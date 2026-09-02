import { Injectable, Logger } from '@nestjs/common';
import { AiUsageService } from '../ai-usage/ai-usage.service';

/**
 * Genera embedding testuali per la ricerca semantica.
 * Provider astratto dietro un'unica interfaccia: oggi Gemini (stessa GEMINI_API_KEY
 * gia' usata per descrizioni/immagini), domani il Mini PC LM Studio in LAN.
 * Cambio provider = variabile d'ambiente, non refactor.
 *
 *   EMBEDDINGS_PROVIDER = gemini | local     (default gemini)
 *   EMBEDDINGS_MODEL    = gemini-embedding-001 | <modello LM Studio>
 *   EMBEDDINGS_DIM      = 768                 (deve coincidere con la colonna vector(N))
 *   EMBEDDINGS_URL      = http://mini-pc:1234/v1   (solo provider local)
 *
 * NB dimensione: se il Mini PC usa un modello con dim diversa (es. 1024), aggiornare
 * EMBEDDINGS_DIM, la colonna text_vec e rilanciare il backfill.
 */
@Injectable()
export class EmbeddingService {
  private readonly log = new Logger(EmbeddingService.name);

  readonly provider = process.env.EMBEDDINGS_PROVIDER || 'gemini';
  readonly dim = parseInt(process.env.EMBEDDINGS_DIM || '768', 10);
  private readonly model =
    process.env.EMBEDDINGS_MODEL ||
    (this.provider === 'gemini' ? 'gemini-embedding-001' : 'text-embedding-nomic-embed-text-v1.5');

  constructor(private readonly aiUsage: AiUsageService) {}

  // Cache in-memory (LRU) query → embedding: evita richiami API per ricerche
  // ripetute. Cap + TTL via env; zero infrastruttura (monoprocesso locale).
  // ponytail: se un giorno servirà multi-istanza/persistenza, sostituire con Redis.
  private readonly cache = new Map<string, { vec: number[]; ts: number }>();
  private readonly cacheMax = parseInt(process.env.EMBEDDINGS_CACHE_MAX || '2000', 10);
  private readonly cacheTtlMs = parseInt(process.env.EMBEDDINGS_CACHE_TTL_H || '24', 10) * 3600_000;

  /** Ritorna il vettore, o null se il provider non e' configurato/raggiungibile (non deve rompere il flusso). */
  async embedText(text: string): Promise<number[] | null> {
    const clean = text.trim();
    if (!clean) return null;

    // Chiave normalizzata (case/whitespace): "Vasi terracotta" == "vasi terracotta".
    const key = clean.toLowerCase().replace(/\s+/g, ' ');
    const hit = this.cache.get(key);
    if (hit) {
      if (Date.now() - hit.ts < this.cacheTtlMs) {
        this.cache.delete(key);
        this.cache.set(key, hit); // LRU: riporta in fondo come usato di recente
        return hit.vec;
      }
      this.cache.delete(key);
    }

    try {
      const vec = this.provider === 'local' ? await this.embedLocal(clean) : await this.embedGemini(clean);
      // embedContent non ritorna i token: stima ~4 char/token (solo per il costo).
      void this.aiUsage.record({ tipo: 'embedding', modello: this.model, tokenIn: Math.ceil(clean.length / 4) });
      this.cacheSet(key, vec);
      return vec;
    } catch (e) {
      this.log.warn(`embedText fallito (provider=${this.provider}): ${(e as Error).message}`);
      return null;
    }
  }

  private cacheSet(key: string, vec: number[]) {
    this.cache.delete(key);
    this.cache.set(key, { vec, ts: Date.now() });
    if (this.cache.size > this.cacheMax) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }

  private async embedGemini(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY mancante');
    const base = (process.env.EMBEDDINGS_URL || 'https://generativelanguage.googleapis.com/v1beta/models/').replace(/\/+$/, '');
    const url = `${base}/${this.model}:embedContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: `models/${this.model}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: this.dim,
      }),
    });
    if (!res.ok) throw new Error(`Gemini embed ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    const data = (await res.json()) as { embedding?: { values?: number[] } };
    const v = data.embedding?.values;
    if (!v?.length) throw new Error('risposta senza embedding');
    return v;
  }

  // LM Studio / OpenAI-compatibile: POST {EMBEDDINGS_URL}/embeddings
  private async embedLocal(text: string): Promise<number[]> {
    const base = (process.env.EMBEDDINGS_URL || 'http://localhost:1234/v1').replace(/\/+$/, '');
    const res = await fetch(`${base}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: text }),
    });
    if (!res.ok) throw new Error(`local embed ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
    const data = (await res.json()) as { data?: { embedding?: number[] }[] };
    const v = data.data?.[0]?.embedding;
    if (!v?.length) throw new Error('risposta senza embedding');
    return v;
  }

  /** Letterale array Postgres: {0.1,0.2,...} per cast ::double precision[] */
  toArrayLiteral(v: number[]): string {
    return `{${v.join(',')}}`;
  }

  /** Similarita' coseno tra due vettori della stessa dimensione. */
  static cosine(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    const den = Math.sqrt(na) * Math.sqrt(nb);
    return den ? dot / den : 0;
  }
}
