# Specifica — API Dropshipping (partner terzi)

**Versione:** bozza 2.0
**Oggetto:** esporre una API pubblica versionata che permetta a marketplace e piattaforme
terze di integrare catalogo, prezzi e giacenze Luis, inviare ordini **dropship** (spedizione
diretta al consumatore finale del partner), ricevere aggiornamenti via webhook e gestire resi.
**Destinatari:** referenti tecnici dei partner + AGOMIR S.p.A. (impatto su Integra).

> Modello: **terze parti** (marketplace, aggregatori, e-commerce SaaS). Ciclo completo.
> Questo documento è **piano** e **specifica**. I punti `[DA CONFERMARE]` sono assunzioni con
> default ragionevole, non blocchi.

---

## 0. Standard di riferimento

Non esiste uno standard formale (ISO/W3C) per le API di dropshipping. Il riferimento di fatto è
il pattern comune ai principali fornitori (BigBuy, Printful, CJ Dropshipping, Doba), consolidato
nella specifica aperta **OpenDrop v1**. Questa API **adotta OpenDrop v1** come target di
conformità, salvo dove il modello dati Luis (Articolo → Variante, Integra) lo rende diverso.

**Conformità OpenDrop v1 — copertura della presente specifica:**

| Requisito OpenDrop v1 | Qui | Note |
|---|---|---|
| Auth Bearer token singolo, rotazione, `/whoami` | §4 | prefissi `pk_live_` / `pk_test_` |
| Status code HTTP reali (mai `200` + `success:false`) | §5.3 | |
| Error envelope `{error:{code,message,doc_url,request_id}}` | §5.3 | API esterna ha envelope proprio |
| Paginazione a cursore | §5.2 | |
| `Idempotency-Key` obbligatoria sulle mutazioni, retention, `409` su corpo diverso | §5.4 | |
| Rate limit + header `X-RateLimit-*`, `Retry-After` | §5.5 | |
| Modello Product → Variant (+ Inventory per magazzino) | §7 | mappa Articolo → Variante |
| Endpoint bulk (products/inventory/pricing) | §6 | |
| Incremental sync (`updated_since`, stream eventi catalogo) | §6.8 | |
| `ship_to`-aware per giacenza e spedizione | §6.4–6.6 | |
| Shipping quote prima dell'ordine | §6.6 | |
| Ordini multi-riga + annullo | §6.7 | |
| Webhook: firma HMAC stile Stripe, envelope, retry, replay | §9 | |
| Returns & refunds API | §6.9 | |
| Sandbox reale, environment-safe | §4.1 | |
| OpenAPI 3.1 pubblicato | §4.4 | |
| Versioning in URL + policy deprecazione | §4.2 | |
| Localizzazione (shape a mappa lingua) | §7.4 | Luis: `it` obbligatorio |
| Date/importi come stringhe decimali + valuta ISO 4217 | §5.6 | |

Fuori scope v1 (stretch): multi-currency, SDK auto-generati, status page, GraphQL.

---

## 1. Scopo e modello

Il portale diventa **fornitore dropship**: un partner pubblica sul proprio canale gli articoli
Luis e, quando vende, invia l'ordine con **destinatario finale** (il consumatore del partner).
Luis spedisce a quel destinatario e **fattura il partner**.

```
Partner (marketplace)                        Luis (portale B2B)
  │  GET /products, /variants, /inventory, /pricing ─▶ IntegrazioneService (viste Integra, listino partner)
  │  POST /shipping/quote ───────────────────────────▶ tariffe spedizione
  │  POST /orders {items, recipient} ────────────────▶ checkout (confermaOrdine) + OrdineCliente
  │  ◀── webhook order.confirmed / order.shipped ────  sync Integra / macchina a stati
  │  POST /returns ──────────────────────────────────▶ reso
```

Principi:

- **Una sola fonte di verità**: il commerciale (catalogo, listini, giacenze, stato ordini) nasce
  in Integra. I prezzi sono **sempre ricalcolati lato server** alla persistenza.
