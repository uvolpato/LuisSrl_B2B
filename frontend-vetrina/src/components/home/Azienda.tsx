import { getTranslations } from 'next-intl/server';

const d = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

export default async function Azienda() {
  const t = await getTranslations('azienda');

  return (
    <section className='section' id='azienda'>
      <div className='container split'>
        <div className='split-media reveal-img'>
          <img src='/images/vetrina/vasi-bianchi.webp' alt={t('alt')} />
        </div>
        <div className='split-text'>
          <p className='eyebrow reveal'>{t('eyebrow')}</p>
          <h2 className='h2 reveal' style={d(70)}>{t('title')}</h2>
          <p className='reveal' style={d(140)}>{t.rich('p1', { b: (c) => <strong>{c}</strong> })}</p>
          <p className='reveal' style={d(210)}>{t('p2')}</p>
          <ul className='facts reveal' style={d(280)}>
            <li>{t('fact1')}</li>
            <li>{t('fact2')}</li>
            <li>{t('fact3')}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
