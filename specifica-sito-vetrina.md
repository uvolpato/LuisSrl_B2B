# Specifica — Sito Vetrina Luis S.r.l.

Sito vetrina pubblico (B2B ingrosso) da sviluppato con **lo stesso stack del portale B2B**:
Next.js (App Router) + React + TypeScript + Tailwind CSS, nel monorepo esistente.

Il prototipo `Prototipo Sito Vetrina/` è il **riferimento visivo e comportamentale** da replicare fedelmente.

---

## 1. Stack tecnologico

| Layer | Tecnologia | Note |
|-------|-----------|------|
| Framework | Next.js 16.2.9 (App Router) | Stessa versione del B2B |
| UI | React 19.2.4 + TypeScript | |
| Styling | Tailwind CSS 4 + CSS custom properties | Design token in `globals.css` |
| i18n | next-intl ^4.14.9 | Come il B2B (it/en) |
| Backend | NestJS (monorepo `backend/`) | Condiviso col B2B |
| Database | PostgreSQL + Prisma | Stesso DB del B2B |
| Font | Geist Sans + Geist Mono (next/font) | Già configurati in `layout.tsx` |

**Dove vive il codice**: `frontend-vetrina/` (già esistente nel repo).

---

## 2. Struttura del progetto

```
frontend-vetrina/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Root layout (font, metadata)
│   │   ├── page.tsx                ← Home page
│   │   ├── catalogo/page.tsx       ← Catalogo vetrina
│   │   ├── azienda/page.tsx        ← Azienda
│   │   ├── contatti/page.tsx       ← Contatti
│   │   └── richiedi-accesso/page.tsx ← Form accesso B2B
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx          ← Navbar (già esistente)
│   │   │   └── Footer.tsx          ← Footer (già esistente)
│   │   ├── home/
│   │   │   ├── Hero.tsx
│   │   │   ├── Azienda.tsx
│   │   │   ├── Valori.tsx
│   │   │   ├── StatsBand.tsx
│   │   │   ├── Collezioni.tsx
│   │   │   ├── Marchi.tsx
│   │   │   ├── AccessoB2B.tsx
│   │   │   └── Contatti.tsx
│   │   ├── catalogo/
│   │   │   ├── CatalogoGrid.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── CatalogoFilter.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Section.tsx
│   │       └── Reveal.tsx          ← Wrapper animazione scroll
│   ├── styles/
│   │   └── globals.css             ← Design token + classi base
│   └── lib/
│       ├── data.ts                 ← Dati prodotti/categorie (mock)
│       └── constants.ts            ← Categorie, link, contatti
├── public/
│   └── images/                     ← Immagini sito vetrina
├── package.json
├── tailwind.config.mjs
└── tsconfig.json
```

---

## 3. Design system

### 3.1 Colori (OKLch) — in `globals.css :root`

```css
:root {
  --bg: oklch(97% 0.005 80);
  --surface: oklch(100% 0 0);
  --fg: oklch(22% 0.02 60);
  --muted: oklch(52% 0.015 60);
  --border: oklch(88% 0.01 70);
  --accent: oklch(55% 0.14 45);
  --accent-soft: oklch(95% 0.03 45);
  --ok: oklch(55% 0.12 150);
}
```

### 3.2 Font

```css
--font-display: 'Iowan Old Style', 'Charter', Georgia, serif;
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace;
```

In `layout.tsx` usare `next/font/google` con Geist per il body e un serif per il display.

### 3.3 Spacing e forme

```css
--radius: 12px;
--radius-lg: 16px;
--container: 1120px;
--gutter: 32px;
```

### 3.4 Classi base (in `globals.css`)

- `.container` — max-width 1120px, padding inline 32px
- `.eyebrow` — mono uppercase 12px, accent
- `.h1` / `.h2` / `.h3` — serif, clamp responsive
- `.lead` — 19px, muted, max-width 62ch
- `.btn` / `.btn-primary` / `.btn-light` — bottoni con hover
- `.section` — padding vertical clamp(56px, 8vw, 104px)

---

## 4. Pagine e componenti

