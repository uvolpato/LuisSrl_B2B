'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';

// Click sull'immagine → vista ingrandita come nel dettaglio articolo del B2B.
// <dialog> nativo: Esc, focus e livello sopra la pagina gestiti dal browser.
export default function ZoomImage({ src, full, alt, ai }: { src: string; full: string; alt: string; ai: boolean }) {
  const t = useTranslations('catalogo');
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type='button' className='zoom-trigger' onClick={() => ref.current?.showModal()} aria-label={t('ingrandisci', { nome: alt })}>
        <img className='product-img' src={src} alt={alt} loading='lazy' />
      </button>
      <dialog ref={ref} className='lightbox' onClick={() => ref.current?.close()} aria-label={alt}>
        <button type='button' className='lightbox-close' aria-label={t('chiudi')}>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' width='22' height='22'><line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' /></svg>
        </button>
        <img src={full} alt={alt} loading='lazy' onClick={(e) => e.stopPropagation()} />
        {ai && <span className='ai-badge ai-badge-lg' title={t('aiBadge')}>AI</span>}
      </dialog>
    </>
  );
}
