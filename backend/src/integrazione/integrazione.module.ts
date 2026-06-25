import { Module } from '@nestjs/common';
import { IntegrazioneController } from './integrazione.controller';
import { IntegrazioneService } from './integrazione.service';

@Module({
  controllers: [IntegrazioneController],
  providers: [IntegrazioneService],
})
export class IntegrazioneModule {}
