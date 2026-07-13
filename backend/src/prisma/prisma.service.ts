import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { auditExtension } from '../common/audit.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor() {
    const url = new URL(process.env.DATABASE_URL!);
    const schema = url.searchParams.get('schema') || 'public';
    url.searchParams.delete('schema');
    const pool = new Pool({ connectionString: url.toString() });
    const adapter = new PrismaPg(pool, { schema });
    super({ adapter });
    this.pool = pool;
    return this.$extends(auditExtension) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.pool.end();
    await this.$disconnect();
  }
}
