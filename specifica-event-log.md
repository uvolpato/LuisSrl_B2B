# Specifica — Sistema di Log Centralizzato (Event Log)

## 1. Concetto

Il **sistema di log centralizzato** traccia ogni azione che avviene sul portale B2B Luis, indipendentemente dalla sua natura: accessi HTTP, errori, mutazioni dati, eventi di business, sincronizzazioni. Sostituisce i sistemi precedenti (`anomalia_log`, `audit_log`, `customer_event`, `sync_log`) con un'unica tabella `event_log`.

### 1.1 Principi

- **Ogni azione è un evento**: login, modifica articolo, errore 500, sincronizzazione — tutto finisce nella stessa tabella con struttura uniforme.
- **Fire-and-forget**: il logging non deve mai bloccare l'operazione principale. Se il log fallisce, l'operazione prosegue.
- **Correlazione via requestId**: ogni richiesta HTTP ha un UUID univoco che collega tutti gli eventi generati durante quella richiesta.
- **Dati completi in JSONB**: ogni evento porta con sé tutto il contesto necessario per il debug (old/new values, stack trace, parametri).

---

## 2. Modello dati

### 2.1 Tabella `event_log`

```sql
CREATE TABLE event_log (
  id          SERIAL PRIMARY KEY,
  event_type  TEXT NOT NULL,        -- 'access' | 'error' | 'mutation' | 'business' | 'sync'
  action      TEXT NOT NULL,        -- etichetta leggibile: 'Login', 'Conferma ordine', 'Admin — modifica articolo'
  actor_id    INTEGER,             -- ID utente/admin che ha compiuto l'azione
  actor_type  TEXT,                -- 'admin' | 'customer'
  entity      TEXT,                -- tipo entità: 'articolo', 'cliente', 'ordine', 'coupon'
  entity_id   TEXT,                -- ID dell'entità (codiceLinea, id numerico, ecc.)
  data        JSONB,               -- payload completo con tutti i dettagli
  request_id  TEXT,                -- UUID univoco della richiesta HTTP
  session_id  TEXT,                -- ID sessione (futuro)
  ip          TEXT,
  user_agent  TEXT,
  status      TEXT DEFAULT 'ok',   -- 'ok' | 'error'
  duration_ms INTEGER,            -- durata in millisecondi (per access log)
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Tipi di evento (`event_type`)

| Tipo | Cosa traccia | Esempio action |
|---|---|---|
| `access` | Ogni richiesta HTTP | `Login → 200 (45ms)` |
| `error` | Eccezioni/errori | `POST /api/checkout/conferma → 500` |
| `mutation` | Create/update/delete dati | `articolo.update`, `cliente.create` |
| `business` | Eventi di business | `ordine.create`, `carrello.add`, `login` |
| `sync` | Sincronizzazioni batch | `sync.articoli.completato` |

### 2.3 Struttura `data` JSONB per tipo

**access**:
```json
{ "method": "GET", "url": "/api/catalogo", "status": 200, "duration": 45 }
```

**error**:
```json
{ "url": "/api/checkout/conferma", "method": "POST", "status": 500, "message": "Connection refused", "requestId": "abc-123" }
```

**mutation** (creazione articolo):
```json
{ "old": null, "new": { "codiceLinea": "LINEA_ROGERS", "nome": "Vaso Rogers", "colore": "Terracotta" }, "fields": ["codiceLinea", "nome", "colore"] }
```

**mutation** (modifica articolo):
```json
{ "old": { "nome": "Vaso Rogers" }, "new": { "nome": "Vaso Rogers 2.0" }, "fields": ["nome"], "changedBy": 1 }
```

**business** (conferma ordine):
```json
{ "numeroOrdine": "B2B-1723...", "importo": 844.20, "pezzi": 12, "clienteId": 5, "coupon": "ESTATE25" }
```

**business** (login):
```json
{ "email": "cliente@test.it", "remember": false }
```

---

## 3. Infrastruttura backend

### 3.1 `EventLogService` (modulo globale `@Global()`)

Disponibile in ogni servizio senza import esplicito. Metodi principali:

| Metodo | Quando usarlo |
|---|---|
| `logAccess(method, url, status, duration, label)` | AccessLogInterceptor automatico |
| `logError(action, message, status, details)` | Exception filter / catch block |
| `logMutation(action, entity, entityId, data)` | Dopo ogni create/update/delete |
| `logBusiness(action, data)` | Eventi cliente (login, ordine, carrello) |
| `logSync(action, data, status)` | Sincronizzazioni batch |

### 3.2 Intercettori automatici (già attivi)

- **`AccessLogInterceptor`** (`APP_INTERCEPTOR`): logga ogni richiesta HTTP con metodo, URL, status, durata
- **`AnomaliaFilter`** (`APP_FILTER`): logga ogni eccezione non catturata con messaggio e stack trace
- **`RequestContextInterceptor`**: popola `requestId` UUID univoco per ogni richiesta

### 3.3 Da collegare (prossimo sviluppo)

- **AuditService** → `eventLog.logMutation()` per ogni azione admin
- **EventsService** → `eventLog.logBusiness()` per eventi cliente
- **Prisma auto-audit extension** → `eventLog.logMutation()` con diff old/new

---

## 4. Interfaccia utente (specifica per Open Design)

### 4.1 Vista principale: "Log eventi"

**Posizione**: Admin → Pannello Amministrazione → tab "Log eventi" (sostituisce l'attuale "Anomalie")

**Struttura**:

```
┌──────────────────────────────────────────────────────────────────┐
│  AdminTopBar: Log eventi                                         │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Eventi 24h   │ │ Errori 24h   │ │ Richieste 24h │  ← KPI cards│
│  │    1,247     │ │     12       │ │    8,450     │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  Filtri: [Tutti] [Access] [Error] [Mutation] [Business] [Sync]  │
│  Data: [Da] → [A]  🔍 Cerca...                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Tipo     │ Azione              │ Entità    │ Utente │ Data   ││
│  │ access   │ Login → 200 (45ms)  │ —         │ uvolp. │ 12:34  ││
│  │ mutation │ articolo.update     │ LINEA_ROG │ admin  │ 12:33  ││
│  │ business │ ordine.create       │ B2B-1723  │ uvolp. │ 12:32  ││
│  │ error    │ POST /checkout → 500│ —         │ uvolp. │ 12:31  ││
│  │ access   │ Catalogo → 200 (..) │ —         │ —      │ 12:31  ││
│  └──────────────────────────────────────────────────────────────┘│
│  1–50 di 1,247                        ◀ 1 / 25 ▶                │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Dashboard KPI (4 card)

