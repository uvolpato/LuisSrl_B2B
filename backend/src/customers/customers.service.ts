import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Customer } from '@prisma/client';
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
    invitato?: 'si' | 'no';
    page: number;
    pageSize: number;
    sort?: string;
    dir?: 'asc' | 'desc';
  }): Promise<{ items: CustomerProfile[]; total: number }> {
    const where: Prisma.CustomerWhereInput = {
      ...(params.stato ? { stato: params.stato } : {}),
      ...(params.invitato === 'no' ? { invitatoAt: null } : params.invitato === 'si' ? { invitatoAt: { not: null } } : {}),
      ...(params.q
        ? { OR: [
            { email: { contains: params.q, mode: 'insensitive' } },
            { nome: { contains: params.q, mode: 'insensitive' } },
            { ragioneSociale: { contains: params.q, mode: 'insensitive' } },
          ]}
        : {}),
    };
    const dir = params.dir === 'desc' ? 'desc' : 'asc';
    const skip = (params.page - 1) * params.pageSize;
    const take = params.pageSize;

    const SORT_MAP: Record<string, string> = {
      cliente: 'ragioneSociale',
      piva: 'partitaIva',
      stato: 'stato',
      createdAt: 'createdAt',
    };

    let rawItems: Customer[];
    let total: number;

    if (params.sort === 'ordini') {
      // Ordinamento per numero ordini (campo calcolato): recupera gli id ordinati
      // tramite subquery di conteggio, poi carica le righe mantenendo l'ordine.
      const conds: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      if (params.stato) { conds.push(`c.stato = $${i}`); vals.push(params.stato); i++; }
      if (params.q) {
        conds.push(`(c.email ILIKE $${i} OR c.nome ILIKE $${i} OR c."ragione_sociale" ILIKE $${i})`);
        vals.push(`%${params.q}%`); i++;
      }
      const whereSql = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const ids = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT c.id FROM "customers" c
         LEFT JOIN (SELECT codice_cliente, count(*) n FROM integra_ordini GROUP BY codice_cliente) o
           ON o.codice_cliente = c."codice_cliente"
         ${whereSql}
         ORDER BY COALESCE(o.n, 0) ${dir}
         LIMIT $${i} OFFSET $${i + 1}`,
        ...vals, take, skip,
      );
      const ordered = ids.length
        ? await this.prisma.customer.findMany({ where: { id: { in: ids.map((x) => x.id) } } })
        : [];
      const byId = new Map(ordered.map((c) => [c.id, c]));
      rawItems = ids.map((x) => byId.get(x.id)).filter((c): c is Customer => !!c);
      total = await this.prisma.customer.count({ where });
    } else {
      const orderBy = (params.sort && SORT_MAP[params.sort]
        ? { [SORT_MAP[params.sort]]: dir }
        : { createdAt: 'desc' }) as Prisma.CustomerOrderByWithRelationInput;
      [rawItems, total] = await Promise.all([
        this.prisma.customer.findMany({ where, orderBy, skip, take }),
        this.prisma.customer.count({ where }),
      ]);
    }

    const profiles = rawItems.map(toCustomerProfile);
    await this.resolvePagamentoDescrizioni(profiles);

    const codici = profiles.map((p) => p.codiceCliente).filter((c): c is string => !!c);
    if (codici.length) {
      try {
        const anno = new Date().getFullYear();
        const oc = await this.prisma.$queryRawUnsafe<{ codice_cliente: string; n: bigint; n_anno: bigint }[]>(
          `SELECT codice_cliente, count(*) as n, count(*) FILTER (WHERE anno_ordine = $2) as n_anno FROM integra_ordini WHERE codice_cliente = ANY($1) GROUP BY codice_cliente`,
          codici,
          anno,
        );
        const map = new Map<string, { n: number; n_anno: number }>();
        for (const o of oc) map.set(String(o.codice_cliente), { n: Number(o.n), n_anno: Number(o.n_anno) });
        for (const p of profiles) {
          const c = map.get(p.codiceCliente ?? '');
          if (c) { p.numOrdini = c.n; p.numOrdiniAnno = c.n_anno; }
        }
      } catch {
        // integra_ordini non disponibile (sync ordini mai eseguito): lascia 0
      }
    }

    return { items: profiles, total };
  }

  async getById(id: number): Promise<CustomerProfile | null> {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) return null;
    const p = toCustomerProfile(c);
    await this.resolvePagamentoDescrizioni([p]);
    return p;
  }

  private async resolvePagamentoDescrizioni(profiles: CustomerProfile[]) {
    const codici = [...new Set(profiles.map((p) => p.codicePagamento).filter(Boolean) as string[])];
    if (!codici.length) return;
    const pagamenti = await this.prisma.modalitaPagamento.findMany({
      where: { codice: { in: codici } },
      select: { codice: true, descrizione: true },
    });
    const map = new Map(pagamenti.map((p) => [p.codice, p.descrizione]));
    for (const p of profiles) {
      if (p.codicePagamento) p.codicePagamentoDescrizione = map.get(p.codicePagamento) ?? null;
    }
  }

  async create(
    actorId: number,
    dto: CreateCustomerDto,
    ip: string | undefined,
  ): Promise<{ user: CustomerProfile; provisionalPassword: string }> {
    const provisionalPassword = generateProvisionalPassword();
    const email = dto.email.toLowerCase();
    // Email unica tra clienti E utenti admin (il login cerca prima negli utenti).
    const existing = await this.prisma.customer.findFirst({ where: { email } });
    const existingUser = await this.prisma.user.findFirst({ where: { email } });
    if (existing || existingUser) throw new ConflictException('users.email_exists');
    if (dto.partitaIva) {
      const pivaExists = await this.prisma.customer.findFirst({ where: { partitaIva: dto.partitaIva } });
      if (pivaExists) throw new ConflictException('users.piva_exists');
    }

    const customer = await this.prisma.customer.create({
      data: {
        email,
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

    // L'email è l'identificativo di login: normalizza (lowercase) e verifica
    // che non sia già usata da un altro cliente/utente.
    let newEmail: string | undefined;
    if (dto.email !== undefined) {
      newEmail = dto.email.toLowerCase();
      if (newEmail !== existing.email) {
        const dup = await this.prisma.customer.findFirst({ where: { email: newEmail, NOT: { id: customerId } } });
        const dupUser = await this.prisma.user.findFirst({ where: { email: newEmail } });
        if (dup || dupUser) throw new ConflictException('users.email_exists');
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(newEmail !== undefined && { email: newEmail }),
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

  /** Invia (o reinvia) l'invito B2B: genera password temporanea, la invia via email
   *  e marca invitatoAt. La password compare SOLO nell'email, mai nella risposta API. */
  async invita(
    actorId: number,
    customerId: number,
    ip: string | undefined,
  ): Promise<CustomerProfile> {
    const existing = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) throw new NotFoundException('users.not_found');
    if (!existing.email || !existing.email.includes('@')) throw new ConflictException('customers.email_non_valida');

    const provisionalPassword = generateProvisionalPassword();
    // Prima l'email: se l'invio fallisce non tocchiamo la password del cliente
    await this.mail.sendInvito(existing.email, existing.ragioneSociale || existing.nome, provisionalPassword);

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        passwordHash: await hashPassword(provisionalPassword),
        mustChangePassword: true,
        invitatoAt: new Date(),
        stato: 'ATTIVO',
      },
    });
    await this.audit.log({ actorId, azione: 'customer.invita', entita: 'customers', entitaId: String(customerId), ip });
    return toCustomerProfile(updated);
  }

  /** Invito massivo: procede cliente per cliente e riporta gli esiti (non si ferma al primo errore). */
  async invitaBulk(
    actorId: number,
    customerIds: number[],
    ip: string | undefined,
  ): Promise<{ inviati: number[]; falliti: { id: number; errore: string }[] }> {
    const inviati: number[] = [];
    const falliti: { id: number; errore: string }[] = [];
    for (const id of customerIds) {
      try {
        await this.invita(actorId, id, ip);
        inviati.push(id);
      } catch (e) {
        falliti.push({ id, errore: e instanceof Error ? e.message : 'errore' });
      }
    }
    return { inviati, falliti };
  }

  async getIndirizzi(customerId: number) {
    return this.prisma.indirizzoCliente.findMany({
      where: { customerId },
      orderBy: { id: 'asc' },
    });
  }

  async getContatti(customerId: number) {
    return this.prisma.contattoCliente.findMany({
      where: { customerId },
      orderBy: { data: 'desc' },
    });
  }

  private readonly SORT_FIELDS = ['numeroOrdine', 'dataOrdine', 'stato', 'importoTotale'] as const;

  async getOrdini(
    customerId: number,
    search?: string,
    page = 1,
    limit = 50,
    sortBy?: string,
    sortDir?: string,
    year?: string,
  ) {
    const where: any = { customerId };

    if (year) {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        const start = new Date(`${y}-01-01T00:00:00.000Z`);
        const end = new Date(`${y + 1}-01-01T00:00:00.000Z`);
        where.dataOrdine = { gte: start, lt: end };
      }
    }

    if (search) {
      const isNumeric = /^\d+$/.test(search);
      where.OR = [
        { numeroOrdine: { contains: search, mode: 'insensitive' } },
        ...(isNumeric ? [{ importoTotale: Number(search) }] : []),
        { righe: { some: { codiceProdotto: { contains: search, mode: 'insensitive' } } } },
        { righe: { some: { descrizione: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const field: string = sortBy && this.SORT_FIELDS.includes(sortBy as any) ? sortBy : 'dataOrdine';
    const dir: 'asc' | 'desc' = sortDir === 'asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      this.prisma.ordineCliente.findMany({
        where,
        orderBy: { [field]: dir },
        include: { righe: { orderBy: { id: 'asc' } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ordineCliente.count({ where }),
    ]);

    const years: number[] = await this.prisma.$queryRawUnsafe<{ anno: number }[]>(
      `SELECT DISTINCT EXTRACT(YEAR FROM data_ordine) AS anno FROM ordini_clienti WHERE customer_id = $1 AND data_ordine IS NOT NULL ORDER BY anno DESC`,
      customerId,
    ).then((rows) => rows.map((r) => r.anno));

    return { items, total, years };
  }

  async deleteCustomer(actorId: number, customerId: number, ip: string | undefined) {
    const existing = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) throw new NotFoundException('users.not_found');
    await this.prisma.customer.delete({ where: { id: customerId } });
    await this.audit.log({ actorId, azione: 'customer.delete', entita: 'customers', entitaId: String(customerId), ip });
  }
}
