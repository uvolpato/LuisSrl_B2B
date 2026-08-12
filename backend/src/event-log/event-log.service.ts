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

  /** Query/lettura */
  async findAll(page = 1, limit = 50, eventType?: string, actorId?: number, entity?: string) {
    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (actorId) where.actorId = actorId;
    if (entity) where.entity = entity;
    const [items, total] = await Promise.all([
      this.prisma.eventLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.eventLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
