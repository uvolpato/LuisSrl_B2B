# Specifica — Sito Vetrina Luis S.r.l.

Sito vetrina pubblico (B2B ingrosso) da sviluppare in **identica coerenza** col prototipo
`Prototipo Sito Vetrina/`. Due pagine + un CSS condiviso. Nessuna libreria esterna:
HTML, CSS e JS vanilla.

---

## 1. Struttura del progetto

```
sito-vetrina/
├── index.html          ← home page
├── catalogo.html       ← catalogo vetrina (varianti, senza prezzi)
└── styles.css          ← unico foglio di stile condiviso
```

- **Nessun framework** (no React/Vue/Next). HTML statico + JS vanilla.
- **Nessuna dipendenza CSS/JS esterna**. Tutto inline o nel file condiviso.
- Il sito funziona senza build: apri `index.html` direttamente.

---

## 2. Design system

### 2.1 Colori (OKLch)

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

### 2.2 Font

```css
--font-display: 'Iowan Old Style', 'Charter', Georgia, 'Times New Roman', serif;
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace;
```

- **Display** (h1, h2, h3): serif, weight 600, `text-wrap: balance`
- **Body**: system sans, 16px, line-height 1.55
- **Mono** (eyebrow, label, codici): monospace, 10.5–12px, uppercase, letter-spacing 0.06–0.12em

### 2.3 Spacing e forme

```css
--radius: 12px;
--radius-lg: 16px;
--container: 1120px;
--gutter: 32px;
```

- `.container` max-width 1120px, padding inline 32px
- `.section` padding vertical `clamp(56px, 8vw, 104px)`
- Bordi: 1px solid `var(--border)`
- Card: radius 16px, bordo, sfondo bianco

### 2.4 Bottoni

| Classe | Uso | Stile |
|--------|-----|-------|
| `.btn-primary` | CTA principali | sfondo accent, testo bianco, radius 10px |
| `.btn-light` | CTA su hero scuro | sfondo rgba(255,255,255,.14), testo bianco, bordo rgba(255,255,255,.4) |
| `.btn-arrow::after` | Freccia animata | `→` con hover translateX(3px) |

Hover: `background: oklch(50% 0.14 45)` (accent più scuro).

---

## 3. Navbar (condivisa)

```html
<header class="site-nav">
  <div class="container">
    <div class="nav-inner">
      <a class="nav-logo" href="index.html"><img src="logo.webp" alt="Luis S.r.l."></a>
      <nav class="nav-links">
        <a href="#azienda">Azienda</a>
        <a href="#collezioni">Collezioni</a>
        <a href="catalogo.html">Catalogo</a>
        <a href="https://shop.luisbg.it" target="_blank" rel="noopener">B2B</a>
        <a href="#contatti">Contatti</a>
        <a class="btn btn-primary btn-arrow nav-cta" href="#accesso">Richiedi accesso B2B</a>
      </nav>
    </div>
  </div>
</header>
```

- Sticky top, blur backdrop, bordo inferiore
- Logo 34px altezza
- Link nav: 14px, colore muted → hover fg
- CTA: bottone primario con scritta **bianca** (regola specifica: `.nav-links a.nav-cta { color: #fff }`)

---

## 4. Home page (index.html)

### 4.1 Hero

```html
<section class="hero">
  <img class="hero-img" src="img-tre-vasi.png" alt="">
  <div class="hero-veil"></div>
  <div class="hero-body">
    <div class="container">
      <div class="hero-inner">
        <span class="hero-badge">Divisione ingrosso · dal 1995</span>
        <p class="eyebrow">Vasi e articoli per garden e fioristi</p>
        <h1 class="h1">Vasi da esterno e interno all'ingrosso</h1>
        <p class="lead">Importiamo e distribuiamo ceramica, cotto e fiberstone...</p>
        <div class="hero-cta">
          <a class="btn btn-primary btn-arrow" href="#accesso">Richiedi l'accesso B2B</a>
          <a class="btn btn-light" href="catalogo.html">Sfoglia il catalogo</a>
        </div>
      </div>
    </div>
  </div>
</section>
```

