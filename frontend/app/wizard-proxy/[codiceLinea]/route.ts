import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ codiceLinea: string }> },
) {
  const { codiceLinea } = await context.params;
  const body = await request.json();
  const backendUrl: string = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';
  const cookie = request.headers.get('cookie') || '';
  const csrfToken = request.headers.get('x-csrf-token') || '';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(
      `${backendUrl}/api/integrazione/articoli/${encodeURIComponent(codiceLinea)}/descrizione/wizard`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { message: 'Errore di connessione al backend: ' + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
