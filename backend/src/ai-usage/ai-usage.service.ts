import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { reqCtx } from '../common/request-context';

/**
 * Prezzi di default (EUR): token in/out per 1M, immagine per pezzo.
 * Tarabili senza ricompilare via site_config: AI_Prezzo_<modello>_input/_output/_immagine.
 * NB: sono stime — la fattura reale Google può differire (free tier, arrotondamenti, cambi listino).
 */
const DEFAULT_PRICES: Record<string, { in: number; out: number; img: number }> = {
  'gemini-2.5-flash': { in: 0.30, out: 2.50, img: 0 },
  'gemini-2.5-flash-image': { in: 0.30, out: 2.50, img: 0.039 },
  'gemini-embedding-001': { in: 0.15, out: 0, img: 0 },
};
const FALLBACK = { in: 0.30, out: 2.50, img: 0.04 };

@Injectable()
export class AiUsageService {
  constructor(private readonly prisma: PrismaService) {}
  private cache: { ts: number; over: Record<string, string> } | null = null;

  private async prices(model: string) {
    if (!this.cache || Date.now() - this.cache.ts > 300_000) {
      const rows = await this.prisma.siteConfig.findMany({ where: { key: { startsWith: 'AI_Prezzo_' } } });
      this.cache = { ts: Date.now(), over: Object.fromEntries(rows.map((r) => [r.key, r.value])) };
    }
    const d = DEFAULT_PRICES[model] ?? FALLBACK;
    const num = (k: string, def: number) => {
      const v = this.cache!.over[k];
      const n = v != null ? parseFloat(v) : NaN;
      return isNaN(n) ? def : n;
    };
    return {
      in: num(`AI_Prezzo_${model}_input`, d.in),
      out: num(`AI_Prezzo_${model}_output`, d.out),
      img: num(`AI_Prezzo_${model}_immagine`, d.img),
    };
  }

  /** Registra una chiamata AI. Fire-and-forget: non deve mai rompere il flusso. */
  async record(p: { tipo: string; modello: string; tokenIn?: number; tokenOut?: number; immagini?: number }) {
    try {
      const store = reqCtx.getStore();
      const pr = await this.prices(p.modello);
      const tin = p.tokenIn ?? 0, tout = p.tokenOut ?? 0, img = p.immagini ?? 0;
      const costo = (tin / 1e6) * pr.in + (tout / 1e6) * pr.out + img * pr.img;
      await this.prisma.aiUsage.create({
        data: {
          attoreTipo: store?.actorType ?? 'system',
          attoreId: store?.actorId ?? null,
          tipo: p.tipo, modello: p.modello,
          tokenIn: tin, tokenOut: tout, immagini: img, costoStimato: costo,
        },
      });
    } catch { /* mai rompere il flusso */ }
  }

  /** Aggregati per la dashboard costi: totali, per tipo, per modello, per attore, serie giornaliera. */
  async summary(days = 30) {
    const from = new Date(Date.now() - days * 24 * 3600 * 1000);
    const where = { createdAt: { gte: from } };

    const [tot, byTipo, byModello, byAttore, serie] = await Promise.all([
      this.prisma.aiUsage.aggregate({ where, _count: true, _sum: { costoStimato: true, tokenIn: true, tokenOut: true, immagini: true } }),
      this.prisma.aiUsage.groupBy({ by: ['tipo'], where, _count: true, _sum: { costoStimato: true } }),
      this.prisma.aiUsage.groupBy({ by: ['modello'], where, _count: true, _sum: { costoStimato: true } }),
      this.prisma.aiUsage.groupBy({ by: ['attoreTipo', 'attoreId'], where, _count: true, _sum: { costoStimato: true } }),
      this.prisma.$queryRawUnsafe<{ giorno: string; costo: number; chiamate: bigint }[]>(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS giorno,
                sum(costo_stimato) AS costo, count(*)::bigint AS chiamate
           FROM ai_usage WHERE created_at >= $1
          GROUP BY 1 ORDER BY 1`, from,
      ),
    ]);

    // Risolvi i nomi degli attori (admin -> users, customer -> customers).
    const adminIds = byAttore.filter((a) => a.attoreTipo === 'admin' && a.attoreId != null).map((a) => a.attoreId!);
    const custIds = byAttore.filter((a) => a.attoreTipo === 'customer' && a.attoreId != null).map((a) => a.attoreId!);
    const empty: { id: number; nome: string }[] = [];
    const [admins, customers] = await Promise.all([
      adminIds.length ? this.prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, nome: true } }) : Promise.resolve(empty),
      custIds.length ? this.prisma.customer.findMany({ where: { id: { in: custIds } }, select: { id: true, nome: true } }) : Promise.resolve(empty),
    ]);
    const nameOf = (tipo: string, id: number | null) => {
      if (id == null) return tipo === 'system' ? 'Sistema' : 'Sconosciuto';
      if (tipo === 'admin') return admins.find((u) => u.id === id)?.nome ?? `Admin #${id}`;
      if (tipo === 'customer') return customers.find((c) => c.id === id)?.nome ?? `Cliente #${id}`;
      return `${tipo} #${id}`;
    };

    return {
      periodoGiorni: days,
      totale: {
        chiamate: tot._count,
        costo: tot._sum.costoStimato ?? 0,
        tokenIn: tot._sum.tokenIn ?? 0,
        tokenOut: tot._sum.tokenOut ?? 0,
        immagini: tot._sum.immagini ?? 0,
      },
      perTipo: byTipo.map((t) => ({ tipo: t.tipo, chiamate: t._count, costo: t._sum.costoStimato ?? 0 })).sort((a, b) => b.costo - a.costo),
      perModello: byModello.map((m) => ({ modello: m.modello, chiamate: m._count, costo: m._sum.costoStimato ?? 0 })).sort((a, b) => b.costo - a.costo),
      perAttore: byAttore.map((a) => ({
        attoreTipo: a.attoreTipo, attoreId: a.attoreId, nome: nameOf(a.attoreTipo, a.attoreId),
        chiamate: a._count, costo: a._sum.costoStimato ?? 0,
      })).sort((a, b) => b.costo - a.costo),
      serie: serie.map((s) => ({ giorno: s.giorno, costo: Number(s.costo), chiamate: Number(s.chiamate) })),
    };
  }
}
