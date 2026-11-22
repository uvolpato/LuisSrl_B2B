'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SITE } from '@/lib/siteConfig';

export default function Header() {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className='site-nav'>
      <div className='container'>
        <div className='nav-inner'>
          <Link className='nav-logo' href='/' onClick={close}>
            <img src={SITE.logo} alt={SITE.logoAlt} />
          </Link>
          <nav className={open ? 'nav-links open' : 'nav-links'} onClick={close}>
            <Link href='/#azienda'>{t('azienda')}</Link>
            <Link href='/#collezioni'>{t('collezioni')}</Link>
            <Link href='/catalogo'>{t('catalogo')}</Link>
            <a href='https://shop.luisbg.it' target='_blank' rel='noopener'>{t('b2b')}</a>
            <Link href='/#contatti'>{t('contatti')}</Link>
            <Link className='btn btn-primary btn-arrow nav-cta' href='/#accesso'>{t('richiediAccesso')}</Link>
          </nav>
          <div className='nav-right'>
            <button
              className='nav-toggle'
              type='button'
              aria-label={t('menu')}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
