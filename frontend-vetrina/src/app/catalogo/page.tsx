import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getArticoli, getFamiglie, imgUrl } from '@/lib/api';
import ZoomImage from '@/components/catalogo/ZoomImage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: t('catalogTitle'), description: t('catalogDescription') };
}

type Search = { famiglia?: string | string[]; q?: string | string[]; page?: string | string[] };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v.trim() : '');

export default async function CatalogoPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const famiglia = one(sp.famiglia).slice(0, 50);
  const q = one(sp.q).slice(0, 100);
  const page = Math.min(Math.max(parseInt(one(sp.page), 10) || 1, 1), 100);

  const [t, famiglie, pagina] = await Promise.all([getTranslations('catalogo'), getFamiglie(), getArticoli({ famiglia, q, page })]);

  // Link che preservano gli altri filtri (URLSearchParams fa l'encoding).
  const href = (p: { famiglia?: string; q?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (p.famiglia) qs.set('famiglia', p.famiglia);
    if (p.q) qs.set('q', p.q);
    if (p.page && p.page > 1) qs.set('page', String(p.page));
    const s = qs.toString();
    return s ? `/catalogo?${s}` : '/catalogo';
  };

  return (
    <>
      <div className='vetrina-banner'>
        <div className='container'>
          <span>{t('banner')}</span>
          <Link href='/#accesso'>{t('bannerLink')}</Link>
        </div>
      </div>

      <section className='catalog-top'>
        <div className='container'>
          <p className='eyebrow'>{t('eyebrow')}</p>
          <h1 className='h1' style={{ fontSize: 'clamp(32px,4.6vw,52px)' }}>{t('title')}</h1>
          <p className='lead'>{t('lead')}</p>
        </div>
      </section>

      <div className='container'>
        <div className='catalog-toolbar'>
          {/* Form GET: funziona anche senza JS e lascia la ricerca nell'URL. */}
          <form className='catalog-search' action='/catalogo' method='get'>
            {famiglia && <input type='hidden' name='famiglia' value={famiglia} />}
            <input type='search' name='q' defaultValue={q} maxLength={100} placeholder={t('cerca')} aria-label={t('cercaLabel')} />
          </form>
          <div className='chips'>
            <Link className={famiglia ? 'chip' : 'chip active'} href={href({ q })}>{t('tutti')}</Link>
            {(famiglie ?? []).map((f) => (
              <Link key={f.codice} className={f.codice === famiglia ? 'chip active' : 'chip'} href={href({ famiglia: f.codice, q })}>
                {f.nome}
              </Link>
            ))}
          </div>
        </div>
        {pagina && <p className='catalog-count'>{t('conteggio', { n: pagina.total })}</p>}
      </div>

      <main className='container'>
        {!pagina ? (
          <p className='catalog-empty'>{t('nonDisponibile')}</p>
        ) : pagina.articoli.length === 0 ? (
          <p className='catalog-empty'>{t('vuoto')}</p>
        ) : (
          <div className='product-grid'>
            {pagina.articoli.map((a) => (
              <article key={a.codiceLinea} className='product-card'>
                <div className='linea-media'>
                  {a.img ? <ZoomImage src={imgUrl(a.img)} full={imgUrl(a.img, 1600)} alt={a.nome} ai={a.imgAI} nome={a.nome} descrizione={a.descrizione} varianti={a.varianti} /> : <div className='product-img' />}
                  {a.imgAI && <span className='ai-badge' title={t('aiBadge')}>AI</span>}
                </div>
                <div className='product-body'>
                  {a.famiglia && <span className='product-kind'>{a.famiglia}</span>}
                  <h3 className='product-name'>{a.nome}</h3>
                  {a.descrizione && <p className='product-desc'>{a.descrizione}</p>}
                  <ul className='variant-list'>
                    {a.varianti.map((v) => (
                      <li key={v.codice}>
                        <span className='v-code'>{v.codice}</span>
                        <span className='v-dim'>{v.dimensioni}</span>
                      </li>
                    ))}
                  </ul>
                  <div className='product-foot'>
                    <span className='product-variants'>{t('varianti', { n: a.varianti.length })}</span>
                    <Link className='product-lock' href='/#accesso'>{t('prezziRiservati')}</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {pagina && (page > 1 || pagina.hasMore) && (
          <nav className='catalog-pager' aria-label={t('pagine')}>
            {page > 1 ? <Link className='btn btn-secondary' href={href({ famiglia, q, page: page - 1 })}>{t('precedenti')}</Link> : <span />}
            {pagina.hasMore && <Link className='btn btn-secondary' href={href({ famiglia, q, page: page + 1 })}>{t('successivi')}</Link>}
          </nav>
        )}
      </main>

      <section className='catalog-cta'>
        <div className='container'>
          <div>
            <h2>{t('ctaTitle')}</h2>
            <p>{t('ctaText')}</p>
          </div>
          <Link className='btn btn-primary btn-arrow' href='/#accesso'>{t('ctaButton')}</Link>
        </div>
      </section>
    </>
  );
}
