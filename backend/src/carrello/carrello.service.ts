import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CarrelloService {
  constructor(private prisma: PrismaService) {}

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
    const enriched = await Promise.all(
      items.map(async (item) => {
        const variante = await this.prisma.variante.findUnique({
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
        const dims: string[] = [];
        if (variante?.dimensioni && typeof variante.dimensioni === 'object') {
          for (const [k, v] of Object.entries(variante.dimensioni as Record<string, any>)) {
            const prefix = k === 'diametro' ? 'Ø' : k === 'altezza' ? 'H' : '';
            dims.push(`${prefix}${v.valore}${(k === 'diametro' || k === 'altezza') ? ' cm' : ''}`);
          }
        }
        return {
          ...item,
          articoloNome: variante?.articolo.nome ?? null,
          articoloCodiceLinea: variante?.articolo.codiceLinea ?? null,
          varianteDescrizione: variante?.descrizione ?? null,
          dimensioni: dims.join(' · '),
          immagineUrl: variante?.articolo.immagini[0]?.url ?? null,
          multiplo: variante?.multiplo ?? 1,
        };
      }),
    );
    return { id: carrello.id, items: enriched };
  }

  async addItem(clienteId: number, varianteCodice: string, quantita: number) {
    if (quantita < 1) throw new BadRequestException('Quantità minima: 1');
    const carrello = await this.getOrCreate(clienteId);
    return this.prisma.cartItem.upsert({
      where: { carrelloId_varianteCodice: { carrelloId: carrello.id, varianteCodice } },
      create: { carrelloId: carrello.id, varianteCodice, quantita },
      update: { quantita: { increment: quantita } },
    });
  }

  async updateQty(clienteId: number, varianteCodice: string, quantita: number) {
    if (quantita < 1) throw new BadRequestException('Quantità minima: 1');
    const carrello = await this.getOrCreate(clienteId);
    const item = await this.prisma.cartItem.findUnique({
      where: { carrelloId_varianteCodice: { carrelloId: carrello.id, varianteCodice } },
    });
    if (!item) throw new NotFoundException('Item non trovato nel carrello');
    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantita },
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
