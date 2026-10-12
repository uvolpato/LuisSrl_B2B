// Chiamate al backend solo lato server: il browser della vetrina non parla mai con l'API dati.
const BACKEND = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';

export type FamigliaPubblica = {
  codice: string;
  nome: string;
  descrizione: string | null;
  immagine: string | null;
  immagineAI: boolean;
};

export type ArticoloPubblico = {
  codiceLinea: string;
  nome: string;
  descrizione: string | null;
  famiglia: string | null;
  img: string | null;
  imgAI: boolean;
  varianti: { codice: string; dimensioni: string }[];
};

export type PaginaArticoli = { total: number; hasMore: boolean; articoli: ArticoloPubblico[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);

// Solo percorsi interni agli asset: niente URL esterni né path traversal.
const asset = (v: unknown) => {
  const s = str(v);
  return s && s.startsWith('/images/') && !s.includes('..') ? s : null;
};

/** /images/x.jpg → endpoint di ridimensionamento del backend (stesso schema di frontend/lib/thumb.ts). */
export const imgUrl = (src: string, w = 800) =>
  `/api/img?p=${encodeURIComponent(src.slice('/images/'.length))}&w=${w}`;

async function getJson(path: string): Promise<Raw | null> {
  try {
    const res = await fetch(`${BACKEND}/api/catalogo/pubblico/${path}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Famiglie per Collezioni e chip del catalogo. null se il backend non risponde o risponde male. */
export async function getFamiglie(): Promise<FamigliaPubblica[] | null> {
  const data = await getJson('famiglie');
  if (!Array.isArray(data)) return null;
  // Validazione al confine: si tiene solo ciò che serve, con i tipi attesi.
  return data.flatMap((f: Raw): FamigliaPubblica[] => {
    const codice = str(f?.codice);
    const nome = str(f?.nome);
    if (!codice || !nome) return [];
    return [{ codice, nome, descrizione: str(f?.descrizione), immagine: asset(f?.immagine), immagineAI: f?.immagineAI === true }];
  });
}

/** Pagina del catalogo pubblico (24 articoli). null se il backend non risponde o risponde male. */
export async function getArticoli(params: { famiglia?: string; q?: string; page?: number }): Promise<PaginaArticoli | null> {
  const qs = new URLSearchParams();
  if (params.famiglia) qs.set('famiglia', params.famiglia);
  if (params.q) qs.set('q', params.q);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  const data = await getJson(`articoli?${qs}`);
  if (!data || !Array.isArray(data.articoli)) return null;
  return {
    total: Number.isFinite(data.total) ? data.total : 0,
    hasMore: data.hasMore === true,
    articoli: data.articoli.flatMap((a: Raw): ArticoloPubblico[] => {
      const codiceLinea = str(a?.codiceLinea);
      const nome = str(a?.nome);
      if (!codiceLinea || !nome) return [];
      return [{
        codiceLinea,
        nome,
        descrizione: str(a?.descrizione),
        famiglia: str(a?.famiglia?.nome),
        img: asset(a?.img),
        imgAI: a?.imgAI === true,
        varianti: (Array.isArray(a?.varianti) ? a.varianti : []).flatMap((v: Raw) => {
          const codice = str(v?.codice);
          return codice ? [{ codice, dimensioni: str(v?.dimensioni) ?? '' }] : [];
        }),
      }];
    }),
  };
}
