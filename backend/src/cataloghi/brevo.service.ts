import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BREVO_BASE = 'https://api.brevo.com/v3';

@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly apiKey: string | undefined;
  private readonly listId: number | undefined;
  private readonly domain: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('BREVO_API_KEY') || undefined;
    this.listId = config.get<number>('BREVO_LIST_ID') || undefined;
    this.domain = config.get<string>('APP_DOMAIN') ?? 'http://localhost:3000';
  }

  /** true se BREVO_API_KEY è configurata (altrimenti le chiamate sono disattivate). */
  get attivo(): boolean {
    return !!this.apiKey;
  }

  /** Importa i contatti su Brevo con gli attributi EMAIL, NOME, CATALOGO_LINK. */
  async importaContatti(contatti: { email: string; nome: string | null; token: string }[]): Promise<number> {
    if (!this.apiKey) throw new Error('BREVO_API_KEY non configurata');
    if (contatti.length === 0) return 0;

    const csv = this.csv(contatti);
    const fileBody = Buffer.from(csv, 'utf-8').toString('base64');
    const body: Record<string, unknown> = { fileBody, updateExistingContacts: true };
    if (this.listId) body.listIds = [this.listId];

    const res = await fetch(`${BREVO_BASE}/contacts/import`, {
      method: 'POST',
      headers: { 'api-key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const testo = await res.text();
      throw new Error(`Brevo import fallito (${res.status}): ${testo.slice(0, 300)}`);
    }
    this.logger.log(`Brevo: import avviato per ${contatti.length} contatti`);
    return contatti.length;
  }

  private csv(contatti: { email: string; nome: string | null; token: string }[]): string {
    const riga = (v: string) => (v.includes(';') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
    const header = 'EMAIL;NOME;CATALOGO_LINK';
    const rows = contatti.map((c) => `${riga(c.email)};${riga(c.nome ?? '')};${this.domain}/c/${c.token}`);
    return [header, ...rows].join('\n');
  }
}