- **Riuso massimo**: nessuna reimplementazione; l'ordine entra nella coda `export-ordini` verso
  Integra come gli ordini da portale.
- **Isolamento**: modulo separato dalle route a sessione-cookie, con auth e scope propri.

## 2. Architettura e riuso

Modulo NestJS **`partner-api`**, path esterno `/api/v1/*` (distinto dal `/api` interno).
Guard proprio (`ApiKeyGuard`), non quello a sessione.

| Serve per | Da dove (riuso) |
|-----------|-----------------|
| Catalogo, varianti, immagini | `IntegrazioneService.getCatalogoPaginato` / `getCatalogoFacets` (`integrazione.service.ts:766`) |
| Prezzo del partner | `IntegrazioneService.getPrezzo(codiceListino, codiceProdotto)` (`integrazione.service.ts:3300`) |
| Giacenze | viste `b2b_giacenze` sincronizzate |
| Tariffe spedizione | `SpeseSpedizioneModule` (`checkout.calcolaSpedizione`) |
| Creazione ordine | `CheckoutService.confermaOrdine(customerId, dto)` (`checkout.service.ts:254`), rifattorizzato su metodo servizio riusabile |
| Ordini del partner | `OrdiniService.getMieiOrdini` adattato |
| Consegna a Integra | `src/export-ordini/` (`.xlsx`, `mvt_vsrif` = numero B2B) |
| Stato/tracking | sync ordini/spedizioni da Integra (`sync.service.ts`) |
| Log/audit | `audit_log` + `AccessLogInterceptor` |

## 3. Ambienti, versioning, autenticazione

### 3.1 Ambienti (environment-safe)

| Env | Base URL | Chiavi | Comportamento |
|---|---|---|---|
| Produzione | `https://api.<dominio>/v1/` | `pk_live_…` | ordini reali, export a Integra |
| Sandbox | `https://sandbox.api.<dominio>/v1/` | `pk_test_…` | ordini di test, **nessun** export |

Il prefisso della chiave determina l'ambiente: una chiave di test **non può** funzionare in
produzione e viceversa (impossibile per errore). `[DA CONFERMARE: sottodominio sandbox]`

### 3.2 Versioning e deprecazione

- Versione nel path (`/v1/…`). Nuovi endpoint backward-compatible non cambiano versione.
- Breaking change → `/v2/`. Versione deprecata risponde con header `Deprecation: true` e
  `Sunset: <data>` (RFC 8594), con preavviso ≥ 6 mesi.

### 3.3 Autenticazione

`Authorization: Bearer pk_live_<token>`. Token opaco generato dal portale, **salvato solo come
hash** (argon2), associato a un `ApiCredential` con *scope*, ambiente e stato. Più chiavi attive
per partner (rotazione zero-downtime), `lastUsedAt` visibile, revoca immediata (audit 90 gg).

Scope: `catalog:read`, `price:read`, `stock:read`, `orders:write`, `orders:read`,
`returns:write`, `webhooks:manage`.

**`GET /v1/whoami`** — validazione credenziali (endpoint unico, standard):

```json
{ "partner_id": "ptr_8a3f…", "partner_name": "Acme Marketplace",
  "environment": "sandbox", "scopes": ["catalog:read","orders:write"],
  "rate_limit_per_minute": 600 }
```

### 3.4 Documentazione come codice

Spec **OpenAPI 3.1** generata (`@nestjs/swagger`) e pubblicata su `/v1/openapi.json`,
UI su `/v1/docs`. È il contratto per il codegen dei client dei partner.

## 4. Pattern comuni

### 4.1 Header di richiesta

```
Authorization: Bearer pk_live_...      (obbligatorio)
Content-Type: application/json         (POST/PUT)
Idempotency-Key: <uuid>                (obbligatorio su POST/PUT/DELETE mutativi)
Accept-Language: it,en;q=0.8           (opzionale)
```

### 4.2 Header di risposta

