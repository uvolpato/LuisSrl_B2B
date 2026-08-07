import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnomaliaService {
  constructor(private readonly prisma: PrismaService) {}

  async log(tipo: string, messaggio: string, gravita = 'error', contesto?: string, dettaglio?: any) {
    try {
      await this.prisma.anomaliaLog.create({
        data: { tipo, gravita, contesto, messaggio, dettaglio },
      });
    } catch {}
  }

  async findAll(page = 1, limit = 50, tipo?: string, gravita?: string, risolto?: boolean) {
    const where: any = {};
    if (tipo) where.tipo = tipo;
    if (gravita) where.gravita = gravita;
    if (risolto !== undefined) where.risolto = risolto;

    const [items, total] = await Promise.all([
      this.prisma.anomaliaLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.anomaliaLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async risolvi(id: number) {
    await this.prisma.anomaliaLog.update({
      where: { id },
      data: { risolto: true, risoltoIl: new Date() },
    });
  }
}
