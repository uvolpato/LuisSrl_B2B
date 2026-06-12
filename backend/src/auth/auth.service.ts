import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica le credenziali. Ogni tentativo (riuscito o no) viene tracciato
   * in audit_log dalla stored procedure fn_auth_log_attempt.
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
      // hash fittizio per non rivelare l'esistenza dell'email via timing
      await argon2
        .verify(
          '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          password,
        )
        .catch(() => false);
      await this.logAttempt(email, false, null, 'utente inesistente', ip);
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      await this.logAttempt(email, false, user.id, 'password errata', ip);
      throw new UnauthorizedException('auth.invalid_credentials');
    }
    if (user.stato === 'BLOCCATO') {
      await this.logAttempt(email, false, user.id, 'utente bloccato', ip);
      throw new UnauthorizedException('auth.user_blocked');
    }

    await this.logAttempt(email, true, user.id, null, ip);
    return user;
  }

  async changePassword(
    user: User,
    oldPassword: string,
    newPassword: string,
    ip: string | undefined,
  ): Promise<void> {
    const valid = await argon2.verify(user.passwordHash, oldPassword);
    if (!valid) {
      throw new BadRequestException('auth.wrong_password');
    }
    const hash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.$queryRaw`
      SELECT id FROM fn_user_set_password(
        ${user.id}::int, ${user.id}::int, ${hash}, false, ${ip ?? null}
      )`;
  }

  async logLogout(userId: number, ip: string | undefined): Promise<void> {
    await this.prisma.$queryRaw`
      SELECT fn_audit_log(${userId}::int, 'auth.logout', 'users',
                          ${String(userId)}, NULL, 'OK', ${ip ?? null})`;
  }

  private async logAttempt(
    email: string,
    success: boolean,
    userId: number | null,
    motivo: string | null,
    ip: string | undefined,
  ): Promise<void> {
    await this.prisma.$queryRaw`
      SELECT fn_auth_log_attempt(${email}, ${success},
                                 ${userId}::int, ${motivo}, ${ip ?? null})`;
  }
}
