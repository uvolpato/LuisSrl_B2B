import { Module } from '@nestjs/common';
import { CarrelloController } from './carrello.controller';
import { CarrelloService } from './carrello.service';

@Module({
  controllers: [CarrelloController],
  providers: [CarrelloService],
  exports: [CarrelloService],
})
export class CarrelloModule {}
