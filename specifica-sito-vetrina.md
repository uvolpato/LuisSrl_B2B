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
| Font | Font di sistema (stack del prototipo) | Geist rimosso: non usato dal design |

**Dove vive il codice**: `frontend-vetrina/` (già esistente nel repo).

---

## 2. Struttura del progetto

```
frontend-vetrina/
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Root layout: Header, Footer, Reveal, script has-js
│   │   ├── page.tsx                ← Home page
│   │   ├── catalogo/page.tsx       ← Catalogo (server component, dati dal backend)
│   │   ├── azienda/page.tsx        ← Riusa <Azienda />
│   │   ├── contatti/page.tsx       ← Riusa <Contatti />
│   │   └── richiedi-accesso/page.tsx ← Riusa <AccessoB2B />
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx          ← Navbar + hamburger ≤720px (client)
│   │   │   └── Footer.tsx
│   │   ├── home/
│   │   │   ├── Hero.tsx
│   │   │   ├── Azienda.tsx
│   │   │   ├── Valori.tsx
│   │   │   ├── StatsBand.tsx
│   │   │   ├── Collezioni.tsx      ← Famiglie dal backend (server component)
│   │   │   ├── Marchi.tsx
│   │   │   ├── AccessoB2B.tsx      ← Form (client)
│   │   │   └── Contatti.tsx
│   │   └── ui/
│   │       └── Reveal.tsx          ← Observer scroll reveal globale (client)
│   ├── styles/
│   │   └── globals.css             ← = styles.css del prototipo + aggiunte marcate
│   └── lib/
│       └── api.ts                  ← Unico punto di accesso al backend (solo server)
├── public/
│   └── images/vetrina/             ← Immagini statiche del sito
├── next.config.mjs                 ← Security header + proxy solo /api/img
├── .env.example                    ← BACKEND_INTERNAL_URL
├── package.json
├── tailwind.config.mjs
└── tsconfig.json
```

**Navigazione**: one-page come il prototipo (`/#azienda`, `/#collezioni`, `/#contatti`, `/#accesso`);
le pagine `/azienda`, `/contatti`, `/richiedi-accesso` esistono e riusano gli stessi componenti.

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

Nessun webfont: si usano gli stack di sistema del prototipo (identici al riferimento visivo).

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
- **Dati reali**: le famiglie della pagina Famiglie del B2B (`GET /api/catalogo/pubblico/famiglie`, vedi §9)
- Layout invariato: grid 3 colonne di `linea-card` (immagine 16/10, tipo mono uppercase "Collezione Luis", h3 = nome famiglia, p = descrizione se presente)
- Immagine via `/api/img` (ridimensionamento backend, w=800); senza immagine → placeholder `--accent-soft`
- Badge "AI" sulle immagini generate con AI (trasparenza AI Act, come nel B2B)
- Click → `/catalogo?famiglia=<codice>`
- Backend non raggiungibile → messaggio "Collezioni momentaneamente non disponibili."

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

Server component, dati da `GET /api/catalogo/pubblico/articoli` (vedi §9).

- Banner vetrina: "Vetrina pubblica: prezzi, disponibilità e ordini sono riservati ai rivenditori registrati."
- Toolbar:
  - ricerca = form GET (`?q=`, max 100 caratteri), mantiene la famiglia selezionata
  - chip = "Tutti" + famiglie reali (`?famiglia=<codice>`), mantengono la ricerca
- Conteggio "N prodotti" (totale lato server)
- Grid 3 colonne, 24 articoli per pagina; paginazione "← Precedenti / Successivi →" (`?page=`)
- Card: immagine copertina (+ badge AI), famiglia, nome, descrizione (max 3 righe), lista varianti attive (codice + descrizione + dimensioni "Ø.. H.."), "N varianti" + "Prezzi riservati →" (`/#accesso`)
- **Nessun prezzo, sconto, disponibilità o carrello**
- Empty state: "Nessun prodotto trovato. Prova con un altro termine o cambia categoria."
- Backend non raggiungibile: "Catalogo momentaneamente non disponibile. Riprova tra qualche minuto."
- CTA finale: "Vuoi vedere i tuoi prezzi e ordinare online?" + bottone
- Filtri e ricerca funzionano senza JavaScript e sono condivisibili via URL

### 4.3 Navbar (Header)

- Sticky top, blur backdrop, bordo inferiore
- Logo 34px + link: Azienda, Collezioni, Catalogo, **B2B** (link esterno `https://shop.luisbg.it`), Contatti
- CTA: "Richiedi accesso B2B" (bottone primario, scritta **bianca**)
- ≤ 720px: link nascosti, bottone hamburger che apre il menu a tendina (aggiunta rispetto al prototipo)

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

