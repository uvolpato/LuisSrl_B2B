import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getFamiglie, imgUrl } from '@/lib/api';

export default async function Collezioni() {
  const [t, ta, famiglie] = await Promise.all([getTranslations('collezioni'), getTranslations('catalogo'), getFamiglie()]);

  return (
    <section className='section' id='collezioni'>
      <div className='container'>
        <div className='section-head reveal'>
          <p className='eyebrow'>{t('eyebrow')}</p>
          <h2 className='h2'>{t('title')}</h2>
          <p className='lead'>{t('lead')}</p>
        </div>
        {!famiglie ? (
          <p className='lead'>{t('nonDisponibili')}</p>
        ) : (
          <div className='grid-3'>
            {famiglie.map((f, i) => (
              <Link key={f.codice} className='linea-card reveal' style={{ '--d': `${(i % 3) * 90}ms` } as React.CSSProperties} href={`/catalogo?famiglia=${encodeURIComponent(f.codice)}`}>
                <div className='linea-media'>
                  {f.immagine ? <img src={imgUrl(f.immagine)} alt={f.nome} /> : <div className='linea-placeholder' />}
                  {f.immagineAI && <span className='ai-badge' title={ta('aiBadge')}>AI</span>}
                </div>
                <div className='linea-body'>
                  <span className='linea-kind'>{t('kind')}</span>
                  <h3>{f.nome}</h3>
                  {f.descrizione && <p>{f.descrizione}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
