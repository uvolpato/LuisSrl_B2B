import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapSpError } from '../common/sp-error';
import type { UserRow } from '../common/user-row';

/**
 * Accesso alle stored procedure dell'entita' utente (fn_user_*).
 * Tutte le scritture passano da qui; le letture restano su Prisma nel service.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async spCreate(params: {
    actorId: number | null;
    email: string;
    passwordHash: string;
    nome: string;
    ragioneSociale?: string;
    partitaIva?: string;
    telefono?: string;
    ruolo: 'ADMIN' | 'CLIENTE';
    preferredLanguage?: string;
    ip?: string;
  }): Promise<UserRow> {
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM fn_user_create(
          ${params.actorId}::int, ${params.email}, ${params.passwordHash},
          ${params.nome}, ${params.ragioneSociale ?? null},
          ${params.partitaIva ?? null}, ${params.telefono ?? null},
          ${params.ruolo}::"UserRole", ${params.preferredLanguage ?? 'it'},
          ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spUpdate(params: {
    actorId: number;
    userId: number;
    nome?: string;
    ragioneSociale?: string;
    partitaIva?: string;
    telefono?: string;
    preferredLanguage?: string;
    ip?: string;
  }): Promise<UserRow> {
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM fn_user_update(
          ${params.actorId}::int, ${params.userId}::int,
          ${params.nome ?? null}, ${params.ragioneSociale ?? null},
          ${params.partitaIva ?? null}, ${params.telefono ?? null},
          ${params.preferredLanguage ?? null}, ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spSetBlocked(params: {
    actorId: number;
    userId: number;
    blocked: boolean;
    ip?: string;
  }): Promise<UserRow> {
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM fn_user_set_blocked(
          ${params.actorId}::int, ${params.userId}::int,
          ${params.blocked}, ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spSetPassword(params: {
    actorId: number;
    userId: number;
    passwordHash: string;
    mustChange: boolean;
    ip?: string;
  }): Promise<UserRow> {
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM fn_user_set_password(
          ${params.actorId}::int, ${params.userId}::int,
          ${params.passwordHash}, ${params.mustChange}, ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }
}
