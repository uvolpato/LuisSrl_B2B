import { NextRequest } from 'next/server';

const BACKEND_URL: string = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';

/**
 * Upload dei cataloghi PDF (anche 300-400MB).
 * Non passa dalla rewrite /api/*: il proxy di Next chiude la richiesta a 30s e,
 * su un file così grande, il caricamento non fa in tempo. Qui il body viene
 * inoltrato in streaming al backend senza attese artificiali.
 */
export async function POST(request: NextRequest) {
  const headers = new Headers();
  for (const name of ['content-type', 'content-length', 'cookie', 'x-csrf-token']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/cataloghi`, {
      method: 'POST',
      headers,
      body: request.body,
      // duplice necessario a fetch per inviare un body in streaming
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    const out = new Headers();
    const type = res.headers.get('content-type');
    if (type) out.set('content-type', type);
    return new Response(res.body, { status: res.status, headers: out });
  } catch (e) {
    return Response.json(
      { message: 'Errore di connessione al backend: ' + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  }
}