- Sfondo: immagine full-bleed con veil gradiente scuro
- Badge: pill con bordo bianco, uppercase mono
- h1: clamp(40px, 6vw, 68px), bianco
- Lead: 19-20px, bianco opaco
- 2 CTA: primaria (accent) + light (trasparente bianca)

### 4.2 Sezione Azienda (`#azienda`)

Layout a due colonne (`.split`):
- Sinistra: immagine `vasi-bianchi.webp`, aspect-ratio 4/3, radius 16px
- Destra: eyebrow "Chi siamo", h2 "Specialisti nella fornitura di vasi professionali", 2 paragrafi, lista `.facts` con 3 item (bullet quadrato accent)

### 4.3 Sezione Valori

Grid 4 colonne `.values` con 4 card:
- Ampio assortimento / Qualità garantita / Consegna veloce / Supporto dedicato
- Ogni card: icona SVG (20px, bordo, radius 10px), h3, p

### 4.4 Banda Numeri (`.stats-band`)

Sfondo scuro `oklch(25% 0.02 60)`, testo chiaro:
- 1995 / 2000+ / 40+
- Numero grande serif (clamp 48–84px), label sotto

### 4.5 Collezioni (`#collezioni`)

Grid 3 colonne `.grid-3` con 6 card `.linea-card`:
- Cesti e Intrecci, Cotto da interno, Cotto da esterno, Metallo, Fiberstone, Marchi rivenduti
- Ogni card: immagine 16/10, tipo (mono uppercase accent), h3, p

### 4.6 Marchi rivenduti

Layout orizzontale `.brands` con 2 card:
- Pottery Pots, Capi Europe
- Immagine 56px + testo con bordo sinistro

### 4.7 Accesso B2B (`#accesso`)

Card grande `.access` con griglia 2 colonne:
- Sinistra: eyebrow "Area riservata", h2 "Richiedi l'accesso al portale B2B", paragrafo, 3 step numerati (counter CSS)
- Destra: form `.access-form` con campi: Ragione sociale*, P.IVA*, Codice fiscale, Referente*, Tipo attività (select), Email*, Telefono, Comune/Provincia, Messaggio (textarea), checkbox privacy*, bottone "Invia richiesta"
- Form dimostrativo: al submit mostra `.form-ok` ("Grazie! La tua richiesta è stata registrata...")

### 4.8 Contatti (`#contatti`)

Griglia 2 colonne:
- Sinistra: eyebrow "Contatti", h2 "Come possiamo aiutarti?", lead
- Destra: lista con 5 item (Sede, Telefono, Cellulare, Email, Social) con label mono a sinistra

### 4.9 Footer

```html
<footer class="site-foot">
  <!-- 4 colonli: brand, navigazione, documenti, contatti -->
  <!-- bottom: copyright + credit -->
</footer>
```

- Brand: logo + descrizione
- Navigazione: Home, Azienda, Catalogo, **Shop B2B** (link esterno), Contatti
- Documenti: Privacy Policy, Cookie Policy (placeholder)
- Contatti: telefono, email, link accesso
- Bottom: © 2026 Luis S.r.l. · Via F. Bellafino 28/30, Bergamo · C.F. e P. IVA 04253020160 | Realizzato da Ugo Volpato AI Consultant

---

## 5. Pagina Catalogo (catalogo.html)

### 5.1 Banner vetrina

Banda chiara `accent-soft`: "Vetrina pubblica: prezzi, disponibilità e ordini sono riservati ai rivenditori registrati." + link "Richiedi l'accesso →"

### 5.2 Toolbar

