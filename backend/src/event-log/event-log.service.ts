import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { reqCtx } from '../common/request-context';

export interface EventLogData {
  eventType: string;
  action: string;
  entity?: string;
  entityId?: string;
  data?: Record<string, unknown>;
  status?: string;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class EventLogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Logga un evento nel sistema centralizzato */
  async log(params: EventLogData) {
    const ctx = reqCtx.getStore();
    try {
      await this.prisma.eventLog.create({
        data: {
          eventType: params.eventType,
          action: params.action,
          actorId: ctx?.actorId ?? null,
          actorType: ctx?.actorType ?? null,
          entity: params.entity ?? null,
          entityId: params.entityId ?? null,
          data: (params.data ?? undefined) as any,
          requestId: ctx?.requestId ?? null,
          sessionId: null,
          ip: params.ip ?? ctx?.ip ?? null,
          userAgent: params.userAgent ?? null,
          status: params.status ?? 'ok',
          durationMs: params.durationMs ?? null,
        },
      });
    } catch { /* fire-and-forget: non bloccare mai */ }
  }

  /** Accesso HTTP */
  async logAccess(method: string, url: string, status: number, duration: number, label: string) {
    return this.log({
      eventType: 'access',
      action: label,
      data: { method, url, status, duration },
      status: status < 400 ? 'ok' : 'error',
      durationMs: duration,
    });
  }

  /** Errore/eccezione */
  async logError(action: string, message: string, status: number, details?: Record<string, unknown>) {
    return this.log({
      eventType: 'error',
      action,
      data: { message, status, ...details },
      status: 'error',
    });
  }

  /** Mutazione dati (create/update/delete) */
  async logMutation(action: string, entity: string, entityId: string, data: Record<string, unknown>) {
    return this.log({
      eventType: 'mutation',
      action,
      entity,
      entityId,
      data,
    });
  }

  /** Evento di business (login, ordine, carrello) */
  async logBusiness(action: string, data?: Record<string, unknown>) {
    return this.log({
      eventType: 'business',
      action,
      data,
    });
  }

  /** Sincronizzazione batch */
  async logSync(action: string, data?: Record<string, unknown>, status = 'ok') {
    return this.log({
      eventType: 'sync',
      action,
      data,
      status,
    });
  }

  /** Query/lettura con filtri */
  async findAll(page = 1, limit = 50, eventType?: string, dateFrom?: string, dateTo?: string, search?: string) {
    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (dateFrom) where.createdAt = { ...(where.createdAt || {}), gte: new Date(dateFrom) };
    if (dateTo) where.createdAt = { ...(where.createdAt || {}), lte: new Date(dateTo + 'T23:59:59.999Z') };
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.eventLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.eventLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    return this.prisma.eventLog.findUnique({ where: { id } });
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.eventLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [total24h, error24h, access24h, avgDuration] = await Promise.all([
      this.prisma.eventLog.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.eventLog.count({ where: { createdAt: { gte: last24h }, eventType: 'error' } }),
      this.prisma.eventLog.count({ where: { createdAt: { gte: last24h }, eventType: 'access' } }),
      this.prisma.$queryRawUnsafe<{ avg: number }[]>(
        `SELECT COALESCE(AVG(duration_ms), 0)::int AS avg FROM event_log WHERE event_type = 'access' AND created_at >= $1`, last24h,
      ),
    ]);
    return {
      total24h: Number(total24h),
      error24h: Number(error24h),
      access24h: Number(access24h),
      avgDurationMs: avgDuration?.[0]?.avg ?? 0,
    };
  }
}
