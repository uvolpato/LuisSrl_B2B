import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapSpError } from '../common/sp-error';
import type { UserRow } from '../common/user-row';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async spCreate(params: {
    actorId: number | null;
    email: string;
    passwordHash: string;
    nome: string;
    ruolo: string;
    preferredLanguage?: string;
    ip?: string;
  }): Promise<UserRow> {
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM users.fn_user_create(
          ${params.actorId}::int, ${params.email}, ${params.passwordHash},
          ${params.nome}, ${params.ruolo}::"AdminRole",
          ${params.preferredLanguage ?? 'it'}, ${params.ip ?? null}
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
    ruolo?: string;
    preferredLanguage?: string;
    ip?: string;
  }): Promise<UserRow> {
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM users.fn_user_update(
          ${params.actorId}::int, ${params.userId}::int,
          ${params.nome ?? null},
          ${params.ruolo ?? null}::"AdminRole",
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
        SELECT * FROM users.fn_user_set_blocked(
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
        SELECT * FROM users.fn_user_set_password(
          ${params.actorId}::int, ${params.userId}::int,
          ${params.passwordHash}, ${params.mustChange}, ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }
}
