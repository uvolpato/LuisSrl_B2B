import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { SyncService } from './sync.service';
import { IntegrazioneService } from './integrazione.service';
import { CronExpressionParser } from 'cron-parser';

export interface SyncConfigRow {
  tipo: string;
  label: string;
  cron_expression: string;
  attivo: boolean;
  solo_manuale: boolean;
  ultima_esecuzione: Date | null;
  ultimo_esito: string | null;
  ultimo_errore: string | null;
  prossima_esecuzione: Date | null;
}

export interface SyncLogRow {
  id: number;
  entity: string;
  status: string;
  rows_total: number | null;
  rows_ok: number | null;
  rows_error: number | null;
  error_text: string | null;
  started_at: Date;
  completed_at: Date | null;
}

@Injectable()
export class SyncManagerService implements OnModuleInit {
  private readonly logger = new Logger(SyncManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: SyncService,
    private readonly integrazioneService: IntegrazioneService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    await this.registerAllFromDb();
  }

  private async registerAllFromDb() {
    try {
      const configs = await this.prisma.$queryRawUnsafe<SyncConfigRow[]>(
        'SELECT * FROM sync_config',
      );
      for (const cfg of configs) {
        if (cfg.attivo && !cfg.solo_manuale) {
          this.registerJob(cfg.tipo, cfg.cron_expression);
        }
      }
      this.logger.log(`Registrati ${configs.length} sync config`);
    } catch (err) {
      this.logger.warn('Impossibile leggere sync_config (tabella non ancora creata?)');
    }
  }

  private registerJob(tipo: string, cronExpression: string) {
    try {
      this.schedulerRegistry.deleteCronJob(tipo);
    } catch { /* non esiste ancora */ }

    const job = new CronJob(cronExpression, async () => {
      await this.runSync(tipo);
    });
    this.schedulerRegistry.addCronJob(tipo, job);
    job.start();

    this.updateProssimaEsecuzione(tipo);
    this.logger.log(`Cron job '${tipo}' registrato: ${cronExpression}`);
  }

  unregisterJob(tipo: string) {
    try {
      this.schedulerRegistry.deleteCronJob(tipo);
      this.logger.log(`Cron job '${tipo}' rimosso`);
    } catch { /* non esiste */ }
  }

  async getConfigs(): Promise<SyncConfigRow[]> {
    return this.prisma.$queryRawUnsafe<SyncConfigRow[]>(
      'SELECT * FROM sync_config ORDER BY tipo',
    );
  }

  async updateConfig(tipo: string, data: { cron_expression?: string; attivo?: boolean; solo_manuale?: boolean }) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (data.cron_expression !== undefined) {
      sets.push(`cron_expression = $${idx++}`);
      vals.push(data.cron_expression);
    }
    if (data.attivo !== undefined) {
      sets.push(`attivo = $${idx++}`);
      vals.push(data.attivo);
    }
    if (data.solo_manuale !== undefined) {
      sets.push(`solo_manuale = $${idx++}`);
      vals.push(data.solo_manuale);
    }

    if (sets.length) {
      vals.push(tipo);
      await this.prisma.$executeRawUnsafe(
        `UPDATE sync_config SET ${sets.join(', ')}, aggiornato_il = now() WHERE tipo = $${idx}`,
        ...vals,
      );
    }

    // Riavvio il job se la configurazione è cambiata
    if (data.cron_expression !== undefined || data.attivo !== undefined || data.solo_manuale !== undefined) {
      try {
        this.schedulerRegistry.deleteCronJob(tipo);
      } catch { /* non esiste */ }

      const configs = await this.prisma.$queryRawUnsafe<SyncConfigRow[]>(
        'SELECT * FROM sync_config WHERE tipo = $1', tipo,
      );
      if (configs.length && configs[0].attivo && !configs[0].solo_manuale) {
        this.registerJob(tipo, configs[0].cron_expression);
      }
    }