```
X-Request-Id: req_…
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 587
X-RateLimit-Reset: 1747315200
```

### 4.3 Errori (envelope esterno)

Envelope proprio dell'API esterna (diverso dall'`HttpErrorFilter` interno, che resta invariato):

```json
{ "error": { "code": "variant_unavailable",
             "message": "Variant var_0123 has 0 available",
             "doc_url": "https://docs.<dominio>/errors/variant_unavailable",
             "request_id": "req_2pK3xY…" } }
```

Status: `400` malformato · `401` chiave assente/invalida · `403` scope mancante · `404`
risorsa non trovata · `409` conflitto idempotenza/state machine · `422` semanticamente invalido
(indirizzo, giacenza) · `429` rate limit (`Retry-After`) · `5xx` server.
**Mai `200` con esito negativo nel body.**

### 4.4 Idempotenza

`Idempotency-Key` su ogni mutazione.

- Prima chiamata → esegue, salva risposta, la restituisce.
- Stessa chiave, stesso body → restituisce la risposta salvata, nessun effetto.
- Stessa chiave, **body diverso** → `409` `idempotency_key_conflict`.
- Chiavi scoped per partner + endpoint. **Retention: 30 gg** su `/orders` e `/returns`, 24 h altrove.

### 4.5 Rate limit

Intero richieste/minuto nell'header; superato → `429` + `Retry-After`. Default suggerito:
free 60/min, pro 600/min, enterprise 6000/min. Il tracker del `ThrottlerModule` va esteso
sull'id credenziale (`req.apiPartnerId`) quando presente.

### 4.6 Formati

- **Importi**: stringa decimale in unità maggiori + valuta ISO 4217, mai float:
  `{ "amount": "12.50", "currency": "EUR" }`.
- **Date**: ISO 8601 UTC (`2026-10-01T09:12:00Z`).
- **ID**: opachi (`var_…`, `ord_…`), mai interi auto-incrementali. Il codice Integra è esposto
  come `sku` (business key), separato dall'`id`.
- **Testo**: `description_text` (plain) e `description_html` separati, mai HTML dentro il testo.

## 5. Endpoint API v1

Base `https://api.<dominio>/v1`. Tutte le liste sono a **cursore**: `?limit=&cursor=` →
`{ data, has_more, next_cursor }`.

### 5.1 Categorie

`GET /categories` — lista piatta con `id`, `name` (mappa lingua), `parent_id`, `path`.

### 5.2 Prodotti

`GET /products?q=&category=&ship_to=IT&in_stock=true&min_price=&max_price=&tag=&updated_since=&limit=&cursor=`

```json
{ "data": [ {
    "id": "art_cer001",
    "sku": "VASO-CER-001",
    "type": "physical",
    "title": { "it": "Vaso in ceramica bianca" },
    "description_text": { "it": "…" },
    "description_html": { "it": "<p>…</p>" },
    "category_id": "cat_ceramica",
    "category_path": ["Ceramica"],
    "tags": ["novita-2026"],
    "images": [ { "url": "https://…/x.webp", "width": 1200, "height": 1600, "alt": "…" } ],
    "variant_count": 3,
    "status": "active",
    "updated_at": "2026-10-01T09:12:00Z"
  } ], "has_more": true, "next_cursor": "…" }
```

`GET /products/{id}?expand=variants,inventory` — dettaglio con varianti/magazzini.
`POST /products/batch` — `{ ids: [up to 100], expand: [...] }` → `{ data, missing:[…] }`.
`GET /products/{id}/variants`.

### 5.3 Varianti

`GET /variants/{id}` — `id`, `product_id`, `sku` (codice Integra), `options` (dimensioni),
`barcode_ean`, `images`, `status`, `updated_at`.

> Giacenza e prezzo **non** stanno sulla variante: stanno per (variante, magazzino) — §5.4/5.5.

### 5.4 Giacenze

`POST /inventory/batch` — `{ variant_ids, ship_to }`

