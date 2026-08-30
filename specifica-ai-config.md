# Specifica — Gestione AI (Panel Admin)

Progetto: Luis Srl B2B · Modulo amministrativo · Sezione "Gestione AI"
Riferimento prototipo: `admin-ai-config.html`

Questa specifica descrive la pagina admin di configurazione dell'intelligenza artificiale del
portale. Documenta il prototipo come implementato oggi (4 tab), i contenuti e i dati di origine
reali già presenti nel backend, e fornisce i contratti per l'implementazione nella webapp
(Next.js `frontend/` + NestJS `backend/`) insieme al requisito di **configurabilità di TUTTI i
prompt di sistema con salvataggio del default di fabbrica come backup**.

---

## 1. Concetto

La sezione deve dare all'amministratore un unico punto di controllo per **tutte le configurazioni
AI** del portale, oggi sparse tra più luoghi:

| Origine | Descrizione | Dove vive attualmente |
|---|---|---|
| Config provider/modelli | Provider, modello, endpoint, temperature, max token | Tabella `SiteConfig` (chiavi `AI_Immagini_*`, `AI_Testi_*`) |
| Prompt di sistema | Prompt comportamentali (descrizione, colore, rewrite, vision, garden, insight, profiling, variante) | Chiavi `Prompt_AI_*` in `SiteConfig` **o hardcoded** in `integrazione.service` |
| Template di prompt | Prompt riutilizzabili per ambienti/descrizioni | Tabella `PromptTemplate` (CRUD già esposto) |
| Uso e costi | Token, chiamate, immagini e costo per tipo/modello/utente | Tabella `AiUsage` (`ai_usage`) |

Obiettivo: rendere **tutto visibile e modificabile** da admin in una pagina unica, con prompt
divisi per sezione, spiegazioni contestuali e **reset al default di fabbrica** per ogni prompt.

> ⚠️ I "Suggerimenti AI dashboard" (ex sezione 4) sono stati **rimossi** dal prototipo: non fanno
> più parte di questa pagina.

---

## 2. Struttura della pagina (schema)

```
┌────────────────────────────────────────────────────────────────────┐
│  AdminTopBar  ● Gestione AI   [Panel Admin]        [🔍 cerca] [💾 Salva modifiche]
├────────────────────────────────────────────────────────────────────┤
│  KPI:  Provider attivi 1 · Prompt configurati 24 · Token 30g 1,24M · Costo 30g €4,82
│                                                                     │
│  ┌ ─ Tabs ────────────────────────────────────────────────────────┐ │
│  │ [Provider e modelli] [Prompt sistema 8] [Template 8] [Uso e costi]│ │
│  └ ─────────────────────────────────────────────────────────────── ┘ │
│                                                                     │
│  ┌ ─ 1 · Provider e modelli ──────────────────────────────────── ┐  │
│  │  Ambito Immagini [gemini ▾]  Modello [gemini-2.5-flash-image] │  │
│  │  Temperature [0.4]  MaxTokens [4096]                          │  │
│  │  Endpoint [ https://generativelanguage.googleapis.com/... ]   │  │
│  │  Ambito Testi [gemini ▾]   Modello [gemini-2.5-flash]         │  │
│  │  Temperature [0.7]  MaxTokens [8192]                          │  │
│  │  Endpoint [ https://generativelanguage.googleapis.com/... ]   │  │
│  └────────────────────────────────────────────────────────────── ┘  │
│                                                                     │
│  ┌ ─ 2 · Prompt di sistema ───────────────── 8 configurati ──────┐  │
│  │  Descrizione / Colore / Rewrite / Vision / Garden / Insight /  │  │
│  │  Profiling / Variante — textarea EDITABILI + [↺ Ripristina     │  │
│  │  default] per ciascuno                                          │  │
│  └────────────────────────────────────────────────────────────── ┘  │
│                                                                     │
│  ┌ ─ 3 · Template di prompt ───────────────── [8] [＋ Nuovo] ────┐  │
│  │  DataTable: # · Tipo · Titolo · Prompt · Tags · Azioni        │  │
│  │  [footer: 1–5 di 8]  [pager ◀ 1/2 ▶]                          │  │
│  └────────────────────────────────────────────────────────────── ┘  │
│                                                                     │
│  ┌ ─ 5 · Uso e costi AI ─────────────────── [◀ 30 gg ▶] ────────┐  │
│  │  Card: Costo stimato · Chiamate AI · Token totali · Immagini  │  │
│  │  Serie: Costo per giorno (barre)                              │  │
│  │  Tabelle: Per utente · Per tipo di richiesta · Per modello    │  │
│  └────────────────────────────────────────────────────────────── ┘  │
└────────────────────────────────────────────────────────────────────┘
```

