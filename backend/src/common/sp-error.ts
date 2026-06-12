import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Traduce gli ERRCODE applicativi sollevati dalle stored procedure
 * (RAISE EXCEPTION ... USING ERRCODE = 'LUIxx') in errori HTTP con
 * codici messaggio che il frontend traduce nella lingua dell'utente.
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
    default:
      throw e;
  }
}