```json
{ "data": [
    { "variant_id": "var_0123", "available_qty": 48, "lead_time_days": 1,
      "warehouses": [ { "warehouse_id": "wh_luis", "available_qty": 48, "lead_time_days": 1 } ],
      "last_synced_at": "2026-10-01T08:00:00Z" }
  ] }
```

`available_qty = null` per variante sconosciuta. `ship_to` filtra i magazzini che spediscono lì.

### 5.5 Prezzi

`POST /pricing/batch` — `{ variant_ids, currency }`

```json
{ "data": [
    { "variant_id": "var_0123", "price": { "amount": "12.50", "currency": "EUR" }, "msrp": null }
  ] }
```

Prezzo dal listino del partner. `price: null` se non a listino.

### 5.6 Shipping quote

`POST /shipping/quote` — `{ items:[{variant_id, qty}], ship_to:{country_code, postal_code} }`

```json
{ "methods": [
    { "id": "ship_std_it", "name": "Corriere standard", "carrier": "…",
      "price": { "amount": "9.90", "currency": "EUR" },
      "estimated_days_min": 2, "estimated_days_max": 4 }
  ] }
```

Quote valida 30 min. Riutilizza `checkout.calcolaSpedizione`.

### 5.7 Ordini

`POST /orders` (richiede `Idempotency-Key`)

```json
{
  "external_id": "SHOP-2026-000123",
  "items": [ { "variant_id": "var_0123", "qty": 2, "shipping_method_id": "ship_std_it" } ],
  "recipient": {
    "name": "Mario Rossi", "phone": "+39…", "email": "mario@example.com",
    "address_line1": "Via Roma 12", "city": "Verona",
    "region_code": "VR", "postal_code": "37100", "country_code": "IT"
  },
  "shipping_method_id": "ship_std_it"
}
```

`shipping_method_id` opzionale: se omesso Luis sceglie il metodo più economico disponibile e lo
restituisce in `shipping.method_id`. Risposta `201`:

```json
{
  "id": "ord_2pK3xY7n",
  "external_id": "SHOP-2026-000123",
  "status": "confirmed",
  "items": [ { "variant_id": "var_0123", "qty": 2,
               "unit_price": { "amount": "12.50", "currency": "EUR" } } ],
  "shipping": { "method_id": "ship_std_it", "name": "Corriere standard", "carrier": "…",
                "tracking_number": null, "tracking_url": null,
                "shipped_at": null, "delivered_at": null },
  "recipient": { "name": "Mario Rossi", "city": "Verona", "country_code": "IT",
                 "address_line1": "Via Roma 12", "postal_code": "37100", "region_code": "VR",
                 "email": "mario@example.com", "phone": "+39…" },
  "costs": { "subtotal": { "amount": "25.00", "currency": "EUR" },
             "shipping":  { "amount": "9.90",  "currency": "EUR" },
             "total":     { "amount": "34.90", "currency": "EUR" } },
  "created_at": "2026-10-01T09:12:00Z", "updated_at": "2026-10-01T09:12:00Z"
}
```

> Nota: campi tracking **piatti** dentro `shipping` (mai annidati in `shipping.shipments[0]…`).

