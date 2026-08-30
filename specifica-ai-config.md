# Specifica — Configurazione AI (Panel Admin)

Progetto: Luis Srl B2B · Modulo amministrativo · Sezione "Configurazione AI"
Riferimento prototipo: `admin-ai-config.html`

Questa specifica descrive la pagina admin di configurazione dell'intelligenza artificiale del
portale. Documenta il prototipo, le sezioni, i dati di origine reali già presenti nel backend e
fornisce i contratti per l'implementazione nella webapp (Next.js `frontend/` + NestJS `backend/`).

---

## 1. Concetto

La sezione deve dare all'amministratore un unico punto di controllo per **tutte le configurazioni
AI** del portale, oggi sparse tra più luoghi:

| Origine | Descrizione | Dove vive attualmente |
|---|---|---|
| Config provider/modelli | Provider, modello, endpoint, temperature, max token | Tabella `SiteConfig` (chiavi `AI_Immagini_*`, `AI_Testi_*`) |
| Prompt di sistema | Prompt comportamentali (descrizione, colore, vision, insight, profiling…) | Chiavi `Prompt_AI_*` in `SiteConfig` **o hardcoded** in `integrazione.service` |
| Template di prompt | Prompt riutilizzabili per ambienti/descrizioni | Tabella `PromptTemplate` (CRUD già esposto) |
| Suggerimenti dashboard | 6 box di suggerimento | Tabella `SuggestionBox` (seed in `area/page.tsx`) |
| Uso e costi | Token e costo per tipo/attore | Tabella `AiUsage` (`ai_usage`) |

Obiettivo: rendere **tutto visibile e modificabile** da admin in una pagina unica, con prompt
divisi per sezione e spiegazioni contestuali.

---

## 2. Struttura della pagina (schema)

```
┌────────────────────────────────────────────────────────────────────┐
│  AdminTopBar  ● Configurazione AI   [Panel Admin]        [🔍 cerca] [💾 Salva modifiche]
├────────────────────────────────────────────────────────────────────┤
│  KPI:  Provider attivi 1 · Prompt configurati 24 · Token 30g 1,24M · Costo 30g €4,82
│                                                                     │
│  ┌ ─ 1 · Provider e modelli ────────────────────────────────── ┐   │
│  │  Ambito Immagini [gemini ▾]  Modello [gemini-2.5-flash-image]│   │
│  │  Temperature [0.4]  MaxTokens [4096]                         │   │
│  │  Endpoint [ https://generativelanguage.googleapis.com/... ]  │   │
│  │  Ambito Testi [gemini ▾]   Modello [gemini-2.5-flash]        │   │
│  │  Temperature [0.7]  MaxTokens [8192]                         │   │
│  │  Endpoint [ https://generativelanguage.googleapis.com/... ]  │   │
│  └────────────────────────────────────────────────────────────── ┘   │
│                                                                     │
│  ┌ ─ 2 · Prompt di sistema ────────────────────────── [Modifica] ┐ │
│  │  Descrizione articolo / Colore / Ricerca semantica / Vision /  │ │
│  │  Insight / Profiling / Variante (textarea read-only, grigie)   │ │
│  └────────────────────────────────────────────────────────────── ┘   │
│                                                                     │
│  ┌ ─ 3 · Template di prompt ─────────────────── [8] [＋ Nuovo] ┐   │
│  │  DataTable: # · Tipo · Titolo · Prompt · Tags · Azioni        │   │
│  │  [footer: 1–5 di 8]  [pager ◀ 1/2 ▶]                          │   │
│  └────────────────────────────────────────────────────────────── ┘   │
│                                                                     │
│  ┌ ─ 4 · Suggerimenti AI dashboard ────────────── [6 box] ┐        │
│  │  DataTable: # · Titolo · Prompt · Campo · Azioni        │        │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                     │
│  ┌ ─ 5 · Uso e costi AI ─────────────────── [◀ 30 gg ▶] ┐          │
│  │  Token per tipo (barre)        Ripartizione per attore  │         │
│  │  Costo totale €4,82            (barre percentuali)      │         │
│  └─────────────────────────────────────────────────────────┘        │
└────────────────────────────────────────────────────────────────────┘
```

### Componenti
| Componente | Note |
|---|---|
| AdminTopBar | Titolo + badge + ricerca testuale (filtra per sezione) + bottone "Salva modifiche" con feedback "Salvato" |
| KPI (4 card) | Provider attivi, Prompt configurati, Token 30 giorni, Costo stimato 30 gg — bordo sinistro accent |
| Sezione 1 | Provider/modelli, in `form-grid` a 2 colonne, span2 per endpoint |
| Sezione 2 | Prompt di sistema, textarea `readonly` grigie ("ro") + bottone collettivo "Modifica" |
| Sezione 3 | Tabella template con paginazione 5/pagina + modale editor |
| Sezione 4 | Tabella suggerimenti + modale |
| Sezione 5 | Grafici a barre uso token/costi + daypicker |

---

## 3. Dati di origine (mappatura reale)

### 3.1 Provider e modelli — `SiteConfig`
Chiavi lette da `integrazione.service.getAiConfig(scope)` con **cache TTL 60s**:

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

