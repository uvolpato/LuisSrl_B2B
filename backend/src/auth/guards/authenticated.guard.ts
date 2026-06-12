import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Verifica la sessione e ricarica l'utente dal DB a ogni richiesta:
 * un cliente bloccato perde l'accesso immediatamente, anche a sessione viva.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.session?.userId;
    if (!userId) {
      throw new UnauthorizedException('auth.not_authenticated');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.stato === 'BLOCCATO') {
      await new Promise<void>((resolve) =>
        req.session.destroy(() => resolve()),
      );
      throw new UnauthorizedException('auth.user_blocked');
    }
    req.user = user;
    return true;
  }
}
