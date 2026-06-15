import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/auth-types';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.session?.userId;
    const userType = req.session?.userType as 'admin' | 'customer' | undefined;
    if (!userId || !userType) {
      throw new UnauthorizedException('auth.not_authenticated');
    }

    if (userType === 'admin') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.stato === 'BLOCCATO' || user.ruolo === 'SOSPESO') {
        await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
        throw new UnauthorizedException('auth.user_blocked');
      }
      req.user = {
        id: user.id,
        email: user.email,
        nome: user.nome,
        userType: 'admin',
        ruolo: user.ruolo,
        stato: user.stato,
        avatarColor: user.avatarColor,
      };
    } else {
      const customer = await this.prisma.customer.findUnique({ where: { id: userId } });
      if (!customer || customer.stato === 'BLOCCATO') {
        await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
        throw new UnauthorizedException('auth.user_blocked');
      }
      req.user = {
        id: customer.id,
        email: customer.email,
        nome: customer.nome,
        userType: 'customer',
        ruolo: customer.ruolo,
        stato: customer.stato,
        avatarColor: customer.avatarColor,
      };
    }
    return true;
  }
}