**Nota sull'ordine delle sezioni:** le **tab** sono 4. La sezione "Uso e costi" è la 5ª numerata
dentro il flusso storico (il "4 · Suggerimenti" è stato rimosso), ma è la 4ª tab. Per coerenza
nella pagina le etichette tab non portano numeri: "Provider e modelli · Prompt sistema · Template ·
Uso e costi".

### Componenti
| Componente | Note |
|---|---|
| AdminTopBar | Titolo + badge "Panel Admin" + ricerca testuale `#search` (filtra il pannello attivo) + bottone "Salva modifiche" `#btn-save-all` con feedback "Salvato" `#saved` |
| KPI (4 card `.kpi`) | Provider attivi, Prompt configurati, Token 30 giorni, Costo stimato 30 gg — bordo sinistro accent (`.blue/.green/.red`) |
| Tabs (`.tabs`/`.tab`/`.panel`) | 4 tab; pannello attivo `.panel.on`; contatori `.cnt` su "Prompt sistema (8)" e "Template (8)" |
| Sezione 1 · Provider | `form-grid` 2 col, span2 per endpoint; select provider + input modello/temperature/max token |
| Sezione 2 · Prompt sistema | 8 textarea **editabili** in `.form-grid`, ciascuno con `.field-foot` (hint + bottone `[data-reset-sys]` "Ripristina default") |
| Sezione 3 · Template | `.table` con paginazione 5/pagina + modale editor (`#tpl-modal`) |
| Sezione 5 · Uso e costi | `.usage-cards` (4 card), `.costi-serie` (barre giornaliere), `.usage-grid` (3 tabelle), daypicker `#dp-*` |

---

## 3. Dati di origine (mappatura reale)

### 3.1 Provider e modelli — `SiteConfig`
Chiavi lette da `integrazione.service.getAiConfig(scope)` con **cache TTL 60s** (modifica → attiva
entro max 1 min):

- `AI_Immagini_Provider` (default `gemini`)
- `AI_Immagini_Modello` (default `gemini-2.5-flash-image`)
- `AI_Immagini_Temperature` (default `0.4`)
- `AI_Immagini_MaxTokens` (default `4096`)
- `AI_Immagini_Endpoint` (default `https://generativelanguage.googleapis.com/v1beta/models/`)
- `AI_Testi_Provider` (default `gemini`)
- `AI_Testi_Modello` (default `gemini-2.5-flash`)
- `AI_Testi_Temperature` (default `0.7`)
- `AI_Testi_MaxTokens` (default `8192`)
- `AI_Testi_Endpoint` (default `https://generativelanguage.googleapis.com/v1beta/models/`)

> Nei seed esistenti (`add_ai_config_keys.sql`, `manual-fixups.sql`) non è prevista la chiave
> `Provider` per l'ambito immagini nei primi seed; è comunque letta dal service con fallback `gemini`.

### 3.2 Prompt di sistema — da rendere TUTTI configurabili
I prompt di sistema mostrati nel prototipo (tab "Prompt sistema", 8 voci) e il loro stato attuale:

| # | Prompt (textareas) | Chiave / posizione | Stato attuale | Default di fabbrica |
|---|---|---|---|---|
| 1 | Descrizione articolo | `Prompt_AI_Descrizione_Articolo` (SiteConfig) | ✅ già configurabile | "Sei un tecnico-specialista di vasellame e articoli garden B2B…" |
| 2 | Estrazione colore (JSON) | hardcoded `integrazione.service` (~L2097) | ⛔ hardcoded | JSON `{colore, coloreRgb}` con regole colori naturali |
| 3 | Ricerca semantica (rewrite) | hardcoded (~L1150) | ⛔ hardcoded | "Trasforma la richiesta del cliente per una ricerca semantica…" |
| 4 | Analisi immagine (vision) | hardcoded (~L1349) | ⛔ hardcoded | Descrizione da foto |
| 5 | Analisi multi-immagine (garden) | hardcoded (~L2426) | ⛔ hardcoded | "Sei un osservatore esperto di vasellame…" |
| 6 | Insight cliente | hardcoded (`insight.service` ~L128) | ⛔ hardcoded | "Sei un analista commerciale B2B…" |
| 7 | Profiling cliente | hardcoded (~L3040) | ⛔ hardcoded | "…profila i clienti B2B… 2-3 paragrafi…" |
| 8 | Genera variante colore | hardcoded (~L1928) | ⛔ hardcoded | "Arricchisce il prompt dell'utente col contesto prodotto…" |

