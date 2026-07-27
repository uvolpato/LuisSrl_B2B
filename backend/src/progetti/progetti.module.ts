import { Module } from '@nestjs/common';
import { ProgettiController } from './progetti.controller';
import { ProgettiPublicController } from './progetti-public.controller';
import { ProgettiService } from './progetti.service';
import { CarrelloModule } from '../carrello/carrello.module';

@Module({
  imports: [CarrelloModule],
  controllers: [ProgettiController, ProgettiPublicController],
  providers: [ProgettiService],
})
export class ProgettiModule {}
