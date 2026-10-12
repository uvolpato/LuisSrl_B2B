import { getTranslations } from 'next-intl/server';

const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const VALORI = [
  { k: 'assortimento', icon: <svg {...svg}><path d='M3 7l9-4 9 4-9 4-9-4z'/><path d='M3 12l9 4 9-4'/><path d='M3 17l9 4 9-4'/></svg> },
  { k: 'qualita', icon: <svg {...svg}><path d='M12 2l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17l-5.9 3 1.2-6.5L2.5 8.9 9.1 8z'/></svg> },
  { k: 'consegna', icon: <svg {...svg}><path d='M1 3h15v13H1z'/><path d='M16 8h4l3 3v5h-7z'/><circle cx='5.5' cy='18.5' r='2'/><circle cx='18.5' cy='18.5' r='2'/></svg> },
  { k: 'supporto', icon: <svg {...svg}><path d='M4 4h16v12H5.2L4 18z'/><path d='M8 9h8M8 12h5'/></svg> },
] as const;

export default async function Valori() {
  const t = await getTranslations('valori');

  return (
    <section className='section'>
      <div className='container'>
        <div className='section-head reveal'>
          <p className='eyebrow'>{t('eyebrow')}</p>
          <h2 className='h2'>{t('title')}</h2>
        </div>
        <div className='values'>
          {VALORI.map((v, i) => (
            <article key={v.k} className='value-card reveal' style={{ '--d': `${i * 90}ms` } as React.CSSProperties}>
              <div className='value-mark'>{v.icon}</div>
              <h3>{t(`${v.k}Title`)}</h3>
              <p>{t(`${v.k}Text`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