> **Requisito chiave:** nell'implementazione **nessun prompt di sistema deve restare hardcoded**.
> Ogni prompt va esposto in `SiteConfig` con una chiave `Prompt_AI_*`, e il fallback (caso chiave
> mancante) deve essere il **testo di fabbrica** corrente.

### 3.3 Template — `PromptTemplate`
```prisma
model PromptTemplate {
  id          Int      @id @default(autoincrement())
  tipo        String   // "AMBIENTA" | "DESCRIZIONE"
  titolo      String
  prompt      String
  tags        String   @default("") // separati da virgola
  ordinamento Int      @default(0)
  createdAt   DateTime
  updatedAt   DateTime @updatedAt
  immagini    Immagine[]
  @@map("prompt_templates")
}
```
CRUD già esposto in `integrazione.controller`:
`GET/POST/PATCH/DELETE /api/integrazione/prompt-templates`.

Nel prototipo i template seed sono 8 (4 AMBIENTA + 4 DESCRIZIONE), dato statico `TEMPLATES`
presente nel prototipo per la preview.

### 3.4 Uso — `AiUsage`
```prisma
model AiUsage {
  id           Int      @id
  attoreTipo   String   // admin | customer | agent | system
  tipo         String   // descrizione | immagine | embedding | rewrite | vision
  modello      String
  tokenIn      Int
  tokenOut     Int
  immagini     Int
  costoStimato Float
  createdAt    DateTime
  @@map("ai_usage")
}
```
Endpoint esistente: `GET /api/admin/ai-usage?days=N` → `AiUsageService.summary`.

---

## 4. Regole di business

1. **Cache TTL 60s**: le modifiche a provider/modelli si attivano entro max 1 minuto (cache in
   `getAiConfig`). Mostrarlo come hint.
2. **Prompt di sistema modificabili**: i textarea sono **editabili di default** (niente `readonly`),
   come le altre parti configurabili; niente modale di blocco/sblocco.
3. **Reset al default di fabbrica**: ogni prompt ha un bottone **"Ripristina default"** che ripristina
   il valore **di fabbrica** salvo come backup (vedi §5). Il reset NON elimina eventuali personaliz-
   zazioni inviate ma ripristina il contenuto visibile nel campo.
4. **Template senza cumulo**: ogni template è una voce indipendente; la modale usa il tipo
   `AMBIENTA`/`DESCRIZIONE` e le variabili `{nome}`, `{descrizione}`, `{contesto}` dove supportate.
5. **Unicità chiavi SiteConfig**: una chiave `Prompt_AI_*` / `AI_*` è univoca; l'aggiornamento è un
   `PUT`/upsert.
6. **Search nella topbar**: filtra il pannello attivo per testo (nasconde se nessuna corrispondenza).
7. **KPI coerenti** con `AiUsage`: token/costo/tipologie/modello coerenti con la tab "Uso e costi".
8. **Permessi**: la sezione richiede `@RequirePermission('ai-config')` + `AuthenticatedGuard` +
   `PermissionsGuard`.

---

## 5. Configurabilità dei prompt + default di fabbrica come backup

### 5.1 Modello di dati (proposto)
Ogni prompt di sistema diventa una voce con **due valori distinti**:

| Campo | Descrizione |
|---|---|
| `key` | chiave univoca `Prompt_AI_<Nome>` |
| `label` | etichetta amministrativa (es. "Descrizione articolo") |
| `prompt` | valore **corrente** (modificabile dall'admin, salvato in `SiteConfig`) |
| `promptDefault` | **default di fabbrica** (backup, immutabile a runtime) |

La sorgente del **default di fabbrica** deve essere estrapolata dal service e conservata dove possa
farla da backup:
- **Opzione A (consigliata)**: colonna/ad-hoc in `SiteConfig` con chiave `Prompt_AI_<X>_DEFAULT`,
  valorizzata nel seed con il testo di fabbrica attuale di `integrazione.service`.
- **Opzione B**: costante in un modulo dedicato (`prompt-defaults.ts`) letta da backend + frontend.
- La **chiave corrente** viene caricata come `prompt`; l'operazione "Ripristina default" copia
  `promptDefault` → `prompt` (PUT su SiteConfig).

### 5.2 Comportamento "Ripristina default"
1. Il frontend chiede `GET /api/admin/ai-config/prompt-defaults` (o le riceve nel bundle di configurazione).
2. Pulsante `[data-reset-sys="<id>"]` → `resetSys(id)` imposta `#<id>.value = SYS_DEFAULTS[id]` (prototipo)
   oppure fa `PUT /api/admin/ai-config/prompt/<key>/reset` (produzione).
3. Feedback visivo "Salvato" (`#saved`).
4. Il **default di fabbrica non è mai sovrascritto** dalle modifiche dell'admin: resta il backup
   permanente.

### 5.3 Prototipo
Nel prototipo i default di fabbrica sono raccolti nell'oggetto JS `SYS_DEFAULTS` (8 chiavi,
`id` textarea → testo di fabbrica) e applicati da `resetSys(id)` + binding `[data-reset-sys]`.
Il valore **corrente** iniziale coincide col default (unico seed); in produzione i due valori
divergono dopo una modifica.

