import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import {
  DUMMY_HASH,
  hashPassword,
  verifyPassword,
} from '../common/password';
import type { AuthUser } from '../common/auth-types';
import { hashSessionToken, hashToken } from '../common/session-token';

/** mario.rossi@vivaio.it → m***o@vivaio.it (per mostrare dove è stato inviato il codice). */
function mascheraEmail(email: string): string {
  const [nome, dominio] = email.split('@');
  if (!dominio) return email;
  const visibile = nome.length <= 2 ? nome[0] ?? '' : `${nome[0]}***${nome[nome.length - 1]}`;
  return `${visibile}@${dominio}`;
}

/** Cookie del dispositivo fidato: salta solo il secondo fattore, mai la password. */
export const DEVICE_COOKIE = 'luis.device';
export const DEVICE_GIORNI = 90;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async setSessionToken(userId: number, userType: string, token: string) {
    // In DB va l'hash: il token in chiaro resta solo nel cookie.
    const hash = hashSessionToken(token);
    if (userType === 'admin') {
      await this.prisma.user.update({ where: { id: userId }, data: { sessionToken: hash } });
    } else {
      await this.prisma.customer.update({ where: { id: userId }, data: { sessionToken: hash } });
    }
  }

  /**
   * Attivazione da link monouso: imposta la password, invalida il token.
   * Monouso per costruzione: il token viene azzerato nella stessa transazione.
   */
  async attivaAccount(token: string, password: string, ip?: string) {
    const hash = hashToken(token);
    const cliente = await this.prisma.customer.findUnique({
      where: { inviteTokenHash: hash },
      select: { id: true, inviteTokenScadenza: true },
    });
    if (!cliente || !cliente.inviteTokenScadenza || cliente.inviteTokenScadenza < new Date()) {
      throw new BadRequestException('auth.invito_non_valido');
    }

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: cliente.id },
        data: {
          passwordHash: await hashPassword(password),
          mustChangePassword: false,
          inviteTokenHash: null,
          inviteTokenScadenza: null,
          stato: 'ATTIVO',
        },
      }),
    ]);

    await this.audit.log({
      actorId: cliente.id,
      actorType: 'customer',
      azione: 'customer.attivazione',
      entita: 'customers',
      entitaId: String(cliente.id),
      ip,
    });
    return { ok: true };
  }

  /** Metodo del secondo fattore attivo per l'utente (null = nessuno). */
  async metodoMfa(userId: number): Promise<'email' | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaAttivo: true },
    });
    return u?.mfaAttivo ? 'email' : null;
  }

  /** Genera e invia un codice via email. Usato sia per attivare sia per il login. */
  async inviaCodiceEmail(userId: number) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, nome: true },
    });
    const codice = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpCodiceHash: hashToken(codice),
        otpScadenza: new Date(Date.now() + 10 * 60_000),
        otpTentativi: 0,
      },
    });
    await this.mail.sendCodiceMfa(u.email, codice, u.nome);
    return { inviato: true, email: mascheraEmail(u.email) };
  }

  /** Attiva il secondo fattore via email (dopo conferma del codice). */
  async confermaMfaEmail(userId: number, codice: string, ip?: string) {
    const ok = await this.verificaOtpEmail(userId, codice, true);
    if (!ok) throw new BadRequestException('auth.mfa_codice_non_valido');
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaAttivo: true, mfaMetodo: 'email', mfaSecret: null, mfaBackupCodes: null },
    });
    await this.audit.log({
      actorId: userId,
      actorType: 'admin',
      azione: 'auth.mfa_email_attivata',
      entita: 'user',
      entitaId: String(userId),
      ip,
    });
    return { ok: true };
  }

  /** Verifica del codice email: hash, scadenza, massimo 5 tentativi. */
  private async verificaOtpEmail(userId: number, codice: string, consuma: boolean): Promise<boolean> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { otpCodiceHash: true, otpScadenza: true, otpTentativi: true },
    });
    if (!u?.otpCodiceHash || !u.otpScadenza) return false;
    if (u.otpScadenza < new Date() || u.otpTentativi >= 5) return false;

    if (u.otpCodiceHash !== hashToken((codice ?? '').trim())) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { otpTentativi: { increment: 1 } },
      });
      return false;
    }
    if (consuma) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { otpCodiceHash: null, otpScadenza: null, otpTentativi: 0 },
      });
    }
    return true;
  }

  /** MFA attiva per questo admin? */
  async mfaAttiva(userId: number): Promise<boolean> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { mfaAttivo: true } });
    return !!u?.mfaAttivo;
  }

  async disattivaMfa(userId: number, password: string, ip?: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!u || !(await verifyPassword(u.passwordHash, password))) {
      throw new BadRequestException('auth.wrong_password');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaAttivo: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaMetodo: null,
        otpCodiceHash: null,
        otpScadenza: null,
        otpTentativi: 0,
      },
    });
    await this.revocaTuttiDispositivi(userId);
    await this.audit.log({
      actorId: userId,
      actorType: 'admin',
      azione: 'auth.mfa_disattivata',
      entita: 'user',
      entitaId: String(userId),
      ip,
    });
    return { ok: true };
  }

  /** Codice al login: codice inviato via email. */
  async verificaMfaLogin(userId: number, codice: string): Promise<boolean> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaAttivo: true },
    });
    if (!u?.mfaAttivo) return false;
    return this.verificaOtpEmail(userId, codice, true);
  }

  /** Token del dispositivo valido per questo utente (scadenza e revoca verificate). */
  async dispositivoValido(userId: number, token: string): Promise<boolean> {
    const hash = hashToken(token);
    const d = await this.prisma.mfaDevice.findUnique({
      where: { tokenHash: hash },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
    if (!d || d.userId !== userId || d.revokedAt || d.expiresAt < new Date()) return false;
    await this.prisma.mfaDevice.update({ where: { id: d.id }, data: { lastUsedAt: new Date() } });
    return true;
  }

  /** Registra un dispositivo fidato. Massimo 5 attivi: i più vecchi vengono revocati. */
  async registraDispositivo(userId: number, token: string, userAgent?: string) {
    await this.prisma.mfaDevice.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        userAgent: userAgent?.slice(0, 255) ?? null,
        expiresAt: new Date(Date.now() + DEVICE_GIORNI * 86400000),
      },
    });
    const attivi = await this.prisma.mfaDevice.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true },
    });
    if (attivi.length > 5) {
      await this.prisma.mfaDevice.updateMany({
        where: { id: { in: attivi.slice(5).map((d) => d.id) } },
        data: { revokedAt: new Date() },
      });
    }
  }

  listaDispositivi(userId: number) {
    return this.prisma.mfaDevice.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true, expiresAt: true },
    });
  }

  async revocaDispositivo(userId: number, id: number) {
    await this.prisma.mfaDevice.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async revocaTuttiDispositivi(userId: number) {
    await this.prisma.mfaDevice.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async validateLogin(
    email: string,
    password: string,
    ip: string | undefined,
  ): Promise<AuthUser> {    const normalizedEmail = email.toLowerCase();
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
      // Cambio password: i dispositivi fidati non valgono più.
      await this.revocaTuttiDispositivi(user.id);
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
