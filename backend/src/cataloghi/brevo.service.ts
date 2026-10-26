import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BREVO_BASE = 'https://api.brevo.com/v3';

@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly apiKey: string | undefined;
  private readonly listId: number | undefined;
  private readonly domain: string;
  private attributePronto = false;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('BREVO_API_KEY') || undefined;
    this.listId = config.get<number>('BREVO_LIST_ID') || undefined;
    this.domain = config.get<string>('APP_DOMAIN') ?? 'http://localhost:3000';
  }

  /** true se BREVO_API_KEY è configurata (altrimenti le chiamate sono disattivate). */
  get attivo(): boolean {
    return !!this.apiKey;
  }

  /** Importa i contatti su Brevo con gli attributi NOME e CATALOGO_LINK. */
  async importaContatti(contatti: { email: string; nome: string | null; token: string }[], listName = 'Cataloghi'): Promise<number> {
    if (!this.apiKey) throw new Error('BREVO_API_KEY non configurata');
    if (contatti.length === 0) return 0;

    await this.ensureAttribute();

    const jsonBody = contatti.map((c) => ({
      email: c.email,
      attributes: { NOME: c.nome ?? '', CATALOGO_LINK: `${this.domain}/c/${c.token}` },
    }));

    const body: Record<string, unknown> = { jsonBody, updateExistingContacts: true };
    if (this.listId) {
      body.listIds = [this.listId];
    } else {
      body.newList = { listName, folderId: await this.primaFolder() };
    }

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

  /** Prima folder contatti disponibile (serve a newList quando BREVO_LIST_ID non è impostato). */
  private async primaFolder(): Promise<number> {
    if (!this.apiKey) throw new Error('BREVO_API_KEY non configurata');
    const res = await fetch(`${BREVO_BASE}/contacts/folders?limit=1&offset=0`, {
      headers: { 'api-key': this.apiKey },
    });
    if (!res.ok) throw new Error(`Brevo folders fallito (${res.status})`);
    const data = (await res.json()) as { folders?: { id: number }[] };
    const id = data.folders?.[0]?.id;
    if (!id) throw new Error('Brevo: nessuna folder contatti trovata');
    return id;
  }

  /** Crea l'attributo CATALOGO_LINK (una sola volta): Brevo ignora gli attributi inesistenti. */
  private async ensureAttribute(): Promise<void> {
    if (this.attributePronto || !this.apiKey) return;
    const res = await fetch(`${BREVO_BASE}/contacts/attributes/normal/CATALOGO_LINK`, {
      method: 'POST',
      headers: { 'api-key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'text' }),
    });
    if (res.ok || res.status === 400) this.attributePronto = true; // 400 = già esiste
    else this.logger.warn(`Brevo: creazione attributo CATALOGO_LINK fallita (${res.status})`);
  }
}
