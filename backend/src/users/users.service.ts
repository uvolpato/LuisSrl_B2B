import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersRepository } from './users.repository';
import {
  generateProvisionalPassword,
  hashPassword,
} from '../common/password';
import {
  rowToProfile,
  userToProfile,
  UserProfile,
} from '../common/user-row';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: UsersRepository,
  ) {}

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
    const row = await this.repo.spCreate({
      actorId,
      email: dto.email,
      passwordHash: await hashPassword(provisionalPassword),
      nome: dto.nome,
      ragioneSociale: dto.ragioneSociale,
      partitaIva: dto.partitaIva,
      telefono: dto.telefono,
      ruolo: 'CLIENTE',
      preferredLanguage: dto.preferredLanguage,
      ip,
    });
    return { user: rowToProfile(row), provisionalPassword };
  }

  async update(
    actorId: number,
    userId: number,
    dto: UpdateUserDto,
    ip: string | undefined,
  ): Promise<UserProfile> {
    const row = await this.repo.spUpdate({ actorId, userId, ...dto, ip });
    return rowToProfile(row);
  }

  async setBlocked(
    actorId: number,
    userId: number,
    blocked: boolean,
    ip: string | undefined,
  ): Promise<UserProfile> {
    const row = await this.repo.spSetBlocked({ actorId, userId, blocked, ip });
    return rowToProfile(row);
  }

  /** Reset password: nuova provvisoria, cambio obbligato al prossimo accesso. */
  async resetPassword(
    actorId: number,
    userId: number,
    ip: string | undefined,
  ): Promise<{ user: UserProfile; provisionalPassword: string }> {
    const provisionalPassword = generateProvisionalPassword();
    const row = await this.repo.spSetPassword({
      actorId,
      userId,
      passwordHash: await hashPassword(provisionalPassword),
      mustChange: true,
      ip,
    });
    return { user: rowToProfile(row), provisionalPassword };
  }
}
