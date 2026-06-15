import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UsersRepository } from '../users/users.repository';
import { CustomersRepository } from '../customers/customers.repository';
import {
  DUMMY_HASH,
  hashPassword,
  verifyPassword,
} from '../common/password';
import type { LoginLookupRow, AuthUser } from '../common/auth-types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly usersRepo: UsersRepository,
    private readonly customersRepo: CustomersRepository,
  ) {}

  async validateLogin(
    email: string,
    password: string,
    ip: string | undefined,
  ): Promise<AuthUser> {
    const [row] = await this.prisma.$queryRaw<LoginLookupRow[]>`
      SELECT * FROM auth.fn_login_lookup(${email.toLowerCase()})
    `;

    if (!row?.user_id) {
      await verifyPassword(DUMMY_HASH, password);
      await this.audit.logLoginAttempt({ email, success: false, userId: null, motivo: 'utente inesistente', ip });
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    const valid = await verifyPassword(row.password_hash, password);
    if (!valid) {
      await this.audit.logLoginAttempt({ email, success: false, userId: row.user_id, motivo: 'password errata', ip, actorType: row.user_type });
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    if (row.stato === 'BLOCCATO' || row.ruolo === 'SOSPESO') {
      await this.audit.logLoginAttempt({ email, success: false, userId: row.user_id, motivo: 'utente bloccato/sospeso', ip, actorType: row.user_type });
      throw new UnauthorizedException('auth.user_blocked');
    }

    await this.audit.logLoginAttempt({ email, success: true, userId: row.user_id, ip, actorType: row.user_type });

    return {
      id: row.user_id,
      email,
      nome: row.nome,
      userType: row.user_type,
      ruolo: row.ruolo,
      stato: row.stato,
      avatarColor: row.avatar_color,
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
      await this.usersRepo.spSetPassword({
        actorId: user.id,
        userId: user.id,
        passwordHash: newHash,
        mustChange: false,
        ip,
      });
    } else {
      await this.customersRepo.spSetPassword({
        actorId: user.id,
        customerId: user.id,
        passwordHash: newHash,
        mustChange: false,
        ip,
        actorType: 'customer',
      });
    }
  }

  async logLogout(userId: number, userType: string, ip: string | undefined): Promise<void> {
    await this.audit.log({
      actorId: userId,
      azione: 'auth.logout',
      entita: userType === 'admin' ? 'users' : 'customers',
      entitaId: String(userId),
      ip,
      actorType: userType === 'admin' ? 'admin' : 'customer',
    });
  }
}
