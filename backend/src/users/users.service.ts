import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mapSpError } from '../common/sp-error';
import {
  rowToProfile,
  userToProfile,
  UserProfile,
  UserRow,
} from '../common/user-row';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/** Password provvisoria leggibile: niente caratteri ambigui (0/O, 1/l/I). */
function generateProvisionalPassword(length = 12): string {
  const charset = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += charset[randomInt(charset.length)];
  }
  return out;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    q?: string;
    stato?: 'ATTIVO' | 'BLOCCATO';
    page: number;
    pageSize: number;
  }): Promise<{ items: UserProfile[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ruolo: 'CLIENTE',
      ...(params.stato ? { stato: params.stato } : {}),
      ...(params.q
        ? {
            OR: [
              { email: { contains: params.q, mode: 'insensitive' } },
              { nome: { contains: params.q, mode: 'insensitive' } },
              {
                ragioneSociale: { contains: params.q, mode: 'insensitive' },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(userToProfile), total };
  }

  async getById(id: number): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? userToProfile(user) : null;
  }

  /** Crea un cliente con password provvisoria (mostrata una sola volta all'admin). */
  async createCliente(
    actorId: number,
    dto: CreateUserDto,
    ip: string | undefined,
  ): Promise<{ user: UserProfile; provisionalPassword: string }> {
    const provisionalPassword = generateProvisionalPassword();
    const hash = await argon2.hash(provisionalPassword, {
      type: argon2.argon2id,
    });
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM fn_user_create(
          ${actorId}::int, ${dto.email}, ${hash}, ${dto.nome},
          ${dto.ragioneSociale ?? null}, ${dto.partitaIva ?? null},
          ${dto.telefono ?? null}, 'CLIENTE'::"UserRole",
          ${dto.preferredLanguage ?? 'it'}, ${ip ?? null}
        )`;
      return { user: rowToProfile(row), provisionalPassword };
    } catch (e) {
      mapSpError(e);
    }
  }

  async update(
    actorId: number,
    userId: number,
    dto: UpdateUserDto,
    ip: string | undefined,
  ): Promise<UserProfile> {
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM fn_user_update(
          ${actorId}::int, ${userId}::int,
          ${dto.nome ?? null}, ${dto.ragioneSociale ?? null},
          ${dto.partitaIva ?? null}, ${dto.telefono ?? null},
          ${dto.preferredLanguage ?? null}, ${ip ?? null}
        )`;
      return rowToProfile(row);
    } catch (e) {
      mapSpError(e);
    }
  }

  async setBlocked(
    actorId: number,
    userId: number,
    blocked: boolean,
    ip: string | undefined,
  ): Promise<UserProfile> {
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM fn_user_set_blocked(
          ${actorId}::int, ${userId}::int, ${blocked}, ${ip ?? null}
        )`;
      return rowToProfile(row);
    } catch (e) {
      mapSpError(e);
    }
  }

  /** Reset password: nuova provvisoria, cambio obbligato al prossimo accesso. */
  async resetPassword(
    actorId: number,
    userId: number,
    ip: string | undefined,
  ): Promise<{ user: UserProfile; provisionalPassword: string }> {
    const provisionalPassword = generateProvisionalPassword();
    const hash = await argon2.hash(provisionalPassword, {
      type: argon2.argon2id,
    });
    try {
      const [row] = await this.prisma.$queryRaw<UserRow[]>`
        SELECT * FROM fn_user_set_password(
          ${actorId}::int, ${userId}::int, ${hash}, true, ${ip ?? null}
        )`;
      return { user: rowToProfile(row), provisionalPassword };
    } catch (e) {
      mapSpError(e);
    }
  }
}
