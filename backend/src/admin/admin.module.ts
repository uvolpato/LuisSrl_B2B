import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CustomerProfileService } from '../customer-profile/customer-profile.service';
import { IntegrazioneModule } from '../integrazione/integrazione.module';

@Module({
  imports: [IntegrazioneModule],
  controllers: [AdminController],
  providers: [AdminService, CustomerProfileService],
})
export class AdminModule {}
