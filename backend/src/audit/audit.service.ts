import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorId: number | null;
    azione: string;
    entita?: string;
    entitaId?: string;
    dettagli?: unknown;
    esito?: 'OK' | 'KO';
    ip?: string;
    actorType?: 'admin' | 'customer';
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorType: params.actorType ?? 'admin',
        azione: params.azione,
        entita: params.entita ?? null,
        entitaId: params.entitaId ?? null,
        dettagli: params.dettagli ?? undefined,
        esito: params.esito ?? 'OK',
        ip: params.ip ?? null,
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
      },
    });
  }
}
