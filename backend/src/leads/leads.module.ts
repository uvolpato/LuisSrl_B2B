import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminLeadsService } from './admin-leads.service';
import { LeadsService } from './leads.service';
import { IndagineService } from './indagine.service';
import { AzioniLeadService } from './azioni.service';
import { ExportClienteService } from './export-cliente.service';
import { ConservazioneLeadService } from './conservazione.service';
import { AggancioLeadService } from './aggancio.service';
import { CustomersModule } from '../customers/customers.module';
import { IntegrazioneModule } from '../integrazione/integrazione.module';
import { DatiImpresaService } from '../dati-impresa/dati-impresa.service';

@Module({
  imports: [IntegrazioneModule, CustomersModule],
  controllers: [LeadsController, AdminLeadsController],
  providers: [
    LeadsService,
    IndagineService,
    AzioniLeadService,
    ExportClienteService,
    ConservazioneLeadService,
    AggancioLeadService,
    AdminLeadsService,
    DatiImpresaService,
  ],
  exports: [ExportClienteService],
})
export class LeadsModule {}
