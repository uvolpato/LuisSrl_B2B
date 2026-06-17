import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Traduce gli ERRCODE applicativi sollevati dalle stored procedure
 * (RAISE EXCEPTION ... USING ERRCODE = 'LUIxx' / 'LAIxx') in errori HTTP
 * con codici messaggio che il frontend traduce nella lingua dell'utente.
 * I codici sconosciuti producono un 500 con dettaglio tecnico.
 */
export function mapSpError(e: unknown): never {
  const prismaErr = e as { meta?: { code?: string }; message?: string; code?: string };
  const code = prismaErr.meta?.code ?? prismaErr.code;
  switch (code) {
    case 'LUI01':
      throw new ConflictException('users.email_exists');
    case 'LUI02':
      throw new ConflictException('users.piva_exists');
    case 'LUI03':
      throw new NotFoundException('users.not_found');
    case 'LUI04':
      throw new BadRequestException('users.cannot_block_admin');
    // LAI (Luis Admin Integration)
    case 'LAI01':
      throw new ConflictException('admin.group_slug_exists');
    case 'LAI02':
      throw new NotFoundException('admin.group_not_found');
    case 'LAI03':
      throw new ConflictException('admin.group_has_users');
    case 'LAI04':
      throw new NotFoundException('users.not_found');
    default: {
      const msg = prismaErr.message ?? 'Errore imprevisto';
      throw new InternalServerErrorException(
        `errors.internal: ${msg.slice(0, 200)}`,
      );
    }
  }
}

/** Wrapper per chiamate SP che restituiscono una riga tipizzata. */
export async function spQuery<T>(
  prisma: import('../prisma/prisma.service').PrismaService,
  query: TemplateStringsArray,
  ...values: unknown[]
): Promise<T> {
  try {
    const [row] = await prisma.$queryRaw<T[]>(query, ...values);
    return row;
  } catch (e) {
    mapSpError(e);
  }
}
