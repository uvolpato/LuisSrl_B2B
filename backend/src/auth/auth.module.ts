import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthenticatedGuard, RolesGuard],
  exports: [AuthService, AuthenticatedGuard, RolesGuard],
})
export class AuthModule {}
