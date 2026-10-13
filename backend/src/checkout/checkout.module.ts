import { Module } from '@nestjs/common';
import { CheckoutController, ConfigController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { IntegrazioneModule } from '../integrazione/integrazione.module';
import { SpeseSpedizioneModule } from '../spese-spedizione/spese-spedizione.module';
import { LeadsModule } from '../leads/leads.module';
import { FatturazioneService } from './fatturazione.service';

@Module({
  imports: [IntegrazioneModule, SpeseSpedizioneModule, LeadsModule],
  controllers: [CheckoutController, ConfigController],
  providers: [CheckoutService, FatturazioneService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
