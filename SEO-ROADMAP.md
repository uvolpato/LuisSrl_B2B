# Roadmap SEO — Portale B2B Luis

## 1. Diagnosi (senza giri di parole)

Stato attuale:
- **Tutto il valore è dietro login**: catalogo e schede prodotto non sono
  raggiungibili da Google. Un portale B2B chiuso ha **superficie SEO ≈ 0**.
- Landing pubblica presente, ma: solo `<title>`, **nessuna** `description`,
  Open Graph, canonical.
- **Nessun** `robots.txt`, **nessuna** `sitemap.xml`, **nessun** dato
  strutturato (schema.org).
- Homepage in `"use client"` → contenuto non ottimizzato per i crawler.
- Le descrizioni AI dei prodotti (contenuto unico e ricco) sono **sprecate**:
  visibili solo ai clienti loggati.

**Conclusione critica:** senza esporre contenuto pubblico, qualsiasi lavoro SEO
è inutile. La prima decisione non è tecnica, è strategica.

## 2. La decisione che viene prima di tutto

**Vuoi acquisire NUOVI rivenditori da Google, o il portale serve solo ai
clienti già acquisiti?**

- **Solo clienti esistenti** → SEO non serve. Fermati qui: bastano landing
  curata + Google Business Profile. Non spendere altro.
- **Acquisire nuovi rivenditori** (consigliato per un ingrosso) → serve una
  **vetrina pubblica**: catalogo sfogliabile e schede prodotto pubbliche
  **senza prezzi** (i prezzi restano dietro login), con CTA "Richiedi accesso
  B2B".

Il resto della roadmap assume la **vetrina pubblica**. È l'intervento che
sblocca tutto il resto.

## 3. Interventi (per fasi, dal più redditizio)

### Fase 0 — Fondamenta tecniche (1-2 giorni, quick win)
Basso sforzo, abilitano tutto il resto.
- `robots.txt` + `sitemap.xml` (Next.js: `app/robots.ts`, `app/sitemap.ts`).
- `metadata` completo nel layout: `description`, `openGraph`, `twitter`,
  `metadataBase`, `lang`.
- `noindex` esplicito su `/area/*`, `/admin/*`, `/login` (aree private non
  devono finire in indice).
- Google Search Console + Bing Webmaster: verifica dominio, invio sitemap.

### Fase 1 — Vetrina pubblica (il cuore del progetto)
- **Catalogo pubblico** `/catalogo` (browse-only, no prezzi, no ordine):
  riusa i componenti esistenti in versione "ospite".
- **Schede prodotto pubbliche** `/catalogo/[slug]`: foto + descrizione AI +
  varianti/dimensioni. **Render server-side** (no `"use client"` sul guscio).
- **Slug parlanti**: `/catalogo/vasi-cotto-portoghese-argo-nocciola` invece di
  codici interni.
- **CTA chiara** su ogni scheda: "Prezzi e ordini riservati ai rivenditori →
  Richiedi accesso".
- Prezzi e "aggiungi all'ordine" **solo dopo login** (il gating resta).

### Fase 2 — Dati strutturati e contenuti
- **Schema.org** `Product` (nome, immagine, brand, descrizione, `sku`) e
  `Organization` (azienda, sede, contatti) → rich result su Google.
- **Pagine categoria/famiglia** pubbliche (`/famiglie/vasi-cotto-interno`):
  ottime per keyword generiche ("vasi cotto per interni ingrosso").
- **Guide/blog** (poche, di qualità): "Come scegliere i vasi per un garden
  center", "Cotto portoghese vs fiberstone". Attirano ricerche informazionali
  e generano link interni.

### Fase 3 — Autorità e locale
- **Google Business Profile** (sede Bergamo) — il più alto ritorno per una
  ricerca locale/B2B.
- Backlink mirati: fornitori, cataloghi di settore, associazioni florovivaisti.
- Coerenza NAP (nome/indirizzo/telefono) su sito e directory.

## 4. Strumenti admin da aggiungere

Nel pannello articolo/famiglia, un piccolo blocco **SEO** (non invasivo):
- Campo **slug** (auto-generato dal nome, modificabile).
- **Meta title** e **meta description** (con contatore caratteri e anteprima
  Google).
- **Alt text** delle immagini (oggi probabilmente vuoto → penalizza).
- Flag **"visibile in vetrina pubblica"** per articolo/famiglia (controllo
  editoriale su cosa esporre).
- **Sitemap automatica**: si popola dagli articoli pubblici configurati.

## 5. Strumenti AI (riuso di ciò che hai già)

Hai già il wizard di descrizione AI: estendilo per **produrre asset SEO** dallo
stesso input, a costo marginale zero.
- Genera **meta title + meta description** ottimizzati (lunghezza corretta,
  keyword naturale) dal contenuto della descrizione.
- Genera **alt text** descrittivi per ogni foto.
- Suggerisce lo **slug** e 3-5 **keyword** pertinenti.
- Bozze di **guide/blog** a partire da famiglia + materiali (revisione umana
  obbligatoria: contenuto AI non revisionato è un rischio, non un vantaggio).

Principio: l'AI **propone**, l'umano **approva**. Niente pubblicazione
automatica.

## 6. Performance (Core Web Vitals)

Google premia la velocità; su mobile è decisivo.
- Immagini: usare `next/image` (formati moderni, lazy-load, dimensioni
  corrette). Oggi le foto sono servite "grezze" da `public/`.
- Evitare `"use client"` sul guscio delle pagine pubbliche (LCP peggiore).
- Obiettivi: LCP ≤ 2,5s · CLS < 0,1 · INP < 200ms (misurabili in Search
  Console → Core Web Vitals).

## 7. Misura (senza dati non si migliora)

- **Google Search Console**: query, impression, click, posizione, errori
  indicizzazione, Core Web Vitals. È lo strumento primario.
- Analytics (GA4 o alternativa privacy-friendly) per il traffico organico.
- KPI: pagine indicizzate, keyword in top-10, richieste "accesso B2B" da
  organico.

## 8. Priorità in una riga

1. **Decidi** se vuoi traffico da Google (Fase strategica).
2. Se sì → **Fase 0** (fondamenta, 1-2 giorni) + **Google Business Profile**.
3. Poi **vetrina pubblica** (Fase 1) — senza questa il resto non serve.
4. Poi dati strutturati, contenuti, strumenti admin/AI (Fasi 2-3).

## 9. Cosa NON fare

- Non "aprire" i prezzi al pubblico per fare SEO: perdi il senso del B2B.
- Non generare decine di articoli AI non revisionati: Google penalizza il
  contenuto di massa a bassa qualità.
- Non inseguire keyword generiche irraggiungibili ("vasi"): punta a nicchie
  ("vasi cotto portoghese ingrosso", "fornitore fiberstone rivenditori").
- Non fare SEO se la risposta al §2 è "solo clienti esistenti".
