import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';

export interface DatiCheckout {
  cliente: {
    id: number;
    ragioneSociale: string | null;
    codicePagamento: string | null;
    codicePorto: string | null;
    codiceSpedizione: string | null;
    codiceVettore: string | null;
  };
  indirizzi: Array<{
    id: number;
    ragioneSociale: string | null;
    indirizzo: string | null;
    cap: string | null;
    citta: string | null;
    provincia: string | null;
    flagSpedizione: boolean;
    codicePorto: string | null;
    codiceVettore: string | null;
  }>;
  pagamenti: Array<{ codice: string; descrizione: string }>;
  porti: Array<{ codice: string; descrizione: string }>;
  spedizioni: Array<{ codice: string; descrizione: string }>;
  vettori: Array<{ codice: string; descrizione: string }>;
  descrizioni: {
    pagamento: string | null;
    porto: string | null;
    spedizione: string | null;
    vettore: string | null;
  };
}

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private integrazione: IntegrazioneService,
  ) {}

  async getDatiCheckout(clienteId: number): Promise<DatiCheckout> {
    const customer = await this.prisma.customer.findUnique({ where: { id: clienteId } });
    if (!customer) throw new NotFoundException('Cliente non trovato');

    const indirizzi = await this.prisma.indirizzoCliente.findMany({
      where: { customerId: clienteId },
      orderBy: [{ flagSpedizione: 'desc' }, { id: 'asc' } ],
    });

    const [pagamenti, porti, spedizioni, vettori] = await Promise.all([
      this.prisma.modalitaPagamento.findMany({ where: { obsoleto: false }, orderBy: { codice: 'asc' } }),
      this.prisma.modalitaPorto.findMany({ where: { obsoleto: false }, orderBy: { codice: 'asc' } }),
      this.prisma.modalitaSpedizione.findMany({ where: { obsoleto: false }, orderBy: { codice: 'asc' } }),
      this.prisma.vettore.findMany({ where: { obsoleto: false }, orderBy: { codice: 'asc' } }),
    ]);

    const descrizioni = {
      pagamento: (await this.prisma.modalitaPagamento.findUnique({ where: { codice: customer.codicePagamento ?? '' } }))?.descrizione ?? null,
      porto: (await this.prisma.modalitaPorto.findUnique({ where: { codice: customer.codicePorto ?? '' } }))?.descrizione ?? null,
      spedizione: (await this.prisma.modalitaSpedizione.findUnique({ where: { codice: customer.codiceSpedizione ?? '' } }))?.descrizione ?? null,
      vettore: (await this.prisma.vettore.findUnique({ where: { codice: customer.codiceVettore ?? '' } }))?.descrizione ?? null,
    };

    return {
      cliente: {
        id: customer.id,
        ragioneSociale: customer.ragioneSociale,
        codicePagamento: customer.codicePagamento,
        codicePorto: customer.codicePorto,
        codiceSpedizione: customer.codiceSpedizione,
        codiceVettore: customer.codiceVettore,
      },
      indirizzi: indirizzi.map((i) => ({
        id: i.id,
        ragioneSociale: i.ragioneSociale,
        indirizzo: i.indirizzo,
        cap: i.cap,
        citta: i.citta,
        provincia: i.provincia,
        flagSpedizione: i.flagSpedizione,
        codicePorto: i.codicePorto,
        codiceVettore: i.codiceVettore,
      })),
      pagamenti: pagamenti.map((p) => ({ codice: p.codice, descrizione: p.descrizione })),
      porti: porti.map((p) => ({ codice: p.codice, descrizione: p.descrizione })),
      spedizioni: spedizioni.map((s) => ({ codice: s.codice, descrizione: s.descrizione })),
      vettori: vettori.map((v) => ({ codice: v.codice, descrizione: v.descrizione })),
      descrizioni,
    };
  }

  async confermaOrdine(
    clienteId: number,
    dto: {
      indirizzoSpedizioneId?: number;
      codicePorto?: string;
      codiceSpedizione?: string;
      codiceVettore?: string;
      codicePagamento?: string;
      notaSpedizione?: string;
      notaOrdine?: string;
    },
  ) {
    const carrello = await this.prisma.carrello.findUnique({ where: { clienteId } });
    if (!carrello) throw new BadRequestException('Carrello vuoto');
    const items = await this.prisma.cartItem.findMany({
      where: { carrelloId: carrello.id, salvato: false },
    });
    if (items.length === 0) throw new BadRequestException('Nessun articolo nel carrello');

    const customer = await this.prisma.customer.findUnique({ where: { id: clienteId } });
    let codiceListino = customer?.codiceListino;
    if (!codiceListino) {
      const fallback = await this.integrazione.getFirstListino();
      codiceListino = fallback?.codice_listino ?? null;
    }

    // Calcola importo totale usando i prezzi reali
    let importoTotale = 0;
    const righe = [];
    for (const item of items) {
      let prezzo = null;
      if (codiceListino) {
        const maxRaccSconto = await this.getMaxRaccSconto(item.varianteCodice);
        prezzo = await this.integrazione.getPrezzo(codiceListino, item.varianteCodice, maxRaccSconto);
      }
      const netto = prezzo?.prezzoNetto ?? 0;
      importoTotale += netto * item.quantita;
      righe.push({
        codiceProdotto: item.varianteCodice,
        descrizione: item.varianteCodice,
        quantita: item.quantita,
        prezzo: netto,
      });
    }

    const numeroOrdine = `B2B-${Date.now()}`;
    const ordine = await this.prisma.ordineCliente.create({
      data: {
        numeroOrdine,
        dataOrdine: new Date(),
        customerId: clienteId,
        importoTotale,
        stato: 'BOZZA',
        indirizzoSpedizioneId: dto.indirizzoSpedizioneId ?? null,
        codicePorto: dto.codicePorto ?? customer?.codicePorto ?? null,
        codiceSpedizione: dto.codiceSpedizione ?? customer?.codiceSpedizione ?? null,
        codiceVettore: dto.codiceVettore ?? customer?.codiceVettore ?? null,
        codicePagamento: dto.codicePagamento ?? customer?.codicePagamento ?? null,
        notaSpedizione: dto.notaSpedizione ?? null,
        notaOrdine: dto.notaOrdine ?? null,
        righe: {
          create: righe,
        },
      },
      include: { righe: true },
    });

    // Svuota il carrello
    await this.prisma.cartItem.deleteMany({ where: { carrelloId: carrello.id } });

    return ordine;
  }

  private async getMaxRaccSconto(codiceVariante: string): Promise<number | undefined> {
    const variante = await this.prisma.variante.findUnique({
      where: { codice: codiceVariante },
      select: { articoloId: true },
    });
    if (!variante) return undefined;
    const articolo = await this.prisma.articolo.findUnique({
      where: { id: variante.articoloId },
      select: { raccolte: { include: { raccolta: { select: { sconto: true } } } } },
    });
    if (!articolo) return undefined;
    const max = Math.max(0, ...articolo.raccolte.map((ar) => ar.raccolta.sconto ?? 0));
    return max > 0 ? max : undefined;
  }
}
