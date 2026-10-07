import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IntegrazioneService } from "../integrazione/integrazione.service";
import { provinciaToRegione } from "../common/geo";

/** Cliente con metriche di segmentazione calcolate dai dati reali del portale. */
type SegCustomer = {
  id: number;
  nome: string;
  cod: string | null;
  regione: string | null;
  /** Giorni dall'ultimo ordine; 9999 = mai ordinato. */
  ultimoOrdine: number;
  /** Sconto medio % (1 - netto/listino); null = senza righe scontabili. */
  scontoMedio: number | null;
  /** Volume ordini ultimi 12 mesi in €. */
  volume: number;
};

type SegFilter = { field: string; value: string };

/** Valori ammessi per filtro: sono esattamente quelli dell'UI Destinatari. */
const FILTER_VALUES: Record<string, string[]> = {
  regione: ["Lombardia", "Veneto", "Toscana", "Lazio", "Emilia-R.", "Piemonte", "Campania", "Sicilia"],
  ultimo: ["30", "90", "over90", "over180"],
  sconto: ["low", "mid", "high"],
  volume: ["small", "low", "mid", "large"],
};
/** Il mapping provincia→regione restituisce il nome esteso. */
const REGION_ALIASES: Record<string, string> = { "Emilia-R.": "Emilia-Romagna" };

const SUGGESTIONS_KEY = "coupon_ai_suggestions";

