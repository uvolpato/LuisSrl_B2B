import { Module } from '@nestjs/common';
import { InsightService } from './insight.service';
import { InsightController } from './insight.controller';
import { IntegrazioneModule } from '../integrazione/integrazione.module';

@Module({
  imports: [IntegrazioneModule],
  controllers: [InsightController],
  providers: [InsightService],
  exports: [InsightService],
})
export class InsightModule {}
