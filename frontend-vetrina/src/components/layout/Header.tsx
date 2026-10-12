'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

const LINGUE = ['it', 'en'] as const;

// Stesso meccanismo del portale B2B: cookie `lang` letto da i18n/request.ts.
function setLangCookie(lang: string) {
  document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
}

export default function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  function switchLang(lang: string) {
    setLangCookie(lang);
    router.refresh();
  }

  return (
    <header className='site-nav'>
      <div className='container'>
        <div className='nav-inner'>
          <Link className='nav-logo' href='/' onClick={close}>
            <img src='/images/vetrina/logo.webp' alt='Luis S.r.l.' />
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
            <div className='lang-switch' role='group' aria-label={t('lingua')}>
              {LINGUE.map((l) => (
                <button key={l} type='button' aria-pressed={l === locale} onClick={() => switchLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
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