- Input ricerca (`#cerca`): filtra per nome, codice, linea (match su `textContent` lowercase)
- Chip filtro (`#chips`): Tutti, Cesti e Intrecci, Cotto da interno, Cotto da esterno, Metallo, Fiberstone, Marchi rivenduti
- Conteggio (`#conta`): "N prodotti"

### 5.3 Griglia prodotti

Grid 3 colonne `.product-grid` con 9 card `.product-card`. Ogni card:
- Immagine prodotto (4/3)
- Tipo (mono uppercase accent)
- Nome prodotto
- Descrizione breve
- Lista varianti: codice mono + descrizione + dimensioni
- Footer: "N varianti" + link "Prezzi riservati →"

**Nessun prezzo, nessun carrello, nessuna disponibilità.**

### 5.4 Empty state

`#vuoto`: "Nessun prodotto trovato. Prova con un altro termine o cambia categoria."

### 5.5 CTA finale

Banda scura: "Vuoi vedere i tuoi prezzi e ordinare online?" + bottone "Richiedi l'accesso B2B"

---

## 6. Interazioni JS

### 6.1 Scroll reveal

```js
// Aggiungi classe 'has-js' a <html> subito
// Tutti gli elementi .reveal e .reveal-img sono hidden (opacity 0, translateY 26px)
// IntersectionObserver li osserva e aggiunge .is-in quando entrano nel viewport
// Con prefers-reduced-motion: tutti visibili subito, nessuna animazione
```

- `.reveal`: fade + slide up 26px, durata 0.7s, stagger con `--d` delay
- `.reveal-img`: fade + slide up + scale(0.97→1), durata 0.9s
- Hero: zoom lento immagine (scale 1.09→1, 16s), testo a cascata (delay 0.1–0.58s)

### 6.2 Form accesso

- Submit prevenuto, validazione HTML5 (`required`)
- Se valido: mostra `.form-ok`, disabilita bottone
- Nessuna chiamata server (dimostrativo)

### 6.3 Filtro catalogo

- Click su chip: imposta categoria, aggiorna `.active`, filtra card per `data-k`
- Input ricerca: filtra per `textContent` lowercase match
- Entrambi insieme (AND)
- Aggiorna conteggio e empty state

---

## 7. Asset immagini

Tutte in `frontend/public/images/b2b/` (o copiate nel progetto):

| File | Uso |
|------|-----|
| `logo.webp` | Navbar + footer |
| `img-tre-vasi.png` | Hero home (sfondo full-bleed) |
| `vasi-bianchi.webp` | Sezione Azienda |
| `catalogo-cotto-esterni.webp` | Card Cotto esterno + catalogo |
| `catalogo-cotto-interni.webp` | Card Cotto interno + catalogo |
| `catalogo-cesti.webp` | Card Cesti + catalogo |
| `catalogo-metallo.webp` | Card Metallo + catalogo |
| `catalogo-fiberstone.webp` | Card Fiberstone + catalogo |
| `catalogo-pottery-pots.webp` | Card Marchi + brand Pottery Pots + catalogo |
| `catalogo-capi-europe.webp` | Brand Capi Europe + catalogo |

**Vincolo**: copiare tutte le immagini nel progetto e referenziare con path relativi. Nessun hotlink.

---

## 8. Responsive

| Breakpoint | Cambiamenti |
|------------|-------------|
| ≤ 980px | split/access/contatti → 1 colonna; values/grid-3/product-grid → 2 colonne; stats → 1 colonna; footer → 2 colonne |
| ≤ 720px | nav-links nascosti; values/grid-3/product-grid/form-grid → 1 colonna; footer → 1 colonna; split-media sopra il testo |

---

## 9. Checklist di parità (pre-consegna)

- [ ] 2 pagine HTML (index + catalogo) + 1 CSS condiviso
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
- [ ] Nessuna dipendenza esterna
- [ ] Tutte le immagini locali, nessun hotlink
- [ ] UTF-8, nessun carattere corrotto
