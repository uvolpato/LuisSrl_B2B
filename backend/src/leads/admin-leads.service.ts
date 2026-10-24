import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  FILTRI_STATO,
  GIORNI_ALLARME,
  ORDINAMENTI,
  STATI_IN_ATTESA,
  VERDETTI,
  giorniAttesa,
} from './admin-leads';

const PAGINA = 10;
const GIORNO_MS = 24 * 3600 * 1000;

@Injectable()
export class AdminLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Elenco paginato (10) + KPI sull'intero archivio (non sul filtro). */
  async elenco(p: {
    stato?: string;
    verdetto?: string;
    q?: string;
    page?: number;
    sort?: string;
    dir?: string;
  }) {
    const statoKey =
      p.stato && p.stato in FILTRI_STATO ? p.stato : 'da-decidere';
    const stati = FILTRI_STATO[statoKey];
    const q = p.q?.trim().slice(0, 100);
    const where: Prisma.LeadWhereInput = {
      ...(stati ? { stato: { in: stati } } : {}),
      ...(p.verdetto && VERDETTI.includes(p.verdetto)
        ? { verdetto: p.verdetto }
        : {}),
      ...(q
        ? {
            OR: [
              { ragioneSociale: { contains: q, mode: 'insensitive' } },
              { partitaIva: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
              { referente: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const page = Math.max(1, p.page || 1);
    // Default: "Da decidere" le piu' vecchie in alto (attesa decrescente), altrimenti le piu' recenti.
    const ord = p.sort ? ORDINAMENTI[p.sort] : undefined;
    let verso: Prisma.SortOrder = statoKey === 'da-decidere' ? 'asc' : 'desc';
    if (ord) verso = (p.dir === 'desc') !== !!ord.inverti ? 'desc' : 'asc';
    const ordine: Prisma.LeadOrderByWithRelationInput = {
      [ord?.campo ?? 'createdAt']:
        ord?.campo === 'verdetto' ? { sort: verso, nulls: 'last' } : verso,
    };
    const [total, righe, kpi] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        orderBy: [ordine, { id: 'asc' }],
        skip: (page - 1) * PAGINA,
        take: PAGINA,
        select: {
          id: true,
          ragioneSociale: true,
          partitaIva: true,
          citta: true,
          tipoAttivita: true,
          createdAt: true,
          verdetto: true,
          stato: true,
          anonimizzatoIl: true,
        },
      }),
      this.kpi(),
    ]);
    const ora = new Date();
    return {
      items: righe.map((r) => ({
        ...r,
        anonimizzato: r.anonimizzatoIl != null,
        giorniAttesa: giorniAttesa(r.stato, r.createdAt, ora),
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAGINA)),
      kpi,
    };
  }

  async kpi() {
    const da30 = new Date(Date.now() - 30 * GIORNO_MS);
    const da6 = new Date(Date.now() - GIORNI_ALLARME * GIORNO_MS);
    const [daDecidere, inVerifica, approvate30, scartate30, ferme] =
      await Promise.all([
        this.prisma.lead.count({ where: { stato: { in: STATI_IN_ATTESA } } }),
        this.prisma.lead.count({ where: { stato: 'IN_VALUTAZIONE' } }),
        this.prisma.lead.count({
          where: { stato: 'APPROVATO', decisioneIl: { gte: da30 } },
        }),
        this.prisma.lead.count({
          where: { stato: 'SCARTATO', decisioneIl: { gte: da30 } },
        }),
        this.prisma.lead.count({
          where: { stato: { in: STATI_IN_ATTESA }, createdAt: { lt: da6 } },
        }),
      ]);
    return { daDecidere, inVerifica, approvate30, scartate30, ferme };
  }

  /** Dettaglio con report, eventi e cliente collegato. */
  async dettaglio(id: number) {
    const l = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        eventi: { orderBy: { createdAt: 'asc' } },
        cliente: {
          select: {
            id: true,
            codiceCliente: true,
            datiFatturazioneConfermatiIl: true,
          },
        },
      },
    });
    if (!l) throw new NotFoundException('leads.non_trovata');
    return {
      ...l,
      anonimizzato: l.anonimizzatoIl != null,
      giorniAttesa: giorniAttesa(l.stato, l.createdAt),
      eventi: l.eventi.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        createdAt: e.createdAt,
        dettagli: e.dettagli,
      })),
    };
  }

  /** Eliminazione definitiva (eventi in cascade, cliente scollegato con SetNull). */
  async elimina(id: number) {
    const esiste = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!esiste) throw new NotFoundException('leads.non_trovata');
    await this.prisma.lead.delete({ where: { id } });
  }
}