    return this.getConfigs().then(c => c.find(x => x.tipo === tipo));
  }

  async runSync(tipo: string, isManual = false): Promise<{ esito: string; errore?: string }> {
    const startedAt = new Date();
    const errorToStr = (err: unknown) => err instanceof Error ? err.message : String(err);

    try {
      let result: import('./sync.service').SyncResult;

      switch (tipo) {
        case 'articoli':
          result = await this.syncService.sync();
          break;
        case 'listini':
          result = await this.syncService.syncListini();
          break;
        case 'giacenze':
          result = await this.syncService.syncGiacenza();
          break;
        case 'ordini':
          result = await this.syncService.syncOrdini();
          // Dopo sync ordini, propaga in ordini_clienti per tutti i clienti con codice_cliente
          await this.propagaOrdiniClienti();
          break;
        default:
          return { esito: 'errore', errore: `Tipo sconosciuto: ${tipo}` };
      }

      const esito = result.status === 'ok' || result.status === 'completed' ? 'ok' : 'errore';
      const errore = result.errorText || undefined;

      await this.prisma.$executeRawUnsafe(
        `UPDATE sync_config SET ultima_esecuzione = $1, ultimo_esito = $2, ultimo_errore = $3, aggiornato_il = now() WHERE tipo = $4`,
        startedAt, esito, errore || null, tipo,
      );
      await this.updateProssimaEsecuzione(tipo);

      return { esito, errore };
    } catch (err) {
      const msg = errorToStr(err);
      await this.prisma.$executeRawUnsafe(
        `UPDATE sync_config SET ultima_esecuzione = $1, ultimo_esito = 'errore', ultimo_errore = $2, aggiornato_il = now() WHERE tipo = $3`,
        startedAt, msg, tipo,
      );
      await this.updateProssimaEsecuzione(tipo);
      return { esito: 'errore', errore: msg };
    }
  }

  private async propagaOrdiniClienti() {
    const clienti = await this.prisma.$queryRawUnsafe<{ id: number; codice_cliente: string }[]>(
      "SELECT id, codice_cliente FROM customers WHERE codice_cliente IS NOT NULL AND codice_cliente != ''",
    );
    let totali = 0;
    for (const c of clienti) {
      try {
        const r = await this.integrazioneService.syncOrdiniCliente(c.codice_cliente);
        totali += r.importati;
      } catch { /* skip */ }
    }
    if (totali > 0) {
      this.logger.log(`Propagati ${totali} ordini in ordini_clienti`);
    }
  }

  private async updateProssimaEsecuzione(tipo: string) {
    const next = await this.nextRunTime(tipo);
    if (next) {
      await this.prisma.$executeRawUnsafe(
        'UPDATE sync_config SET prossima_esecuzione = $1 WHERE tipo = $2', next, tipo,
      );
    }
  }

  async getLogs(tipo?: string, limit = 50): Promise<SyncLogRow[]> {
    if (tipo) {
      return this.prisma.$queryRawUnsafe<SyncLogRow[]>(
        'SELECT * FROM sync_log WHERE entity = $1 ORDER BY started_at DESC LIMIT $2',
        tipo, limit,
      );
    }
    return this.prisma.$queryRawUnsafe<SyncLogRow[]>(
      'SELECT * FROM sync_log ORDER BY started_at DESC LIMIT $1', limit,
    );
  }

  async getProssimaEsecuzione(tipo: string): Promise<Date | null> {
    const rows = await this.prisma.$queryRawUnsafe<{ prossima_esecuzione: Date | null }[]>(
      'SELECT prossima_esecuzione FROM sync_config WHERE tipo = $1', tipo,
    );
    return rows.length ? rows[0].prossima_esecuzione : null;
  }

  async nextRunTime(tipo: string): Promise<Date | null> {
    const rows = await this.prisma.$queryRawUnsafe<{ cron_expression: string }[]>(
      'SELECT cron_expression FROM sync_config WHERE tipo = $1 AND attivo = true AND solo_manuale = false', tipo,
    );
    if (!rows.length) return null;
    try {
      const interval = CronExpressionParser.parse(rows[0].cron_expression);
      return interval.next().toDate();
    } catch {
      return null;
    }
  }
}
