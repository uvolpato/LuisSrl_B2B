import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExportClienteService } from '../leads/export-cliente.service';
import { FatturazioneDto } from './dto/fatturazione.dto';
import { confermaRichiesta, erroreCanaleSdi } from './fatturazione';

@Injectable()
export class FatturazioneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly exportCliente: ExportClienteService,
  ) {}

  async get(clienteId: number) {
    const c = await this.prisma.customer.findUnique({
      where: { id: clienteId },
    });
    if (!c) throw new NotFoundException('Cliente non trovato');
    return {
      richiesta: confermaRichiesta(c),
      confermatiIl: c.datiFatturazioneConfermatiIl,
      dati: {
        ragioneSociale: c.ragioneSociale ?? c.nome,
        partitaIva: c.partitaIva,
        codiceFiscale: c.codiceFiscale,
        indirizzo: c.indirizzo,
        cap: c.cap,
        citta: c.citta,
        provincia: c.provincia,
        codiceSdi: c.codiceSdi,
        pec: c.pec,
      },
    };
  }

  /** Salva, marca come confermati e riesporta l'anagrafica per Integra. */
  async salva(clienteId: number, dto: FatturazioneDto, ip?: string) {
    const errore = erroreCanaleSdi(dto.codiceSdi, dto.pec);
    if (errore) throw new BadRequestException(errore);
    const c = await this.prisma.customer.update({
      where: { id: clienteId },
      data: {
        ragioneSociale: dto.ragioneSociale.trim(),
        codiceFiscale: dto.codiceFiscale?.trim().toUpperCase() || null,
        indirizzo: dto.indirizzo.trim(),
        cap: dto.cap.trim(),
        citta: dto.citta.trim(),
        provincia: dto.provincia.trim().toUpperCase(),
        codiceSdi: dto.codiceSdi?.trim().toUpperCase() || null,
        pec: dto.pec?.trim().toLowerCase() || null,
        datiFatturazioneConfermatiIl: new Date(),
      },
    });
    const exp = await this.exportCliente.riesportaCliente(c);
    await this.audit.log({
      actorId: clienteId,
      actorType: 'customer',
      azione: 'cliente.fatturazione_confermata',
      entita: 'customers',
      entitaId: String(clienteId),
      dettagli: { riesportazione: exp.ok ? exp.file : exp.errore },
      ip,
    });
    return this.get(clienteId);
  }
}
