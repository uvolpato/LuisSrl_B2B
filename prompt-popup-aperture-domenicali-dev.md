# Prompt per opencode — Popup "Aperture domenicali" nel sito vetrina Next.js

Incolla tutto il testo sotto come prompt. Workdir: `C:\Progetti\Luis Srl - B2B`.

---

## Incarico

Replica **in modo identico** il popup "Aperture domenicali 2026" del prototipo statico nel sito vetrina in sviluppo (`frontend-vetrina`, Next.js 16 App Router + next-intl).

Fonte di verità (non modificare): `Prototipo Sito Vetrina/popup_main.html`, `Prototipo Sito Vetrina/index.html` (blocco "Popup aperture domenicali" e CSS iniettato), `Prototipo Sito Vetrina/popup-config.js`.

Vincoli:

- Non toccare nulla in `Prototipo Sito Vetrina/`, `Rivendita Privati/`, `frontend/`, `backend/`.
- Stessi testi, stesse date, stessa grafica, stesse animazioni, stesso comportamento.
- Solo homepage: apertura automatica una volta per utente dopo 1,5 s, link nel footer per riaprire.
- Niente fetch/DOMParser: componente React client.
- Italiano hardcoded (il prototipo non è tradotto). Non aggiungere chiavi i18n.

## 1. Asset

Copia `Rivendita Privati/img/splah_natale.jpg` in `frontend-vetrina/public/images/vetrina/splah_natale.jpg` (crea la cartella solo se manca; `public/images/vetrina/` esiste già). Stesso file, nessuna ottimizzazione.

## 2. Componente popup

Crea `frontend-vetrina/src/components/home/PopupAperture.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ATTIVO = true;
const KEY = 'luis-popup-seen';
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
  const snowRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const fillSnow = useCallback(() => {
    const snow = snowRef.current;
    if (!snow) return;
    const n = Math.max(24, Math.min(120, Math.round((window.innerWidth * window.innerHeight) / 8000)));
    if (snow.dataset.n === String(n)) return;
    snow.dataset.n = String(n);
    snow.textContent = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
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
    snow.appendChild(frag);
  }, []);

  const openPopup = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setShown(false);
    setOpen(false);
    try { localStorage.setItem(KEY, '1'); } catch {}
    lastFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!ATTIVO) return;
    fillSnow();
    let resizeT: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(fillSnow, 250);
    };
    const onOpen = () => openPopup();
    window.addEventListener('resize', onResize);
    window.addEventListener('luis-popup-open', onOpen);
    let seen = false;
    try { seen = !!localStorage.getItem(KEY); } catch {}
    const auto = seen ? undefined : setTimeout(openPopup, 1500);
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setPast(DATES.filter(([iso]) => new Date(iso + 'T00:00:00') < today).map(([iso]) => iso));
  }, []);

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
      <div className='pp-snow' aria-hidden='true' ref={snowRef} />
      <div className='pp-card' role='dialog' aria-modal='true' aria-labelledby='pp-title'>
        <img className='pp-band' src='/images/vetrina/splah_natale.jpg' alt='Allestimento natalizio Luis' />
        <button ref={closeRef} className='pp-close' type='button' aria-label='Chiudi il popup' onClick={closePopup}>✕</button>
        <div className='pp-body'>
          <p className='pp-eyebrow'>Luis S.r.l. · Bergamo · dal 1995</p>
          <h2 className='pp-title' id='pp-title'>Aperture domenicali 2026</h2>
          <p className='pp-lead'>Nelle prossime domeniche apriamo lo showroom di Bergamo: vi aspettiamo per scoprire dal vivo le nostre collezioni di vasi da esterno e interno.</p>
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
    </div>
  );
}
```

Note per l'agente:

- `past` parte vuoto e si calcola in `useEffect`: nessun mismatch di idratazione.
- I fiocchi sono creati imperativamente in `fillSnow()` (niente 120 re-render) e restano nel DOM; l'animazione CSS parte solo quando il popup passa da `display:none` a visibile.
- Non aggiungere blocco scroll: il prototipo non lo fa.
- `luis-popup-open` è l'evento usato dal link del footer.

## 3. Link nel footer

Crea `frontend-vetrina/src/components/layout/PopupApertureLink.tsx`:

```tsx
'use client';

import { usePathname } from 'next/navigation';

export default function PopupApertureLink() {
  const pathname = usePathname();
  if (pathname !== '/') return null;
  return (
    <li>
      <a
        href='#'
        onClick={(e) => {
          e.preventDefault();
          window.dispatchEvent(new Event('luis-popup-open'));
        }}
      >
        Aperture domenicali
      </a>
    </li>
  );
}
```

In `frontend-vetrina/src/components/layout/Footer.tsx`, dentro il `<ul>` della colonna "navigazione", aggiungi **come ultima voce**:

```tsx
import PopupApertureLink from './PopupApertureLink';
...
<li><a href='https://shop.luisbg.it' target='_blank' rel='noopener'>{t('shop')}</a></li>
<li><Link href='/#contatti'>{t('contatti')}</Link></li>
<PopupApertureLink />
```

## 4. Montaggio in homepage

In `frontend-vetrina/src/app/page.tsx` aggiungi il componente dopo `<Contatti />`:

```tsx
import PopupAperture from '@/components/home/PopupAperture';
...
      <Contatti />
      <PopupAperture />
```

## 5. CSS

Accoda in fondo a `frontend-vetrina/src/styles/globals.css` (usa i token già presenti `--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`, `--accent-soft`, `--font-display`, `--font-body`, `--font-mono`):

