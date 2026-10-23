'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ATTIVO = true;
// Flag di modulo: si azzera a ogni caricamento completo (arrivo da fuori o refresh),
// persiste nella navigazione interna (es. catalogo → home).
let autoOpened = false;
const DATES: [string, string, string][] = [
  ['2026-10-25', '25', 'Ottobre'],
  ['2026-11-08', '8', 'Novembre'],
  ['2026-11-15', '15', 'Novembre'],
  ['2026-11-22', '22', 'Novembre'],
  ['2026-11-29', '29', 'Novembre'],
  ['2026-12-06', '6', 'Dicembre'],
  ['2026-12-13', '13', 'Dicembre'],
];

export default function PopupAperture() {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [past, setPast] = useState<string[]>([]);
  const snowBackRef = useRef<HTMLDivElement>(null);
  const snowFrontRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const fillSnow = useCallback(() => {
    const back = snowBackRef.current;
    const front = snowFrontRef.current;
    if (!back || !front) return;
    const n = Math.max(24, Math.min(120, Math.round((window.innerWidth * window.innerHeight) / 8000)));
    const frontN = Math.round(n * 0.4);
    const backN = n - frontN;
    const fill = (el: HTMLDivElement, count: number) => {
      if (el.dataset.n === String(count)) return;
      el.dataset.n = String(count);
      el.textContent = '';
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const f = document.createElement('i');
        const s = 6 + Math.random() * 16;
        const d = 5 + s / 2 + Math.random() * 4;
        f.textContent = '\u2744\uFE0E';
        f.style.setProperty('--x', (Math.random() * 98).toFixed(2) + '%');
        f.style.setProperty('--s', s.toFixed(0) + 'px');
        f.style.setProperty('--d', d.toFixed(2) + 's');
        f.style.setProperty('--dl', (Math.random() * d).toFixed(2) + 's');
        f.style.setProperty('--amp', (4 + Math.random() * 12).toFixed(0) + 'px');
        f.style.setProperty('--o', (0.45 + Math.random() * 0.4).toFixed(2));
        frag.appendChild(f);
      }
      el.appendChild(frag);
    };
    fill(front, frontN);
    fill(back, backN);
  }, []);

  const openPopup = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setPast(DATES.filter(([iso]) => new Date(iso + 'T00:00:00') < today).map(([iso]) => iso));
    setOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setShown(false);
    setOpen(false);
    lastFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!ATTIVO) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hasFuture = DATES.some(([iso]) => new Date(iso + 'T00:00:00') >= today);
    fillSnow();
    let resizeT: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(fillSnow, 250);
    };
    const onOpen = () => openPopup();
    window.addEventListener('resize', onResize);
    window.addEventListener('luis-popup-open', onOpen);
    const shouldAutoOpen = hasFuture && !autoOpened;
    if (shouldAutoOpen) autoOpened = true;
    const auto = shouldAutoOpen ? setTimeout(openPopup, 1500) : undefined;
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('luis-popup-open', onOpen);
      clearTimeout(resizeT);
      if (auto) clearTimeout(auto);
    };
  }, [fillSnow, openPopup]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopup(); };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closePopup]);

  if (!ATTIVO) return null;

  return (
    <div
      className={shown ? 'pp-overlay pp-open' : 'pp-overlay'}
      hidden={!open}
      onClick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
    >
      <div className='pp-snow pp-snow-back' aria-hidden='true' ref={snowBackRef} />
      <div className='pp-card' role='dialog' aria-modal='true' aria-labelledby='pp-title'>
        <img className='pp-band' src='/images/vetrina/splah_natale.jpg' alt='Allestimento natalizio Luis' />
        <button ref={closeRef} className='pp-close' type='button' aria-label='Chiudi il popup' onClick={closePopup}>✕</button>
        <div className='pp-body'>
          <p className='pp-eyebrow'>Luis S.r.l. · Bergamo · dal 1995</p>
          <h2 className='pp-title' id='pp-title'>Aperture domenicali Natale 2026</h2>
          <p className='pp-lead'>Nelle prossime domeniche apriamo lo showroom di Bergamo:<br /><strong style={{ display: 'block', textAlign: 'center' }}>Via F. Bellafino 28/30 (c/o Centro Galassia)</strong> Vi aspettiamo per scoprire dal vivo le nostre collezioni di vasi da esterno e interno.</p>
          <p className='pp-badge'>Domenica · 10:00 – 19:00</p>
          <ul className='pp-dates'>
            {DATES.map(([iso, day, mon]) => (
              <li key={iso} data-date={iso} className={past.includes(iso) ? 'is-past' : undefined}>
                <span className='pp-dow'>Dom</span>
                <span className='pp-day'>{day}</span>
                <span className='pp-mon'>{mon}</span>
              </li>
            ))}
          </ul>
          <p className='pp-ig'>Seguici su Instagram <a href='https://www.instagram.com/luis_bg/' target='_blank' rel='noopener'>@luis_bg</a></p>
        </div>
      </div>
      <div className='pp-snow pp-snow-front' aria-hidden='true' ref={snowFrontRef} />
    </div>
  );
}
