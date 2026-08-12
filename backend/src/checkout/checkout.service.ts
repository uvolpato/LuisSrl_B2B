import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrazioneService } from '../integrazione/integrazione.service';
import { EventsService } from '../events/events.service';
import { SpeseSpedizioneService, Calcola } from '../spese-spedizione/spese-spedizione.service';

export type ModalitaConsegna = 'RITIRO' | 'SPEDIZIONE';

export interface DatiCheckout {
  cliente: {
    id: number;
    ragioneSociale: string | null;
    indirizzo: string | null;
    cap: string | null;
    citta: string | null;
    provincia: string | null;
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
    tipoDestinazione: string | null;
    flagSpedizione: boolean;
    abituale: boolean;
    daIntegra: boolean;
  }>;
  allowNewAddress: boolean;
  pagamenti: Array<{ codice: string; descrizione: string }>;
  porti: Array<{ codice: string; descrizione: string }>;
  spedizioni: Array<{ codice: string; descrizione: string }>;
  vettori: Array<{ codice: string; descrizione: string }>;
}

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private integrazione: IntegrazioneService,
    private events: EventsService,
    private speseSpedizione: SpeseSpedizioneService,
  ) {}

  async getSogliaDefault(clienteId: number) {
    const attivo = (await this.getConfigFlag('banner_spedizione_attivo')) === true;
    if (!attivo) return { soglia: null, attivo: false, minimoOrdine: null };

    const addr = await this.prisma.indirizzoCliente.findFirst({
      where: { customerId: clienteId, flagAbituale: true },
    });
    let resolved;
    if (addr?.provincia) {
      const regione = this.provinciaToRegione(addr.provincia.toUpperCase());
      resolved = regione ? await this.speseSpedizione.resolveTariffaAsync('IT', regione) : null;
    }
    if (!resolved) {
      const nazione = addr?.nazione || 'ROW';
      resolved = await this.speseSpedizione.resolveTariffaAsync(nazione, null);
    }
    if (!resolved) return { soglia: null, attivo: true, minimoOrdine: null };
    return { soglia: resolved.t.sogliaImporto ? Number(resolved.t.sogliaImporto) : null, attivo: true, minimoOrdine: resolved.t.minimoOrdine ? Number(resolved.t.minimoOrdine) : null };
  }

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
        indirizzo: customer.indirizzo,
        cap: customer.cap,
        citta: customer.citta,
        provincia: customer.provincia,
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
        nazione: i.nazione,
        tipoDestinazione: i.tipoDestinazione,
        flagSpedizione: i.flagSpedizione,
        abituale: i.flagAbituale,
        daIntegra: i.codiceDestinazione != null && i.codiceDestinazione !== '',
      })),
      allowNewAddress,
      pagamenti: pagamenti.map((p) => ({ codice: p.codice, descrizione: p.descrizione })),
      porti: porti.map((p) => ({ codice: p.codice, descrizione: p.descrizione })),
      spedizioni: spedizioni.map((s) => ({ codice: s.codice, descrizione: s.descrizione })),
      vettori: vettori.map((v) => ({ codice: v.codice, descrizione: v.descrizione })),
    };
  }

  async calcolaSpedizione(clienteId: number, provincia: string, nazioneParam: string, imponibile: number, sconto: number = 0) {
    let nazione = nazioneParam || 'ROW';
    let regione: string | null = null;

    if (provincia) {
      const reg = this.provinciaToRegione(provincia.toUpperCase());
      if (reg) { regione = reg; nazione = 'IT'; }
    }

    if (nazione === 'IT') {
      const resolved = await this.speseSpedizione.resolveTariffaAsync('IT', regione);
      if (!resolved) return { importo: 0, descrizione: 'Tariffa da confermare', gratuita: false, soglia: null, minimo: null, minimoOrdine: null };
      const calc = Calcola(resolved.t, imponibile, sconto);
      return {
        importo: Math.round(calc.fee * 100) / 100,
        descrizione: (regione || 'Italia') + (calc.superaSoglia ? ' (gratuita sopra soglia)' : ` (${calc.pct.toFixed(1)}%)`),
        gratuita: calc.superaSoglia, soglia: calc.soglia, minimo: calc.minimo, minimoOrdine: calc.minimoOrdine,
      };
    }

    const resolved = await this.speseSpedizione.resolveTariffaAsync(nazione, null);
    if (!resolved) return { importo: 0, descrizione: 'Tariffa da confermare', gratuita: false, soglia: null, minimo: null, minimoOrdine: null };
    const calc = Calcola(resolved.t, imponibile, sconto);
    return {
      importo: Math.round(calc.fee * 100) / 100,
      descrizione: nazione + (calc.superaSoglia ? ' (gratuita sopra soglia)' : ` (${calc.pct.toFixed(1)}%)`),
      gratuita: calc.superaSoglia, soglia: calc.soglia, minimo: calc.minimo, minimoOrdine: calc.minimoOrdine,
    };
  }

  private provinciaToRegione(prov: string): string | null {
    const map: Record<string, string> = {
      AG:'Sicilia',AL:'Piemonte',AN:'Marche',AO:"Valle d'Aosta",AR:'Toscana',AP:'Marche',AT:'Piemonte',AV:'Campania',
      BA:'Puglia',BT:'Puglia',BL:'Veneto',BN:'Campania',BG:'Lombardia',BI:'Piemonte',BO:'Emilia-Romagna',
      BZ:'Trentino-Alto Adige',BS:'Lombardia',BR:'Puglia',CA:'Sardegna',CL:'Sicilia',CB:'Molise',CE:'Campania',
      CT:'Sicilia',CZ:'Calabria',CH:'Abruzzo',CO:'Lombardia',CS:'Calabria',CR:'Lombardia',KR:'Calabria',
      CN:'Piemonte',EN:'Sicilia',FM:'Marche',FE:'Emilia-Romagna',FI:'Toscana',FG:'Puglia',FC:'Emilia-Romagna',
      FR:'Lazio',GE:'Liguria',GO:'Friuli-Venezia Giulia',GR:'Toscana',IM:'Liguria',IS:'Molise',SP:'Liguria',
      AQ:'Abruzzo',LT:'Lazio',LE:'Puglia',LC:'Lombardia',LI:'Toscana',LO:'Lombardia',LU:'Toscana',
      MC:'Marche',MN:'Lombardia',MS:'Toscana',MT:'Basilicata',ME:'Sicilia',MI:'Lombardia',MO:'Emilia-Romagna',
      MB:'Lombardia',NA:'Campania',NO:'Piemonte',NU:'Sardegna',OR:'Sardegna',PD:'Veneto',PA:'Sicilia',
      PR:'Emilia-Romagna',PV:'Lombardia',PG:'Umbria',PU:'Marche',PE:'Abruzzo',PC:'Emilia-Romagna',
      PI:'Toscana',PT:'Toscana',PN:'Friuli-Venezia Giulia',PZ:'Basilicata',PO:'Toscana',RG:'Sicilia',
      RA:'Emilia-Romagna',RC:'Calabria',RE:'Emilia-Romagna',RI:'Lazio',RN:'Emilia-Romagna',RM:'Lazio',
      RO:'Veneto',SA:'Campania',SS:'Sardegna',SV:'Liguria',SI:'Toscana',SR:'Sicilia',SO:'Lombardia',
      SU:'Sardegna',TA:'Puglia',TE:'Abruzzo',TR:'Umbria',TO:'Piemonte',TP:'Sicilia',TN:'Trentino-Alto Adige',
      TV:'Veneto',TS:'Friuli-Venezia Giulia',UD:'Friuli-Venezia Giulia',VA:'Lombardia',VE:'Veneto',
      VB:'Piemonte',VC:'Piemonte',VR:'Veneto',VV:'Calabria',VI:'Veneto',VT:'Lazio',
    };
    return map[prov] ?? null;
  }

  async salvaIndirizzo(clienteId: number, dto: { ragioneSociale?: string; indirizzo: string; cap: string; citta: string; provincia?: string; nazione?: string; abituale?: boolean }) {
    if (dto.abituale) {
      await this.prisma.indirizzoCliente.updateMany({ where: { customerId: clienteId }, data: { flagAbituale: false } });
    }
    const nuovo = await this.prisma.indirizzoCliente.create({
      data: {
        customerId: clienteId,
        ragioneSociale: dto.ragioneSociale ?? null,
        indirizzo: dto.indirizzo,
        cap: dto.cap,
        citta: dto.citta,
        provincia: dto.provincia ?? null,
        nazione: dto.nazione ?? 'IT',
        flagSpedizione: true,
        flagAbituale: dto.abituale ?? false,
        tipoDestinazione: 'SPEDIZIONE',
      },
    });
    return {
      id: nuovo.id,
      nome: nuovo.ragioneSociale ?? "Nuovo indirizzo",
      indirizzo: nuovo.indirizzo,
      cap: nuovo.cap,
      citta: nuovo.citta,
      provincia: nuovo.provincia,
      tipo: nuovo.tipoDestinazione ?? "SPEDIZIONE",
      abituale: nuovo.flagAbituale,
      daIntegra: false,
    };
  }

  async aggiornaIndirizzo(clienteId: number, id: number, dto: { indirizzo?: string; cap?: string; citta?: string; provincia?: string; nazione?: string; ragioneSociale?: string; abituale?: boolean }) {
    const addr = await this.prisma.indirizzoCliente.findFirst({ where: { id, customerId: clienteId } });
    if (!addr) throw new NotFoundException('Indirizzo non trovato');
    if (dto.abituale) {
      await this.prisma.indirizzoCliente.updateMany({ where: { customerId: clienteId }, data: { flagAbituale: false } });
    }
    const updated = await this.prisma.indirizzoCliente.update({
      where: { id },
      data: {
        ...(dto.indirizzo !== undefined ? { indirizzo: dto.indirizzo } : {}),
        ...(dto.cap !== undefined ? { cap: dto.cap } : {}),
        ...(dto.citta !== undefined ? { citta: dto.citta } : {}),
        ...(dto.provincia !== undefined ? { provincia: dto.provincia } : {}),
        ...(dto.nazione !== undefined ? { nazione: dto.nazione } : {}),
        ...(dto.ragioneSociale !== undefined ? { ragioneSociale: dto.ragioneSociale } : {}),
        ...(dto.abituale !== undefined ? { flagAbituale: dto.abituale } : {}),
      },
    });
    return { id: updated.id };
  }

  async eliminaIndirizzo(clienteId: number, id: number) {
    const addr = await this.prisma.indirizzoCliente.findFirst({ where: { id, customerId: clienteId } });
    if (!addr) throw new NotFoundException('Indirizzo non trovato');
    await this.prisma.indirizzoCliente.delete({ where: { id } });
  }

  async impostaPredefinito(clienteId: number, id: number) {
    await this.prisma.indirizzoCliente.updateMany({ where: { customerId: clienteId }, data: { flagAbituale: false } });
    if (id > 0) {
      await this.prisma.indirizzoCliente.update({ where: { id }, data: { flagAbituale: true } });
    }
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
      codiceCoupon?: string;
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
      // SPEDIZIONE: serve un indirizzo di consegna
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
        descrizione: (item as any).varianteDescrizione || item.varianteCodice,
        quantita: item.quantita,
        prezzo: netto,
      });
    }

    let costoTrasporto = 0;

    // Calcola spese di spedizione se l'indirizzo ha provincia (Italia)
    if (indirizzoSpedizioneId) {
      const addr = await this.prisma.indirizzoCliente.findUnique({ where: { id: indirizzoSpedizioneId } });
      if (addr?.provincia) {
        const regione = provinciaToRegione(addr.provincia.toUpperCase());
        const resolved = this.speseSpedizione.resolveTariffa('IT', regione ?? null);
        if (resolved) {
          costoTrasporto = Calcola(resolved.t, importoTotale, 0).fee;
        }
      }
    }

    // Applica coupon se presente - calcolo server-side
    let couponRiga: any = null;
    if (dto.codiceCoupon) {
      const campaign = await this.prisma.campaign.findUnique({ where: { code: dto.codiceCoupon.toUpperCase() } });
      if (campaign && campaign.status === 'active') {
        const now = new Date();
        const validFrom = campaign.validFrom ? new Date(campaign.validFrom) <= now : true;
        const validTo = campaign.validTo ? new Date(campaign.validTo) >= now : true;
        const sopraMinimo = !campaign.minOrder || Number(campaign.minOrder) <= importoTotale;

        // Controlla utilizzo per cliente
        let canUse = true;
        if (campaign.usage === 'once') {
          const already = await this.prisma.campaignUsage.findUnique({
            where: { campaignId_customerId: { campaignId: campaign.id, customerId: clienteId } },
          });
          if (already) canUse = false;
        } else if (campaign.usage === 'single') {
          if (campaign.usedCount > 0) canUse = false;
        }

        if (validFrom && validTo && sopraMinimo && canUse) {
          let discountAmount = 0;
          let descr = `Coupon ${campaign.code}`;
          if (campaign.type === 'pct') {
            discountAmount = importoTotale * Number(campaign.value) / 100;
            descr += ` (−${Number(campaign.value)}%)`;
          } else if (campaign.type === 'fixed') {
            discountAmount = Math.min(Number(campaign.value), importoTotale);
            descr += ` (−${Number(campaign.value).toFixed(2)} €)`;
          } else if (campaign.type === 'free-ship') {
            costoTrasporto = 0;
            descr += ' (Spedizione gratuita)';
          }
          if (campaign.scopeDetail) descr += ` su ${campaign.scopeDetail}`;

          if (discountAmount > 0) {
            couponRiga = {
              codiceProdotto: campaign.code,
              descrizione: descr,
              quantita: 1,
              prezzo: -Math.round(discountAmount * 100) / 100,
            };
          }

          // Traccia utilizzo
          await this.prisma.campaignUsage.create({
            data: { campaignId: campaign.id, customerId: clienteId },
          });
          await this.prisma.campaign.update({ where: { id: campaign.id }, data: { usedCount: { increment: 1 } } });
        }
      }
    }

    const numeroOrdine = `B2B-${Date.now()}`;
    const righeFinali = couponRiga ? [...righe, couponRiga] : righe;
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
        codiceCoupon: dto.codiceCoupon ?? null,
        notaSpedizione: dto.notaSpedizione ?? null,
        notaOrdine: dto.notaOrdine ?? null,
        righe: { create: righeFinali },
      },
      include: { righe: true },
    });

    // Aggiorna CampaignUsage con l'orderId
    if (dto.codiceCoupon && ordine) {
      const campaign = await this.prisma.campaign.findUnique({ where: { code: dto.codiceCoupon.toUpperCase() } });
      if (campaign) {
        await this.prisma.campaignUsage.updateMany({
          where: { campaignId: campaign.id, customerId: clienteId, orderId: null },
          data: { orderId: ordine.id, importo: importoTotale },
        });
      }
    }
    void this.events.track('ordine.create', { entita: 'ordine', entitaId: numeroOrdine, dettagli: { importo: importoTotale, righe: righe.length } });

    // Svuota il carrello
    await this.prisma.cartItem.deleteMany({ where: { carrelloId: carrello.id } });

    return ordine;
  }

  private mappaModalita(
    modalita: ModalitaConsegna,
    dtoSpedizione: string | undefined,
    defaultSpedizione: string | null | undefined,
  ): string {
    if (modalita === 'RITIRO') return '001';
    return dtoSpedizione ?? defaultSpedizione ?? '003';
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

  async validateCoupon(code: string, subtotale: number, codiciVariante: string[] = [], items?: { codice: string; qty: number; prezzo: number }[]) {
    const campaign = await this.prisma.campaign.findUnique({ where: { code: code.toUpperCase() } });
    if (!campaign) return { valid: false, message: "Codice non valido" };
    if (campaign.status !== "active") return { valid: false, message: "Campagna non attiva" };
    const now = new Date();
    if (campaign.validFrom && new Date(campaign.validFrom) > now) return { valid: false, message: "Campagna non ancora attiva" };
    if (campaign.validTo && new Date(campaign.validTo) < now) return { valid: false, message: "Campagna scaduta" };
    if (campaign.usage === "single" && campaign.usedCount > 0) return { valid: false, message: "Codice già utilizzato" };

    // Calcola subtotale dell'ambito
    let scopeSubtotale = subtotale;

    if (campaign.scope !== "all" && campaign.scopeDetail && codiciVariante.length > 0) {
      const varianti = await this.prisma.variante.findMany({
        where: { codice: { in: codiciVariante } },
        select: { codice: true, articolo: { select: { codiceLinea: true, famigliaCodice: true } } },
      });
      const lineaCodes = [...new Set(varianti.map(v => v.articolo.codiceLinea))];
      const famigliaCodes = [...new Set(varianti.map(v => v.articolo.famigliaCodice))];

      let matchingCodes: Set<string> = new Set();

      if (campaign.scope === "family") {
        const matching = varianti.filter(v => v.articolo.famigliaCodice === campaign.scopeDetail);
        matchingCodes = new Set(matching.map(v => v.codice));
        if (matchingCodes.size === 0) {
          const fam = await this.prisma.famiglia.findUnique({ where: { codice: campaign.scopeDetail! }, select: { nome: true } });
          return { valid: false, message: `Questo coupon è valido solo per la famiglia "${fam?.nome || campaign.scopeDetail}"` };
        }
      } else if (campaign.scope === "collection") {
        const raccolta = await this.prisma.raccolta.findFirst({ where: { slug: campaign.scopeDetail! }, select: { id: true, nome: true } });
        if (raccolta) {
          const inRaccolta = await this.prisma.articoloRaccolta.findMany({
            where: { raccoltaId: raccolta.id, articolo: { codiceLinea: { in: lineaCodes } } },
            select: { articolo: { select: { codiceLinea: true } } },
          });
          const lineaSet = new Set(inRaccolta.map(r => r.articolo.codiceLinea));
          matchingCodes = new Set(varianti.filter(v => lineaSet.has(v.articolo.codiceLinea)).map(v => v.codice));
          if (matchingCodes.size === 0) {
            return { valid: false, message: `Questo coupon è valido solo per la raccolta "${raccolta.nome || campaign.scopeDetail}"` };
          }
        }
      }

      // Calcola subtotale solo degli articoli matching
      if (items && items.length > 0) {
        scopeSubtotale = items
          .filter(i => matchingCodes.has(i.codice))
          .reduce((s, i) => s + i.qty * i.prezzo, 0);
      }
    }

    // Soglia minima sull'ambito
    if (campaign.minOrder && Number(campaign.minOrder) > scopeSubtotale) {
      let scopeName = campaign.scopeDetail || "questo ambito";
      if (campaign.scope === "family" && campaign.scopeDetail) {
        const fam = await this.prisma.famiglia.findUnique({ where: { codice: campaign.scopeDetail }, select: { nome: true } });
        if (fam?.nome) scopeName = fam.nome;
      } else if (campaign.scope === 'collection' && campaign.scopeDetail) {
        const col = await this.prisma.raccolta.findFirst({ where: { slug: campaign.scopeDetail }, select: { nome: true } });
        if (col?.nome) scopeName = col.nome;
      }
      return { valid: false, message: `Lo sconto si applica a un importo superiore a ${Number(campaign.minOrder).toFixed(2)} € per ${scopeName}` };
    }

    let discount = 0;
    let isPct = false;
    if (campaign.type === "pct") { discount = Number(campaign.value); isPct = true; }
    else if (campaign.type === "fixed") { discount = Number(campaign.value); isPct = false; }
    else if (campaign.type === "free-ship") { discount = 0; isPct = false; }

    const discountAmount = isPct ? scopeSubtotale * discount / 100 : Math.min(discount, scopeSubtotale);

    // Risolvi nome ambito per visualizzazione
    let scopeName: string | undefined;
    if (campaign.scope === 'family' && campaign.scopeDetail) {
      const fam = await this.prisma.famiglia.findUnique({ where: { codice: campaign.scopeDetail }, select: { nome: true } });
      scopeName = fam?.nome || campaign.scopeDetail;
    } else if (campaign.scope === 'collection' && campaign.scopeDetail) {
      const col = await this.prisma.raccolta.findFirst({ where: { slug: campaign.scopeDetail }, select: { nome: true } });
      scopeName = col?.nome || campaign.scopeDetail;
    }

    return {
      valid: true,
      type: campaign.type,
      value: Number(campaign.value),
      discount: isPct ? discount : discountAmount,
      isPct,
      scopeSubtotale,
      discountAmount,
      label: campaign.type === "free-ship" ? "Spedizione gratuita" : campaign.type === "pct" ? `−${Number(campaign.value)}%` : `−${Number(campaign.value).toFixed(2)} €`,
      code: campaign.code,
      scopeDetail: campaign.scopeDetail,
      scopeName,
    };
  }
}