### 4.1 Home page (`/`)

#### Hero
- Immagine full-bleed `img-tre-vasi.png` con veil gradiente scuro
- Badge "Divisione ingrosso · dal 1995" (pill bianca)
- h1 "Vasi da esterno e interno all'ingrosso" (serif, clamp 40–68px)
- Lead: "Importiamo e distribuiamo ceramica, cotto e fiberstone..."
- 2 CTA: "Richiedi l'accesso B2B" (primaria) + "Sfoglia il catalogo" (light)
- Animazione: zoom lento immagine + testo a cascata

#### Azienda (`/azienda`)
- Split 2 colonne: immagine `vasi-bianchi.webp` + testo
- Eyebrow "Chi siamo", h2, 2 paragrafi, lista facts con bullet quadrato accent

#### Valori
- Grid 4 colonne con 4 card: Ampio assortimento, Qualità garantita, Consegna veloce, Supporto dedicato
- Ogni card: icona SVG, h3, p

#### Stats Band
- Sfondo scuro `oklch(25% 0.02 60)`, testo chiaro
- 3 numeri grandi: 1995, 2000+, 40+

#### Collezioni
- Grid 3 colonne con 6 card: Cesti e Intrecci, Cotto da interno, Cotto da esterno, Metallo, Fiberstone, Marchi rivenduti
- Ogni card: immagine 16/10, tipo mono uppercase, h3, p

#### Marchi rivenduti
- 2 card orizzontali: Pottery Pots, Capi Europe
- Immagine 56px + testo con bordo sinistro

#### Accesso B2B (`/richiedi-accesso`)
- Card con griglia 2 colonne
- Sinistra: eyebrow "Area riservata", h2, paragrafo, 3 step numerati
- Destra: form con campi (Ragione sociale*, P.IVA*, Codice fiscale, Referente*, Tipo attività, Email*, Telefono, Comune/Provincia, Messaggio, privacy*)
- Submit → feedback "Grazie! La tua richiesta è stata registrata..."

#### Contatti (`/contatti`)
- Griglia 2 colonne: testo + lista 5 item (Sede, Telefono, Cellulare, Email, Social)

### 4.2 Catalogo (`/catalogo`)

- Banner vetrina: "Vetrina pubblica: prezzi, disponibilità e ordini sono riservati ai rivenditori registrati."
- Toolbar: input ricerca + chip filtro (Tutti, Cesti, Cotto interno, Cotto esterno, Metallo, Fiberstone, Marchi)
- Grid 3 colonne con 9 card prodotto
- Ogni card: immagine, tipo, nome, descrizione, lista varianti (codice + descrizione + dimensioni), "N varianti" + "Prezzi riservati →"
- **Nessun prezzo, nessun carrello**
- Empty state: "Nessun prodotto trovato..."
- CTA finale: "Vuoi vedere i tuoi prezzi e ordinare online?" + bottone

### 4.3 Navbar (Header)

- Sticky top, blur backdrop, bordo inferiore
- Logo 34px + link: Azienda, Collezioni, Catalogo, **B2B** (link esterno `https://shop.luisbg.it`), Contatti
- CTA: "Richiedi accesso B2B" (bottone primario, scritta **bianca**)

### 4.4 Footer

- 4 colonne: Brand (logo + descrizione), Navigazione (Home, Azienda, Catalogo, Shop B2B, Contatti), Documenti (Privacy, Cookie), Contatti (telefono, email, accesso)
- Bottom: © 2026 Luis S.r.l. · Via F. Bellafino 28/30, Bergamo · C.F. e P. IVA 04253020160 | Realizzato da Ugo Volpato AI Consultant

---

## 5. Interazioni

### 5.1 Scroll reveal

Componente `Reveal.tsx` (client component):
- Usa IntersectionObserver
- Aggiunge classe `is-in` quando l'elemento entra nel viewport
- Stagger con `--d` delay
- `prefers-reduced-motion`: tutto visibile subito, nessuna animazione
- Senza JS: contenuto sempre visibile

### 5.2 Form accesso

