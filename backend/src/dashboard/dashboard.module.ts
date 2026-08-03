import { Module } from '@nestjs/common';
import { IntegrazioneModule } from '../integrazione/integrazione.module';
import { InsightModule } from '../insight/insight.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [IntegrazioneModule, InsightModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
