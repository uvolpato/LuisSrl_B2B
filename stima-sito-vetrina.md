# Stima Costi e Tempi — Sito Vetrina Pubblico (www.luisbg.it)

Basata su riutilizzo **massimo** dell'esistente (backend + componenti UI).

---

## 1. Riassunto esecutivo

| Voce | Tempo | Costo dev (interno) | Note |
|---|---|---|---|
| **Backend** (estensioni minime) | **~0,5 gg** | 0 € | Solo 3 metodi service + 1 controller pubblico |
| **Frontend vetrina** (static export) | **~8–10 gg** | 0 € | Scaffold, home, catalogo read-only, form accesso, SEO |
| **Deploy / DevOps** | **~1 gg** | 0 € | nginx config, build statico, DNS |
| **Totale vetrina** | **~10–11,5 gg** | **0 €** (team interno) | Nessuna infrastruttura nuova |
| **Qualifica Lead (AI)** | **~9–13 gg** | **0 €** (team interno) | Backend only, Gemini API |
| **Totale complessivo** | **~19–24,5 gg** | **0 €** (team interno) | Vetrina + lead qualification |

> Se esternalizzato: vetrina ~80–100h + lead ~70–105h × tariffa oraria.

---

## 2. Dettaglio per fase

### Fase 1 — Scaffold `frontend-vetrina/` (1,5–2 gg)

| Task | Tempo | Dettagli |
|---|---|---|
| `package.json` + `next.config.js` (export, images) | 0,5 gg | Copia da B2B, strip auth/proxy |
| `tsconfig.json`, `.eslintrc.js`, `globals.css` (token OKLch) | 0,5 gg | Copia da `frontend/` + `brand-spec.md` |
| Copia componenti UI base (`Button`, `Card`, `PositionedImage`, `Header`, `Footer`) | 0,5 gg | ~8 file, zero logica |

### Fase 2 — Home + Azienda + Contatti (1,5–2 gg)

| Task | Tempo |
|---|---|
| `app/layout.tsx` (SEO defaults, font, JSON-LD Organization) | 0,5 gg |
| `app/page.tsx` (hero, value props, CTA "Richiedi accesso") | 0,5 gg |
| `app/azienda/page.tsx` + `app/contatti/page.tsx` | 0,5 gg |

### Fase 3 — Catalogo read-only (3–4 gg)

| Task | Tempo | Backend usato |
|---|---|---|
| `GET /api/catalogo/pubblico` (famiglie) + `getFamigliePubbliche()` | 0,5 gg | Nuovo method service |
| `GET /api/catalogo/pubblico/famiglia/:codice` + method | 0,5 gg | Nuovo method service |
| `app/catalogo/page.tsx` (griglia famiglie → linee) | 1 gg | Riusa `ProductGrid`/`ProductCard` da B2B |
| `app/catalogo/[slug]/page.tsx` (scheda articolo) | 1–1,5 gg | `GET /api/catalogo/pubblico/:codiceLinea` esistente |
| Immagini via `/api/img?p=...&w=` (già pronto) | — | Zero lavoro |

### Fase 4 — Form "Richiedi accesso B2B" (1 gg)

| Task | Tempo |
|---|---|
| `AuthPublicController` + `POST /auth/pubblico/richiedi-accesso` | 0,5 gg |
| Validazione + `customer_event` lead + email admin (template esistente) | 0,5 gg |
| `app/richiedi-accesso/page.tsx` (form + toast) | 0,5 gg |

### Fase 5 — SEO + Performance (1,5–2 gg)

| Task | Tempo |
|---|---|
| `next-sitemap` config + `robots.txt` | 0,5 gg |
| JSON-LD `Product` su schede, `BreadcrumbList`, `WebSite` | 0,5 gg |
| Meta tag per pagina (`title`, `description`, `og:*`, `canonical`) | 0,5 gg |
| Audit CWV (Lighthouse CI), budget JS < 150KB gz, CLS < 0.1 | 0,5–1 gg |

### Fase 6 — Deploy (1 gg)

