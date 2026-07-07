import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  generateProvisionalPassword,
  hashPassword,
} from '../common/password';
import { toCustomerProfile } from '../common/auth-types';
import type { CustomerProfile } from '../common/auth-types';
import { MailService } from '../mail/mail.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async list(params: {
    q?: string;
    stato?: 'ATTIVO' | 'BLOCCATO';
    page: number;
    pageSize: number;
  }): Promise<{ items: CustomerProfile[]; total: number }> {
    const where: Prisma.CustomerWhereInput = {
      ...(params.stato ? { stato: params.stato } : {}),
      ...(params.q
        ? { OR: [
            { email: { contains: params.q, mode: 'insensitive' } },
            { nome: { contains: params.q, mode: 'insensitive' } },
            { ragioneSociale: { contains: params.q, mode: 'insensitive' } },
          ]}
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items: items.map(toCustomerProfile), total };
  }

  async getById(id: number): Promise<CustomerProfile | null> {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    return c ? toCustomerProfile(c) : null;
  }

  async create(
    actorId: number,
    dto: CreateCustomerDto,
    ip: string | undefined,
  ): Promise<{ user: CustomerProfile; provisionalPassword: string }> {
    const provisionalPassword = generateProvisionalPassword();
    const existing = await this.prisma.customer.findFirst({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('users.email_exists');
    if (dto.partitaIva) {
      const pivaExists = await this.prisma.customer.findFirst({ where: { partitaIva: dto.partitaIva } });
      if (pivaExists) throw new ConflictException('users.piva_exists');
    }

    const customer = await this.prisma.customer.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await hashPassword(provisionalPassword),
        nome: dto.nome,
        ragioneSociale: dto.ragioneSociale ?? null,
        partitaIva: dto.partitaIva ?? null,
        telefono: dto.telefono ?? null,
        telefonoFisso: dto.telefonoFisso ?? null,
        sitoWeb: dto.sitoWeb ?? null,
        preferredLanguage: dto.preferredLanguage ?? 'it',
      },
    });
    await this.audit.log({ actorId, azione: 'customer.create', entita: 'customers', entitaId: String(customer.id), ip });
    this.mail.sendProvisionalPassword(dto.email, customer.nome, provisionalPassword, false).catch(() => {});
    return { user: toCustomerProfile(customer), provisionalPassword };
  }

  async update(
    actorId: number,
    customerId: number,
    dto: UpdateCustomerDto,
    ip: string | undefined,
  ): Promise<CustomerProfile> {
    const existing = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) throw new NotFoundException('users.not_found');

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.ragioneSociale !== undefined && { ragioneSociale: dto.ragioneSociale }),
        ...(dto.partitaIva !== undefined && { partitaIva: dto.partitaIva }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.telefonoFisso !== undefined && { telefonoFisso: dto.telefonoFisso }),
        ...(dto.sitoWeb !== undefined && { sitoWeb: dto.sitoWeb }),
        ...(dto.preferredLanguage !== undefined && { preferredLanguage: dto.preferredLanguage }),
      },
    });
    await this.audit.log({ actorId, azione: 'customer.update', entita: 'customers', entitaId: String(customerId), ip });
    return toCustomerProfile(updated);
  }

  async setBlocked(
    actorId: number,
    customerId: number,
    blocked: boolean,
    ip: string | undefined,
  ): Promise<CustomerProfile> {
    const existing = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) throw new NotFoundException('users.not_found');

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { stato: blocked ? 'BLOCCATO' : 'ATTIVO' },
    });
    await this.audit.log({
      actorId, azione: blocked ? 'customer.block' : 'customer.unblock',
      entita: 'customers', entitaId: String(customerId), ip,
    });
    return toCustomerProfile(updated);
  }

  async resetPassword(
    actorId: number,
    customerId: number,
    ip: string | undefined,
  ): Promise<{ user: CustomerProfile; provisionalPassword: string }> {
    const existing = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) throw new NotFoundException('users.not_found');

    const provisionalPassword = generateProvisionalPassword();
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash: await hashPassword(provisionalPassword), mustChangePassword: true },
    });
    await this.audit.log({ actorId, azione: 'customer.password_reset', entita: 'customers', entitaId: String(customerId), ip });
    this.mail.sendProvisionalPassword(updated.email, updated.nome, provisionalPassword, true).catch(() => {});
    return { user: toCustomerProfile(updated), provisionalPassword };
  }
}