```css
/* Popup aperture domenicali — replica del prototipo vetrina */
.pp-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background: oklch(20% 0.02 60 / .55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.pp-overlay[hidden] { display: none; }

.pp-snow {
  position: absolute; inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
}
.pp-snow i {
  position: absolute;
  top: 0;
  left: var(--x);
  font-style: normal;
  font-family: 'Segoe UI Symbol', 'Segoe UI', Arial, sans-serif;
  font-size: var(--s);
  line-height: 1;
  color: #fff;
  text-shadow: 0 0 4px rgba(20, 20, 20, .45), 0 0 10px rgba(255, 255, 255, .35);
  opacity: 0;
  will-change: transform, opacity;
  animation: pp-snowfall var(--d) linear var(--dl) infinite,
             pp-sway calc(var(--d) / 4) ease-in-out var(--dl) infinite;
}
@keyframes pp-snowfall {
  0%   { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 0; }
  6%   { opacity: var(--o); }
  90%  { opacity: var(--o); }
  100% { transform: translate3d(0, 112vh, 0) rotate(300deg); opacity: 0; }
}
@keyframes pp-sway {
  0%, 100% { margin-left: calc(-1 * var(--amp, 8px)); }
  50%      { margin-left: var(--amp, 8px); }
}
@media (prefers-reduced-motion: reduce) {
  .pp-snow i { animation-duration: calc(var(--d) * 2), calc(var(--d) / 2); }
  .pp-snow i:nth-child(even) { display: none; }
}

.pp-card {
  position: relative;
  z-index: 1;
  width: 100%; max-width: 560px;
  max-height: calc(100vh - 48px);
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 24px 64px oklch(15% 0.02 60 / .35);
  font-family: var(--font-body);
  color: var(--fg);
  opacity: 0; transform: translateY(10px);
  transition: opacity .25s ease, transform .25s ease;
}
.pp-overlay.pp-open .pp-card { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .pp-card { transition: none; opacity: 1; transform: none; }
}

.pp-band {
  display: block; width: 100%; height: 170px;
  object-fit: cover; object-position: center 50%;
  border-radius: 16px 16px 0 0;
}

.pp-close {
  position: absolute; top: 10px; right: 10px;
  width: 40px; height: 40px;
  display: grid; place-items: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--fg);
  font-size: 16px; line-height: 1;
  cursor: pointer;
}
.pp-close:hover { border-color: var(--accent); color: var(--accent); }
.pp-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.pp-body { padding: 26px 30px 30px; }

.pp-eyebrow {
  font-family: var(--font-mono);
  font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 8px;
}
.pp-title {
  font-family: var(--font-display);
  font-size: 30px; line-height: 1.12; letter-spacing: -0.015em;
  margin: 0 0 10px;
}
.pp-lead { font-size: 14.5px; line-height: 1.55; color: var(--muted); margin: 0 0 14px; }

.pp-badge {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-mono);
  font-size: 12px; letter-spacing: .06em; text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 999px;
  padding: 7px 14px;
  margin: 0 0 18px;
}

.pp-dates {
  list-style: none; margin: 0 0 22px; padding: 0;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px;
}
.pp-dates li {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 6px 9px;
  text-align: center;
  background: var(--bg);
}
.pp-dates .pp-dow {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--muted);
}
.pp-dates .pp-day {
  display: block;
  font-family: var(--font-display);
  font-size: 22px; line-height: 1.2;
  color: var(--fg);
}
.pp-dates .pp-mon {
  display: block;
  font-size: 12px;
  color: var(--muted);
}
.pp-dates li.is-past {
  opacity: .45;
  background: transparent;
  border-style: dashed;
}
.pp-dates li.is-past .pp-day {
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
}

.pp-ig { margin: 14px 0 0; font-size: 13px; color: var(--muted); }
.pp-ig a { color: var(--accent); font-weight: 600; text-decoration: none; }
.pp-ig a:hover { text-decoration: underline; }

@media (max-width: 480px) {
  .pp-overlay { padding: 12px; }
  .pp-body { padding: 20px 20px 24px; }
  .pp-title { font-size: 26px; }
  .pp-band { height: 110px; }
}
```

Il file `globals.css` è globale: non incapsulare i selettori, ma verifica che nessuna classe `pp-` esista già (nel progetto non c'è).

## 6. Verifica richiesta

Dalla cartella `frontend-vetrina`:

1. `npm run lint` e `npm run build` devono passare.
2. `npm run dev` (porta 3002) e controllare in browser, con date di sistema al 23/10/2026:
   - prima visita: popup dopo 1,5 s, card con fade-in, neve che **inizia a cadere all'apertura** (nessun fiocco prima).
   - neve: ~41 fiocchi a 390×844, 120 a 1280×800 e oltre; resize/rotazione li rigenera dopo 250 ms; nessun buco temporale (ritardi distribuiti sulla durata di caduta).
   - chiusura con ✕, Esc e click sull'overlay; focus sul pulsante di chiusura all'apertura e ripristino del focus alla chiusura.
   - `localStorage['luis-popup-seen'] = '1'` dopo la chiusura: al reload nessuna apertura automatica.
   - link "Aperture domenicali" nel footer (solo `/`) riapre il popup.
   - date passate: `opacity .45`, bordo tratteggiato, giorno barrato (verificabile con le date del prototipo o spostando l'orologio di sistema).
   - `prefers-reduced-motion: reduce`: metà fiocchi, durate modificate, card senza transizione.
   - mobile ≤480 px: padding 12 px, fascia 110 px, titolo 26 px.
3. Confronto visivo fianco a fianco con `Prototipo Sito Vetrina/popup_main.html` aperto da solo: stessa card, stessi testi, stessa neve. Unica differenza ammessa: il prototipo mostra anche l'anteprima standalone.

Non committare né fare push salvo richiesta esplicita.
