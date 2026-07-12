import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';

@Injectable()
export class CarrelloService {
  constructor(
    private prisma: PrismaService,
    private integrazione: IntegrazioneService,
  ) {}

  private async getOrCreate(clienteId: number) {
    let carrello = await this.prisma.carrello.findUnique({ where: { clienteId } });
    if (!carrello) {
      carrello = await this.prisma.carrello.create({ data: { clienteId } });
    }
    return carrello;
  }

  async getCart(clienteId: number) {
    const carrello = await this.getOrCreate(clienteId);
    const items = await this.prisma.cartItem.findMany({
      where: { carrelloId: carrello.id },
      orderBy: { createdAt: 'asc' },
    });
    const customer = await this.prisma.customer.findUnique({ where: { id: clienteId } });
    let codiceListino = customer?.codiceListino;
    if (!codiceListino) {
      const fallback = await this.integrazione.getFirstListino();
      codiceListino = fallback?.codice_listino ?? null;
    }
    const varianti = await Promise.all(
      items.map(async (item) => {
        const v = await this.prisma.variante.findUnique({
          where: { codice: item.varianteCodice },
          include: {
            articolo: {
              select: {
                nome: true,
                codiceLinea: true,
                immagini: { where: { inGalleria: true }, orderBy: [{ copertina: 'desc' }, { ordinamento: 'asc' }], take: 1 },
              },
            },
          },
        });
        return { item, variante: v };
      }),
    );
    const codiceLinee = [...new Set(varianti.map((v) => v.variante?.articolo.codiceLinea).filter(Boolean) as string[])];
    const raccolteMap = new Map<string, number>();
    if (codiceLinee.length > 0) {
      const articoli = await this.prisma.articolo.findMany({
        where: { codiceLinea: { in: codiceLinee } },
        select: { codiceLinea: true, raccolte: { include: { raccolta: { select: { sconto: true } } } } },
      });
      for (const a of articoli) {
        const maxSconto = Math.max(0, ...a.raccolte.map((ar) => ar.raccolta.sconto ?? 0));
        if (maxSconto > 0) raccolteMap.set(a.codiceLinea, maxSconto);
      }
    }
    const enriched = await Promise.all(
      varianti.map(async ({ item, variante }) => {
        const dims: string[] = [];
        if (variante?.dimensioni && typeof variante.dimensioni === 'object') {
          for (const [k, v] of Object.entries(variante.dimensioni as Record<string, any>)) {
            const prefix = k === 'diametro' ? 'Ø' : k === 'altezza' ? 'H' : '';
            dims.push(`${prefix}${v.valore}${(k === 'diametro' || k === 'altezza') ? ' cm' : ''}`);
          }
        }
        let prezzo: any = null;
        if (codiceListino) {
          const maxRaccSconto = variante?.articolo.codiceLinea ? raccolteMap.get(variante.articolo.codiceLinea) : undefined;
          prezzo = await this.integrazione.getPrezzo(codiceListino, item.varianteCodice, maxRaccSconto);
        }
        return {
          ...item,
          articoloNome: variante?.articolo.nome ?? null,
          articoloCodiceLinea: variante?.articolo.codiceLinea ?? null,
          varianteDescrizione: variante?.descrizione ?? null,
          dimensioni: dims.join(' · '),
          immagineUrl: variante?.articolo.immagini[0]?.url ?? null,
          multiplo: variante?.multiplo ?? 1,
          prezzo,
        };
      }),
    );
    return { id: carrello.id, items: enriched };
  }

  async addItem(clienteId: number, varianteCodice: string, quantita: number) {
    const v = await this.prisma.variante.findUnique({ where: { codice: varianteCodice }, select: { multiplo: true } });
    const multiplo = v?.multiplo ?? 1;
    if (quantita < multiplo) throw new BadRequestException(`Quantità minima: ${multiplo}`);
    const qty = Math.round(quantita / multiplo) * multiplo;
    const carrello = await this.getOrCreate(clienteId);
    return this.prisma.cartItem.upsert({
      where: { carrelloId_varianteCodice: { carrelloId: carrello.id, varianteCodice } },
      create: { carrelloId: carrello.id, varianteCodice, quantita: qty },
      update: { quantita: { increment: qty } },
    });
  }

  async updateQty(clienteId: number, varianteCodice: string, quantita: number) {
    const v = await this.prisma.variante.findUnique({ where: { codice: varianteCodice }, select: { multiplo: true } });
    const multiplo = v?.multiplo ?? 1;
    if (quantita < multiplo) throw new BadRequestException(`Quantità minima: ${multiplo}`);
    const qty = Math.round(quantita / multiplo) * multiplo;
    const carrello = await this.getOrCreate(clienteId);
    const item = await this.prisma.cartItem.findUnique({
      where: { carrelloId_varianteCodice: { carrelloId: carrello.id, varianteCodice } },
    });
    if (!item) throw new NotFoundException('Item non trovato nel carrello');
    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantita: qty },
    });
  }

  async removeItem(clienteId: number, varianteCodice: string) {
    const carrello = await this.getOrCreate(clienteId);
    const item = await this.prisma.cartItem.findUnique({
      where: { carrelloId_varianteCodice: { carrelloId: carrello.id, varianteCodice } },
    });
    if (!item) throw new NotFoundException('Item non trovato nel carrello');
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return { rimossi: true };
  }

  async toggleSaved(clienteId: number, varianteCodice: string) {
    const carrello = await this.getOrCreate(clienteId);
    const item = await this.prisma.cartItem.findUnique({
      where: { carrelloId_varianteCodice: { carrelloId: carrello.id, varianteCodice } },
    });
    if (!item) throw new NotFoundException('Item non trovato nel carrello');
    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { salvato: !item.salvato },
    });
  }

  async getCount(clienteId: number) {
    const carrello = await this.prisma.carrello.findUnique({ where: { clienteId } });
    if (!carrello) return 0;
    return this.prisma.cartItem.count({
      where: { carrelloId: carrello.id, salvato: false },
    });
  }
}
