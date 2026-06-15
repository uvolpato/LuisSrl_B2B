import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Traduce gli ERRCODE applicativi sollevati dalle stored procedure
 * (RAISE EXCEPTION ... USING ERRCODE = 'LUIxx' / 'LAIxx') in errori HTTP
 * con codici messaggio che il frontend traduce nella lingua dell'utente.
 */
export function mapSpError(e: unknown): never {
  const code = (e as { meta?: { code?: string } })?.meta?.code;
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
    default:
      throw e;
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
