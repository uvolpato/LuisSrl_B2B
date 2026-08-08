import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminOrdiniService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(data: string, search?: string) {
    const where = this.buildWhere(data, search);
    const ordini = await this.prisma.ordineCliente.findMany({
      where,
      include: { righe: true, customer: { select: { id: true, ragioneSociale: true } } },
    });

    const count = ordini.length;
    const totale = ordini.reduce((s, o) => s + Number(o.importoTotale ?? 0), 0);
    const inAttesa = ordini.filter((o) => o.stato === "attesa").length;
    const pezzi = ordini.reduce((s, o) => s + o.righe.reduce((rs, r) => rs + Number(r.quantita ?? 0), 0), 0);
    const clientiSet = new Set(ordini.map((o) => o.customerId));
    const clienti = clientiSet.size;

    const totaleListino = ordini.reduce(
      (s, o) => s + o.righe.reduce((rs, r) => rs + Number(r.quantita ?? 0) * 0, 0),
      0,
    );
    const scontoMedio = totaleListino > 0 ? Math.round((1 - totale / totaleListino) * 1000) / 10 : 0;

    const ordiniConSped = ordini.filter((o) => Number(o.importoTotale ?? 0) > 0 && o.codiceSpedizione !== "RITIRO");
    const spedizioniCount = ordiniConSped.length;
    const spedizioneMedia =
      spedizioniCount > 0
        ? Math.round((ordini.reduce((s, o) => s + (o.codiceSpedizione === "RITIRO" ? 0 : 0), 0) / spedizioniCount) * 100) / 100
        : null;

    return { count, totale, scontoMedio, spedizioneMedia: 0, pezzi, clienti, inAttesa };
  }

  async findAll(data: string, page = 1, limit = 10, search?: string) {
    const where = this.buildWhere(data, search);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.ordineCliente.findMany({
        where,
        include: {
          customer: { select: { id: true, ragioneSociale: true } },
          righe: { select: { id: true, quantita: true } },
        },
        orderBy: { dataOrdine: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.ordineCliente.count({ where }),
    ]);

    const mapped = items.map((o) => ({
      id: o.id,
      num: o.numeroOrdine,
      clienteId: o.customerId,
      clienteNome: o.customer.ragioneSociale ?? `Cliente #${o.customerId}`,
      data: o.dataOrdine ? o.dataOrdine.toISOString().slice(0, 10) : "",
      ora: o.dataOrdine
        ? o.dataOrdine.toISOString().slice(11, 16)
        : "",
      stato: o.stato ?? "confermato",
      pagamento: o.codicePagamento ?? "",
      totale: Number(o.importoTotale ?? 0),
      pezzi: o.righe.reduce((s, r) => s + Number(r.quantita ?? 0), 0),
    }));

    return { items: mapped, total, page, pages: Math.ceil(total / limit) || 1 };
  }

  async findOne(id: number) {
    const o = await this.prisma.ordineCliente.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, ragioneSociale: true } },
        righe: true,
      },
    });
    if (!o) return null;

    const indirizzo = o.indirizzoSpedizioneId
      ? await this.prisma.indirizzoCliente.findUnique({ where: { id: o.indirizzoSpedizioneId } })
      : null;

    return {
      id: o.id,
      num: o.numeroOrdine,
      clienteId: o.customerId,
      clienteNome: o.customer.ragioneSociale ?? `Cliente #${o.customerId}`,
      data: o.dataOrdine ? o.dataOrdine.toISOString().slice(0, 10) : "",
      ora: o.dataOrdine ? o.dataOrdine.toISOString().slice(11, 16) : "",
      stato: o.stato ?? "confermato",
      pagamento: o.codicePagamento ?? "",
      totale: Number(o.importoTotale ?? 0),
      pezzi: o.righe.reduce((s, r) => s + Number(r.quantita ?? 0), 0),
      spedizione: 0,
      indirizzo: indirizzo
        ? {
            nome: indirizzo.ragioneSociale ?? "",
            via: indirizzo.indirizzo ?? "",
            cap: indirizzo.cap ?? "",
            citta: indirizzo.citta ?? "",
            prov: indirizzo.provincia ?? "",
          }
        : null,
      notaSped: o.notaSpedizione ?? undefined,
      items: o.righe.map((r) => ({
        codice: r.codiceProdotto ?? "",
        nome: r.descrizione ?? "",
        qty: Number(r.quantita ?? 0),
        prezzo: Number(r.prezzo ?? 0),
        listino: Number(r.prezzo ?? 0),
      })),
    };
  }

  async getClientiLookup() {
    const clienti = await this.prisma.customer.findMany({
      select: { id: true, ragioneSociale: true },
      orderBy: { ragioneSociale: "asc" },
    });
    return clienti.map((c) => ({ id: c.id, ragioneSociale: c.ragioneSociale ?? `Cliente #${c.id}` }));
  }

  private buildWhere(data: string, search?: string) {
    const dayStart = new Date(data + "T00:00:00.000Z");
    const dayEnd = new Date(data + "T23:59:59.999Z");
    const where: any = {
      dataOrdine: { gte: dayStart, lte: dayEnd },
    };
    if (search) {
      where.OR = [
        { numeroOrdine: { contains: search, mode: "insensitive" } },
        {
          customer: {
            ragioneSociale: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }
    return where;
  }
}