Errori rilevanti: `variant_unavailable` (giacenza caduta), `invalid_address`,
`shipping_not_available`, `min_order_not_met` (minimo d'ordine Luis), `credit_exceeded`
(fido insufficiente) `[DA CONFERMARE: gestione fido/crédit nel dropship]`.

`GET /orders/{id}` · `GET /orders?status=&since=&limit=&cursor=`
`POST /orders/{id}/cancel` — `{ "reason": "buyer_requested" }`; finestra di annullo: fino a
`status=shipped` o N minuti dalla creazione `[DA CONFERMARE]`.

**Mapping stato interno ↔ API:**

| API (OpenDrop) | Interno / Integra |
|---|---|
| `pending` | BOZZA (pre-validazione) |
| `confirmed` | CONFERMATO |
| `shipped` | SPEDITO (da Integra) |
| `delivered` | CONSEGNATO (da Integra) |
| `cancelled` | ANNULLATO |
| `failed` | ERRORE_* (export/validazione) |
| `refunded` | RESO |

### 5.8 Incremental sync — stream eventi catalogo

`GET /catalog/events?since=&limit=&cursor=` — eventi `product.created|updated|discontinued`,
`product.stock.changed`, `product.price.changed`. Evita il re-crawl completo; i partner poi
rilanciano `GET /products/{id}` sui soli id cambiati. `updated_since` resta disponibile anche su
`/products`, `/inventory`, `/pricing`.

### 5.9 Resi e rimborsi

`GET /products/{id}/return-policy` → `{ returnable, window_days, conditions[], restocking_fee_pct }`
`POST /returns` (richiede `Idempotency-Key`) — `{ order_id, items:[{variant_id, qty, reason}], buyer_notes }`
→ `201 { id, status, return_label_url, return_tracking_number, refund_amount_estimated }`
`POST /orders/{id}/refund` (richiede `Idempotency-Key`) — `{ amount?, reason }`; `amount` omesso = rimborso totale.

### 5.10 Webhook (gestione)

`GET/POST/DELETE /webhooks` — registra/elenca/elimina endpoint; `POST /webhooks/{id}/test`.
Supporto **URL dedicato per partner** (`…/webhooks/{partner_token}/`) per il routing multi-account.

### 5.11 Documentazione

`GET /v1/openapi.json` (spec OpenAPI 3.1) · UI su `/v1/docs`.

## 6. Modello dati

Modelli Prisma additivi (`backend/prisma/schema.prisma`):

```
Partner                    // soggetto terzo abilitato all'API dropship
  id, nome, stato, emailTecnica
  customerId → Customer    // soggetto fatturato + codice_listino (riuso)
  createdAt, updatedAt

ApiCredential
  id, partnerId → Partner
  keyHash (argon2), prefisso, scope[], ambiente (SANDBOX|PROD)
  attivo, lastUsedAt, createdAt           @@unique([prefisso])

WebhookEndpoint
  id, partnerId → Partner
  url, secret (HMAC), eventi[], attivo

WebhookDelivery              // coda + retry + replay
  id, endpointId → WebhookEndpoint
  evento, payload(json), stato(PENDING|OK|FAILED)
  tentativi, responseStatus, prossimoTentativo, createdAt

IdempotencyRecord            // deduplica POST/PUT (retention 30gg / 24h)
  id, partnerId, endpoint, chiave, requestHash, responseJson, createdAt
  @@unique([partnerId, endpoint, chiave])
```

Estensioni additive a `OrdineCliente`:

| Campo | Tipo | Uso |
|-------|------|-----|
| `partner_id` | int? | ordine via API (null = portale) |
| `origine` | text | `PORTALE` \| `API` |
| `riferimento_partner` | text? | `external_id` del partner |
| `dest_nome`, `dest_indirizzo`, `dest_cap`, `dest_citta`, `dest_provincia`, `dest_nazione`, `dest_email`, `dest_telefono` | text? | snapshot destinatario finale |

Nuovo modello **`ResoPartner`** (order_id, items json, stato, label_url, tracking, importo stimato) per §5.9.

`IndirizzoCliente` invariato: il destinatario finale è snapshot di documento, non anagrafica.

### 6.1 Mappatura entità Luis ↔ OpenDrop

| OpenDrop | Luis |
|---|---|
| Product | Articolo |
| Variant | Variante (codice articolo Integra → `sku`) |
| InventoryRecord (variant × warehouse) | giacenza per variante (magazzino unico: `wh_luis`) |
| SKU (`external_sku`) | codice variante Integra |
| Category | Famiglia |
| Order / OrderItem | OrdineCliente / RigaOrdine |
| Recipient | snapshot destinatario finale |
| Merchant | Partner (→ Customer fatturato) |

## 7. Flusso ordine dropship end-to-end

```
1. Partner            POST /v1/orders (Idempotency-Key, recipient finale)
2. partner-api        valida key+scope, deriva partnerId
3. servizio ordine    ricalcola prezzi+sconti+spedizione dal listino partner, verifica giacenza
4. DB                 $transaction: OrdineCliente(origine=API, partner_id, destinatario…) + righe
5. export-ordini      genera .xlsx per Integra (mvt_vsrif = numero B2B)   [destinatario → §9]
6. Integra            importa, numera, evade
7. sync ordini/spediz. aggiorna stato + tracking
8. webhook            order.confirmed → order.shipped → order.delivered
```

Le tappe 3–5 riusano il percorso degli ordini da portale; differiscono per origine,
destinatario snapshot e soggetto fatturato (il partner).

## 8. Webhook

**Eventi** (nomi OpenDrop): `order.confirmed`, `order.shipped`, `order.delivered`,
`order.cancelled`, `order.failed`, `order.refunded`; `product.stock.changed`,
`product.price.changed`; `return.created`, `return.received`, `return.refunded`.

**Envelope**:

```json
{ "id": "evt_3kKf9aB", "type": "order.shipped",
  "created_at": "2026-10-02T10:15:00Z", "api_version": "v1",
  "data": { "object": { "id": "ord_2pK3xY7n", "status": "shipped",
                        "shipping": { "tracking_number": "…", "tracking_url": "…" } } } }
```

**Firma** (schema Stripe, raccomandato da OpenDrop):

```
OpenDrop-Signature: t=1747315200,v1=<HMAC-SHA256(secret, t + "." + raw_body)>
```

Il partner verifica firma + `t` (rifiuta eventi > 5 min, anti-replay). Verifica con
`crypto.timingSafeEqual`.

**Retry**: 30s, 2m, 10m, 1h, 6h, 24h (6 tentativi) → dead-letter, replay dalla dashboard partner.
Ogni retry usa un **nuovo `t`** e firma ricalcolata; `raw_body` e `id` invariati (dedup lato
partner su `id`). Consegna at-least-once.

## 9. Punti aperti / da concordare con AGOMIR

1. **Destinatario finale sull'ordine.** Il tracciato attuale (`mvt_clacodstr` = codice soggetto)
   non prevede spedizione a indirizzo diverso dal soggetto. Serve una **destinazione** in
   anagrafica Integra (codice da valorizzare) **o** colonne dedicate nel tracciato.
   → **blocca il go-live**; da concordare prima della Fase 3.
2. **Vista spedizioni/DDT in lettura.** Oggi assente (`restore-b2b-views.sql`): serve per
   `GET /orders/{id}/shipment` e `order.shipped`/`order.delivered`.
3. **Codice soggetto del partner** in Integra (fatturazione) + `codice_listino`: onboarding.
4. **Riga sconto/coupon** (già aperta in `ordini-fdw-spec.md §5`).
5. **Resi**: come rientra un reso nel gestionale? (RMA in Integra o solo lato portale)
   `[DA CONFERMARE]`.

## 10. Piano a fasi

| Fase | Contenuto | Deliverable | Stima |
|------|-----------|-------------|-------|
| **0 — Accordi** | auth, scope, listino partner, SLA, webhook, fino a §9; avvio confronto AGOMIR | decisioni §0/§3 chiuse | — |
| **1 — Fondamenta** | modelli `Partner/ApiCredential/Webhook*/IdempotencyRecord`; migration; modulo `partner-api`; `ApiKeyGuard`; OpenAPI 3.1; `/whoami`; envelope errori; cursori; rate limit + header; sandbox `pk_test_` | `/whoami` + `GET /products` autenticato | 3–4 gg |
| **2 — Lettura** | categorie, prodotti (+batch/expand), varianti, inventory/pricing batch `ship_to`-aware, catalog events | partner integra il catalogo | 3–4 gg |
| **3 — Ordini** | shipping quote; `POST/GET /orders`; idempotenza (30 gg); rifattorizza `confermaOrdine`; destinatario snapshot; ingresso `export-ordini`; cancel | ordine dropship fino a Integra | 4–5 gg *(dipende da §9.1)* |
| **4 — Tracking + Webhook** | vista spedizioni; `WebhookEndpoint/Delivery`; firma Stripe-style; retry; stream eventi da sync; dashboard/replay | aggiornamenti automatici al partner | 4–5 gg *(dipende da §9.2)* |
| **5 — Resi** | `returns`/`refund`/`return-policy`; modello `ResoPartner` | gestione resi via API | 3–4 gg |
| **6 — Sandbox, DX, go-live** | sandbox reale, OpenAPI finale, Postman, docs partner, hardening, collaudo end-to-end | partner in produzione | 3–4 gg |

> È lo stesso percorso del portale con auth, destinatario e ciclo resi in più: nessuna nuova
> infrastruttura.

## 11. Barra di qualità e sicurezza (OWASP Top 10:2025)

- **A01 Broken Access Control**: `partnerId` solo dalla credenziale; query filtrate per partner;
  mai esporre campi admin o dati di altri partner. Verifica **sui dati**, non solo sulla rotta.
- **A02 Misconfiguration**: HTTPS obbligatorio; nessuna route di debug; CORS invariato
  (server-to-server senza `Origin`).
- **A04 Crypto**: chiave API solo come hash; `timingSafeEqual`; secret webhook mai in chiaro/log.
- **A05 Injection**: DTO `class-validator` + whitelist; query parametrizzate via Prisma.
- **A07 Auth**: rate limit per credenziale; revoca immediata; rotazione; `lastUsedAt`.
- **A09 Logging**: ogni creazione ordine e uso credenziale in `audit_log`; `429` e accessi
  falliti monitorati; `X-Request-Id` correlabile.
- **A10 Errori**: fail closed; messaggi senza dettagli interni; ordini atomici in `$transaction`.
- **Finanziario**: prezzi/sconti/spedizione **sempre** ricalcolati server-side alla persistenza.

## 12. Collaudo e sandbox

- Sandbox `pk_test_` → stessi endpoint, ordini marcati test, **nessun** export a Integra.
- Test minimi: idempotenza (doppio `POST` → un ordine; stesso key body diverso → `409`),
  giacenza insufficiente (`422`), scope mancante (`403`), key revocata (`401`), firma webhook
  ricalcolata dal partner, cursori, `updated_since`/catalog events, annullo entro finestra.
- Verifica reale: chiamate con chiave di test (Bearer, nessuna sessione), controllo a DB
  dell'ordine creato e del file `export-ordini` prodotto (solo in prod).

---

## Riferimenti

- **OpenDrop v1** — open spec di riferimento (auth, webhook HMAC, idempotenza, sandbox, resi).
- **Google UCP** — order lifecycle: eventi obbligatori `created`/`shipped`/`delivered`.
- **Rithum/Dsco Dropship API** — `order.orderType=Dropship`, workflow acknowledge/cancel/invoice.
- **BigBuy API** — Bearer `API_KEY`, ambienti prod/sandbox, endpoint `order/check` (simulazione),
  delivery notes, tracking, header `X-RateLimit-*`.
- `backend/prisma/schema.prisma` — `Customer`, `OrdineCliente`, `RigaOrdine`.
- `backend/src/checkout/checkout.service.ts:254` — `confermaOrdine` (ricalcolo, `$transaction`).
- `backend/src/integrazione/integrazione.service.ts` — `getCatalogoPaginato:766`, `getPrezzo:3300`.
- `backend/src/export-ordini/` e `backend/prisma/ordini-fdw-spec.md` — export verso Integra.
- `backend/src/main.ts` — Helmet, CORS, CSRF, sessioni.
- `specifica-scambio-dati-integra.md` — canali concordati con AGOMIR.
- `backend/prisma/restore-b2b-views.sql` — viste `b2b_*` in lettura.
