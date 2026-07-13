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
    year?: string,
  ) {
    const where: any = { customerId };

    if (year) {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        const start = new Date(`${y}-01-01T00:00:00.000Z`);
        const end = new Date(`${y + 1}-01-01T00:00:00.000Z`);
        where.dataOrdine = { gte: start, lt: end };
      }
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

    const years: number[] = await this.prisma.$queryRawUnsafe<{ anno: number }[]>(
      `SELECT DISTINCT EXTRACT(YEAR FROM data_ordine) AS anno
       FROM ordini_clienti WHERE customer_id = $1 AND data_ordine IS NOT NULL
       ORDER BY anno DESC`,
      customerId,
    ).then((rows) => rows.map((r) => r.anno));

    return { items, total, years };
  }
}
