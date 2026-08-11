import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdiniService {
  private readonly SORT_FIELDS = ['numeroOrdine', 'dataOrdine', 'stato', 'importoTotale'] as const;

  constructor(private prisma: PrismaService) {}

  async getMieiOrdini(
    customerId: number,
    search?: string,
    page = 1,
    limit = 50,
    sortBy?: string,
    sortDir?: string,
    dataDa?: string,
    dataA?: string,
  ) {
    const where: any = { customerId };

    if (dataDa) {
      const from = new Date(dataDa + 'T00:00:00.000Z');
      const to = dataA ? new Date(dataA + 'T23:59:59.999Z') : new Date(dataDa + 'T23:59:59.999Z');
      where.dataOrdine = { gte: from, lte: to };
    }

    if (search) {
      const isNumeric = /^\d+$/.test(search);
      where.OR = [
        { numeroOrdine: { contains: search, mode: 'insensitive' } },
        ...(isNumeric ? [{ importoTotale: Number(search) }] : []),
        { righe: { some: { codiceProdotto: { contains: search, mode: 'insensitive' } } } },
        { righe: { some: { descrizione: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const field: string = sortBy && this.SORT_FIELDS.includes(sortBy as any) ? sortBy : 'dataOrdine';
    const dir: 'asc' | 'desc' = sortDir === 'asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      this.prisma.ordineCliente.findMany({
        where,
        orderBy: { [field]: dir },
        include: { righe: { orderBy: { id: 'asc' } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ordineCliente.count({ where }),
    ]);

    // Arricchisci le righe con i nomi articolo reali (la descrizione Integra può contenere solo il codice)
    const allCodici = [...new Set(items.flatMap(o => o.righe.map(r => r.codiceProdotto).filter(Boolean)))];
    const nameMap = new Map<string, string>();
    if (allCodici.length > 0) {
      const varianti = await this.prisma.variante.findMany({
        where: { codice: { in: allCodici as string[] } },
        select: { codice: true, descrizione: true, articolo: { select: { nome: true } } },
      });
      for (const v of varianti) {
        nameMap.set(v.codice, v.articolo.nome || v.descrizione || v.codice);
      }
    }
    for (const ordine of items) {
      for (const riga of ordine.righe) {
        const resolved = riga.codiceProdotto ? nameMap.get(riga.codiceProdotto) : undefined;
        if (resolved && (!riga.descrizione || riga.descrizione === riga.codiceProdotto)) {
          (riga as any).descrizione = resolved;
        }
      }
    }

    return { items, total, years: [] as number[] };
  }
}
