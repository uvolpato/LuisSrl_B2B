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

export type UserFilter = 'ATTIVO' | 'BLOCCATO' | 'ELIMINATO' | 'TUTTI';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: UsersRepository,
  ) {}

  async list(params: {
    q?: string;
    stato?: UserFilter;
    page: number;
    pageSize: number;
  }): Promise<{ items: UserProfile[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...this.buildStatoFilter(params.stato),
      ...(params.q
        ? { OR: [
            { email: { contains: params.q, mode: 'insensitive' } },
            { nome: { contains: params.q, mode: 'insensitive' } },
          ]}
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

  private buildStatoFilter(stato?: UserFilter): Prisma.UserWhereInput {
    switch (stato) {
      case 'ATTIVO':
        return { stato: 'ATTIVO', deletedAt: null };
      case 'BLOCCATO':
        return { stato: 'BLOCCATO', deletedAt: null };
      case 'ELIMINATO':
        return { deletedAt: { not: null } };
      case 'TUTTI':
        return {};
      default:
        return { deletedAt: null };
    }
  }

  async getById(id: number): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? userToProfile(user) : null;
  }

  /** Crea un admin/staff con password provvisoria. */
  async create(
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
      ruolo: dto.ruolo ?? 'UTENTE',
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

  /** Soft-delete: imposta deletedAt + stato BLOCCATO. */
  async softDelete(
    actorId: number,
    userId: number,
    ip: string | undefined,
  ): Promise<UserProfile> {
    const row = await this.repo.spSetDeleted({
      actorId,
      userId,
      deletedAt: new Date(),
      ip,
    });
    return rowToProfile(row);
  }
}
