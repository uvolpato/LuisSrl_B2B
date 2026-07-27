import { Module } from '@nestjs/common';
import { ProgettiController } from './progetti.controller';
import { ProgettiPublicController } from './progetti-public.controller';
import { ProgettiService } from './progetti.service';
import { CarrelloModule } from '../carrello/carrello.module';
import { IntegrazioneModule } from '../integrazione/integrazione.module';

@Module({
  imports: [CarrelloModule, IntegrazioneModule],
  controllers: [ProgettiController, ProgettiPublicController],
  providers: [ProgettiService],
})
export class ProgettiModule {}
