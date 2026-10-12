import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { IndagineService } from './indagine.service';
import { AzioniLeadService } from './azioni.service';
import { IntegrazioneModule } from '../integrazione/integrazione.module';
import { DatiImpresaService } from '../dati-impresa/dati-impresa.service';

@Module({
  imports: [IntegrazioneModule],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    IndagineService,
    AzioniLeadService,
    DatiImpresaService,
  ],
})
export class LeadsModule {}
