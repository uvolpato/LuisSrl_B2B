import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UsersRepository } from '../users/users.repository';
import {
  DUMMY_HASH,
  hashPassword,
  verifyPassword,
} from '../common/password';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly usersRepo: UsersRepository,
  ) {}

  /**
   * Verifica le credenziali. Ogni tentativo (riuscito o no) viene tracciato
   * in audit_log via fn_auth_log_attempt.
   */
  async validateLogin(
    email: string,
    password: string,
    ip: string | undefined,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // verifica fittizia per non rivelare l'esistenza dell'email via timing
      await verifyPassword(DUMMY_HASH, password);
      await this.audit.logLoginAttempt({
        email,
        success: false,
        userId: null,
        motivo: 'utente inesistente',
        ip,
      });
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      await this.audit.logLoginAttempt({
        email,
        success: false,
        userId: user.id,
        motivo: 'password errata',
        ip,
      });
      throw new UnauthorizedException('auth.invalid_credentials');
    }
    if (user.stato === 'BLOCCATO') {
      await this.audit.logLoginAttempt({
        email,
        success: false,
        userId: user.id,
        motivo: 'utente bloccato',
        ip,
      });
      throw new UnauthorizedException('auth.user_blocked');
    }

    await this.audit.logLoginAttempt({
      email,
      success: true,
      userId: user.id,
      ip,
    });
    return user;
  }

  async changePassword(
    user: User,
    oldPassword: string,
    newPassword: string,
    ip: string | undefined,
  ): Promise<void> {
    const valid = await verifyPassword(user.passwordHash, oldPassword);
    if (!valid) {
      throw new BadRequestException('auth.wrong_password');
    }
    await this.usersRepo.spSetPassword({
      actorId: user.id,
      userId: user.id,
      passwordHash: await hashPassword(newPassword),
      mustChange: false,
      ip,
    });
  }

  async logLogout(userId: number, ip: string | undefined): Promise<void> {
    await this.audit.log({
      actorId: userId,
      azione: 'auth.logout',
      entita: 'users',
      entitaId: String(userId),
      ip,
    });
  }
}
