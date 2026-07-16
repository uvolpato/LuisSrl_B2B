import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  generateProvisionalPassword,
  hashPassword,
} from '../common/password';
import { toUserProfile } from '../common/auth-types';
import type { UserProfile } from '../common/auth-types';
import { buildStatoFilter } from '../common/filters';
import type { UserFilter } from '../common/filters';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const AVATAR_COLORS = [
  'oklch(55% 0.15 250)', 'oklch(55% 0.18 180)', 'oklch(55% 0.17 40)',
  'oklch(55% 0.16 330)', 'oklch(55% 0.15 150)', 'oklch(55% 0.14 80)',
  'oklch(55% 0.16 20)',  'oklch(55% 0.15 300)', 'oklch(55% 0.15 200)',
  'oklch(55% 0.15 120)',
];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async list(params: {
    q?: string;
    stato?: UserFilter;
    page: number;
    pageSize: number;
  }): Promise<{ items: UserProfile[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...buildStatoFilter(params.stato),
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
    return { items: items.map(toUserProfile), total };
  }

  async getById(id: number): Promise<UserProfile | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toUserProfile(user) : null;
  }

  async create(
    actorId: number,
    dto: CreateUserDto,
    ip: string | undefined,
  ): Promise<{ user: UserProfile; provisionalPassword: string }> {
    const provisionalPassword = generateProvisionalPassword();
    const email = dto.email.toLowerCase();
    // L'email è l'identità di login: dev'essere unica tra utenti E clienti,
    // altrimenti il login (che cerca prima negli utenti) impedisce l'accesso all'altro.
    const existing = await this.prisma.user.findFirst({ where: { email } });
    const existingCustomer = await this.prisma.customer.findFirst({ where: { email } });
    if (existing || existingCustomer) throw new ConflictException('users.email_exists');

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(provisionalPassword),
        nome: dto.nome,
        ruolo: (dto.ruolo ?? 'UTENTE') as AdminRole,
        preferredLanguage: dto.preferredLanguage ?? 'it',
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      },
    });
    await this.audit.log({ actorId, azione: 'user.create', entita: 'users', entitaId: String(user.id), ip });
    this.mail.sendProvisionalPassword(dto.email, user.nome, provisionalPassword, false).catch(() => {});
    return { user: toUserProfile(user), provisionalPassword };
  }

  async update(
    actorId: number,
    userId: number,
    dto: UpdateUserDto,
    ip: string | undefined,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('users.not_found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.ruolo !== undefined && { ruolo: dto.ruolo as AdminRole }),
        ...(dto.preferredLanguage !== undefined && { preferredLanguage: dto.preferredLanguage }),
      },
    });
    await this.audit.log({ actorId, azione: 'user.update', entita: 'users', entitaId: String(userId), ip });
    return toUserProfile(updated);
  }

  async setBlocked(
    actorId: number,
    userId: number,
    blocked: boolean,
    ip: string | undefined,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('users.not_found');
    if (user.ruolo === 'SUPERUSER') throw new Error('users.cannot_block_admin');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { stato: blocked ? 'BLOCCATO' : 'ATTIVO' },
    });
    await this.audit.log({
      actorId, azione: blocked ? 'user.block' : 'user.unblock',
      entita: 'users', entitaId: String(userId), ip,
    });
    return toUserProfile(updated);
  }

  async resetPassword(
    actorId: number,
    userId: number,
    ip: string | undefined,
  ): Promise<{ user: UserProfile; provisionalPassword: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('users.not_found');

    const provisionalPassword = generateProvisionalPassword();
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(provisionalPassword), mustChangePassword: true },
    });
    await this.audit.log({ actorId, azione: 'user.password_reset', entita: 'users', entitaId: String(userId), ip });
    this.mail.sendProvisionalPassword(updated.email, updated.nome, provisionalPassword, true).catch(() => {});
    return { user: toUserProfile(updated), provisionalPassword };
  }

  async softDelete(
    actorId: number,
    userId: number,
    ip: string | undefined,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('users.not_found');
    if (user.ruolo === 'SUPERUSER') throw new Error('users.cannot_block_admin');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { stato: 'BLOCCATO', deletedAt: new Date() },
    });
    await this.audit.log({ actorId, azione: 'user.delete', entita: 'users', entitaId: String(userId), ip });
    return toUserProfile(updated);
  }
}
