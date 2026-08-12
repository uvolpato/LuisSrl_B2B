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

  // LoggerService implementation
  logMsg(message: any, context?: string) { this.logToDb('log', message, context); }
  errorMsg(message: any, trace?: string, context?: string) { this.logToDb('error', message, context, trace); }
  warnMsg(message: any, context?: string) { this.logToDb('warning', message, context); }
  debugMsg(message: any, context?: string) { this.logToDb('debug', message, context); }
  verboseMsg(message: any, context?: string) { this.logToDb('verbose', message, context); }

  private logToDb(level: string, message: any, context?: string, trace?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    try {
      this.prisma.$executeRawUnsafe(
        `INSERT INTO anomalia_log (tipo, gravita, messaggio, contesto, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        'logger', level, trace ? `${msg}\n${trace}` : msg, context || null,
      );
    } catch {}
  }

  async getStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);

    const [total24h, error24h, lastErrors, topMessages] = await Promise.all([
      this.prisma.anomaliaLog.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.anomaliaLog.count({ where: { createdAt: { gte: last24h }, gravita: 'error' } }),
      this.prisma.anomaliaLog.findMany({ where: { createdAt: { gte: last1h }, gravita: 'error' }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.$queryRawUnsafe<{ messaggio: string; cnt: bigint }[]>(
        `SELECT messaggio, count(*) as cnt FROM anomalia_log WHERE created_at >= $1 AND gravita = 'error' GROUP BY messaggio ORDER BY cnt DESC LIMIT 10`,
        last24h,
      ),
    ]);

    const access24h = await this.prisma.anomaliaLog.count({
      where: { createdAt: { gte: last24h }, tipo: 'access' },
    });

    return {
      total24h, error24h, access24h,
      lastErrors: lastErrors.map(e => ({ messaggio: e.messaggio, gravita: e.gravita, createdAt: e.createdAt })),
      topMessages: topMessages.map(t => ({ messaggio: t.messaggio, count: Number(t.cnt) })),
    };
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
