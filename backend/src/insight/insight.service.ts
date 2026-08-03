import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';
import { EmbeddingService } from '../integrazione/embedding.service';

const PERIODO = 'globale';

@Injectable()
export class InsightService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrazione: IntegrazioneService,
    private readonly embedding: EmbeddingService,
  ) {}

  /** Digest compatto degli eventi del cliente + metriche. */
  private async digest(customerId: number, days = 120) {
    const from = new Date(Date.now() - days * 24 * 3600 * 1000);
    const events = await this.prisma.customerEvent.findMany({
      where: { customerId, createdAt: { gte: from } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const d = (e: (typeof events)[number]) => (e.dettagli ?? {}) as Record<string, unknown>;
    const ricerche = events.filter((e) => e.tipo === 'ricerca').map((e) => String(d(e).q ?? d(e).tipo ?? '')).filter(Boolean);
    const viste = new Map<string, number>();
    for (const e of events.filter((e) => e.tipo === 'articolo.view')) {
      const k = String(d(e).nome ?? e.entitaId ?? '');
      if (k) viste.set(k, (viste.get(k) ?? 0) + 1);
    }
    const carrello = events.filter((e) => e.tipo === 'carrello.add').map((e) => e.entitaId).filter(Boolean) as string[];
    const ordini = events.filter((e) => e.tipo === 'ordine.create').length;
    const topViste = [...viste.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    const metriche = { eventi: events.length, ricerche: ricerche.length, viste: [...viste.values()].reduce((s, n) => s + n, 0), articoliDistinti: viste.size, aggiuntiCarrello: carrello.length, ordini };
    const testo = [
      `Eventi ultimi ${days} giorni: ${events.length}.`,
      ricerche.length ? `Ricerche: ${[...new Set(ricerche)].slice(0, 12).join('; ')}.` : '',
      topViste.length ? `Articoli più visti: ${topViste.map(([n, c]) => `${n} (${c})`).join('; ')}.` : '',
      carrello.length ? `Aggiunti al carrello: ${[...new Set(carrello)].slice(0, 12).join(', ')}.` : '',
      `Ordini creati: ${ordini}.`,
    ].filter(Boolean).join('\n');
    return { testo, metriche };
  }

  /** Genera (o rigenera) la sintesi AI del cliente: profilo + prossima azione. */
  async generate(customerId: number) {
    const { testo: digest, metriche } = await this.digest(customerId);
    const prompt = `Sei un analista commerciale B2B per un'azienda di vasi e complementi.
Dato il comportamento del cliente qui sotto, scrivi in italiano, max ~120 parole:
1) un breve PROFILO (interessi, categorie/attributi ricorrenti, stagionalità o segnali di abbandono);
2) una riga "Prossima azione consigliata:" per l'agente (up-sell, riattivazione, ecc.).
Sii concreto, niente frasi vuote. Se i dati sono pochi, dillo.

Comportamento:
${digest || '(nessun evento registrato)'}`;

    let sintesi = digest ? await this.integrazione.generaSintesiAI(prompt) : 'Dati insufficienti: il cliente non ha ancora attività registrata.';
    sintesi = (sintesi || '').trim();
    const vec = await this.embedding.embedText(sintesi);

    const insight = await this.prisma.customerInsight.upsert({
      where: { customerId_periodo: { customerId, periodo: PERIODO } },
      create: { customerId, periodo: PERIODO, testo: sintesi, metriche: metriche as never, embedding: (vec ?? undefined) as never },
      update: { testo: sintesi, metriche: metriche as never, embedding: (vec ?? undefined) as never, generatoIl: new Date() },
    });
    return { testo: insight.testo, metriche, generatoIl: insight.generatoIl };
  }

  /** Ultima sintesi salvata (senza rigenerare). */
  async latest(customerId: number) {
    const i = await this.prisma.customerInsight.findUnique({ where: { customerId_periodo: { customerId, periodo: PERIODO } } });
    if (!i) return null;
    return { testo: i.testo, metriche: i.metriche, generatoIl: i.generatoIl };
  }

  /** Clienti che si comportano in modo simile (coseno sugli embedding delle sintesi). */
  async simili(customerId: number, k = 5) {
    const rows = await this.prisma.customerInsight.findMany({
      where: { periodo: PERIODO },
      select: { customerId: true, embedding: true },
    });
    const target = rows.find((r) => r.customerId === customerId)?.embedding as number[] | null | undefined;
    if (!target?.length) return [];
    const scored = rows
      .filter((r) => r.customerId !== customerId && Array.isArray(r.embedding) && (r.embedding as number[]).length)
      .map((r) => ({ customerId: r.customerId, score: EmbeddingService.cosine(target, r.embedding as number[]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    if (!scored.length) return [];
    const clienti = await this.prisma.customer.findMany({ where: { id: { in: scored.map((s) => s.customerId) } }, select: { id: true, nome: true, ragioneSociale: true } });
    return scored.map((s) => ({ ...s, nome: clienti.find((c) => c.id === s.customerId)?.ragioneSociale || clienti.find((c) => c.id === s.customerId)?.nome || `#${s.customerId}` }));
  }
}