- Validazione HTML5 (`required`)
- Submit → mostra feedback di conferma, disabilita bottone
- Nessuna chiamata server (dimostrativo) oppure POST al backend B2B

### 5.3 Filtro catalogo

- Stato React: `filtro` (categoria) + `query` (ricerca)
- Click chip → aggiorna categoria
- Input ricerca → filtra per textContent
- Aggiorna conteggio e empty state

---

## 6. Dati

### 6.1 Prodotti catalogo (mock in `lib/data.ts`)

9 prodotti con varianti:

| Prodotto | Categoria | Varianti |
|----------|-----------|----------|
| Vaso Rogers | Cotto da esterno | LU3161, LU3162, LU3163 |
| Vaso Cotto Portoghese | Cotto da esterno | LU3050, LU3051, LU3052 |
| Fioriera Colton | Cotto da interno | LU2789, LU2790, LU2791, LU2792 |
| Vaso Lakota | Cotto da interno | LU2904, LU2905, LU2906 |
| Cesto Pecos | Cesti e Intrecci | LU1520, LU1521, LU1522 |
| Portavaso Missouri | Metallo | LU4402, LU4403, LU4404 |
| Fioriera Argo | Fiberstone | LU5010, LU5011, LU5012 |
| Urban Smooth | Marchi · Pottery Pots | PP-URB-01, PP-URB-02, PP-URB-03 |
| Ball Smooth | Marchi · Capi Europe | CE-BAL-01, CE-BAL-02, CE-BAL-03 |

### 6.2 Immagini

Tutte in `frontend-vetrina/public/images/vetrina/`:

| File | Uso |
|------|-----|
| `logo.webp` | Header + footer |
| `img-tre-vasi.png` | Hero home |
| `vasi-bianchi.webp` | Sezione Azienda |
| `catalogo-cotto-esterni.webp` | Card + catalogo |
| `catalogo-cotto-interni.webp` | Card + catalogo |
| `catalogo-cesti.webp` | Card + catalogo |
| `catalogo-metallo.webp` | Card + catalogo |
| `catalogo-fiberstone.webp` | Card + catalogo |
| `catalogo-pottery-pots.webp` | Card + brand + catalogo |
| `catalogo-capi-europe.webp` | Brand + catalogo |

**Vincolo**: copiare tutte le immagini dal prototipo (`Prototipo Sito Vetrina/`) in `frontend-vetrina/public/images/vetrina/`.

---

## 7. Responsive

| Breakpoint | Cambiamenti |
|------------|-------------|
| ≤ 980px | split/access/contatti → 1 colonna; values/grid-3/product-grid → 2 colonne; stats → 1 colonna; footer → 2 colonne |
| ≤ 720px | nav-links nascosti (hamburger); values/grid-3/product-grid/form-grid → 1 colonna; footer → 1 colonna |

---

## 8. Checklist di parità (pre-consegna)

- [ ] Next.js App Router + TypeScript + Tailwind CSS
- [ ] Design token OKLch in globals.css
- [ ] Navbar sticky con logo, link, CTA bianca, link B2B esterno
- [ ] Hero full-bleed con img-tre-vasi.png, veil scuro, 2 CTA
- [ ] Azienda: split 2-col con immagine e facts
- [ ] Valori: 4 card con icone SVG
- [ ] Stats band scura con 3 numeri grandi
- [ ] Collezioni: 6 card con immagini
- [ ] Marchi: 2 card orizzontali
- [ ] Accesso: form con tutti i campi, validazione, feedback
- [ ] Contatti: lista 5 item con label mono
- [ ] Footer: 4 colonne + bottom bar
- [ ] Catalogo: banner, toolbar (ricerca+chip), 9 card prodotto con varianti, empty state, CTA
- [ ] Scroll reveal con IntersectionObserver + prefers-reduced-motion
- [ ] Form dimostrativo con feedback
- [ ] Filtro catalogo funzionante (chip + ricerca)
- [ ] Responsive 980px e 720px
- [ ] Tutte le immagini locali, nessun hotlink
- [ ] i18n next-intl (it/en)
- [ ] Build Next.js senza errori
