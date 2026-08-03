import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { reqCtx } from '../common/request-context';

/**
 * Tracciamento eventi comportamentali dei clienti. Fire-and-forget: non deve mai
 * rompere il flusso. Attribuzione automatica dal reqCtx (solo attori 'customer').
 */
@Injectable()
export class EventsService {
  private readonly log = new Logger(EventsService.name);
  private readonly retentionMonths = parseInt(process.env.EVENTS_RETENTION_MONTHS || '18', 10);

  constructor(private readonly prisma: PrismaService) {}

  /** Logga un evento del cliente corrente (dal reqCtx). Ignora admin/sistema. */
  async track(tipo: string, opts?: { entita?: string; entitaId?: string; dettagli?: unknown }) {
    const store = reqCtx.getStore();
    if (store?.actorType !== 'customer' || store.actorId == null) return;
    await this.write(store.actorId, tipo, opts, store.ip);
  }

  /** Logga un evento per un cliente esplicito (es. login, quando la sessione non c'è ancora). */
  async trackFor(customerId: number, tipo: string, opts?: { entita?: string; entitaId?: string; dettagli?: unknown }, ip?: string) {
    await this.write(customerId, tipo, opts, ip);
  }

  private async write(customerId: number, tipo: string, opts: { entita?: string; entitaId?: string; dettagli?: unknown } | undefined, ip?: string) {
    try {
      await this.prisma.customerEvent.create({
        data: {
          customerId, tipo,
          entita: opts?.entita ?? null,
          entitaId: opts?.entitaId ?? null,
          dettagli: (opts?.dettagli ?? undefined) as never,
          ip: ip ?? null,
        },
      });
    } catch (e) {
      this.log.warn(`track fallito (${tipo}): ${(e as Error).message}`);
    }
  }

  /** Retention: elimina gli eventi oltre la finestra (default 18 mesi). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOld() {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - this.retentionMonths);
    try {
      const { count } = await this.prisma.customerEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
      if (count) this.log.log(`Retention: eliminati ${count} eventi oltre ${this.retentionMonths} mesi`);
    } catch (e) {
      this.log.warn(`Retention fallita: ${(e as Error).message}`);
    }
  }

  /** Timeline eventi di un cliente (per l'admin). */
  async timeline(customerId: number, limit = 200) {
    return this.prisma.customerEvent.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 1000),
    });
  }
}