| Task | Tempo |
|---|---|
| Build statico `npm run build` → `./out/` | 0,25 gg |
| nginx config per `www.luisbg.it` + SSL (Certbot) | 0,5 gg |
| DNS switch, test mobile/desktop, redirect vecchi URL | 0,25 gg |

---

## 3. Costi infrastruttura (zero nuovo)

| Risorsa | Già esistente | Note |
|---|---|---|
| Server (stesso del B2B) | ✅ | CPU/RAM marginale per file statici |
| Backend API (NestJS 3001) | ✅ | Stesse query, nessun carico extra |
| Immagini `/api/img` | ✅ | Cache 1 anno, banda minima |
| Database (PostgreSQL) | ✅ | Solo `SELECT` su viste esistenti |
| Email (Nodemailer) | ✅ | Template `richiedi-accesso` |
| DNS `luisbg.it` | ✅ | Aggiungere `www` CNAME |

---

## 4. Rischi e mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| `IntegrazioneService` non ha `getFamigliePubbliche()` | Bassa | +0,5 gg | Metodo banale: `SELECT DISTINCT famiglia FROM articoli WHERE stato='attivo'` |
| Immagini non ottimizzate per LCP | Media | CWV fail | `PositionedImage` con `priority` su hero, `width`/`height` espliciti |
| SEO: contenuti duplicati vs vecchio sito | Bassa | Ranking drop | Redirect 301 mappati, `canonical` corretto |
| Form spam | Media | Email noise | honeypot field + rate limit IP (nginx) + opzionale reCAPTCHA v3 |

---

## 5. Confronto: "integrare nel B2B" vs "app separata"

| Approccio | Tempo extra | Rischio | Manutenibilità |
|---|---|---|---|
| **App separata (questa stima)** | **0** (baseline) | Basso | Alta: deploy indipendenti, bundle separati |
| Integrare in `frontend/` (route `/vetrina/*`) | +2–3 gg (routing, middleware, build config) | Medio: auth leak, bundle bloating, CSP conflitti | Bassa: un bug nel carrello rompe il sito pubblico |

**Conclusione**: l'app separata è **più veloce, più sicura, più manutenibile**.

---

## 6. Cash flow (se team esterno)

| Voce | Ore | Tariffa €/h | Totale |
|---|---|---|---|
| Backend | 4 | 80 | 320 € |
| Frontend | 70 | 80 | 5.600 € |
| DevOps/Deploy | 8 | 80 | 640 € |
| **Totale** | **82** | — | **~6.560 €** |

---

## 7. Qualifica Lead con AI — Stima

| Fase | Contenuto | Tempo | Note |
|---|---|---|---|
| **1 — Fondamenta** | Modelli `Lead`/`LeadEvent`, `POST /leads` pubblico, DTO, template mail | 2 gg | Backend only |
| **2 — Indagine AI** | Gemini + Google Search grounding, segnali, timeout, fallback | 2–3 gg | Dipende da §8.2 (search grounding) |
| **3 — Verdetto + pulsanti** | Logica 3 voci, token HMAC single-use, endpoint azioni | 2 gg | Backend only |
| **4 — Excel Integra** | Generatore `.xlsx` anagrafica, cartella monitorata | 1–2 gg | **Bloccato su AGOMIR** (tracciato) |
| **5 — Automazione invito** | `leadId` su Customer, post-import invito automatico | 1–2 gg | Riusa `invita()` |
| **6 — Hardening** | Rate limit, spam, collaudo end-to-end | 1–2 gg | |
| **Totale** | | **~9–13 gg** | |

**Costo esterno (se esternalizzato):**

| Voce | Ore | Tariffa €/h | Totale |
|---|---|---|---|
| Backend lead | 88 | 80 | 7.040 € |
| **Totale** | **88** | — | **~7.040 €** |

---

## 8. Prossimo passo

1. Approvi la stima?
2. Creo lo scaffold `frontend-vetrina/` (Fase 1) → commit + push
3. Procedo a fasi successive con check intermedi