import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mapSpError } from '../common/sp-error';
import type { CustomerRow } from '../common/customer-row';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async spCreate(params: {
    actorId: number | null;
    email: string;
    passwordHash: string;
    nome: string;
    ragioneSociale?: string;
    partitaIva?: string;
    telefono?: string;
    preferredLanguage?: string;
    ip?: string;
  }): Promise<CustomerRow> {
    try {
      const [row] = await this.prisma.$queryRaw<CustomerRow[]>`
        SELECT * FROM customers.fn_customer_create(
          ${params.actorId}::int, ${params.email}, ${params.passwordHash},
          ${params.nome}, ${params.ragioneSociale ?? null},
          ${params.partitaIva ?? null}, ${params.telefono ?? null},
          ${params.preferredLanguage ?? 'it'}, ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spUpdate(params: {
    actorId: number;
    customerId: number;
    nome?: string;
    ragioneSociale?: string;
    partitaIva?: string;
    telefono?: string;
    preferredLanguage?: string;
    ip?: string;
  }): Promise<CustomerRow> {
    try {
      const [row] = await this.prisma.$queryRaw<CustomerRow[]>`
        SELECT * FROM customers.fn_customer_update(
          ${params.actorId}::int, ${params.customerId}::int,
          ${params.nome ?? null}, ${params.ragioneSociale ?? null},
          ${params.partitaIva ?? null}, ${params.telefono ?? null},
          ${params.preferredLanguage ?? null}, ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spSetBlocked(params: {
    actorId: number;
    customerId: number;
    blocked: boolean;
    ip?: string;
  }): Promise<CustomerRow> {
    try {
      const [row] = await this.prisma.$queryRaw<CustomerRow[]>`
        SELECT * FROM customers.fn_customer_set_blocked(
          ${params.actorId}::int, ${params.customerId}::int,
          ${params.blocked}, ${params.ip ?? null}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }

  async spSetPassword(params: {
    actorId: number;
    customerId: number;
    passwordHash: string;
    mustChange: boolean;
    ip?: string;
    /** 'admin' (reset da admin) o 'customer' (cambio password del cliente stesso). */
    actorType?: 'admin' | 'customer';
  }): Promise<CustomerRow> {
    try {
      const [row] = await this.prisma.$queryRaw<CustomerRow[]>`
        SELECT * FROM customers.fn_customer_set_password(
          ${params.actorId}::int, ${params.customerId}::int,
          ${params.passwordHash}, ${params.mustChange}, ${params.ip ?? null},
          ${params.actorType ?? 'admin'}
        )`;
      return row;
    } catch (e) {
      mapSpError(e);
    }
  }
}
