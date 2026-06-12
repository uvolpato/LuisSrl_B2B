import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Punto unico di scrittura dell'audit applicativo.
 * Le stored procedure di entita' (fn_user_*) scrivono gia' il proprio audit:
 * questo servizio copre le azioni senza scrittura propria (login, logout).
 */
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
  }): Promise<void> {
    await this.prisma.$queryRaw`
      SELECT fn_audit_log(
        ${params.actorId}::int, ${params.azione},
        ${params.entita ?? null}, ${params.entitaId ?? null},
        ${params.dettagli === undefined ? null : JSON.stringify(params.dettagli)}::jsonb,
        ${params.esito ?? 'OK'}, ${params.ip ?? null}
      )`;
  }

  async logLoginAttempt(params: {
    email: string;
    success: boolean;
    userId: number | null;
    motivo?: string;
    ip?: string;
  }): Promise<void> {
    await this.prisma.$queryRaw`
      SELECT fn_auth_log_attempt(
        ${params.email}, ${params.success},
        ${params.userId}::int, ${params.motivo ?? null}, ${params.ip ?? null}
      )`;
  }
}