type Suggestion = { title: string; description: string; filters: Record<string, string>; count: number };

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService, private integrazione: IntegrazioneService) {}

  async getDashboard() {
    const campaigns = await this.prisma.campaign.findMany();
    const active = campaigns.filter(c => c.status === "active").length;
    const totalUsed = campaigns.reduce((s, c) => s + c.usedCount, 0);
    const totalVolume = campaigns.reduce((s, c) => s + c.usedCount * (Number(c.value) || 0), 0);
    const redemptionRate = totalUsed > 0 ? Math.round((campaigns.filter(c => c.usedCount > 0).length / Math.max(campaigns.length, 1)) * 1000) / 10 : 0;
    return { activeCount: active, totalUsed, totalVolume, redemptionRate };
  }

  async findAll(search?: string, status?: string) {
    const where: any = {};
    if (search) where.OR = [{ code: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }];
    if (status) where.status = status;
    return this.prisma.campaign.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  async create(data: any) {
    return this.prisma.campaign.create({
      data: {
        code: data.code, name: data.name, type: data.type,
        value: data.value ?? 0, scope: data.scope ?? "all",
        scopeDetail: data.scopeDetail ?? null, minOrder: data.minOrder ?? null,
        usage: data.usage ?? "unlimited",
        validFrom: new Date(data.validFrom || new Date()),
        validTo: data.validTo ? new Date(data.validTo) : null,
        status: "active", targetCount: data.targetCount ?? 0,
        filters: data.filters ?? null, customerIds: data.customerIds ?? [],
      },
    });
  }

  /** Bacino reale: tutti i clienti del portale (stessa sezione admin "Clienti")
   *  con metriche calcolate da ordini_clienti + righe_ordini. */
  async loadSegment(): Promise<SegCustomer[]> {
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT c.id, c.ragione_sociale, c.nome, c.codice_cliente, c.provincia,
             CASE WHEN o.ultimo IS NULL THEN 9999
                  ELSE LEAST(9999, FLOOR(EXTRACT(EPOCH FROM (now() - o.ultimo)) / 86400))::int
             END AS giorni,
             COALESCE(o.volume12, 0)::float8 AS volume,
             d.sconto_medio::float8 AS sconto_medio
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, MAX(data_ordine) AS ultimo,
               SUM(importo_totale) FILTER (WHERE data_ordine >= now() - INTERVAL '12 months') AS volume12
        FROM ordini_clienti GROUP BY customer_id
      ) o ON o.customer_id = c.id
      LEFT JOIN (
        SELECT oo.customer_id,
               (1 - SUM(r.prezzo_netto) / SUM(r.prezzo_listino)) * 100 AS sconto_medio
        FROM ordini_clienti oo
        JOIN righe_ordini r ON r.ordine_id = oo.id
        WHERE r.prezzo_listino > 0 AND r.prezzo_netto IS NOT NULL
        GROUP BY oo.customer_id
      ) d ON d.customer_id = c.id
      ORDER BY c.id
    `);
    return rows.map(r => ({
      id: Number(r.id),
      nome: String(r.ragione_sociale || r.nome || `Cliente #${r.id}`),
      cod: r.codice_cliente == null ? null : String(r.codice_cliente),
      regione: r.provincia ? provinciaToRegione(String(r.provincia).toUpperCase()) : null,
      ultimoOrdine: Number(r.giorni ?? 9999),
      scontoMedio: r.sconto_medio == null ? null : Math.round(Number(r.sconto_medio) * 10) / 10,
      volume: Math.round(Number(r.volume ?? 0)),
    }));
  }

  /** Applica i filtri dell'UI Destinatari a un bacino già caricato. */
  private applySegFilters(customers: SegCustomer[], filters: SegFilter[]): SegCustomer[] {
    let out = customers;
    for (const f of filters) {
      if (f.field === "regione" && f.value) {
        const want = REGION_ALIASES[f.value] ?? f.value;
        out = out.filter(c => c.regione === want);
      }
      if (f.field === "ultimoOrdine") {
        if (f.value === "30") out = out.filter(c => c.ultimoOrdine <= 30);
        else if (f.value === "90") out = out.filter(c => c.ultimoOrdine <= 90);
        else if (f.value === "over90") out = out.filter(c => c.ultimoOrdine > 90);
        else if (f.value === "over180") out = out.filter(c => c.ultimoOrdine > 180);
        else if (f.value === "none") out = out.filter(c => c.ultimoOrdine >= 9999);
      }
      if (f.field === "scontoMedio") {
        if (f.value === "low") out = out.filter(c => c.scontoMedio != null && c.scontoMedio < 10);
        else if (f.value === "mid") out = out.filter(c => c.scontoMedio != null && c.scontoMedio >= 10 && c.scontoMedio <= 25);
        else if (f.value === "high") out = out.filter(c => c.scontoMedio != null && c.scontoMedio > 25);
      }
      if (f.field === "volume") {
        if (f.value === "small") out = out.filter(c => c.volume < 1000);
        else if (f.value === "low") out = out.filter(c => c.volume < 5000);
        else if (f.value === "mid") out = out.filter(c => c.volume >= 5000 && c.volume <= 20000);
        else if (f.value === "large") out = out.filter(c => c.volume > 20000);
      }
    }
    return out;
  }

  async previewSegment(filters: any[]) {
    const customers = await this.loadSegment();
    const matched = this.applySegFilters(customers, (filters ?? []).filter(f => f?.field && f?.value));
    return { count: matched.length, customers: matched.map(c => ({ id: c.id, nome: c.nome, cod: c.cod })) };
  }

  /** Proposte salvate in site_config (nessuna spesa AI alla riapertura del modal). */
  async getAISuggestions(): Promise<{ generatedAt: string | null; items: Suggestion[] }> {
    const sc = await this.prisma.siteConfig.findUnique({ where: { key: SUGGESTIONS_KEY } });
    if (!sc) return { generatedAt: null, items: [] };
    try {
      const parsed = JSON.parse(sc.value);
      return { generatedAt: parsed.generatedAt ?? null, items: Array.isArray(parsed.items) ? parsed.items : [] };
    } catch {
      return { generatedAt: null, items: [] };
    }
  }

  /** Genera 3 proposte con AI: il modello suggerisce i filtri, il DB calcola i count. */
  async generateAISuggestions(): Promise<{ generatedAt: string; items: Suggestion[] }> {
    const seg = await this.loadSegment();
    const prompt = this.buildSuggestionsPrompt(seg);
    const raw = await this.integrazione.generaSintesiAI(prompt, "coupon_suggestions");
    const candidates = this.parseSuggestions(raw);

    const items: Suggestion[] = [];
    for (const c of candidates) {
      const filters = this.toSegFilters(c.filters);
      if (!filters.length) continue;
      const count = this.applySegFilters(seg, filters).length;
      if (count === 0) continue;
      items.push({ title: c.title, description: c.description, filters: c.filters, count });
    }
    if (!items.length) throw new BadRequestException("L'AI non ha prodotto proposte applicabili ai clienti del portale. Riprova.");

    const payload = { generatedAt: new Date().toISOString(), items };
    const value = JSON.stringify(payload);
    await this.prisma.siteConfig.upsert({
      where: { key: SUGGESTIONS_KEY },
      create: { key: SUGGESTIONS_KEY, value },
      update: { value },
    });
    return payload;
  }

  /** Aggregati del bacino: al modello vanno solo statistiche, mai righe per cliente. */
  private buildSuggestionsPrompt(seg: SegCustomer[]) {
    const digest = {
      totaleClienti: seg.length,
      perRegione: {} as Record<string, number>,
      inattivi: { oltre90gg: 0, oltre180gg: 0, maiOrdinato: 0 },
      volume12mesi: { sotto1k: 0, sotto5k: 0, da5kA20k: 0, oltre20k: 0 },
      scontoMedio: { sotto10pct: 0, da10a25pct: 0, oltre25pct: 0, senzaDati: 0 },
    };
    for (const c of seg) {
      const reg = c.regione ?? "non nota";
      digest.perRegione[reg] = (digest.perRegione[reg] ?? 0) + 1;
      if (c.ultimoOrdine > 90) digest.inattivi.oltre90gg++;
      if (c.ultimoOrdine > 180) digest.inattivi.oltre180gg++;
      if (c.ultimoOrdine >= 9999) digest.inattivi.maiOrdinato++;
      if (c.volume < 1000) digest.volume12mesi.sotto1k++;
      else if (c.volume < 5000) digest.volume12mesi.sotto5k++;
      else if (c.volume <= 20000) digest.volume12mesi.da5kA20k++;
      else digest.volume12mesi.oltre20k++;
      if (c.scontoMedio == null) digest.scontoMedio.senzaDati++;
      else if (c.scontoMedio < 10) digest.scontoMedio.sotto10pct++;
      else if (c.scontoMedio <= 25) digest.scontoMedio.da10a25pct++;
      else digest.scontoMedio.oltre25pct++;
    }

    return `Sei un consulente di marketing B2B per Luis S.r.l., grossista di vasi e complementi per fioristi e garden center.
Ti fornisco statistiche AGGREGATE del bacino clienti del portale (nessun dato personale):
${JSON.stringify(digest)}

Proponi esattamente 3 proposte di segmentazione per campagne coupon.
Ogni proposta deve essere esprimibile SOLO con questi filtri e questi valori ammessi:
- regione: ${FILTER_VALUES.regione.map(v => `"${v}"`).join(", ")}
- ultimo (giorni dall'ultimo ordine; over90/over180 includono chi non ha mai ordinato): ${FILTER_VALUES.ultimo.map(v => `"${v}"`).join(", ")}
- sconto (sconto medio percentuale): "low" = sotto 10%, "mid" = 10-25%, "high" = oltre 25%
- volume (ordini ultimi 12 mesi): "small" = sotto 1k€, "low" = sotto 5k€, "mid" = 5-20k€, "large" = oltre 20k€

Regole: almeno un filtro e almeno un filtro per proposta; usa solo i valori ammessi; title max 60 caratteri; description max 140 caratteri in italiano SENZA numeri né conteggi (la piattaforma li aggiunge).
Rispondi SOLO con JSON valido, senza altro testo:
{"suggestions":[{"title":"","description":"","filters":{}}]}`;
  }

  private parseSuggestions(raw: string): { title: string; description: string; filters: Record<string, string> }[] {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new BadRequestException("Risposta AI non interpretabile. Riprova.");
    let data: any;
    try { data = JSON.parse(match[0]); } catch { throw new BadRequestException("Risposta AI non interpretabile. Riprova."); }
    const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
    return list.filter((s: any) => {
      if (typeof s?.title !== "string" || !s.title.trim()) return false;
      if (typeof s?.description !== "string" || !s.description.trim()) return false;
      if (typeof s?.filters !== "object" || s.filters == null) return false;
      // Fail closed: ogni filtro proposto deve stare nella grammatica dell'UI.
      return Object.entries(s.filters).every(([k, v]) =>
        FILTER_VALUES[k] !== undefined && FILTER_VALUES[k].includes(String(v)));
    }).map((s: any) => ({
      title: s.title.trim().slice(0, 80),
      description: s.description.trim().slice(0, 200),
      filters: s.filters as Record<string, string>,
    }));
  }

  /** Filtri proposti dal modello (chiavi regione/ultimo/sconto/volume) → campi segmento. */
  private toSegFilters(filters: Record<string, string>): SegFilter[] {
    const FIELD: Record<string, string> = { regione: "regione", ultimo: "ultimoOrdine", sconto: "scontoMedio", volume: "volume" };
    return Object.entries(filters)
      .filter(([k, v]) => FIELD[k] !== undefined && FILTER_VALUES[k]?.includes(String(v)))
      .map(([k, v]) => ({ field: FIELD[k], value: String(v) }));
  }

  async generateQR(code: string) {
    try {
      const QRCode = require("qrcode");
      const dataUrl = await QRCode.toDataURL(code, { width: 200, margin: 1 });
      return { qrCode: dataUrl };
    } catch { return { qrCode: null }; }
  }

  async sendCampaign(id: number, _body: any) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new Error("Campagna non trovata");
    return { sent: campaign.targetCount, status: "sent" };
  }

  async updateStatus(id: number, status: string) {
    return this.prisma.campaign.update({ where: { id }, data: { status } });
  }

  async delete(id: number) {
    await this.prisma.campaign.delete({ where: { id } });
  }

  async getUsage(campaignId: number) {
    return this.prisma.campaignUsage.findMany({
      where: { campaignId },
      orderBy: { usedAt: "desc" },
    });
  }

  async getTargetClients(campaignId: number) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || !campaign.customerIds?.length) return [];

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: campaign.customerIds } },
      select: { id: true, ragioneSociale: true, nome: true, codiceCliente: true },
    });

    const usages = await this.prisma.campaignUsage.findMany({
      where: { campaignId, customerId: { in: campaign.customerIds } },
      select: { customerId: true, usedAt: true, orderId: true, importo: true },
    });
    const usageMap = new Map(usages.map(u => [u.customerId, u]));

    return customers.map(c => ({
      id: c.id,
      nome: c.ragioneSociale || c.nome || `Cliente #${c.id}`,
      codiceCliente: c.codiceCliente,
      usato: usageMap.has(c.id),
      usage: usageMap.get(c.id) || null,
    }));
  }

  async removeClient(campaignId: number, customerId: number) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error("Campagna non trovata");
    const updatedIds = (campaign.customerIds || []).filter(id => id !== customerId);
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { customerIds: updatedIds },
    });
  }

  async update(id: number, data: any) {
    return this.prisma.campaign.update({
      where: { id },
      data: {
        name: data.name, type: data.type, value: data.value, scope: data.scope,
        scopeDetail: data.scopeDetail ?? null, minOrder: data.minOrder ?? null,
        usage: data.usage, validFrom: new Date(data.validFrom),
        validTo: data.validTo ? new Date(data.validTo) : null,
      },
    });
  }
}
