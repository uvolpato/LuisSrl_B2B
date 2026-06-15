import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './authenticated.guard';

export const ROLES_KEY = 'roles';
export const Roles = (...types: string[]) => SetMetadata(ROLES_KEY, types);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user || !required.includes(req.user.userType)) {
      throw new ForbiddenException('auth.forbidden');
    }
    return true;
  }
}
