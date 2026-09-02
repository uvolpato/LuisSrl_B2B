import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CarrelloService } from '../carrello/carrello.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';

@Injectable()
export class ProgettiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carrello: CarrelloService,
    private readonly integrazione: IntegrazioneService,
  ) {}

  /**
   * Arricchisce gli item con nome articolo, variante, dimensioni, immagine.
   * Se clienteId è fornito calcola anche il prezzo (listino cliente + sconto raccolta),
   * come nel carrello; nella vista pubblica i prezzi sono omessi.
   */
  private async enrich(items: { varianteCodice: string; quantita: number }[], clienteId?: number) {
    // Prezzi solo per il proprietario del progetto.
    let codiceListino: string | null = null;
    const raccolteMap = new Map<string, number>();
    if (clienteId) {
      codiceListino = await this.integrazione.codiceListinoCliente(clienteId);
    }

    return Promise.all(items.map(async (it) => {
      const v = await this.prisma.variante.findUnique({
        where: { codice: it.varianteCodice },
        include: {
          articolo: {
            select: {
              nome: true, codiceLinea: true,
              raccolte: { include: { raccolta: { select: { sconto: true } } } },
              immagini: { where: { inGalleria: true }, orderBy: [{ copertina: 'desc' }, { ordinamento: 'asc' }], take: 1 },
            },
          },
        },
      });
      const dims: string[] = [];
      if (v?.dimensioni && typeof v.dimensioni === 'object') {
        for (const [k, val] of Object.entries(v.dimensioni as Record<string, any>)) {
          const prefix = k === 'diametro' ? 'Ø' : k === 'altezza' ? 'H' : '';
          const unit = (k === 'diametro' || k === 'altezza') ? ' cm' : '';
          dims.push(`${prefix}${val?.valore ?? val}${unit}`);
        }
      }
      let prezzo: any = null;
      if (clienteId && codiceListino && v) {
        const maxSconto = Math.max(0, ...v.articolo.raccolte.map((ar) => ar.raccolta.sconto ?? 0));
        prezzo = await this.integrazione.getPrezzo(codiceListino, it.varianteCodice, maxSconto > 0 ? maxSconto : undefined);
      }
      return {
        varianteCodice: it.varianteCodice,
        quantita: it.quantita,
        articoloNome: v?.articolo.nome ?? null,
        articoloCodiceLinea: v?.articolo.codiceLinea ?? null,
        varianteDescrizione: v?.descrizione ?? null,
        dimensioni: dims.join(' · '),
        immagineUrl: v?.articolo.immagini[0]?.url ?? null,
        multiplo: v?.multiplo ?? 1,
        prezzo,
      };
    }));
  }

  private async own(clienteId: number, id: number) {
    const p = await this.prisma.progetto.findUnique({ where: { id } });
    if (!p || p.clienteId !== clienteId) throw new NotFoundException('progetti.non_trovato');
    return p;
  }

  async list(clienteId: number) {
    const progetti = await this.prisma.progetto.findMany({
      where: { clienteId },
      orderBy: { updatedAt: 'desc' },
      include: { items: { select: { varianteCodice: true, quantita: true } } },
    });
    // ponytail: calcola il totale per progetto arricchendo gli item; ok per pochi
    // progetti. Se un cliente ne avesse a decine, muovere il calcolo in una query aggregata.
    return Promise.all(progetti.map(async (p) => {
      const enriched = await this.enrich(p.items, clienteId);
      const totale = enriched.reduce((s, i) => s + i.quantita * (i.prezzo?.prezzoNetto ?? 0), 0);
      return {
        id: p.id, nome: p.nome, note: p.note, shareToken: p.shareToken,
        count: p.items.length, totale, updatedAt: p.updatedAt,
      };
    }));
  }

  async get(clienteId: number, id: number) {
    const p = await this.own(clienteId, id);
    const items = await this.prisma.progettoItem.findMany({ where: { progettoId: id }, orderBy: { createdAt: 'asc' } });
    return { id: p.id, nome: p.nome, note: p.note, shareToken: p.shareToken, items: await this.enrich(items, clienteId) };
  }

  async create(clienteId: number, nome: string, note?: string) {
    const n = (nome || '').trim();
    if (!n) throw new BadRequestException('progetti.nome_richiesto');
    const p = await this.prisma.progetto.create({
      data: { clienteId, nome: n, note: note?.trim() || null, shareToken: randomUUID().replace(/-/g, '') },
    });
    return { id: p.id, nome: p.nome, note: p.note, shareToken: p.shareToken, count: 0, updatedAt: p.updatedAt };
  }

  async update(clienteId: number, id: number, data: { nome?: string; note?: string }) {
    await this.own(clienteId, id);
    const patch: { nome?: string; note?: string | null } = {};
    if (data.nome !== undefined) {
      const n = data.nome.trim();
      if (!n) throw new BadRequestException('progetti.nome_richiesto');
      patch.nome = n;
    }
    if (data.note !== undefined) patch.note = data.note.trim() || null;
    const p = await this.prisma.progetto.update({ where: { id }, data: patch });
    return { id: p.id, nome: p.nome, note: p.note, shareToken: p.shareToken };
  }

  async remove(clienteId: number, id: number) {
    await this.own(clienteId, id);
    await this.prisma.progetto.delete({ where: { id } });
    return { rimosso: true };
  }

  async addItem(clienteId: number, id: number, varianteCodice: string, quantita: number) {
    await this.own(clienteId, id);
    const v = await this.prisma.variante.findUnique({ where: { codice: varianteCodice }, select: { multiplo: true } });
    if (!v) throw new NotFoundException('progetti.variante_non_trovata');
    const multiplo = v.multiplo ?? 1;
    const qty = Math.max(multiplo, Math.round(quantita / multiplo) * multiplo);
    await this.prisma.progettoItem.upsert({
      where: { progettoId_varianteCodice: { progettoId: id, varianteCodice } },
      create: { progettoId: id, varianteCodice, quantita: qty },
      update: { quantita: { increment: qty } },
    });
    await this.prisma.progetto.update({ where: { id }, data: { updatedAt: new Date() } });
    return { ok: true };
  }

  async updateItem(clienteId: number, id: number, varianteCodice: string, quantita: number) {
    await this.own(clienteId, id);
    const v = await this.prisma.variante.findUnique({ where: { codice: varianteCodice }, select: { multiplo: true } });
    const multiplo = v?.multiplo ?? 1;
    const qty = Math.max(multiplo, Math.round(quantita / multiplo) * multiplo);
    await this.prisma.progettoItem.update({
      where: { progettoId_varianteCodice: { progettoId: id, varianteCodice } },
      data: { quantita: qty },
    });
    return { ok: true };
  }

  async removeItem(clienteId: number, id: number, varianteCodice: string) {
    await this.own(clienteId, id);
    await this.prisma.progettoItem.deleteMany({ where: { progettoId: id, varianteCodice } });
    return { rimosso: true };
  }

  /** Riversa gli item del progetto nel carrello (somma, non svuota il progetto). */
  async addToCart(clienteId: number, id: number) {
    await this.own(clienteId, id);
    const items = await this.prisma.progettoItem.findMany({ where: { progettoId: id } });
    let aggiunti = 0;
    for (const it of items) {
      try { await this.carrello.addItem(clienteId, it.varianteCodice, it.quantita); aggiunti++; }
      catch { /* variante non più disponibile: salta */ }
    }
    return { aggiunti, totali: items.length };
  }

  /** Vista pubblica in sola lettura via token (nessun dato del cliente). */
  async getPublic(token: string) {
    const p = await this.prisma.progetto.findUnique({ where: { shareToken: token } });
    if (!p) throw new NotFoundException('progetti.non_trovato');
    const items = await this.prisma.progettoItem.findMany({ where: { progettoId: p.id }, orderBy: { createdAt: 'asc' } });
    return { nome: p.nome, note: p.note, items: await this.enrich(items) };
  }
}