// Mapping provincia italiana → regione (per resolveTariffa)
function provinciaToRegione(prov: string): string | null {
  const map: Record<string, string> = {
    AG: 'Sicilia', AL: 'Piemonte', AN: 'Marche', AO: "Valle d'Aosta", AP: 'Marche',
    AQ: 'Abruzzo', AR: 'Toscana', AT: 'Piemonte', AV: 'Campania', BA: 'Puglia',
    BG: 'Lombardia', BI: 'Piemonte', BL: 'Veneto', BN: 'Campania', BO: 'Emilia-Romagna',
    BR: 'Puglia', BS: 'Lombardia', BT: 'Puglia', BZ: 'Trentino-Alto Adige', CA: 'Sardegna',
    CB: 'Molise', CE: 'Campania', CH: 'Abruzzo', CL: 'Sicilia', CN: 'Piemonte',
    CO: 'Lombardia', CR: 'Lombardia', CS: 'Calabria', CT: 'Sicilia', CZ: 'Calabria',
    EN: 'Sicilia', FC: 'Emilia-Romagna', FE: 'Emilia-Romagna', FG: 'Puglia', FI: 'Toscana',
    FM: 'Marche', FR: 'Lazio', GE: 'Liguria', GO: 'Friuli-Venezia Giulia', GR: 'Toscana',
    IM: 'Liguria', IS: 'Molise', KR: 'Calabria', LC: 'Lombardia', LE: 'Puglia',
    LI: 'Toscana', LO: 'Lombardia', LT: 'Lazio', LU: 'Toscana', MB: 'Lombardia',
    MC: 'Marche', ME: 'Sicilia', MI: 'Lombardia', MN: 'Lombardia', MO: 'Emilia-Romagna',
    MS: 'Toscana', MT: 'Basilicata', NA: 'Campania', NO: 'Piemonte', NU: 'Sardegna',
    OR: 'Sardegna', PA: 'Sicilia', PC: 'Emilia-Romagna', PD: 'Veneto', PE: 'Abruzzo',
    PG: 'Umbria', PI: 'Toscana', PN: 'Friuli-Venezia Giulia', PO: 'Toscana', PR: 'Emilia-Romagna',
    PT: 'Toscana', PU: 'Marche', PV: 'Lombardia', PZ: 'Basilicata', RA: 'Emilia-Romagna',
    RC: 'Calabria', RE: 'Emilia-Romagna', RG: 'Sicilia', RI: 'Lazio', RM: 'Lazio',
    RN: 'Emilia-Romagna', RO: 'Veneto', SA: 'Campania', SI: 'Toscana', SO: 'Lombardia',
    SP: 'Liguria', SR: 'Sicilia', SS: 'Sardegna', SU: 'Sardegna', SV: 'Liguria',
    TA: 'Puglia', TE: 'Abruzzo', TN: 'Trentino-Alto Adige', TO: 'Piemonte', TP: 'Sicilia',
    TR: 'Umbria', TS: 'Friuli-Venezia Giulia', TV: 'Veneto', UD: 'Friuli-Venezia Giulia',
    VA: 'Lombardia', VB: 'Piemonte', VC: 'Piemonte', VE: 'Veneto', VI: 'Veneto',
    VR: 'Veneto', VT: 'Lazio', VV: 'Calabria',
  };
  return map[prov] ?? null;
}
