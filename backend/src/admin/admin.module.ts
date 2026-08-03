import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CustomerProfileService } from '../customer-profile/customer-profile.service';

@Module({
  imports: [],
  controllers: [AdminController],
  providers: [AdminService, CustomerProfileService],
})
export class AdminModule {}
