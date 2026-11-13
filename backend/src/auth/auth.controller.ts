import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Customer } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrivacyAccettaDto, TrackingOptOutDto } from './dto/privacy.dto';
import { AttivaAccountDto } from './dto/attiva.dto';
import { MfaCodiceDto, MfaPasswordDto } from './dto/mfa.dto';
import type { AuthUser } from '../common/auth-types';
import { generaTokenInvito } from '../common/session-token';
import { DEVICE_COOKIE, DEVICE_GIORNI } from './auth.service';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import type { AuthenticatedRequest } from './guards/authenticated.guard';
import { PrismaService } from '../prisma/prisma.service';
import { toUserProfile, toCustomerProfile } from '../common/auth-types';
import { EventsService } from '../events/events.service';
import { PRIVACY_VERSIONE_PORTALE } from '../common/privacy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  private async buildCustomerProfile(customer: Customer) {
    const profile = toCustomerProfile(customer);
    if (customer.codicePagamento) {
      const pag = await this.prisma.modalitaPagamento.findUnique({
        where: { codice: customer.codicePagamento },
      });
      profile.codicePagamentoDescrizione = pag?.descrizione ?? null;
    }
    const [lastLogin]: any[] = await this.prisma.customerEvent.findMany({
      where: { customerId: customer.id, tipo: 'login' },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { createdAt: true },
    });
    (profile as any).ultimoAccesso = lastLogin?.createdAt?.toISOString() ?? null;
    return profile;
  }

  /** Login: max 5 tentativi al minuto per IP. */
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.auth.validateLogin(dto.email, dto.password, req.ip);

    // Admin con MFA attiva: se il browser è già certificato si salta solo il secondo fattore.
    const metodo = user.userType === 'admin' ? await this.auth.metodoMfa(user.id) : null;
    if (metodo) {
      const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
      const dispositivo = cookies?.[DEVICE_COOKIE];
      const fidato = dispositivo ? await this.auth.dispositivoValido(user.id, dispositivo) : false;
      if (!fidato) {
        let invioFallito = false;
        if (metodo === 'email') {
          try {
            await this.auth.inviaCodiceEmail(user.id);
          } catch {
            // Non bloccare il login: il codice si può reinviare.
            invioFallito = true;
          }
        }
        await new Promise<void>((resolve, reject) =>
          req.session.regenerate((err) => (err ? reject(err) : resolve())),
        );
        req.session.pendingUserId = user.id;
        req.session.pendingUserType = 'admin';
        req.session.pendingMfaDa = Date.now();
        req.session.pendingRemember = !!dto.remember;
        req.session.cookie.maxAge = 5 * 60 * 1000;
        await new Promise<void>((resolve, reject) =>
          req.session.save((err) => (err ? reject(err) : resolve())),
        );
        return { mfaRichiesta: true, metodo, invioFallito };
      }
    }

    return this.completaLogin(req, user, !!dto.remember);
  }

  /** Rinvia il codice via email (sessione di login ancora in attesa). */
  @Post('mfa/rinvia')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async mfaRinvia(@Req() req: Request) {
    const pendingId = req.session.pendingUserId;
    if (!pendingId) throw new UnauthorizedException('auth.mfa_sessione_scaduta');
    return this.auth.inviaCodiceEmail(pendingId);
  }

  /** Attiva il secondo fattore via email: invia un codice all'indirizzo dell'account. */
  @Post('mfa/email/attiva')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  mfaEmailAttiva(@Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'admin') throw new ForbiddenException('auth.forbidden');
    return this.auth.inviaCodiceEmail(req.user.id);
  }

  /** Conferma il codice ricevuto via email: da qui la MFA è attiva. */
  @Post('mfa/email/conferma')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  mfaEmailConferma(@Body() dto: MfaCodiceDto, @Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'admin') throw new ForbiddenException('auth.forbidden');
    return this.auth.confermaMfaEmail(req.user.id, dto.code, req.ip);
  }

  /** Secondo passo del login: codice TOTP o codice di recupero. */
  @Post('mfa/verifica')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verificaMfa(
    @Body() dto: MfaCodiceDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pendingId = req.session.pendingUserId;
    if (!pendingId) throw new UnauthorizedException('auth.mfa_sessione_scaduta');

    const ok = await this.auth.verificaMfaLogin(pendingId, dto.code);
    if (!ok) throw new UnauthorizedException('auth.mfa_codice_non_valido');

    if (dto.ricordaDispositivo) {
      const token = generaTokenInvito();
      await this.auth.registraDispositivo(pendingId, token, req.get('user-agent') ?? undefined);
      res.cookie(DEVICE_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: DEVICE_GIORNI * 86400000,
        path: '/api/auth',
      });
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: pendingId } });
    const remember = !!req.session.pendingRemember;
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      userType: 'admin',
      ruolo: user.ruolo,
      stato: user.stato,
      avatarColor: user.avatarColor,
    };
    return this.completaLogin(req, authUser, remember);
  }

  @Get('mfa/stato')
  @UseGuards(AuthenticatedGuard)
  async mfaStato(@Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'admin') return { attivo: false, metodo: null };
    return {
      attivo: await this.auth.mfaAttiva(req.user.id),
      metodo: await this.auth.metodoMfa(req.user.id),
    };
  }

  @Post('mfa/disattiva')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  mfaDisattiva(@Body() dto: MfaPasswordDto, @Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'admin') throw new ForbiddenException('auth.forbidden');
    return this.auth.disattivaMfa(req.user.id, dto.password, req.ip);
  }

  @Get('mfa/dispositivi')
  @UseGuards(AuthenticatedGuard)
  dispositivi(@Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'admin') return [];
    return this.auth.listaDispositivi(req.user.id);
  }

  @Post('mfa/dispositivi/:id/revoca')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  revocaDispositivo(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'admin') throw new ForbiddenException('auth.forbidden');
    return this.auth.revocaDispositivo(req.user.id, id);
  }

  @Post('mfa/dispositivi/revoca-tutti')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  revocaDispositivi(@Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'admin') throw new ForbiddenException('auth.forbidden');
    return this.auth.revocaTuttiDispositivi(req.user.id);
  }

  /** Completamento sessione (login normale o dopo MFA). */
  private async completaLogin(req: Request, user: AuthUser, remember: boolean) {
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
    req.session.userId = user.id;
    req.session.userType = user.userType;
    req.session.email = user.email;
    req.session.nome = user.nome;
    req.session.csrfToken = randomBytes(32).toString('hex');
    req.session.sessionToken = crypto.randomUUID();

    await this.auth.setSessionToken(user.id, user.userType, req.session.sessionToken);
    req.session.cookie.maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;

    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve())),
    );

    const profile = user.userType === 'admin'
      ? toUserProfile(await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
      : await this.buildCustomerProfile(await this.prisma.customer.findUniqueOrThrow({ where: { id: user.id } }));

    if (user.userType === 'customer') void this.events.trackFor(user.id, 'login', undefined, req.ip);
    return { user: profile, csrfToken: req.session.csrfToken, mfaRichiesta: false };
  }

  /** Attivazione account dal link monouso dell'invito: il cliente sceglie la password. */
  @Post('attiva')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  attiva(@Body() dto: AttivaAccountDto, @Req() req: Request) {
    return this.auth.attivaAccount(dto.token, dto.password, req.ip);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logLogout(req.user.id, req.user.userType, req.ip);
    if (req.user.userType === 'customer') void this.events.trackFor(req.user.id, 'logout', undefined, req.ip);
    await new Promise<void>((resolve, reject) =>
      req.session.destroy((err) => (err ? reject(err) : resolve())),
    );
    res.clearCookie('luis.sid');
    return { ok: true };
  }

  /** Profilo corrente + token CSRF (per ripristinare lo stato dopo un refresh). */
  @Get('me')
  @UseGuards(AuthenticatedGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const profile = req.user.userType === 'admin'
      ? toUserProfile(await this.prisma.user.findUniqueOrThrow({ where: { id: req.user.id } }))
      : await this.buildCustomerProfile(await this.prisma.customer.findUniqueOrThrow({ where: { id: req.user.id } }));
    return {
      user: profile,
      csrfToken: req.session.csrfToken,
    };
  }

  /** Aggiornamento del proprio profilo (tab Account). */
  @Patch('profile')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.auth.updateProfile(req.user, dto, req.ip);
    return { user };
  }

  /** Stato dell'informativa privacy del portale per il cliente corrente. */
  @Get('privacy')
  @UseGuards(AuthenticatedGuard)
  async privacy(@Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'customer') {
      return { versione: PRIVACY_VERSIONE_PORTALE, accettataVersione: PRIVACY_VERSIONE_PORTALE, accettataIl: null };
    }
    const c = await this.prisma.customer.findUnique({
      where: { id: req.user.id },
      select: { privacyVersione: true, privacyAccettataIl: true, trackingOptOut: true },
    });
    return {
      versione: PRIVACY_VERSIONE_PORTALE,
      accettataVersione: c?.privacyVersione ?? null,
      accettataIl: c?.privacyAccettataIl ?? null,
      trackingOptOut: c?.trackingOptOut ?? false,
    };
  }

  /** Presa visione dell'informativa: salva versione e data come prova (art. 5.2 GDPR). */
  @Post('privacy/accetta')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async accettaPrivacy(@Body() dto: PrivacyAccettaDto, @Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'customer') return { ok: true };
    await this.prisma.customer.update({
      where: { id: req.user.id },
      data: { privacyVersione: dto.versione, privacyAccettataIl: new Date() },
    });
    return { ok: true };
  }

  /** Opposizione al tracciamento comportamentale: effetto immediato. */
  @Post('tracciamento')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async tracciamento(@Body() dto: TrackingOptOutDto, @Req() req: AuthenticatedRequest) {
    if (req.user.userType !== 'customer') return { ok: true, trackingOptOut: false };
    await this.prisma.customer.update({
      where: { id: req.user.id },
      data: { trackingOptOut: dto.optOut },
    });
    this.events.invalidaOptOut(req.user.id);
    if (!dto.optOut) void this.events.track('opposizione.revocata');
    return { ok: true, trackingOptOut: dto.optOut };
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.auth.changePassword(
      req.user,
      dto.oldPassword,
      dto.newPassword,
      req.ip,
    );
    return { ok: true };
  }
}
