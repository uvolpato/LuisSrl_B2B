# Specifica — Sito Vetrina Pubblico (www.luisbg.it)

**Versione:** bozza 1.0
**Obiettivo:** sostituire l'attuale www.luisbg.it con un sito statico performante, SEO-first,
che condivide il backend API col B2B ma ha ciclo di vita, build e deploy indipendenti.

---

## 1. Decisione architetturale

**Due app Next.js separate sullo stesso server**, reverse proxy nginx per hostname:

| App | Cartella | Porta dev | Host produzione | Output |
|---|---|---|---|---|
| B2B | `frontend/` | 3000 | `shop.luisbg.it` | `next start` (SSR + WS) |
| Vetrina | `frontend-vetrina/` | 3002 | `www.luisbg.it` | `output: 'export'` → file statici |

**Perché separare:**
- Vetrina = **zero Node in produzione** (solo nginx serve file statici + CDN)
- B2B = SSR autenticato, WebSocket, carrello, checkout
- Deploy indipendenti: `nginx -s reload` vs `pm2 restart b2b`
- SEO critico solo su vetrina (sitemap, meta, JSON-LD, Core Web Vitals)
- Nessun rischio che bug B2B rompano il sito pubblico

---

## 2. Cartella e struttura

```
frontend-vetrina/
├── package.json
├── next.config.js
├── tsconfig.json
├── .eslintrc.js
├── public/
│   ├── images/          # asset locali (logo, hero)
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── layout.tsx           # root layout, font, SEO defaults
│   │   ├── page.tsx             # home marketing
│   │   ├── catalogo/
│   │   │   ├── page.tsx         # lista famiglie/linee
│   │   │   └── [slug]/
│   │   │       └── page.tsx     # scheda prodotto (read-only)
│   │   ├── azienda/
│   │   │   └── page.tsx
│   │   ├── contatti/
│   │   │   └── page.tsx
│   │   ├── richiedi-accesso/
│   │   │   └── page.tsx         # form → POST /api/auth/richiedi-accesso
│   │   ├── sitemap.ts           # next-sitemap o generate static
│   │   └── robots.ts
│   ├── components/
│   │   ├── ui/                  # copiati da frontend/components/ui/
│   │   │   ├── Button.tsx
│   │   │   ├── PositionedImage.tsx
│   │   │   ├── Card.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── catalogo/
│   │       ├── ProductGrid.tsx
│   │       └── ProductCard.tsx
│   ├── lib/
│   │   ├── api.ts               # fetch verso backend (public endpoints)
│   │   ├── seo.ts               # helper meta, JSON-LD
│   │   └── utils.ts
│   └── styles/
│       └── globals.css          # design tokens OKLch (copiati da brand-spec)
├── next-sitemap.config.js       # genera sitemap.xml + robots.txt
└── .github/workflows/deploy.yml # opzionale: build statico su push
```

---

## 3. Cosa condivide col B2B (copia, non link)

| Cosa | Da `frontend/` | Note |
|---|---|---|
| Design tokens (colori OKLch, tipografia, spacing) | `src/styles/globals.css` + `brand-spec.md` | copia identica |
| `PositionedImage` | `components/ui/PositionedImage.tsx` | **unico componente immagini** — copia obbligatorio |
| `Button`, `Card`, `Badge`, `Input` base | `components/ui/` | copia i file che servono |
| Type `Articolo`, `Variante`, `Famiglia` | `src/types/` o API response | riusa tipi dal backend o genera da OpenAPI |
| Logica prezzo/immagini | `lib/api.ts` | chiama endpoint **pubblici** del backend |

> **Non condividere:** carrello, checkout, dashboard, auth context, SWR hooks con auth,
> componenti admin, `next.config` del B2B (proxy, rewrites, headers auth).

---

## 4. Endpoint backend usati (sola lettura, pubblici)

Il backend **già espone** o può esporre senza auth:

| Endpoint | Uso vetrina |
|---|---|
| `GET /api/catalogo` | lista famiglie/linee con conteggio varianti |
| `GET /api/catalogo/[slug]` | dettaglio articolo + varianti + immagini |
| `GET /api/articoli/[codice]/immagini` | galleria (già c'è) |
| `GET /api/articoli/[codice]/descrizione-ai` | descrizione generata |
| `POST /api/auth/richiedi-accesso` | form "Diventa rivenditore" → email admin + lead in DB |

> Se mancano, aggiungere controller `public-` (es. `PublicCatalogoController`) con `AllowAnonymous` guard, **senza** sessione/CSRF.

---

## 5. Build e deploy

**Dev:**
```bash
cd frontend-vetrina && npm run dev   # http://localhost:3002
```

**Produzione (static export):**
```bash
cd frontend-vetrina && npm run build   # genera ./out/
# nginx serve /var/www/vetrina/out/
```

`next.config.js` chiavi:
```js
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,           // nginx serve le immagini
    remotePatterns: [{ hostname: 'api.luisbg.it' }], // se immagini da backend
  },
  // niente rewrites, niente middleware auth
};
module.exports = nextConfig;
```

**Nginx snippet (aggiungere a config esistente):**
```nginx
server {
  listen 443 ssl http2;
  server_name www.luisbg.it;
  root /var/www/vetrina/out;
  index index.html;

  # static assets long cache
  location ~* \.(js|css|png|jpg|jpeg|webp|avif|woff2)$ {
    expires 1y; add_header Cache-Control "public, immutable";
  }

  # HTML no-cache (ISR non c'è, ma per sicurezza)
  location / { try_files $uri $uri/ /index.html; }
}

server {
  listen 443 ssl http2;
  server_name shop.luisbg.it;
  location / { proxy_pass http://127.0.0.1:3000; ... }  # B2B esistente
}
```

---

## 6. SEO (non negoziabile)

- **Meta tag** per pagina: `title`, `description`, `og:*`, `twitter:*`, `canonical`
- **JSON-LD**: `Organization`, `WebSite`, `Product` (su schede), `BreadcrumbList`
- **Sitemap.xml** + `robots.txt` generati al build (`next-sitemap`)
- **Core Web Vitals target**: LCP ≤ 2.5s, INP ≤ 200ms, CLS < 0.1 (budget JS ≈ 150KB gz)
- **Immagini**: `PositionedImage` con `width`/`height` dichiarati, `loading="lazy"` sotto piega, formati moderni (webp/avif via backend o `next/image` `unoptimized`)
- **Niente JS blocking** above-the-fold; font `font-display: swap`

---

## 7. Piano a fasi

| Fase | Contenuto | Stima |
|---|---|---|
| **1 — Scaffold** | `frontend-vetrina/` con config, layout, globals.css, componenti UI copiati | 1–2 gg |
| **2 — Home + Azienda + Contatti** | pagine statiche marketing, form contatti (emailjs o API) | 1–2 gg |
| **3 — Catalogo read-only** | lista famiglie → scheda articolo → varianti con immagini, prezzo "da" | 2–3 gg |
| **4 — Richiedi accesso B2B** | form validato → `POST /api/auth/richiedi-accesso` → email admin + lead DB | 1 gg |
| **5 — SEO + performance** | sitemap, JSON-LD, meta, CWV audit, compressione, cache headers | 1–2 gg |
| **6 — Deploy** | nginx config, build statico, DNS, test mobile/desktop | 1 gg |

---

## 8. Riferimenti

- `brand-spec.md` — design system (colori OKLch terracotta, tipografia, spacing)
- `specifiche-b2b-luis.md` § catalogo — gerarchia Famiglia → Articolo → Variante
- `backend/src/integrazione/integrazione.service.ts` — endpoint catalogo riutilizzabili
- `frontend/components/ui/PositionedImage.tsx` — **copiare identico**
- `01-landing.html` … `06-admin.html` — prototipi visivi (vetrina ≈ `01-landing.html` + `02-catalog.html` read-only)

---

## 9. Decisioni aperte

| # | Punto | Default proposto |
|---|---|---|
| 1 | Immagini: servite da backend (`/api/img/...`) o CDN/locale? | **CDN/locale** (copiare asset in `public/images/` al deploy) |
| 2 | Prezzi: mostrare "da € X" (min listino) o nascondere? | **mostrare min listino pubblico** (`LISTINO_BASE` o simile) |
| 3 | Form "richiedi accesso": campi obbligatori? | azienda, email, telefono, messaggio → lead in `customer_event` + email |
| 4 | Blog/News: serve? | **no v1**, solo pagine statiche |
| 5 | Multilingua (EN/DE)? | **no v1**, solo italiano |

---

> **Nota ponytail**: la vetrina è un *sito statico*, non un'app. Meno codice = meno bug, deploy più veloce, SEO migliore. Tutto ciò che non serve a vendere (carrello, auth, dashboard) **non esiste** in questa cartella.