- Validazione HTML5 (`required`, `checkValidity`/`reportValidity`)
- Submit → mostra feedback di conferma, disabilita bottone
- **Attualmente dimostrativo**: nessuna chiamata server (POST al backend B2B da fare quando esiste l'endpoint)

### 5.3 Filtro catalogo

- Lato server, via query string: `famiglia`, `q`, `page`
- Click chip → link con nuova famiglia (ricerca preservata)
- Invio ricerca → form GET (famiglia preservata)
- Ricerca del backend B2B: nome articolo, codice linea, codice variante, nome famiglia/raccolta
  (non cerca nelle descrizioni: "vaso" non trova nulla, "LAKOTA" o "LU3161" sì)

---

## 6. Dati

### 6.1 Origine

| Dato | Fonte |
|------|-------|
| Famiglie (Collezioni, chip catalogo) | `GET /api/catalogo/pubblico/famiglie` |
| Articoli e varianti (catalogo) | `GET /api/catalogo/pubblico/articoli` |
| Immagini famiglie/articoli | `/api/img?p=...&w=800` (backend, proxato dalla vetrina) |
| Testi home, contatti, marchi | statici nei componenti |

Stessi criteri di visibilità del B2B: famiglie ATTIVE con almeno un articolo; articoli configurati,
ATTIVI, famiglia ATTIVA; varianti non NASCOSTE. Cache 5 minuti (backend + `revalidate` Next).

### 6.2 Immagini statiche

Tutte in `frontend-vetrina/public/images/vetrina/`:

| File | Uso |
|------|-----|
| `logo.webp` | Header + footer |
| `img-tre-vasi.png` | Hero home |
| `vasi-bianchi.webp` | Sezione Azienda |
| `catalogo-pottery-pots.webp` | Card brand Pottery Pots |
| `catalogo-capi-europe.webp` | Card brand Capi Europe |
| `catalogo-*.webp` (altri) | Non più usati dopo il collegamento al backend; rimuovibili |

---

## 7. Responsive

| Breakpoint | Cambiamenti |
|------------|-------------|
| ≤ 980px | split/access/contatti → 1 colonna; values/grid-3/product-grid → 2 colonne; stats → 1 colonna; footer → 2 colonne |
| ≤ 720px | nav-links nascosti (hamburger); values/grid-3/product-grid/form-grid → 1 colonna; footer → 1 colonna |

---

## 8. Checklist di parità (pre-consegna)

- [x] Next.js App Router + TypeScript + Tailwind CSS
- [x] Design token OKLch in globals.css
- [x] Navbar sticky con logo, link, CTA bianca, link B2B esterno, hamburger mobile
- [x] Hero full-bleed con img-tre-vasi.png, veil scuro, 2 CTA
- [x] Azienda: split 2-col con immagine e facts
- [x] Valori: 4 card con icone SVG
- [x] Stats band scura con 3 numeri grandi
- [x] Collezioni: famiglie reali dal backend, layout card invariato, badge AI
- [x] Marchi: 2 card orizzontali
- [x] Accesso: form con tutti i campi, validazione, feedback
- [x] Contatti: lista 5 item con label mono
- [x] Footer: 4 colonne + bottom bar
- [x] Catalogo: banner, toolbar (ricerca + chip famiglie), card con varianti dal backend, paginazione, empty state, CTA
- [x] Scroll reveal con IntersectionObserver + prefers-reduced-motion
- [x] Form dimostrativo con feedback
- [x] Filtro catalogo funzionante (chip + ricerca, via URL)
- [x] Responsive 980px e 720px
- [x] Tutte le immagini locali o via backend, nessun hotlink
- [ ] Form accesso collegato al backend
- [ ] i18n next-intl (it/en)
- [ ] Build Next.js di produzione verificata

---

## 9. Backend e sicurezza

### 9.1 Endpoint pubblici (in `backend/src/integrazione/catalogo-public.controller.ts`)

Nessuna API del portale B2B è modificata: si aggiungono rotte di sola lettura che **riusano**
le funzioni esistenti del service.

| Endpoint | Riusa | Parametri accettati | Risposta |
|----------|-------|---------------------|----------|
| `GET /api/catalogo/pubblico/famiglie` | `getFamiglieCliente()` | — | codice, nome, descrizione, immagine, immagineAI |
| `GET /api/catalogo/pubblico/articoli` | `getCatalogoPaginato()` | **solo** `page` (1–100), `famiglia` (max 50 car.), `q` (max 100 car.) | total, hasMore, articoli: codiceLinea, nome, descrizione, famiglia, img, imgAI, varianti (codice, descrizione, dimensioni) |

- Mai esposti: prezzi, sconti, listini, giacenze/disponibilità, stato, campi interni.
- `prezzoMin/Max`, `sort`, `codiceListino` e gli altri filtri del catalogo cliente **non** sono
  raggiungibili (darebbero un oracolo sui prezzi riservati).
- `Cache-Control: public, max-age=300`; rate limit globale del backend (100 req/min per IP).
- Rotte dichiarate prima di `:codiceLinea` (anteprima `/p/`), che altrimenti le catturerebbe.

### 9.2 Vetrina

- Il browser **non** chiama l'API dati: fetch solo lato server (`lib/api.ts`), timeout 3s.
- Validazione al confine delle risposte (tipi, campi whitelist); immagini accettate solo se
  `/images/...` senza `..`.
- Proxy (`next.config.mjs`) limitato a **`/api/img`**: login, carrello, ordini ecc. non sono
  raggiungibili dal dominio vetrina (404).
- Security header come il portale B2B (HSTS, X-Frame-Options, nosniff, Referrer-Policy, frame-ancestors).
- Testi dal backend renderizzati da React (escape automatico).

### 9.3 Configurazione

| Variabile | Dove | Default |
|-----------|------|---------|
| `BACKEND_INTERNAL_URL` | `frontend-vetrina/.env` | `http://localhost:3001` |
