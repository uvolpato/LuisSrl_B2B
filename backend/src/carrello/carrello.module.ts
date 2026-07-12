import { Module } from '@nestjs/common';
import { CarrelloController } from './carrello.controller';
import { CarrelloService } from './carrello.service';
import { IntegrazioneModule } from '../integrazione/integrazione.module';

@Module({
  imports: [IntegrazioneModule],
  controllers: [CarrelloController],
  providers: [CarrelloService],
  exports: [CarrelloService],
})
export class CarrelloModule {}
