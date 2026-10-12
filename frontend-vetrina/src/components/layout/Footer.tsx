import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const b = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

export default async function Footer() {
  const t = await getTranslations('footer');
  const tn = await getTranslations('nav');

  return (
    <footer className='site-foot'>
      <div className='container'>
        <div className='foot-grid'>
          <div className='foot-brand'>
            <img src='/images/vetrina/logo.webp' alt='Luis S.r.l.' />
            <p>{t.rich('brand', { b })}</p>
          </div>
          <div className='foot-col'>
            <h4>{t('navigazione')}</h4>
            <ul>
              <li><Link href='/'>{t('home')}</Link></li>
              <li><Link href='/#azienda'>{tn('azienda')}</Link></li>
              <li><Link href='/catalogo'>{tn('catalogo')}</Link></li>
              <li><a href='https://shop.luisbg.it' target='_blank' rel='noopener'>{t('shop')}</a></li>
              <li><Link href='/#contatti'>{t('contatti')}</Link></li>
            </ul>
          </div>
          <div className='foot-col'>
            <h4>{t('documenti')}</h4>
            <ul>
              <li><a href='#'>{t('privacy')}</a></li>
              <li><a href='#'>{t('cookie')}</a></li>
            </ul>
          </div>
          <div className='foot-col'>
            <h4>{t('contatti')}</h4>
            <ul>
              <li><a href='tel:+390350521957'>+39 035 0521957</a></li>
              <li><a href='mailto:contatti@luisbg.it'>contatti@luisbg.it</a></li>
              <li><Link href='/#accesso'>{tn('richiediAccesso')}</Link></li>
            </ul>
          </div>
        </div>
        <div className='foot-bottom'>
          <span>{t('legal')}</span>
          <span>{t.rich('credits', { b })}</span>
        </div>
      </div>
    </footer>
  );
}