### 3.2 Prompt di sistema — `SiteConfig` + hardcoded
| Prompt | Chiave / posizione | Default (riassunto) |
|---|---|---|
| Descrizione articolo | `Prompt_AI_Descrizione_Articolo` (SiteConfig) | "Sei un tecnico-specialista di vasellame e articoli garden B2B…" |
| Estrazione colore | hardcoded `integrazione.service` (~L2097) | Estrae JSON `{colore, coloreRgb}` con regole su colori naturali |
| Ricerca semantica | hardcoded (~L1150) | "Trasforma la richiesta del cliente per una ricerca semantica" |
| Analisi immagine vision | hardcoded (~L1349) | Descrizione da foto |
| Analisi multi-immagine garden | hardcoded (~L2426) | "Sei un osservatore esperto di vasellame…" |
| Insight cliente | hardcoded (`insight.service` ~L128) | Analista commerciale B2B |
| Profiling cliente | hardcoded (~L3040) | "…profila i clienti B2B… 2-3 paragrafi…" |
| Variante colore | hardcoded (~L1928) | Arricchisce il prompt col contesto prodotto |

> Nell'implementazione questi prompt hardcoded **devono** essere esposti in SiteConfig per
> renderli modificabili (fallback al testo attuale se la chiave manca).

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

### 3.4 Suggerimenti — `SuggestionBox`
```prisma
model SuggestionBox {
  id     Int    @id @default(autoincrement())
  titolo String
  prompt String
  // cliente = sui dati del singolo cliente; generale = su dati di vendita globali
  campo  String
  // ... (pesi e vincoli)
  @@map("suggestion_boxes")
}
```
Seed di default = i 6 box attuali in `frontend/app/area/page.tsx`.

### 3.5 Uso — `AiUsage`
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

1. **Cache TTL 60s**: le modifiche a provider/modelli si attivano entro max 1 minuto
   (cache in `getAiConfig`). Mostrarlo come hint.
2. **Prompt di sistema bloccati di default**: sono `readonly` (grigi) per evitare modifiche
   accidentali; "Modifica" apre la modale con la chiave associata.
3. **Template senza cumulo**: ogni template è una voce indipendente; la modale usa il tipo
   `AMBIENTA`/`DESCRIZIONE` e le variabili `{nome}`, `{descrizione}`, `{contesto}` dove supportate.
4. **Unicità chiavi SiteConfig**: una chiave `Prompt_AI_*` / `AI_*` è univoca; l'aggiornamento è un
   `PUT`/upsert.
5. **Search nella topbar**: filtra le sezioni per testo (nasconde quelle senza corrispondenza).
6. **KPI coerenti** con `AiUsage`: token/costo ripartiti per tipo e per attore.
7. **Permessi**: la sezione richiede `@RequirePermission('ai-config')` + `AuthenticatedGuard` +
   `PermissionsGuard`.

---

## 5. Contratti API

| Metodo | Endpoint | Body / Note |
|---|---|---|
| GET | `/api/admin/ai-config` | → `{ kpi: {...}, provider: { immagini: {...}, testi: {...} } }` |
| PUT | `/api/admin/ai-config/provider/:scope` | body `{ provider, model, endpoint, temperature, maxTokens }` · scope = `immagini`\|`testi` |
| GET | `/api/admin/ai-config/prompts` | → `{ system: [{ key, label, prompt }], templates: [...] }` |
| PUT | `/api/admin/ai-config/prompt/:key` | body `{ prompt }` · upsert su SiteConfig |
| POST | `/api/admin/ai-config/prompts` | crea PromptTemplate |
| PATCH | `/api/admin/ai-config/prompts/:id` | aggiorna PromptTemplate |
| DELETE | `/api/admin/ai-config/prompts/:id` | elimina PromptTemplate |
| GET | `/api/admin/suggestion-box` | elenco 6 box |
| PUT | `/api/admin/suggestion-box/:id` | aggiorna titolo/prompt/pesi |
| GET | `/api/admin/ai-usage?days=N` | summary esistente (token/costo per tipo e attore) |

---

## 6. Checklist parità (prototipo → app)

- [x] AdminTopBar con ricerca + "Salva modifiche" con feedback "Salvato"
- [x] 4 KPI card (provider, prompt, token, costo) con bordo sinistro accent
- [x] Sezione 1 provider/modelli a `form-grid` 2 col, endpoint span2, hint su TTL 60s
- [x] Sezione 2 prompt di sistema read-only con bottone "Modifica" → modale chiave+prompt
- [x] Sezione 3 DataTable template (paginazione 5/pagina, tipo badge, pill, azioni, pager)
- [x] Sezione 4 DataTable suggerimenti con campo cliente/generale
- [x] Sezione 5 grafici a barre token per tipo + per attore + costo totale + daypicker
- [x] Search filtra sezioni
- [x] Modale template: tipo/ordinamento/titolo/prompt/tags, elimina (se in modifica), salva
- [x] Escape chiude le modali; backdrop click chiude
- [x] Div/script bilanciati, JS senza errori di sintassi

---

## 7. Note implementative

- **Esporre i prompt hardcoded**: spostare `Prompt_AI_Colore`, `Prompt_AI_Ricerca`, `Prompt_AI_Vision`,
  `Prompt_AI_Garden`, `Prompt_AI_Insight`, `Prompt_AI_Profiling`, `Prompt_AI_Variante` in `SiteConfig`
  con fallback al testo attuale del service.
- **Modelli dati**: riusare `SiteConfig` e `PromptTemplate`/`SuggestionBox`/`AiUsage` esistenti;
  non creare nuove tabelle se le esistenti bastano.
- **UI**: replicare gli standard admin (`DataTable`, `Modal`, `Tooltip`, bottoni `btn-*`, status
  badge) — vedi pattern in `spese-spedizione.html`, `admin-ordini.html`, `admin-coupon.html`.
- **Daypicker**: range 1–365 giorni, min 1, max 365.
- **Localizzazione**: aggiungere le stringhe in `frontend/messages/it.json` ed `en.json`.
