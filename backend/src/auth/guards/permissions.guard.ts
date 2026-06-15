import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import type { AuthenticatedRequest } from './authenticated.guard';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (req.user.ruolo === 'SUPERUSER') return true;

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        group: true,
        adminPermissions: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('auth.forbidden');
    }

    const effective = new Set(user.group?.permissions ?? []);

    for (const override of user.adminPermissions) {
      if (override.granted) {
        effective.add(override.permission);
      } else {
        effective.delete(override.permission);
      }
    }

    if (!effective.has(required)) {
      throw new ForbiddenException('auth.forbidden');
    }

    return true;
  }
}
