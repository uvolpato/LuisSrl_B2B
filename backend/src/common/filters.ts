import type { Prisma } from '@prisma/client';

export type UserFilter = 'ATTIVO' | 'BLOCCATO' | 'ELIMINATO' | 'TUTTI';

export function buildStatoFilter(stato?: UserFilter): Prisma.UserWhereInput {
  switch (stato) {
    case 'ATTIVO':    return { stato: 'ATTIVO', deletedAt: null };
    case 'BLOCCATO':  return { stato: 'BLOCCATO', deletedAt: null };
    case 'ELIMINATO': return { deletedAt: { not: null } };
    case 'TUTTI':     return {};
    default:          return { deletedAt: null };
  }
}
