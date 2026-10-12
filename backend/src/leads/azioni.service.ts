import { Injectable } from '@nestjs/common';
import type { Lead } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AZIONI,
  TRANSIZIONI,
  TTL_MS,
  firma,
  segretoAzioni,
  verificaToken,
  type Azione,
} from './azioni';

export type EsitoAzione =
  | { tipo: 'conferma'; lead: Lead; azione: Azione }
  | { tipo: 'eseguita'; lead: Lead; azione: Azione }
  | { tipo: 'gia_fatta'; lead: Lead; azione: Azione }
  | { tipo: 'errore'; motivo: 'invalido' | 'scaduto' | 'inesistente' };

type Parametri = { l?: unknown; a?: unknown; e?: unknown; s?: unknown };

/** Pulsanti Approva/Verifica/Scarta della mail lead: link firmati, TTL 7 giorni, decisioni finali non ripetibili. */
@Injectable()
export class AzioniLeadService {
  constructor(private readonly prisma: PrismaService) {}

  /** URL dei tre pulsanti. Passano dal dominio del portale (APP_DOMAIN), che proxa /api al backend. */
  link(leadId: number): Record<Azione, string> {
    const base = (process.env.APP_DOMAIN ?? 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    const scadenza = Date.now() + TTL_MS;
    const segreto = segretoAzioni();
    return Object.fromEntries(
      AZIONI.map((a) => {
        const q = new URLSearchParams({
          l: String(leadId),
          a,
          e: String(scadenza),
          s: firma(leadId, a, scadenza, segreto),
        });
        return [a, `${base}/api/leads/azione?${q}`];
      }),
    ) as Record<Azione, string>;
  }

  /** GET: solo lettura, mostra cosa si sta per fare (i client mail aprono i link da soli). */
  async anteprima(p: Parametri): Promise<EsitoAzione> {
    const t = verificaToken(p, segretoAzioni());
    if (!t.ok) return { tipo: 'errore', motivo: t.motivo };
    const lead = await this.prisma.lead.findUnique({ where: { id: t.leadId } });
    if (!lead) return { tipo: 'errore', motivo: 'inesistente' };
    const ammessa = TRANSIZIONI[t.azione].da.includes(lead.stato);
    return { tipo: ammessa ? 'conferma' : 'gia_fatta', lead, azione: t.azione };
  }

  /** POST: esegue la transizione in modo atomico (doppio click o link riusato → gia_fatta). */
  async esegui(
    p: Parametri,
    ip: string | null,
    userAgent: string | null,
  ): Promise<EsitoAzione> {
    const t = verificaToken(p, segretoAzioni());
    if (!t.ok) return { tipo: 'errore', motivo: t.motivo };
    const { da, a } = TRANSIZIONI[t.azione];
    const finale = t.azione !== 'verifica';
    const res = await this.prisma.lead.updateMany({
      where: { id: t.leadId, stato: { in: da } },
      data: { stato: a, ...(finale ? { decisioneIl: new Date() } : {}) },
    });
    const lead = await this.prisma.lead.findUnique({ where: { id: t.leadId } });
    if (!lead) return { tipo: 'errore', motivo: 'inesistente' };
    if (res.count === 0) return { tipo: 'gia_fatta', lead, azione: t.azione };
    await this.prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        tipo: `azione_${t.azione}`,
        dettagli: { ip, userAgent: userAgent?.slice(0, 300) ?? null },
      },
    });
    return { tipo: 'eseguita', lead, azione: t.azione };
  }
}
