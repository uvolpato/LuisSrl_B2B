import { getTranslations } from 'next-intl/server';

export default async function StatsBand() {
  const t = await getTranslations('stats');

  return (
    <section className='section stats-band'>
      <div className='container'>
        <div className='section-head reveal'>
          <p className='eyebrow'>{t('eyebrow')}</p>
          <h2 className='h2'>{t('title')}</h2>
        </div>
        <div className='stats'>
          <div className='stat reveal'>
            <div className='stat-num'>30</div>
            <div className='stat-label'>{t('anno')}</div>
          </div>
          <div className='stat reveal' style={{ '--d': '120ms' } as React.CSSProperties}>
            <div className='stat-num'>2000<span className='unit'>+</span></div>
            <div className='stat-label'>{t('referenze')}</div>
          </div>
          <div className='stat reveal' style={{ '--d': '240ms' } as React.CSSProperties}>
            <div className='stat-num'>40<span className='unit'>+</span></div>
            <div className='stat-label'>{t('linee')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
