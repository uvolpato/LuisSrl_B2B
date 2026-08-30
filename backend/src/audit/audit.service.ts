import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { reqCtx } from '../common/request-context';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorId?: number | null;
    azione: string;
    entita?: string;
    entitaId?: string;
    dettagli?: unknown;
    esito?: 'OK' | 'KO';
    ip?: string;
    actorType?: 'admin' | 'customer';
    durationMs?: number | null;
  }): Promise<void> {
    const ctx = reqCtx.getStore();
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorType: params.actorType ?? ctx?.actorType ?? null,
        azione: params.azione,
        entita: params.entita ?? null,
        entitaId: params.entitaId ?? null,
        dettagli: params.dettagli ?? undefined,
        esito: params.esito ?? 'OK',
        ip: params.ip ?? ctx?.ip ?? null,
        requestId: ctx?.requestId ?? null,
        durationMs: params.durationMs ?? null,
      },
    });
  }

  async logLoginAttempt(params: {
    email: string;
    success: boolean;
    userId: number | null;
    motivo?: string;
    ip?: string;
    actorType?: 'admin' | 'customer';
  }): Promise<void> {
    const ctx = reqCtx.getStore();
    await this.prisma.auditLog.create({
      data: {
        actorId: params.userId,
        actorType: params.actorType ?? 'admin',
        azione: params.success ? 'auth.login_success' : 'auth.login_failed',
        entita: 'auth',
        dettagli: {
          email: params.email,
          motivo: params.motivo,
        },
        esito: params.success ? 'OK' : 'KO',
        ip: params.ip ?? null,
        requestId: ctx?.requestId ?? null,
      },
    });
  }

  /** Accesso HTTP (interceptor). Fire-and-forget: non deve mai bloccare la risposta. */
  async logAccess(method: string, url: string, status: number, duration: number, label: string) {
    void this.log({
      azione: 'http.access',
      entita: 'http',
      dettagli: { method, url, status, label },
      esito: status < 400 ? 'OK' : 'KO',
      durationMs: duration,
    }).catch(() => {});
  }

  /** Eccezione/errore HTTP (filtro globale). */
  async logError(action: string, message: string, status: number, details?: Record<string, unknown>) {
    void this.log({
      azione: 'http.error',
      entita: 'http',
      dettagli: { label: action, message, status, ...details },
      esito: 'KO',
    }).catch(() => {});
  }

  async findAll(page = 1, limit = 50, categoria?: string, dateFrom?: string, dateTo?: string, search?: string) {
    const where: any = {};
    if (categoria === 'access') where.azione = 'http.access';
    else if (categoria === 'error') where.azione = 'http.error';
    else if (categoria === 'audit') where.azione = { notIn: ['http.access', 'http.error'] };
    if (dateFrom) where.createdAt = { ...(where.createdAt || {}), gte: new Date(dateFrom) };
    if (dateTo) where.createdAt = { ...(where.createdAt || {}), lte: new Date(dateTo + 'T23:59:59.999Z') };
    if (search) {
      where.OR = [
        { azione: { contains: search, mode: 'insensitive' } },
        { entita: { contains: search, mode: 'insensitive' } },
        { entitaId: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items: items.map((i) => ({ ...i, id: String(i.id) })), total, page, limit };
  }

  async findOne(id: number) {
    const row = await this.prisma.auditLog.findUnique({ where: { id } });
    return row ? { ...row, id: String(row.id) } : null;
  }

  async findByEntity(entita: string, entitaId: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: { entita, entitaId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({ ...r, id: String(r.id) }));
  }

  async getStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [total24h, error24h, access24h, avgDuration] = await Promise.all([
      this.prisma.auditLog.count({ where: { createdAt: { gte: last24h } } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: last24h }, azione: 'http.error' } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: last24h }, azione: 'http.access' } }),
      this.prisma.$queryRawUnsafe<{ avg: number }[]>(
        `SELECT COALESCE(AVG(duration_ms), 0)::int AS avg FROM audit_log WHERE azione = 'http.access' AND created_at >= $1`, last24h,
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
