import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';

export type ModalitaConsegna = 'RITIRO' | 'SPEDIZIONE' | 'MEZZI_PROPRI';

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
    codiceDestinazione: string | null;
    ragioneSociale: string | null;
    indirizzo: string | null;
    cap: string | null;
    citta: string | null;
    provincia: string | null;
    flagSpedizione: boolean;
    flagAbituale: boolean;
    tipoDestinazione: string | null;
    codicePorto: string | null;
    codiceVettore: string | null;
  }>;
  allowNewAddress: boolean;
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
      orderBy: [{ flagSpedizione: 'desc' }, { flagAbituale: 'desc' }, { id: 'asc' } ],
    });

    const allowNewAddress = (await this.getConfigFlag('checkout_allow_new_address')) === true;

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
        codiceDestinazione: i.codiceDestinazione,
        ragioneSociale: i.ragioneSociale,
        indirizzo: i.indirizzo,
        cap: i.cap,
        citta: i.citta,
        provincia: i.provincia,
        flagSpedizione: i.flagSpedizione,
        flagAbituale: i.flagAbituale,
        tipoDestinazione: i.tipoDestinazione,
        codicePorto: i.codicePorto,
        codiceVettore: i.codiceVettore,
      })),
      allowNewAddress,
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
      modalitaConsegna?: ModalitaConsegna;
      indirizzoSpedizioneId?: number;
      nuovoIndirizzo?: {
        ragioneSociale?: string;
        indirizzo: string;
        cap: string;
        citta: string;
        provincia?: string;
        codicePorto?: string;
        codiceVettore?: string;
        nota?: string;
      };
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
    const allowNewAddress = (await this.getConfigFlag('checkout_allow_new_address')) === true;
    const modalita = dto.modalitaConsegna ?? 'SPEDIZIONE';

    // ── Validazione e risoluzione indirizzo in base alla modalità di consegna ──
    let indirizzoSpedizioneId: number | null = dto.indirizzoSpedizioneId ?? null;

    if (modalita === 'RITIRO') {
      // Nessun indirizzo richiesto: serve data/ora di ritiro
      indirizzoSpedizioneId = null;
      if (!dto.notaSpedizione || dto.notaSpedizione.trim().length === 0) {
        throw new BadRequestException('Indicare data e ora di ritiro in sede');
      }
    } else {
      // SPEDIZIONE o MEZZI_PROPRI: serve un indirizzo di consegna
      if (dto.nuovoIndirizzo) {
        if (!allowNewAddress) {
          throw new BadRequestException('Inserimento di un nuovo indirizzo non abilitato');
        }
        if (
          !dto.nuovoIndirizzo.indirizzo?.trim() ||
          !dto.nuovoIndirizzo.cap?.trim() ||
          !dto.nuovoIndirizzo.citta?.trim()
        ) {
          throw new BadRequestException('Nuovo indirizzo: indirizzo, cap e città sono obbligatori');
        }
        const creato = await this.prisma.indirizzoCliente.create({
          data: {
            customerId: clienteId,
            codiceDestinazione: `MANUALE-${Date.now()}`,
            ragioneSociale: dto.nuovoIndirizzo.ragioneSociale?.trim() || null,
            indirizzo: dto.nuovoIndirizzo.indirizzo.trim(),
            cap: dto.nuovoIndirizzo.cap.trim(),
            citta: dto.nuovoIndirizzo.citta.trim(),
            provincia: dto.nuovoIndirizzo.provincia?.trim() || null,
            flagSpedizione: true,
            flagAbituale: false,
            tipoDestinazione: 'MAN',
            codicePorto: dto.nuovoIndirizzo.codicePorto ?? null,
            codiceVettore: dto.nuovoIndirizzo.codiceVettore ?? null,
          },
        });
        indirizzoSpedizioneId = creato.id;
      } else if (!indirizzoSpedizioneId) {
        throw new BadRequestException('Selezionare un indirizzo di spedizione');
      }
    }

    // Mappa la modalità sul codice "modalità di spedizione" (tabella portale)
    const codiceSpedizione = this.mappaModalita(modalita, dto.codiceSpedizione, customer?.codiceSpedizione);
    const codiceVettore =
      modalita === 'SPEDIZIONE'
        ? (dto.codiceVettore ?? customer?.codiceVettore ?? null)
        : null;

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
        indirizzoSpedizioneId,
        codicePorto: dto.codicePorto ?? customer?.codicePorto ?? null,
        codiceSpedizione,
        codiceVettore,
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

  private mappaModalita(
    modalita: ModalitaConsegna,
    dtoSpedizione: string | undefined,
    defaultSpedizione: string | null | undefined,
  ): string {
    if (modalita === 'RITIRO') return '001'; // A MEZZO MITTENTE (ritiro in sede)
    if (modalita === 'MEZZI_PROPRI') return '002'; // A MEZZO DESTINATARIO (mezzi propri)
    return dtoSpedizione ?? defaultSpedizione ?? '003'; // A MEZZO VETTORE (corriere)
  }

  private async getConfigFlag(key: string): Promise<boolean> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key } });
    if (!cfg) return false;
    return cfg.value === 'true' || cfg.value === '1';
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
