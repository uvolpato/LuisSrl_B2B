import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import HeroImages from './HeroImages';

export default async function Hero() {
  const t = await getTranslations('hero');

  return (
    <section className='hero'>
      <HeroImages />
      <div className='hero-veil' />
      <div className='hero-body'>
        <div className='container'>
          <div className='hero-inner'>
            <span className='hero-badge'>{t('badge')}</span>
            <p className='eyebrow'>{t('eyebrow')}</p>
            <h1 className='h1'>{t('title')}</h1>
            <p className='lead'>{t('lead')}</p>
            <div className='hero-cta'>
              <Link className='btn btn-primary btn-arrow' href='/#accesso'>{t('ctaAccesso')}</Link>
              <Link className='btn btn-light' href='/catalogo'>{t('ctaCatalogo')}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}