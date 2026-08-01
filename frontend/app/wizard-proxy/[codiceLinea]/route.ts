import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL: string = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';
// La generazione chiama Gemini più volte in sequenza (una per immagine CARICATA
// + il testo finale): può superare i 2 minuti per articoli con più foto.
const REQUEST_TIMEOUT_MS = 300_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

/** Solo errori di rete transitori (backend in restart/breve down): il backend
 *  non ha ricevuto la richiesta, quindi il retry è sicuro. Un abort da timeout
 *  (AbortError, niente cause.code) NON viene ritentato. */
function isRetryableNetworkError(e: unknown): boolean {
  const cause = (e as { cause?: { code?: string } })?.cause;
  return typeof cause?.code === 'string' && cause.code.length > 0;
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_ATTEMPTS && isRetryableNetworkError(e)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else if (attempt < MAX_ATTEMPTS) {
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastErr;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ codiceLinea: string }> },
) {
  const { codiceLinea } = await context.params;
  const body = await request.json();
  const cookie = request.headers.get('cookie') || '';
  const csrfToken = request.headers.get('x-csrf-token') || '';

  try {
    const res = await fetchWithRetry(
      `${BACKEND_URL}/api/integrazione/articoli/${encodeURIComponent(codiceLinea)}/descrizione/wizard`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(body),
      },
    );

    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { message: 'Errore di connessione al backend: ' + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  }
}
