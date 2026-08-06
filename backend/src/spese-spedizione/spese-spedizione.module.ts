import { Module } from '@nestjs/common';
import { SpeseSpedizioneController } from './spese-spedizione.controller';
import { SpeseSpedizioneService } from './spese-spedizione.service';

@Module({
  controllers: [SpeseSpedizioneController],
  providers: [SpeseSpedizioneService],
  exports: [SpeseSpedizioneService],
})
export class SpeseSpedizioneModule {}