| Card | Fonte | Descrizione |
|---|---|---|
| Eventi 24h | `count(*) WHERE created_at > now() - 24h` | Totale eventi |
| Errori 24h | `count(*) WHERE event_type='error' AND created_at > now() - 24h` | Errori ultime 24h |
| Richieste 24h | `count(*) WHERE event_type='access' AND created_at > now() - 24h` | Traffico HTTP |
| Tempo medio risposta | `avg(duration_ms) WHERE event_type='access'` | Performance media |

### 4.3 DataTable (6 colonne)

| Colonna | Larghezza | Contenuto |
|---|---|---|
| Tipo | 90px | Badge colorato: access (grigio), error (rosso), mutation (blu), business (verde), sync (ambra) |
| Azione | grow | Testo leggibile: "Login → 200", "Admin — modifica articolo", "Conferma ordine" |
| Entità | 130px | `entity:entityId` o "—" |
| Utente | 100px | Nome utente/email o "—" |
| Data | 130px | `GG/MM HH:MM:SS` |
| Dettaglio | 60px | Icona lente per aprire modale |

### 4.4 Filtri

- **Tipo evento**: pulsanti toggle (Tutti, Access, Error, Mutation, Business, Sync)
- **Data range**: date picker Da → A (default: ultime 24h)
- **Ricerca**: campo testo che cerca in `action` e `data` (case-insensitive)
- **Utente**: select con ricerca per nome/email

