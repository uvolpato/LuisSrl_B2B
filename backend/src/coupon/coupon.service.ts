import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEMO_CLIENTS = [
  { id: 1, nome: "Verdepiù di Bianchi & C.", cod: "C001", piva: "IT01234567890", regione: "Lombardia", ultimoOrdine: 12, scontoMedio: 18, volume: 14500 },
  { id: 2, nome: "Floricoltura Lombardi", cod: "C002", piva: "IT02345678901", regione: "Lombardia", ultimoOrdine: 45, scontoMedio: 22, volume: 8900 },
  { id: 3, nome: "Green Garden Center", cod: "C003", piva: "IT03456789012", regione: "Toscana", ultimoOrdine: 8, scontoMedio: 12, volume: 3200 },
  { id: 4, nome: "Piante e Dintorni", cod: "C004", piva: "IT04567890123", regione: "Veneto", ultimoOrdine: 3, scontoMedio: 25, volume: 21500 },
  { id: 5, nome: "Vivai Riuniti Veneto", cod: "C005", piva: "IT05678901234", regione: "Veneto", ultimoOrdine: 120, scontoMedio: 8, volume: 9800 },
  { id: 6, nome: "Terra e Colore Sas", cod: "C006", piva: "IT06789012345", regione: "Lombardia", ultimoOrdine: 60, scontoMedio: 15, volume: 34000 },
  { id: 7, nome: "GardenShop Bergamo", cod: "C007", piva: "IT07890123456", regione: "Lombardia", ultimoOrdine: 15, scontoMedio: 20, volume: 7200 },
  { id: 8, nome: "Il Giardino Segreto", cod: "C008", piva: "IT08901234567", regione: "Lazio", ultimoOrdine: 90, scontoMedio: 30, volume: 5200 },
  { id: 9, nome: "Agriverde Cooperativa", cod: "C009", piva: "IT09012345678", regione: "Emilia-R.", ultimoOrdine: 2, scontoMedio: 10, volume: 18500 },
  { id: 10, nome: "Fiori e Foglie", cod: "C010", piva: "IT00123456789", regione: "Campania", ultimoOrdine: 200, scontoMedio: 5, volume: 4200 },
  { id: 11, nome: "Ortoflor Commerciale", cod: "C011", piva: "IT11234567890", regione: "Piemonte", ultimoOrdine: 30, scontoMedio: 18, volume: 26000 },
  { id: 12, nome: "Verde Casa Martinelli", cod: "C012", piva: "IT12234567890", regione: "Sicilia", ultimoOrdine: 180, scontoMedio: 28, volume: 3100 },
];

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

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

  async previewSegment(filters: any[]) {
    let customers = [...DEMO_CLIENTS];
    for (const f of filters) {
      if (f.field === "regione" && f.value) customers = customers.filter(c => c.regione === f.value);
      if (f.field === "ultimoOrdine") {
        if (f.value === "30") customers = customers.filter(c => c.ultimoOrdine <= 30);
        else if (f.value === "90") customers = customers.filter(c => c.ultimoOrdine <= 90);
        else if (f.value === "over90") customers = customers.filter(c => c.ultimoOrdine > 90);
        else if (f.value === "over180") customers = customers.filter(c => c.ultimoOrdine > 180);
        else if (f.value === "none") customers = customers.filter(c => c.ultimoOrdine === 0);
      }
      if (f.field === "scontoMedio") {
        if (f.value === "low") customers = customers.filter(c => c.scontoMedio < 10);
        else if (f.value === "mid") customers = customers.filter(c => c.scontoMedio >= 10 && c.scontoMedio <= 25);
        else if (f.value === "high") customers = customers.filter(c => c.scontoMedio > 25);
      }
      if (f.field === "volume") {
        if (f.value === "small") customers = customers.filter(c => c.volume < 1000);
        else if (f.value === "low") customers = customers.filter(c => c.volume < 5000);
        else if (f.value === "mid") customers = customers.filter(c => c.volume >= 5000 && c.volume <= 20000);
        else if (f.value === "large") customers = customers.filter(c => c.volume > 20000);
      }
    }
    return { count: customers.length, customers };
  }

  async getAISuggestions() {
    return [
      { title: "Clienti inattivi da oltre 90 giorni", description: "12 clienti non ordinano da 3+ mesi. Una campagna con sconto 10-15% potrebbe riattivarli.", count: 12, filters: { ultimo: "over90" } },
      { title: "Top spender senza sconto recente", description: "4 clienti con volume >20k€ e sconto medio <10%. Premiali con un codice esclusivo.", count: 4, filters: { volume: "large", sconto: "low" } },
      { title: "Nuovi clienti da fidelizzare", description: "3 clienti con volume <1k€. Uno sconto di benvenuto li incentiverebbe a ordinare di più.", count: 3, filters: { volume: "small" } },
      { title: "Lombardia — campagna regionale", description: "5 clienti in Lombardia. Puoi targettizzarli con una promo dedicata alla zona.", count: 5, filters: { regione: "Lombardia" } },
    ];
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
      select: { customerId: true, usedAt: true, orderId: true, revoked: true },
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

  async revokeUsage(usageId: number, adminId: number) {
    const usage = await this.prisma.campaignUsage.findUnique({ where: { id: usageId } });
    if (!usage) throw new Error("Utilizzo non trovato");
    const newRevoked = !usage.revoked;
    return this.prisma.campaignUsage.update({
      where: { id: usageId },
      data: { revoked: newRevoked, revokedAt: new Date(), revokedBy: adminId },
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
