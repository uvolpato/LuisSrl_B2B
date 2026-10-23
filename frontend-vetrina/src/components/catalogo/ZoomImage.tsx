'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type Variante = { codice: string; dimensioni: string };

// Click sull'immagine → vista ingrandita: varianti a sinistra, immagine al centro,
// descrizione a destra. I testi compaiono in dissolvenza solo quando l'immagine è caricata.
export default function ZoomImage({ src, full, alt, ai, nome, descrizione, varianti }: {
  src: string;
  full: string;
  alt: string;
  ai: boolean;
  nome: string;
  descrizione: string | null;
  varianti: Variante[];
}) {
  const t = useTranslations('catalogo');
  const ref = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState(false);

  const open = () => {
    setLoaded(false);
    ref.current?.showModal();
  };

  const onLoad = () => setLoaded(true);

  return (
    <>
      <button type='button' className='zoom-trigger' onClick={open} aria-label={t('ingrandisci', { nome: alt })}>
        <img className='product-img' src={src} alt={alt} loading='lazy' />
      </button>
      <dialog ref={ref} className='lightbox' onClick={() => ref.current?.close()} aria-label={alt}>
        <button type='button' className='lightbox-close' aria-label={t('chiudi')}>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' width='22' height='22'><line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' /></svg>
        </button>
        <div className='lightbox-inner' onClick={(e) => e.stopPropagation()}>
          <div className={`lightbox-varianti ${loaded ? 'is-loaded' : ''}`}>
            <h3>{t('varianti', { n: varianti.length })}</h3>
            <ul className='variant-list'>
              {varianti.map((v) => (
                <li key={v.codice}>
                  <span className='v-code'>{v.codice}</span>
                  <span className='v-dim'>{v.dimensioni}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className='lightbox-figure'>
            <img src={full} alt={alt} loading='lazy' onLoad={onLoad} onError={onLoad} />
            {ai && <span className={`ai-badge ai-badge-lg ${loaded ? 'is-loaded' : ''}`} title={t('aiBadge')}>AI</span>}
          </div>
          <div className={`lightbox-desc ${loaded ? 'is-loaded' : ''}`}>
            <h2>{nome}</h2>
            {descrizione && <p>{descrizione}</p>}
          </div>
        </div>
      </dialog>
    </>
  );
}