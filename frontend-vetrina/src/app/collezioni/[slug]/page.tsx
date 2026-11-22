import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getArticoli, getFamiglie, imgUrl } from '@/lib/api';
import ZoomImage from '@/components/catalogo/ZoomImage';
import Composizione from '@/components/catalogo/Composizione';

type Params = { slug: string };

export async function generateStaticParams() {
  const famiglie = await getFamiglie();
  return (famiglie ?? []).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const famiglie = await getFamiglie();
  const f = famiglie?.find((x) => x.slug === slug);
  if (!f) return { title: 'Collezione non trovata — Luis S.r.l.', robots: { index: false } };
  return {
    title: `${f.nome} — Collezione Luis S.r.l.`,
    description: f.descrizione ?? `Scopri la collezione ${f.nome} di Luis S.r.l.: modelli, codici e dimensioni. Prezzi e disponibilità riservati ai rivenditori registrati.`,
    alternates: { canonical: `/collezioni/${slug}` },
  };
}

export default async function CollezionePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [t, tc, tnav, famiglie] = await Promise.all([
    getTranslations('collezione'),
    getTranslations('catalogo'),
    getTranslations('nav'),
    getFamiglie(),
  ]);
  const f = famiglie?.find((x) => x.slug === slug);
  if (!f) notFound();

  const pagina = await getArticoli({ famiglia: f.codice });

  return (
    <>
      <div className='vetrina-banner'>
        <div className='container'>
          <span>{tc('banner')}</span>
          <Link href='/#accesso'>{tc('bannerLink')}</Link>
        </div>
      </div>

      <section className='catalog-top'>
        <div className='container'>
          <div className='collezione-header'>
            <div className='collezione-copy'>
              <nav className='breadcrumb' aria-label={t('bricioleLabel')}>
                <Link href='/'>{tnav('home')}</Link>
                <span aria-hidden='true'>›</span>
                <Link href='/#collezioni'>{tnav('collezioni')}</Link>
                <span aria-hidden='true'>›</span>
                <span aria-current='page'>{f.nome}</span>
              </nav>
              <p className='eyebrow'>{t('eyebrow')}</p>
              <h1 className='h1'>{f.nome}</h1>
              <p className='lead'>{f.descrizione ?? t('leadDefault', { nome: f.nome })}</p>
            </div>
            {f.immagine && (
              <div className='collezione-media'>
                <img src={imgUrl(f.immagine)} alt={f.nome} />
                {f.immagineAI && <span className='ai-badge' title={tc('aiBadge')}>AI</span>}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className='container'>
        {!pagina ? (
          <p className='catalog-empty'>{tc('nonDisponibile')}</p>
        ) : pagina.articoli.length === 0 ? (
          <p className='catalog-empty'>{tc('vuoto')}</p>
        ) : (
          <>
            <p className='catalog-count'>{tc('conteggio', { n: pagina.total })}</p>
            <div className='product-grid'>
              {pagina.articoli.map((a) => (
                <article key={a.codiceLinea} className='product-card'>
                  <div className='linea-media'>
                    {a.img ? <ZoomImage src={imgUrl(a.img)} full={imgUrl(a.img, 1600)} alt={a.nome} ai={a.imgAI} nome={a.nome} descrizione={a.descrizione} varianti={a.varianti} /> : <div className='product-img' />}
                    {a.imgAI && <span className='ai-badge' title={tc('aiBadge')}>AI</span>}
                  </div>
                  <div className='product-body'>
                    <h3 className='product-name'>{a.nome}</h3>
                    <ul className='variant-list'>
                      {a.varianti.map((v) => (
                        <li key={v.codice}>
                          <span className='v-code'>{v.codice}</span>
                          <span className='v-dim'>{v.dimensioni}</span>
                        </li>
                      ))}
                    </ul>
                    {a.varianti.filter((v) => v.componenti.length > 0).map((v) => (
                      <Composizione key={v.codice} codice={v.codice} componenti={v.componenti} />
                    ))}
                    <div className='product-foot'>
                      <span className='product-variants'>{tc('varianti', { n: a.varianti.length })}</span>
                      <Link className='product-lock' href='/#accesso'>{tc('prezziRiservati')}</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      <section className='catalog-cta'>
        <div className='container'>
          <div>
            <h2>{tc('ctaTitle')}</h2>
            <p>{tc('ctaText')}</p>
          </div>
          <Link className='btn btn-primary btn-arrow' href='/#accesso'>{tc('ctaButton')}</Link>
        </div>
      </section>
    </>
  );
}
