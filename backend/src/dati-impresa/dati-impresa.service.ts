import { Injectable, Logger } from '@nestjs/common';

export interface DatiImpresa {
  ragioneSociale?: string | null;
  ateco?: string | null;
  settore?: string | null;
  fatturato?: number | null;
  addetti?: number | null;
  sede?: string | null;
  pec?: string | null;
}

/**
 * Fonte dati ufficiale per P.IVA (Registro Imprese / Cerved / Atoka / openapi.it / ...).
 * Provider-agnostica e deterministica (una chiamata, NON agentica).
 *
 * Config via env (feature disattivata se manca l'URL):
 *   DATI_IMPRESA_API_URL   es. https://api.openapi.it/IT-start/{piva}   ({piva} = placeholder)
 *   DATI_IMPRESA_API_KEY   token bearer (opzionale, dipende dal provider)
 *
 * Il mapping dei campi è best-effort su nomi comuni: così si può cambiare provider
 * senza toccare il codice, basta che il JSON contenga ateco/fatturato/addetti ecc.
 */
@Injectable()
export class DatiImpresaService {
  private readonly log = new Logger(DatiImpresaService.name);

  get abilitato(): boolean {
    return !!process.env.DATI_IMPRESA_API_URL;
  }

  async lookup(partitaIva?: string | null): Promise<DatiImpresa | null> {
    const piva = (partitaIva ?? '').replace(/\D/g, '');
    const base = process.env.DATI_IMPRESA_API_URL;
    if (!base || piva.length < 11) return null;

    const url = base.includes('{piva}') ? base.replace('{piva}', piva) : `${base.replace(/\/+$/, '')}/${piva}`;
    const key = process.env.DATI_IMPRESA_API_KEY;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      });
      if (!res.ok) {
        this.log.warn(`Dati impresa ${piva}: HTTP ${res.status}`);
        return null;
      }
      const json = (await res.json()) as Record<string, unknown>;
      return this.map(json);
    } catch (e) {
      this.log.warn(`Dati impresa ${piva} fallita: ${(e as Error).message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Estrae i campi da un JSON generico (molte API annidano sotto data/result/0). */
  private map(json: Record<string, unknown>): DatiImpresa | null {
    const root = this.unwrap(json);
    if (!root) return null;
    const num = (v: unknown): number | null => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') { const n = parseFloat(v.replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; }
      return null;
    };
    const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const pick = (...keys: string[]): unknown => { for (const k of keys) if (root[k] != null) return root[k]; return undefined; };

    const dati: DatiImpresa = {
      ragioneSociale: str(pick('denominazione', 'ragioneSociale', 'ragione_sociale', 'nome')),
      ateco: str(pick('ateco', 'codiceAteco', 'codice_ateco', 'atecoCode')),
      settore: str(pick('settore', 'descrizioneAteco', 'descrizione_ateco', 'attivita', 'ateco_descrizione')),
      fatturato: num(pick('fatturato', 'ricavi', 'revenue', 'fatturato_stimato', 'turnover')),
      addetti: num(pick('addetti', 'dipendenti', 'employees', 'numeroDipendenti', 'numero_dipendenti')),
      sede: str(pick('sede', 'comune', 'citta', 'indirizzo')),
      pec: str(pick('pec', 'emailPec')),
    };
    const haQualcosa = Object.values(dati).some((v) => v != null);
    return haQualcosa ? dati : null;
  }

  private unwrap(json: Record<string, unknown>): Record<string, unknown> | null {
    let cur: unknown = json;
    for (const k of ['data', 'result', 'results', 'response', 'impresa', 'azienda']) {
      if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[k];
    }
    if (Array.isArray(cur)) cur = cur[0];
    return cur && typeof cur === 'object' ? (cur as Record<string, unknown>) : null;
  }
}
