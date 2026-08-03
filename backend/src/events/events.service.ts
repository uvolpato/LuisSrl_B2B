import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { reqCtx } from '../common/request-context';

/**
 * Tracciamento eventi comportamentali dei clienti. Fire-and-forget: non deve mai
 * rompere il flusso. Attribuzione automatica dal reqCtx (solo attori 'customer').
 */
@Injectable()
export class EventsService {
  private readonly log = new Logger(EventsService.name);
  private readonly retentionMonths = parseInt(process.env.EVENTS_RETENTION_MONTHS || '18', 10);

  constructor(private readonly prisma: PrismaService) {}

  /** Logga un evento del cliente corrente (dal reqCtx). Ignora admin/sistema. */
  async track(tipo: string, opts?: { entita?: string; entitaId?: string; dettagli?: unknown }) {
    const store = reqCtx.getStore();
    if (store?.actorType !== 'customer' || store.actorId == null) return;
    await this.write(store.actorId, tipo, opts, store.ip);
  }

  /** Logga un evento per un cliente esplicito (es. login, quando la sessione non c'è ancora). */
  async trackFor(customerId: number, tipo: string, opts?: { entita?: string; entitaId?: string; dettagli?: unknown }, ip?: string) {
    await this.write(customerId, tipo, opts, ip);
  }

  private async write(customerId: number, tipo: string, opts: { entita?: string; entitaId?: string; dettagli?: unknown } | undefined, ip?: string) {
    try {
      await this.prisma.customerEvent.create({
        data: {
          customerId, tipo,
          entita: opts?.entita ?? null,
          entitaId: opts?.entitaId ?? null,
          dettagli: (opts?.dettagli ?? undefined) as never,
          ip: ip ?? null,
        },
      });
    } catch (e) {
      this.log.warn(`track fallito (${tipo}): ${(e as Error).message}`);
    }
  }

  /** Retention: elimina gli eventi oltre la finestra (default 18 mesi). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOld() {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - this.retentionMonths);
    try {
      const { count } = await this.prisma.customerEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
      if (count) this.log.log(`Retention: eliminati ${count} eventi oltre ${this.retentionMonths} mesi`);
    } catch (e) {
      this.log.warn(`Retention fallita: ${(e as Error).message}`);
    }
  }

  /** Tipi consentiti dagli eventi lato browser (anti-abuso). */
  private static readonly CLIENT_TIPI = new Set(['page.view', 'page.leave', 'scroll.depth', 'articolo.dwell']);

  /** Batch di eventi dal browser (beacon). Filtra i tipi ammessi, cap 50. */
  async trackBatch(events: { tipo: string; entita?: string; entitaId?: string; dettagli?: unknown }[]) {
    const store = reqCtx.getStore();
    if (store?.actorType !== 'customer' || store.actorId == null) return { ok: false };
    let n = 0;
    for (const e of (events || []).slice(0, 50)) {
      if (!EventsService.CLIENT_TIPI.has(e.tipo)) continue;
      await this.write(store.actorId, e.tipo, { entita: e.entita, entitaId: e.entitaId, dettagli: e.dettagli }, store.ip);
      n++;
    }
    return { ok: true, salvati: n };
  }

  /** Metriche comportamentali aggregate del cliente (funnel, tempo, abbandoni). */
  async comportamento(customerId: number, days = 90) {
    const from = new Date(Date.now() - days * 24 * 3600 * 1000);
    const events = await this.prisma.customerEvent.findMany({ where: { customerId, createdAt: { gte: from } }, orderBy: { createdAt: 'asc' } });
    const dett = (e: (typeof events)[number]) => (e.dettagli ?? {}) as Record<string, unknown>;

    const viste = new Map<string, { nome: string; n: number }>();
    for (const e of events.filter((e) => e.tipo === 'articolo.view')) {
      const id = e.entitaId ?? '';
      const cur = viste.get(id) ?? { nome: String(dett(e).nome ?? id), n: 0 };
      cur.n++; viste.set(id, cur);
    }
    const ordinati = new Set(events.filter((e) => e.tipo === 'ordine.create').flatMap((e) => (dett(e).articoli as string[]) ?? []));
    const aggiuntiCarrello = new Set(events.filter((e) => e.tipo === 'carrello.add').map((e) => e.entitaId).filter(Boolean) as string[]);
    const nOrdini = events.filter((e) => e.tipo === 'ordine.create').length;

    const tempi = events.filter((e) => e.tipo === 'page.leave').map((e) => Number(dett(e).sec ?? 0)).filter((s) => s > 0);
    const tempoMedioPagina = tempi.length ? Math.round(tempi.reduce((s, n) => s + n, 0) / tempi.length) : 0;

    const nViste = viste.size;
    const nCarrello = aggiuntiCarrello.size;
    // Articoli visti più volte ma mai messi nel carrello → interesse non convertito.
    const vistiMaiInCarrello = [...viste.entries()]
      .filter(([id]) => !aggiuntiCarrello.has(id))
      .map(([id, v]) => ({ entitaId: id, nome: v.nome, viste: v.n }))
      .sort((a, b) => b.viste - a.viste)
      .slice(0, 8);

    return {
      periodoGiorni: days,
      totali: { eventi: events.length, pagine: events.filter((e) => e.tipo === 'page.view').length, tempoMedioPagina },
      funnel: {
        articoliVisti: nViste,
        aggiuntiCarrello: nCarrello,
        ordini: nOrdini,
        vistoAdd: nViste ? Math.round((nCarrello / nViste) * 100) : 0,
        addOrdine: nCarrello ? Math.round((nOrdini / nCarrello) * 100) : 0,
      },
      vistiMaiInCarrello,
    };
  }

  /** Timeline eventi di un cliente (per l'admin). */
  async timeline(customerId: number, limit = 200) {
    return this.prisma.customerEvent.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 1000),
    });
  }
}