---

## 6. Contratti API

| Metodo | Endpoint | Body / Note |
|---|---|---|
| GET | `/api/admin/ai-config` | → `{ kpi: {...}, provider: { immagini: {...}, testi: {...} } }` |
| PUT | `/api/admin/ai-config/provider/:scope` | body `{ provider, model, endpoint, temperature, maxTokens }` · scope = `immagini`\|`testi` |
| GET | `/api/admin/ai-config/prompts` | → `{ system: [{ key, label, prompt, promptDefault }], templates: [...] }` |
| PUT | `/api/admin/ai-config/prompt/:key` | body `{ prompt }` · upsert su `SiteConfig` |
| POST | `/api/admin/ai-config/prompts` | crea un `PromptTemplate` |
| PATCH | `/api/admin/ai-config/prompts/:id` | aggiorna un `PromptTemplate` |
| DELETE | `/api/admin/ai-config/prompts/:id` | elimina un `PromptTemplate` |
| PUT | `/api/admin/ai-config/prompt/:key/reset` | ripristina il default di fabbrica per il prompt (copia `promptDefault` → `prompt`) |
| GET | `/api/admin/ai-usage?days=N` | summary esistente (token/costo per tipo, modello e utente) |

---

## 7. Checklist parità (prototipo → app)

- [ ] AdminTopBar con ricerca + "Salva modifiche" con feedback "Salvato"
- [ ] 4 KPI card (provider, prompt, token, costo) con bordo sinistro accent
- [ ] 4 tab (Provider e modelli · Prompt sistema · Template · Uso e costi) con pannello attivo e contatori
- [ ] Sezione 1 provider/modelli a `form-grid` 2 col, endpoint span2, hint su TTL 60s
- [ ] Sezione 2 prompt di sistema **editabili** (niente readonly) con bottone "Ripristina default" per ciascuno
- [ ] Default di fabbrica salvato come backup e mai sovrascritto dalle modifiche (§5)
- [ ] Sezione 3 DataTable template (paginazione 5/pagina, tipo badge, pill, azioni, pager)
- [ ] Sezione 5 Uso e costi: 4 card + serie costo/giorno + tabelle per utente/tipo/modello + daypicker
- [ ] Search filtra il pannello attivo
- [ ] Modale template: tipo/ordinamento/titolo/prompt/tags, elimina (se in modifica), salva
- [ ] Escape chiude le modali; backdrop click chiude
- [ ] Div/script bilanciati, JS senza errori di sintassi

---

## 8. Note implementative

- **Esporre TUTTI i prompt hardcoded**: spostare `Prompt_AI_Colore`, `Prompt_AI_Ricerca`,
  `Prompt_AI_Vision`, `Prompt_AI_Garden`, `Prompt_AI_Insight`, `Prompt_AI_Profiling`,
  `Prompt_AI_Variante` in `SiteConfig` con fallback al testo attuale del service, e salvare il
  default di fabbrica come backup (§5). Il solo `Prompt_AI_Descrizione_Articolo` è già configurabile.
- **Modelli dati**: riusare `SiteConfig`, `PromptTemplate`, `AiUsage` esistenti; non creare nuove
  tabelle se le esistenti bastano (per il default si può usare una chiave `_DEFAULT` dedicata).
- **UI**: replicare gli standard admin (`DataTable`, `Modal`, `Tooltip`, bottoni `btn-*`, status
  badge) — vedi pattern in `spese-spedizione.html`, `admin-ordini.html`, `admin-coupon.html`.
- **Daypicker**: range 1–365 giorni, min 1, max 365.
- **Localizzazione**: aggiungere le stringhe in `frontend/messages/it.json` ed `en.json`.
