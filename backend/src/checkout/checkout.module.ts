import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { IntegrazioneModule } from '../integrazione/integrazione.module';
import { SpeseSpedizioneModule } from '../spese-spedizione/spese-spedizione.module';

@Module({
  imports: [IntegrazioneModule, SpeseSpedizioneModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
