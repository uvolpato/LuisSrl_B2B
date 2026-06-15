import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthenticatedGuard } from './guards/authenticated.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { UsersModule } from '../users/users.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [UsersModule, CustomersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthenticatedGuard, RolesGuard, PermissionsGuard],
  exports: [AuthService, PermissionsGuard],
})
export class AuthModule {}