### 4.5 Modale dettaglio evento

Cliccando su una riga (o sulla lente) si apre una modale con:

```
┌─────────────────────────────────────────┐
│  Dettaglio evento                  ✕    │
├─────────────────────────────────────────┤
│  Tipo:      mutation                    │
│  Azione:    Admin — modifica articolo   │
│  Entità:    articolo / LINEA_ROGERS     │
│  Utente:    admin@luissrl.it (ID: 1)    │
│  Data:      12/08/2026 14:23:15         │
│  Request ID: abc-123-def-456            │
│  IP:        192.168.1.100               │
│                                         │
│  Dati (JSON):                           │
│  ┌─────────────────────────────────────┐│
│  │ {                                   ││
│  │   "old": { "nome": "Vaso Rogers" }, ││
│  │   "new": { "nome": "Vaso Rogers 2" }││
│  │   "fields": ["nome"]                ││
│  │ }                                   ││
│  └─────────────────────────────────────┘│
│                           [Chiudi]      │
└─────────────────────────────────────────┘
```

### 4.6 API endpoint

| Endpoint | Descrizione |
|---|---|
| `GET /api/admin/event-log?eventType=&actorId=&page=&limit=` | Lista paginata con filtri |
| `GET /api/admin/event-log/:id` | Dettaglio singolo evento |
| `GET /api/admin/event-log/stats` | Dashboard KPI |
| `GET /api/admin/event-log/entity/:entity/:entityId` | Timeline di un'entità |

### 4.7 Timeline entità

Accessibile da qualsiasi scheda (articolo, cliente, ordine) cliccando "Storico modifiche" o "Log":

```
┌─────────────────────────────────────────────────┐
│  Timeline — Articolo LINEA_ROGERS           ✕   │
├─────────────────────────────────────────────────┤
│  ● 12/08 14:23 — admin modifica nome           │
│  │  "Vaso Rogers" → "Vaso Rogers 2.0"          │
│  ● 11/08 09:15 — admin modifica colore         │
│  │  null → "Terracotta"                        │
│  ● 10/08 16:40 — sync importa varianti         │
│  │  +3 varianti: LU3608, LU3609, LU3610        │
│  ● 09/08 08:00 — admin crea articolo           │
│  ─────────────────────────────────────────────  │
│                           [Chiudi]              │
└─────────────────────────────────────────────────┘
```

### 4.8 Classi CSS da usare

| Elemento | Classe |
|---|---|
| Dashboard card | `.dash-grid` > `.dash-card` (border-left accent 3px) |
| DataTable | `.data-table` standard con header sticky mono |
| Badge tipo evento | `.status-pill` con varianti colore per ogni event_type |
| Modale dettaglio | `Modal size="md"` |
| Filtri toggle | `.btn .btn-sm .btn-primary/secondary` |
| Timeline | struttura verticale con pallini e linee |
| JSON viewer | `<pre>` con sfondo `var(--fg-soft)` e font mono |

---

## 5. Note implementative

- Il `requestId` è generato da `randomUUID()` nel `RequestContextInterceptor` e propagato via `AsyncLocalStorage`.
- `EventLogService` è `@Global()` — disponibile in ogni modulo senza import esplicito.
- I log sono **fire-and-forget**: il `try/catch` nell'implementazione assicura che un log fallito non blocchi l'operazione.
- La retention può essere gestita con un cron che elimina eventi più vecchi di N giorni (da configurare in `site_config`).
- La tabella `anomalia_log` esistente rimane per retrocompatibilità; i nuovi eventi vanno su `event_log`.
