import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  DUMMY_HASH,
  hashPassword,
  verifyPassword,
} from '../common/password';
import type { AuthUser } from '../common/auth-types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async validateLogin(
    email: string,
    password: string,
    ip: string | undefined,
  ): Promise<AuthUser> {
    const normalizedEmail = email.toLowerCase();
    let row: {
      id: number; email: string; passwordHash: string;
      nome: string; ruolo: string; stato: string; avatarColor: string;
      userType: 'admin' | 'customer';
    } | null = null;

    const user = await this.prisma.user.findFirst({ where: { email: normalizedEmail }, select: { id: true, email: true, passwordHash: true, nome: true, ruolo: true, stato: true, avatarColor: true } });
    if (user) {
      row = { ...user, userType: 'admin' };
    } else {
      const customer = await this.prisma.customer.findFirst({ where: { email: normalizedEmail }, select: { id: true, email: true, passwordHash: true, nome: true, ruolo: true, stato: true, avatarColor: true } });
      if (customer) row = { ...customer, userType: 'customer' };
    }

    if (!row) {
      await verifyPassword(DUMMY_HASH, password);
      await this.audit.logLoginAttempt({ email: normalizedEmail, success: false, userId: null, motivo: 'utente inesistente', ip });
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    const valid = await verifyPassword(row.passwordHash, password);
    if (!valid) {
      await this.audit.logLoginAttempt({ email: normalizedEmail, success: false, userId: row.id, motivo: 'password errata', ip, actorType: row.userType });
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    if (row.stato === 'BLOCCATO' || row.ruolo === 'SOSPESO') {
      await this.audit.logLoginAttempt({ email: normalizedEmail, success: false, userId: row.id, motivo: 'utente bloccato/sospeso', ip, actorType: row.userType });
      throw new UnauthorizedException('auth.user_blocked');
    }

    await this.audit.logLoginAttempt({ email: normalizedEmail, success: true, userId: row.id, ip, actorType: row.userType });

    return {
      id: row.id,
      email: row.email,
      nome: row.nome,
      userType: row.userType,
      ruolo: row.ruolo,
      stato: row.stato,
      avatarColor: row.avatarColor,
    };
  }

  async changePassword(
    user: AuthUser,
    oldPassword: string,
    newPassword: string,
    ip: string | undefined,
  ): Promise<void> {
    const hash =
      user.userType === 'admin'
        ? (await this.prisma.user.findUnique({ where: { id: user.id } }))?.passwordHash
        : (await this.prisma.customer.findUnique({ where: { id: user.id } }))?.passwordHash;

    if (!hash || !(await verifyPassword(hash, oldPassword))) {
      throw new BadRequestException('auth.wrong_password');
    }

    const newHash = await hashPassword(newPassword);
    if (user.userType === 'admin') {
      await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash, mustChangePassword: false } });
    } else {
      await this.prisma.customer.update({ where: { id: user.id }, data: { passwordHash: newHash, mustChangePassword: false } });
    }

    await this.audit.log({
      actorId: user.id, azione: 'auth.password_change',
      entita: user.userType === 'admin' ? 'users' : 'customers',
      entitaId: String(user.id), ip, actorType: user.userType,
    });
  }

  async updateProfile(
    user: AuthUser,
    dto: { nome?: string; bio?: string | null; gender?: string | null; birthDate?: string | null },
    ip: string | undefined,
  ) {
    if (user.userType !== 'admin') {
      throw new BadRequestException('auth.forbidden');
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
      },
    });
    await this.audit.log({
      actorId: user.id, azione: 'profile.update',
      entita: 'users', entitaId: String(user.id), ip, actorType: 'admin',
    });
    return {
      id: updated.id, email: updated.email, nome: updated.nome,
      userType: 'admin' as const, ruolo: updated.ruolo, stato: updated.stato,
      preferredLanguage: updated.preferredLanguage, mustChangePassword: updated.mustChangePassword,
      avatarColor: updated.avatarColor, bio: updated.bio, gender: updated.gender,
      birthDate: updated.birthDate, groupId: updated.groupId, deletedAt: updated.deletedAt,
      createdAt: updated.createdAt,
    };
  }

  async logLogout(userId: number, userType: string, ip: string | undefined): Promise<void> {
    await this.audit.log({
      actorId: userId, azione: 'auth.logout',
      entita: userType === 'admin' ? 'users' : 'customers',
      entitaId: String(userId), ip,
      actorType: userType === 'admin' ? 'admin' : 'customer',
    });
  }
}
