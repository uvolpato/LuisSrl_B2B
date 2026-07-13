import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Customer } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import type { AuthenticatedRequest } from './guards/authenticated.guard';
import { PrismaService } from '../prisma/prisma.service';
import { toUserProfile, toCustomerProfile } from '../common/auth-types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  private async buildCustomerProfile(customer: Customer) {
    const profile = toCustomerProfile(customer);
    if (customer.codicePagamento) {
      const pag = await this.prisma.modalitaPagamento.findUnique({
        where: { codice: customer.codicePagamento },
      });
      profile.codicePagamentoDescrizione = pag?.descrizione ?? null;
    }
    return profile;
  }

  /** Login: max 5 tentativi al minuto per IP. */
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.auth.validateLogin(dto.email, dto.password, req.ip);

    // rigenera l'id di sessione: previene session fixation
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
    req.session.userId = user.id;
    req.session.userType = user.userType;
    req.session.email = user.email;
    req.session.nome = user.nome;
    req.session.csrfToken = randomBytes(32).toString('hex');
    req.session.cookie.maxAge = dto.remember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;

    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve())),
    );

    const profile = user.userType === 'admin'
      ? toUserProfile(await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
      : await this.buildCustomerProfile(await this.prisma.customer.findUniqueOrThrow({ where: { id: user.id } }));

    return { user: profile, csrfToken: req.session.csrfToken };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logLogout(req.user.id, req.user.userType, req.ip);
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
