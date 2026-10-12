import { getTranslations } from 'next-intl/server';

export default async function Marchi() {
  const t = await getTranslations('marchi');

  return (
    <section className='section'>
      <div className='container'>
        <div className='section-head reveal'>
          <p className='eyebrow'>{t('eyebrow')}</p>
          <h2 className='h2'>{t('title')}</h2>
        </div>
        <div className='brands'>
          <article className='brand-card reveal'>
            <img src='/images/vetrina/catalogo-pottery-pots.webp' alt='Pottery Pots' />
            <div className='brand-txt'>
              <h3>Pottery Pots</h3>
              <p>{t('potteryText')}</p>
            </div>
          </article>
          <article className='brand-card reveal' style={{ '--d': '120ms' } as React.CSSProperties}>
            <img src='/images/vetrina/catalogo-capi-europe.webp' alt='Capi Europe' />
            <div className='brand-txt'>
              <h3>Capi Europe</h3>
              <p>{t('capiText')}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
