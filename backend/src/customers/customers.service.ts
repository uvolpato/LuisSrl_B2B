import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersRepository } from './customers.repository';
import {
  generateProvisionalPassword,
  hashPassword,
} from '../common/password';
import {
  customerRowToProfile,
  customerToProfile,
  CustomerProfile,
} from '../common/customer-row';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: CustomersRepository,
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
        ? {
            OR: [
              { email: { contains: params.q, mode: 'insensitive' } },
              { nome: { contains: params.q, mode: 'insensitive' } },
              { ragioneSociale: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items: items.map(customerToProfile), total };
  }

  async getById(id: number): Promise<CustomerProfile | null> {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    return c ? customerToProfile(c) : null;
  }

  async create(
    actorId: number,
    dto: CreateCustomerDto,
    ip: string | undefined,
  ): Promise<{ customer: CustomerProfile; provisionalPassword: string }> {
    const provisionalPassword = generateProvisionalPassword();
    const row = await this.repo.spCreate({
      actorId,
      email: dto.email,
      passwordHash: await hashPassword(provisionalPassword),
      nome: dto.nome,
      ragioneSociale: dto.ragioneSociale,
      partitaIva: dto.partitaIva,
      telefono: dto.telefono,
      preferredLanguage: dto.preferredLanguage,
      ip,
    });
    return { customer: customerRowToProfile(row), provisionalPassword };
  }

  async update(
    actorId: number,
    customerId: number,
    dto: UpdateCustomerDto,
    ip: string | undefined,
  ): Promise<CustomerProfile> {
    const row = await this.repo.spUpdate({ actorId, customerId, ...dto, ip });
    return customerRowToProfile(row);
  }

  async setBlocked(
    actorId: number,
    customerId: number,
    blocked: boolean,
    ip: string | undefined,
  ): Promise<CustomerProfile> {
    const row = await this.repo.spSetBlocked({ actorId, customerId, blocked, ip });
    return customerRowToProfile(row);
  }

  async resetPassword(
    actorId: number,
    customerId: number,
    ip: string | undefined,
  ): Promise<{ customer: CustomerProfile; provisionalPassword: string }> {
    const provisionalPassword = generateProvisionalPassword();
    const row = await this.repo.spSetPassword({
      actorId,
      customerId,
      passwordHash: await hashPassword(provisionalPassword),
      mustChange: true,
      ip,
    });
    return { customer: customerRowToProfile(row), provisionalPassword };
  }
}
