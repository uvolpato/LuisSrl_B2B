import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import type { AuthenticatedRequest } from './guards/authenticated.guard';
import { userToProfile } from '../common/user-row';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Login: max 5 tentativi al minuto per IP. */
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.auth.validateLogin(dto.email, dto.password, req.ip);

    // rigenera l'id di sessione: previene session fixation
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
    req.session.userId = user.id;
    req.session.csrfToken = randomBytes(32).toString('hex');

    return { user: userToProfile(user), csrfToken: req.session.csrfToken };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthenticatedGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logLogout(req.user.id, req.ip);
    await new Promise<void>((resolve, reject) =>
      req.session.destroy((err) => (err ? reject(err) : resolve())),
    );
    res.clearCookie('luis.sid');
    return { ok: true };
  }

  /** Profilo corrente + token CSRF (per ripristinare lo stato dopo un refresh). */
  @Get('me')
  @UseGuards(AuthenticatedGuard)
  me(@Req() req: AuthenticatedRequest) {
    return {
      user: userToProfile(req.user),
      csrfToken: req.session.csrfToken,
    };
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
