# Roadmap SEO — Kappa Design (B2C, www.kappa.it)

**Versione:** bozza 1.0
**Target:** consumatori finali (B2C)
**Sito:** `Rivendita Privati/` (HTML statico, in migrazione a Next.js) · dominio `[DA CONFERMARE]`
**Differenza chiave vs Luis B2B:** prezzi visibili, intent transazionale, recensioni, SEO locale negozio, contenuti stagionali.

---

## 1. Diagnosi

| Aspetto | Stato attuale | Impatto |
|---|---|---|
| Meta title/description | ✅ presenti su index | OK base |
| Canonical | ❌ assente | Duplicati se URL multipli |
| Open Graph / Twitter Card | ❌ assente | Scarsa condivisione social |
| robots.txt / sitemap.xml | ❌ assenti | Google non sa cosa indicizzare |
| Dati strutturati (schema.org) | ❌ assenti | Niente rich results |
| Immagini | WebP senza `alt` descrittivo | Perdita ranking immagini |
| Core Web Vitals | `app.js` tutto client-side, hero pesante | LCP/CLS a rischio |
| Contenuti | Solo prodotti, nessun blog/guida | Superficie keyword limitata |

---

## 2. Strategia keyword

**B2C = intent transazionale + informativo, non "ingrosso".**

| Tipo | Esempi keyword | Priorità |
|---|---|---|
| **Prodotto specifico** | "vasi cotto portoghese", "fioriere in terracotta", "vasi da esterno grandi" | Alta |
| **Occasione/regalo** | "idee regalo fiorista", "vasi da terrazzo eleganti", "addobbi natale" | Alta (stagionale) |
| **Informazionale** | "come scegliere un vaso da esterno", "differenza cotto e fiberstone", "cura vasi in terracotta" | Media (guida) |
| **Locale** | "negozio vasi Bergamo", "complementi arredo Bergamo", "fiorista Bergamo" | Alta (locale) |
| **Marca** | "Kappa Design vasi", "Kappa Design catalogo" | Media (brand awareness) |

**Cosa NON fare:** inseguire keyword generiche tipo "vasi" (volume enorme, competitor enormi). Punta su nicchie e long-tail.

---

## 3. Interventi per fase

### Fase 0 — Fondamenta tecniche (1-2 giorni)

- `robots.txt` + `sitemap.xml`
- `canonical` su ogni pagina
- Open Graph + Twitter Card su tutte le pagine prodotto
- `lang="it"` verificato
- Google Search Console + Bing Webmaster: verifica dominio, invio sitemap
- Google Business Profile per il negozio fisico (Bergamo): foto, orari, recensioni, prodotti

### Fase 1 — Schema.org (2-3 giorni)

**Obbligatorio per B2C con prezzi:**

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Vaso Torchio Terracotta Ø30 H35",
  "image": "https://…/vaso.jpg",
  "description": "…",
  "sku": "VASO-CER-001-30",
  "brand": { "@type": "Brand", "name": "Kappa Design" },
  "offers": {
    "@type": "Offer",
    "price": "25.00",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "128"
  }
}
```

- `Organization` con indirizzo negozio, telefono, orari
- `BreadcrumbList` su ogni pagina
- `LocalBusiness` o `Store` per il punto vendita

### Fase 2 — Contenuti (3-5 giorni)

**Guide/blog** (poche, di qualità, stagionali):
- "Come scegliere il vaso da esterno giusto" (primavera)
- "Cotto vs fiberstone: quale materiale conviene" (evergreen)
- "Idee regalo per la Casa: vasi e fioriere" (Natale, 24 dicembre)
- "Come curare i vasi in terracotta in inverno" (autunno)
- "Tendenze arredo esterno 2026" (gennaio)

**Landing stagionali:**
- `/natale` (già esiste come prototipo → SEO page)
- `/offerte` (sconti, ci sono già nel catalogo)

**Ottimizzazione prodotti:**
- `alt` descrittivo per ogni immagine (non "v-123.jpg")
- Meta title: "Vaso Torchio Terracotta Ø30 H35 — Kappa Design"
- Meta description con prezzo + spedizione + CTA
- Slug parlanti: `/prodotto/vaso-torchio-terracotta-30`

### Fase 3 — SEO locale (2-3 giorni)

- Google Business Profile completo: foto negozio, prodotti, orari, servizi
- Recensioni Google attive (post-acquisto: email che chiede recensione)
- NAP coerente: Kappa Design, indirizzo Bergamo, telefono — identico su sito e directory
- Directory locali: PagineGialle, Yelp, TripAdvisor (se rilevante)
- Schema `LocalBusiness` con area servita

### Fase 4 — Performance (2-3 giorni)

- Immagini: WebP con `width`/`height` dichiarati, `loading="lazy"` sotto piega
- Hero: `fetchpriority="high"`, preload del font
- CSS/JS: minificati, code-splitting
- Obiettivi CWV: LCP ≤ 2,5s · CLS < 0,1 · INP ≤ 200ms
- Migrazione Next.js con SSR per le pagine prodotto (LCP migliora)

---

## 4. Strumenti

| Strumento | Uso | Costo |
|---|---|---|
| Google Search Console | Query, impression, errori indicizzazione | Gratis |
| Google Analytics 4 | Traffico, conversioni, funnel | Gratis |
| Google Business Profile | SEO locale, recensioni, mappe | Gratis |
| PageSpeed Insights | Audit performance | Gratis |
| Ahrefs / SEMrush (opzionale) | Keyword research, backlink, competitor | ~€100/mese |

---

## 5. KPI

| Metrica | Target 6 mesi |
|---|---|
| Pagine indicizzate | 200+ |
| Keyword in top-10 | 50+ (nicchie) |
| Traffico organico mensile | 5.000+ visite |
| Conversione e-commerce | 2-3% |
| Recensioni Google | 50+ (media 4.5★) |

---

## 6. Cosa NON fare

- Non copiare descrizioni fornitore identiche su tutti i prodotti (contenuto duplicato)
- Non usare recensioni false (viola termini Google, rischio penalizzazione)
- Non trascurare le immagini pesanti (B2C = mobile first, LCP critico)
- Non dimenticare il negozio fisico: il SEO locale è il canale più redditizio per un B2C con punto vendita

---

## 7. Priorità in una riga

1. **Fase 0** (fondamenta) + Google Business Profile — quick win
2. **Fase 1** (schema.org Product + Offer) — rich results con prezzo
3. **Fase 2** (guide + alt text + slug) — superficie keyword
4. **Fase 3** (locale + recensioni) — traffico qualificato
5. **Fase 4** (performance) — conversione

---

## 8. Differenze vs Luis B2B

| | Luis (B2B) | Kappa (B2C) |
|---|---|---|
| Target | Rivenditori, fioristi | Consumatori finali |
| Prezzi | Nascosti (gating) | Visibili |
| Intent keyword | "ingrosso", "fornitore" | "compra", "prezzo", "recensioni" |
| Schema | Organization, Product (no prezzo) | Product + Offer + AggregateRating |
| Locale | Google Business Profile (sede) | Google Business Profile (negozio) + recensioni |
| Contenuto | Catalogo, schede prodotto | + guide, stagionali, blog |
| Recensioni | Non rilevanti | Critiche (trust + schema) |
| Conversione | Richiesta accesso | Acquisto diretto |
