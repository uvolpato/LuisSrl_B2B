# Luis Brain — Sistema Agentico di Intelligence Commerciale
### Analisi validata sul codice + piano funzionale, operativo e **tecnico** (con implementazione)

> **v2** — questa versione è stata verificata contro il repo reale (`backend/src`,
> `backend/prisma/schema.prisma`). Le affermazioni della v1 che non reggevano sono state corrette
> ed è stato aggiunto il capitolo che mancava: **§4 — come lo implemento davvero**, con codice.

---

## 0. Referto di validazione (cosa cambia dalla v1)

**Confermato dal codice:** l'impianto strategico della v1 regge, i mattoni ci sono davvero.

**Corretto — la v1 era impreciso o sbagliato:**

| # | v1 diceva | La realtà nel codice | Conseguenza |
|---|-----------|----------------------|-------------|
| C1 | "serve una tabella-coda + cron da costruire" | Esiste già uno **scheduler dinamico DB-driven**: `sync_config` + `SyncManagerService` (`SchedulerRegistry`, cron per tipo, `attivo`/`solo_manuale`, `ultima/prossima_esecuzione`, `sync_log`) — `backend/src/integrazione/sync-manager.service.ts:44-77` | **Non scrivo un orchestratore da zero**: clono quel pattern in `agent_config`. Risparmio ~1 settimana e riuso una UI già esistente |
| C2 | "carrelli salvati/abbandonati" (vago) | `Carrello` è **1:1 col cliente** (`cliente_id @unique`); il flag `salvato` è **per riga** (`CartItem.salvato`) | "Abbandonato" = `carrelli.aggiornato_il` vecchio con righe `salvato=false`; "sospeso" = righe `salvato=true`. Sono **due segnali diversi** |
| C3 | "serve un churn detector nuovo" | `Dossier.salute: 'buona'\|'media'\|'a_rischio'` **esiste già** (`customer-intelligence.service.ts:36-49`), con `giorniDaUltimoOrdine`, `cadenzaMediaGiorni`, `trendYoY`, `concentrazioneHHI` | Il churn detector è **una query sul dossier**, non un modello nuovo |
| C4 | "l'agente propone email/azioni" (canale non definito) | Esistono il modello **`Campaign`** (targeting `customerIds`/`filters`, `validFrom/To`, `status`) e `MailModule` | L'agente **non inventa un canale**: propone una `Campaign` in bozza o un `Progetto`/offerta. L'umano attiva |
| C5 | "Gemini con JSON strutturato e tool-calling" (dato per esistente) | **NON esiste**: gli unici entry point pubblici sono `generaSintesiAI` / `generaSintesiAIConRicerca`, che ritornano **testo**; il JSON si estrae a regex (`estraiJson`). Niente `responseMimeType`, `responseSchema`, function calling | È il **primo prerequisito tecnico** (§4.5): ~40 righe in `IntegrazioneService` |
| C6 | "i servizi sono moduli riusabili" | `CustomerProfileService`, `DatiImpresaService`, `CustomerIntelligenceService` sono **provider privati di `AdminModule`** (`admin.module.ts:12`), non moduli esportati | Vanno estratti in moduli con `exports` prima di poterli iniettare negli agenti (§4.1) |
| C7 | "embedding in `double precision[]` ovunque" | Due storage diversi: `articolo_embedding.text_vec` = `double precision[]` (SQL puro), `customer_insight.embedding` = **`Json`** via Prisma | Il retrieval deve gestire entrambi; `insight.simili()` carica **tutti** i vettori in Node (`insight.service.ts:157-166`) → è lì il vero ceiling |
| C8 | "budget/attribuzione costi da progettare" | `AiUsage.attoreTipo` **contempla già `'agent'`** (schema riga 147), il costo è calcolato per chiamata e l'attore viene da `reqCtx` (AsyncLocalStorage) | Basta far girare gli agenti dentro `reqCtx.run({actorType:'agent'})` → costi per agente **gratis** |
| C9 | "prompt degli agenti nel codice" | Pattern già in uso: `SuggestionBox.prompt` e `PromptTemplate` tengono i prompt **in DB**, editabili da admin | I prompt degli agenti vanno in `agent_config.prompt`: tuning **senza deploy** |
| C10 | "lock in-process basta" | `dashboard.service` usa un boolean `batchRunning` (in-process) | Con backend riavviabile o più istanze serve **`pg_try_advisory_lock`** (§4.4) |

**Aggiunto in v2:** §4 completa (file tree, migration SQL, contratto `Agent`, orchestratore reale,
`generaJson`, due agenti scritti per intero, tool layer, coda azioni, budget, agenti di mercato,
query SQL del profilo Luis, apprendimento, ceiling), effort per fase, decisioni aperte.

---

## 1. Analisi dello stato attuale (verificata)

### 1.1 Asset riusabili — con riferimento al codice
| Asset | File | Cosa dà al sistema agentico |
|------|------|------------------------------|
| **Scheduler dinamico DB-driven** | `integrazione/sync-manager.service.ts` | il motore dell'orchestratore (clonare, non riscrivere) |
| **Batch a finestra con cap** | `dashboard/dashboard.service.ts:182` (`@Cron` 3AM, `FREQUENZA_GIORNI`, `MAX_CLIENTI_NOTTE`, i più stantii per primi) | la politica di scheduling già collaudata su clienti reali |
| **Dossier commerciale** | `customer-intelligence/customer-intelligence.service.ts:179` | KPI, YoY, stagionalità 12 mesi, basket, HHI, segmento, **salute** |
| **Offerte deterministiche** | stesso file, `raccomandazioni():64` | riordino ciclico + cross-sell, già filtrato per `nonCompreraMai` |
| **Creazione offerta** | `creaOfferta():165` → `Progetto` + `shareToken` | l'**azione** che l'agente propone |
| **Profilo cliente + web** | `customer-profile.service.ts` + `dati-impresa.service.ts` + `generaSintesiAIConRicerca` | identità, settore, interessi, `nonCompreraMai` |
| **Sintesi comportamentale** | `insight/insight.service.ts:126` + `simili():157` | narrazione + "clienti simili" per coseno |
| **Embedding** | `integrazione/embedding.service.ts` (provider `gemini\|local`, dim 768, `cosine` statico) | retrieval; **già pronto a puntare al Mini PC LM Studio** |
| **Contabilità AI** | `ai-usage/ai-usage.service.ts:41` (costo €/chiamata, attore da `reqCtx`) | il budget degli agenti |
| **Canale azione** | `Campaign`, `Promozione`, `MailModule` | dove atterrano le proposte |
| **Anomalie** | `AnomaliaLog` (tipo/gravità/risolto) | alert quando un agente devia |
| **Prompt in DB** | `SuggestionBox.prompt`, `PromptTemplate` | tuning degli agenti senza deploy |

### 1.2 Gap reali (dopo la verifica)
1. **Nessun orchestratore**: i moduli AI sono isolati, ognuno col suo `@Cron`, nessuno parla con gli altri, nessuno decide le priorità.
2. **Nessun output strutturato dall'LLM** (C5) → oggi ogni consumatore fa parsing a regex. Blocca qualsiasi agente tipizzato.
3. **Nessuna memoria condivisa**: gli output AI vivono in tabelle scollegate (`customer_insight`, `customer_profiles`, `dashboard_boxes`); non c'è un posto dove "l'agente A legge cosa ha capito l'agente B".
4. **Zero visione esterna**: il grounding è usato **solo** sul singolo cliente. Niente mercato, tendenze, prezzi, stagionalità di settore.
5. **Nessun profilo di Luis**: c'è l'HHI **per cliente**, non per l'azienda. Manca la bussola.
6. **Nessun prospecting**: il sistema conosce solo chi è già cliente.
7. **Carrelli non sfruttati** (C2): il segnale più caldo che esiste è inerte.
8. **Nessuna coda azioni**: l'AI produce testo che qualcuno deve leggere; non c'è un "cosa faccio oggi" con stati e feedback.
9. **Nessun ciclo di apprendimento**: nessuno misura se un'offerta proposta è poi diventata un ordine.

---

## 2. Visione, obiettivi, non-obiettivi

**Visione.** Un collega digitale che non dorme: osserva tutto ciò che succede in Luis e nel mercato,
capisce ogni cliente e l'azienda nel suo insieme, e produce **continuamente** una coda di azioni
concrete, motivate e misurate.

**Principio ingegneristico (vincolante).** *Deterministico dove si può, LLM dove serve giudizio.*
Selezionare, contare, ordinare, filtrare = SQL. Spiegare, classificare, ipotizzare, scrivere = LLM.
È già la scelta fatta nei box (`generaRationale`: "l'AI spiega soltanto, non sceglie né conta") e va
elevata a **regola di architettura**: rende il sistema economico, testabile e non allucinante.

**Non-obiettivi:** invii automatici senza umano, pricing automatico, scraping aggressivo,
profilazione di persone fisiche, framework agentici prima di averne bisogno.

---

## 3. Architettura agentica

```
┌───────────────────────────────────────────────────────────────────────────┐
│ L0 · ORCHESTRATORE  (AgentManagerService — clone di SyncManagerService)     │
│  cron da DB · advisory lock · budget € · retry · log su agent_run           │
└───┬───────────────────────────┬───────────────────────────┬───────────────┘
    │                            │                           │
┌───▼────────────────┐ ┌─────────▼──────────┐ ┌──────────────▼─────────────┐
│ L1 INTERNO         │ │ L1 ESTERNO         │ │ L1 STRATEGIA (Luis)        │
│ customer-strategist│ │ market-watcher     │ │ company-profiler           │
│ (per cliente)      │ │ (settimanale)      │ │ (settimanale)              │
└───┬────────────────┘ └─────────┬──────────┘ └──────────────┬─────────────┘
    │ nesting reale               │                           │
    ├─ dossier (esistente)        ├─ trend-scout (grounding)  ├─ mix & HHI aziendale (SQL)
    ├─ churn-detector (SQL)       ├─ price-scout (grounding)  ├─ clienti crescita/calo (SQL)
    ├─ cart-recovery (SQL)        └─ prospect-finder          └─ sintesi + 3 mosse (LLM)
    ├─ offer-generator (esistente)     (registro imprese + web)
    └─ narratore (LLM, 1 chiamata)
```

**Perché gerarchico.** L0 non ragiona sul merito: pianifica, isola i guasti, tiene il budget.
L1 possiede un dominio e **compone** i suoi sub-agenti. L2 sono unità piccole, quasi tutte
deterministiche, testabili in isolamento.

**Perché annidato.** Il contesto sale **sintetizzato**: L2 produce ~10 righe di JSON, L1 le unisce e
fa **una** chiamata LLM. Niente mega-prompt, costo prevedibile, ogni livello ispezionabile.

**Regola di autonomia (3 livelli):**
- **auto** — calcoli e segnalazioni interne (dossier, salute, score). Nessuna approvazione.
- **proposta** — crea artefatti *interni, non visibili al cliente*: `Progetto`/offerta bozza, `Campaign` in `status=draft`. Un click dell'umano li rende reali.
- **approvazione obbligatoria** — qualunque cosa esca verso l'esterno (email, contatto prospect, pubblicazione). **Mai automatica.**

---

## 4. Implementazione tecnica (il "come", in concreto)

### 4.1 Struttura file (un solo modulo nuovo + 3 estrazioni)

```
backend/src/agents/
  agents.module.ts            # unico modulo nuovo
  agent.types.ts              # contratto Agent + AgentContext + AgentAction
  agent-manager.service.ts    # L0: scheduler (clone di SyncManagerService) + budget + lock
  agent-registry.ts           # mappa nome -> istanza (niente DI magica)
  agent-actions.service.ts    # coda azioni: propone/approva/scarta/esegue + esito
  agents.controller.ts        # API admin: /api/admin/agents/*
  interni/
    customer-strategist.agent.ts   # L1
    churn-detector.agent.ts        # L2 (SQL)
    cart-recovery.agent.ts         # L2 (SQL)
    offer.agent.ts                 # L2 (wrappa CustomerIntelligenceService)
  esterni/
    market-watcher.agent.ts        # L1
    trend-scout.agent.ts           # L2 (grounding)
    price-scout.agent.ts           # L2 (grounding)
    prospect-finder.agent.ts       # L2 (registro imprese + grounding)
  strategia/
    company-profiler.agent.ts      # L1: il profilo di Luis

# Estrazioni necessarie (C6): sposto i provider da AdminModule a moduli con exports
backend/src/customer-intelligence/customer-intelligence.module.ts   (nuovo)
backend/src/customer-profile/customer-profile.module.ts             (nuovo)
backend/src/dati-impresa/dati-impresa.module.ts                     (nuovo)
```

> `AdminModule` continua a funzionare: importa i moduli invece di dichiarare i provider.
> Diff piccolo, zero cambi di comportamento.

### 4.2 Migration additiva (convenzione del progetto: `IF NOT EXISTS`, mai `DROP`)

`backend/prisma/migrations/2026xxxx_agents/migration.sql`

```sql
-- Config + scheduling degli agenti (gemello di sync_config: stessa UI, stesso pattern)
CREATE TABLE IF NOT EXISTS agent_config (
  nome                TEXT PRIMARY KEY,           -- 'customer-strategist'
  label               TEXT NOT NULL,
  livello             TEXT NOT NULL DEFAULT 'L1', -- L0 | L1 | L2
  cron_expression     TEXT NOT NULL DEFAULT '0 3 * * *',
  attivo              BOOLEAN NOT NULL DEFAULT true,
  solo_manuale        BOOLEAN NOT NULL DEFAULT false,
  prompt              TEXT DEFAULT '',            -- tuning senza deploy (come suggestion_boxes)
  parametri           JSONB NOT NULL DEFAULT '{}',-- {maxClientiNotte:50, freqGiorni:7, ...}
  budget_giornaliero  NUMERIC(10,4) DEFAULT 1.0,  -- € max/giorno per questo agente
  ultima_esecuzione   TIMESTAMPTZ,
  ultimo_esito        TEXT,
  ultimo_errore       TEXT,
  prossima_esecuzione TIMESTAMPTZ,
  aggiornato_il       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ogni esecuzione (padre/figlio = nesting tracciabile)
CREATE TABLE IF NOT EXISTS agent_run (
  id            BIGSERIAL PRIMARY KEY,
  agente        TEXT NOT NULL,
  parent_run_id BIGINT REFERENCES agent_run(id) ON DELETE CASCADE,
  target_tipo   TEXT,            -- 'customer' | 'global' | 'articolo'
  target_id     INTEGER,
  stato         TEXT NOT NULL DEFAULT 'running',  -- running|ok|errore|skipped
  input         JSONB,
  output        JSONB,
  errore        TEXT,
  costo_stimato NUMERIC(10,6) DEFAULT 0,
  durata_ms     INTEGER,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS agent_run_agente_idx ON agent_run(agente, started_at DESC);
CREATE INDEX IF NOT EXISTS agent_run_target_idx ON agent_run(target_tipo, target_id);

-- La coda azioni: IL prodotto del sistema
CREATE TABLE IF NOT EXISTS agent_action (
  id           BIGSERIAL PRIMARY KEY,
  run_id       BIGINT REFERENCES agent_run(id) ON DELETE SET NULL,
  agente       TEXT NOT NULL,
  tipo         TEXT NOT NULL,   -- offerta|recupero_carrello|winback|prospect|pricing|strategia
  customer_id  INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  titolo       TEXT NOT NULL,
  motivazione  TEXT NOT NULL,   -- il "perche'", sempre obbligatorio
  payload      JSONB NOT NULL DEFAULT '{}',
  priorita     INTEGER NOT NULL DEFAULT 0,       -- valore atteso € (ordinamento coda)
  confidenza   REAL NOT NULL DEFAULT 0.5,
  autonomia    TEXT NOT NULL DEFAULT 'proposta', -- auto|proposta|approvazione
  stato        TEXT NOT NULL DEFAULT 'proposta', -- proposta|approvata|scartata|eseguita|scaduta
  esito        TEXT,            -- ordine|nessuno|... (feedback loop)
  esito_valore NUMERIC(12,2),
  dedup_key    TEXT UNIQUE,     -- evita di riproporre la stessa cosa ogni notte
  scade_il     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_action_coda_idx ON agent_action(stato, priorita DESC);
CREATE INDEX IF NOT EXISTS agent_action_cliente_idx ON agent_action(customer_id, stato);

-- Memoria condivisa (fatti + embedding). Coerente con articolo_embedding: array nativo.
CREATE TABLE IF NOT EXISTS knowledge_item (
  id          BIGSERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL,      -- fatto_cliente|trend|prezzo|prospect|strategia
  entita_tipo TEXT,               -- customer|articolo|famiglia|azienda
  entita_id   TEXT,
  testo       TEXT NOT NULL,
  meta        JSONB NOT NULL DEFAULT '{}',
  fonti       JSONB,              -- URL/fonte per tutto cio' che viene dal web
  embedding   double precision[],
  valido_fino TIMESTAMPTZ,        -- i fatti di mercato scadono
  agente      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_tipo_idx ON knowledge_item(tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_entita_idx ON knowledge_item(entita_tipo, entita_id);

-- Profilo dell'azienda Luis, versionato (mai UPDATE: lo storico E' la direzione)
CREATE TABLE IF NOT EXISTS company_profile (
  id           BIGSERIAL PRIMARY KEY,
  periodo      TEXT NOT NULL UNIQUE,   -- '2026-W33'
  kpi          JSONB NOT NULL,         -- calcolati in SQL
  sintesi      TEXT,                   -- narrazione LLM
  opportunita  JSONB,
  rischi       JSONB,
  mosse        JSONB,                  -- 3-5 raccomandazioni con priorita'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prospect (aziende, non persone fisiche)
CREATE TABLE IF NOT EXISTS prospect (
  id              BIGSERIAL PRIMARY KEY,
  ragione_sociale TEXT NOT NULL,
  partita_iva     TEXT UNIQUE,
  settore TEXT, ateco TEXT, citta TEXT, provincia TEXT, sito TEXT,
  fonte           JSONB,
  score           REAL DEFAULT 0,
  motivazione     TEXT,
  simile_a        INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  stato           TEXT NOT NULL DEFAULT 'nuovo',  -- nuovo|qualificato|contattato|cliente|scartato
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> Nessun `DROP`, nessuna colonna modificata su tabelle esistenti → il sync di schema non può
> distruggere nulla e la migration è rilanciabile (regola DB del progetto).

### 4.3 Il contratto (`agent.types.ts`) — ~40 righe, niente framework

```ts
export interface AgentAction {
  tipo: 'offerta' | 'recupero_carrello' | 'winback' | 'prospect' | 'pricing' | 'strategia';
  customerId?: number;
  titolo: string;
  motivazione: string;          // obbligatorio: un'azione senza perche' non si propone
  payload?: Record<string, unknown>;
  priorita?: number;            // € di valore atteso
  confidenza?: number;          // 0..1
  autonomia?: 'auto' | 'proposta' | 'approvazione';
  dedupKey?: string;            // es. `cart:${customerId}:${settimana}`
  scadeIl?: Date;
}

export interface AgentResult {
  azioni: AgentAction[];
  fatti?: { tipo: string; testo: string; meta?: object; fonti?: object; validoFino?: Date }[];
  note?: string;
}

export interface AgentContext {
  runId: number;
  spawn<I>(agente: string, input: I): Promise<AgentResult>;   // <- il nesting
  budget: { residuo(): Promise<number>; esaurito(): Promise<boolean> };
  log: LoggerLike;
  config: { prompt: string; parametri: Record<string, unknown> };
}

export interface Agent<I = unknown> {
  readonly nome: string;
  readonly livello: 'L0' | 'L1' | 'L2';
  run(input: I, ctx: AgentContext): Promise<AgentResult>;
}
```

Tre scelte deliberate:
- **`AgentResult` è l'unico output possibile.** Un agente non scrive sul DB di business, non manda mail, non chiama API di scrittura. Produce *azioni* e *fatti*; chi le materializza è `AgentActionsService`, **in un punto solo**. È il guardrail più forte del sistema — vale più di dieci regole scritte nei prompt.
- **`ctx.spawn` è l'unica via per l'annidamento**, così ogni sub-run finisce in `agent_run.parent_run_id` e l'albero è ispezionabile.
- **`ctx.config` viene dal DB** → prompt e parametri si tarano dalla UI admin, senza deploy.

### 4.4 L'orchestratore (`agent-manager.service.ts`) — clone di `SyncManagerService`

Il 70% è già scritto in `sync-manager.service.ts`: registrazione cron da DB in `onModuleInit`,
`SchedulerRegistry`, `updateProssimaEsecuzione` con `cron-parser`, `run(tipo, isManual)` con log
esito. Copio quella struttura e aggiungo le tre cose che mancano: **lock cross-processo**,
**budget**, **contabilizzazione dei run**.

```ts
@Injectable()
export class AgentManagerService implements OnModuleInit {
  async onModuleInit() {                    // identico a SyncManagerService.registerAllFromDb
    const cfgs = await this.prisma.$queryRawUnsafe<AgentConfigRow[]>('SELECT * FROM agent_config');
    for (const c of cfgs) if (c.attivo && !c.solo_manuale) this.registerJob(c.nome, c.cron_expression);
  }

  /** Un solo run per agente in tutto il cluster: advisory lock Postgres (C10). */
  private async withLock<T>(nome: string, fn: () => Promise<T>): Promise<T | null> {
    const key = hashInt32(nome);
    const [{ locked }] = await this.prisma.$queryRawUnsafe<{ locked: boolean }[]>(
      'SELECT pg_try_advisory_lock($1) AS locked', key);
    if (!locked) { this.log.warn(`${nome}: gia' in esecuzione, salto`); return null; }
    try { return await fn(); }
    finally { await this.prisma.$executeRawUnsafe('SELECT pg_advisory_unlock($1)', key); }
  }

  async esegui(nome: string, input: unknown = {}, parentRunId?: number): Promise<AgentResult> {
    const cfg   = await this.getConfig(nome);
    const agent = this.registry.get(nome);
    const runId = await this.startRun(nome, input, parentRunId);
    const t0    = Date.now();

    const ctx: AgentContext = {
      runId,
      spawn: (sub, i) => this.esegui(sub, i, runId),                  // nesting
      budget: {
        residuo:  () => this.budgetResiduo(nome, cfg.budget_giornaliero),
        esaurito: async () => (await this.budgetResiduo(nome, cfg.budget_giornaliero)) <= 0,
      },
      log: this.log,
      config: { prompt: cfg.prompt ?? '', parametri: cfg.parametri ?? {} },
    };

    try {
      // Tutte le chiamate AI dentro il run vengono attribuite all'agente (C8):
      // ai_usage.attore_tipo='agent', attore_id=runId. Zero codice in piu' in AiUsageService.
      const res = await reqCtx.run({ actorType: 'agent', actorId: runId }, () => agent.run(input, ctx));
      await this.actions.materializza(res, nome, runId);   // unico punto di scrittura
      await this.endRun(runId, 'ok', res, Date.now() - t0);
      return res;
    } catch (e) {
      await this.endRun(runId, 'errore', null, Date.now() - t0, (e as Error).message);
      await this.anomalia.log('agent', 'warning', nome, (e as Error).message);  // AnomaliaLog esistente
      return { azioni: [] };            // un agente rotto non ferma gli altri
    }
  }

  /** Budget: il costo e' gia' calcolato in ai_usage, basta sommarlo. */
  private async budgetResiduo(nome: string, max: number): Promise<number> {
    const [r] = await this.prisma.$queryRawUnsafe<{ speso: number }[]>(`
      SELECT COALESCE(sum(u.costo_stimato),0)::float AS speso
      FROM ai_usage u JOIN agent_run r ON r.id = u.attore_id
      WHERE u.attore_tipo='agent' AND r.agente=$1 AND u.created_at >= date_trunc('day', now())`, nome);
    return max - r.speso;
  }
}
```

**Il ciclo notturno** riusa la politica già validata sui box (finestra + cap + i più stantii per primi):

```sql
-- customer-strategist gira per N clienti a notte, non per tutti (dashboard.service.ts:182 docet)
SELECT c.id FROM customers c
LEFT JOIN LATERAL (
  SELECT max(started_at) AS ts FROM agent_run r
  WHERE r.agente='customer-strategist' AND r.target_id=c.id AND r.stato='ok'
) r ON true
WHERE c.stato='ATTIVO' AND (r.ts IS NULL OR r.ts < now() - ($1 || ' days')::interval)
ORDER BY r.ts NULLS FIRST LIMIT $2;
```

**Trigger a eventi**, senza infrastruttura nuova: `EventsService` scrive già `customer_event`.
Un `@Cron` ogni 15 minuti legge gli eventi non ancora processati e accoda run mirati (carrello fermo
da 24h, cliente rientrato dopo 90 giorni). *ponytail: polling di una tabella indicizzata invece di
una coda vera; se un giorno serve latenza sotto il minuto → BullMQ.*

### 4.5 Il pezzo mancante: output LLM tipizzato (C5)

Oggi `callGeminiText` ritorna una stringa e ogni chiamante fa parsing a regex. Aggiungo **un metodo**
a `IntegrazioneService`, riusando tutto ciò che già fa (config da `SiteConfig`, `AbortController`,
errori parlanti, `aiUsage.record`):

```ts
/** Come generaSintesiAI, ma con output JSON garantito dal modello. Opzionale: grounding. */
async generaJson<T>(prompt: string, schema: object,
                    opts?: { grounding?: boolean; usageTipo?: string }): Promise<T | null> {
  const raw = await this.callGeminiText(prompt, undefined, opts?.usageTipo ?? 'agent', undefined, undefined, {
    grounding: opts?.grounding,
    json: opts?.grounding ? undefined : schema,   // <- vedi nota
  });
  try { return JSON.parse(this.estraiJson(raw) ?? raw) as T; } catch { return null; }
}
```

e in `callGeminiText`, dentro `generationConfig`:

```ts
...(opts?.json ? { responseMimeType: 'application/json', responseSchema: opts.json } : {}),
```

> **Limite reale dell'API (da sapere prima, non dopo):** su Gemini `responseSchema` e il tool
> `google_search` **non sono combinabili nella stessa chiamata**. Per gli agenti esterni servono
> quindi **due passaggi**: (1) chiamata con grounding → testo + fonti; (2) chiamata di
> normalizzazione, senza grounding, con `responseSchema` → JSON tipizzato. Costa una chiamata in più
> solo sugli agenti di mercato (poche al giorno) ed è l'unico modo per avere insieme *fatti dal web*
> e *output strutturato*. Fallback: `estraiJson`, che già esiste.

### 4.6 Agente completo #1 — `cart-recovery` (L2: SQL sceglie, zero LLM)

```ts
@Injectable()
export class CartRecoveryAgent implements Agent<{ ore?: number }> {
  nome = 'cart-recovery'; livello = 'L2' as const;

  async run({ ore = 24 }, ctx: AgentContext): Promise<AgentResult> {
    // C2: carrello 1:1 col cliente; righe salvato=false = abbandonate, salvato=true = "per dopo"
    const carrelli = await this.prisma.$queryRawUnsafe<CartRow[]>(`
      SELECT c.cliente_id, cu.ragione_sociale,
             count(*) FILTER (WHERE i.salvato = false) AS n_attive,
             count(*) FILTER (WHERE i.salvato = true)  AS n_salvate,
             max(i.aggiornato_il) AS ultimo_tocco,
             array_agg(DISTINCT i.variante_codice) AS varianti
      FROM carrelli c
      JOIN carrello_items i ON i.carrello_id = c.id
      JOIN customers cu ON cu.id = c.cliente_id
      WHERE c.aggiornato_il < now() - ($1 || ' hours')::interval
      GROUP BY c.cliente_id, cu.ragione_sociale
      HAVING count(*) FILTER (WHERE i.salvato = false) > 0`, ore);

    const azioni: AgentAction[] = [];
    for (const c of carrelli) {
      const valore = await this.valorizza(c.varianti);   // deterministico: listino del cliente
      if (valore < 50) continue;                         // sotto soglia non disturbo nessuno
      azioni.push({
        tipo: 'recupero_carrello',
        customerId: c.cliente_id,
        titolo: `Carrello fermo da ${giorni(c.ultimo_tocco)}g — ${euro(valore)}`,
        motivazione: `${c.n_attive} righe attive, ultimo tocco ${fmt(c.ultimo_tocco)}. Nessun ordine dopo.`,
        payload: { varianti: c.varianti, valore },
        priorita: Math.round(valore),                    // la coda si ordina da sola sul €
        confidenza: c.n_attive >= 3 ? 0.8 : 0.6,
        autonomia: 'proposta',                           // crea un Progetto bozza, non invia nulla
        dedupKey: `cart:${c.cliente_id}:${settimanaIso()}`,   // max 1 volta a settimana
        scadeIl: addDays(new Date(), 7),
      });
    }
    return { azioni };   // ponytail: nessuna chiamata LLM qui. Il testo lo scrive il narratore L1.
  }
}
```

**Il check che lascio dietro** (`cart-recovery.spec.ts`, tre assert): carrello vecchio sopra soglia
→ 1 azione; carrello toccato ieri → 0 azioni; `dedupKey` stabile nella stessa settimana.
Se la query sbaglia, fallisce.

### 4.7 Agente completo #2 — `customer-strategist` (L1: il nesting vero)

```ts
async run({ customerId }, ctx: AgentContext): Promise<AgentResult> {
  // 1) deterministico, in parallelo, riusando cio' che esiste
  const [dossier, offerte, churn, carrello] = await Promise.all([
    this.intelligence.dossier(customerId),           // esistente
    this.intelligence.raccomandazioni(customerId),   // esistente
    ctx.spawn('churn-detector', { customerId }),     // L2 nested
    ctx.spawn('cart-recovery',  { customerId }),     // L2 nested
  ]);

  const azioni = [...churn.azioni, ...carrello.azioni, ...offerte.slice(0, 3).map(toAzione)];
  if (!azioni.length) return { azioni: [] };            // niente da dire = zero costo
  if (await ctx.budget.esaurito()) return { azioni };   // le azioni restano, salta la narrazione

  // 2) UNA chiamata LLM, su input gia' ridotto (~15 righe), con output tipizzato
  const profilo = await this.profilo.getProfilo(customerId);   // interessi + nonCompreraMai
  const sintesi = await this.ai.generaJson<{ sintesi: string; azionePrioritaria: string }>(
    `${ctx.config.prompt}\n\n` +
    `CLIENTE: ${dossier.segmento}, salute ${dossier.salute}, ` +
    `fatturato 12m ${euro(dossier.kpi.fatturato12m)} (YoY ${pct(dossier.kpi.trendYoY)}), ` +
    `ultimo ordine ${dossier.kpi.giorniDaUltimoOrdine}g fa su cadenza media ${dossier.kpi.cadenzaMediaGiorni}g.\n` +
    `FAMIGLIE: ${dossier.basket.famiglie.slice(0,5).map(f => `${f.nome} ${pct(f.quota)}`).join(', ')}\n` +
    `NON PROPORRE MAI: ${(profilo?.nonCompreraMai ?? []).join(', ') || '—'}\n` +
    `AZIONI CANDIDATE: ${azioni.map(a => a.titolo).join(' | ')}\n` +
    `Scegli l'azione prioritaria e spiega in max 40 parole perche', citando i numeri.`,
    SCHEMA_STRATEGIA);

  if (sintesi) azioni[0] = { ...azioni[0], motivazione: sintesi.azionePrioritaria };
  return { azioni, fatti: sintesi ? [{ tipo: 'fatto_cliente', testo: sintesi.sintesi }] : [] };
}
```

**Costo reale:** 1 chiamata LLM per cliente elaborato (~1.500 token in / 200 out). Con
`gemini-2.5-flash` e 50 clienti a notte siamo nell'ordine di **pochi centesimi a notte** — dentro il
budget di un singolo box di oggi. È l'effetto diretto della regola "SQL sceglie, LLM spiega".

### 4.8 Tool layer (function calling) — **solo dove serve davvero**

Il function calling serve quando l'agente non sa *in anticipo* quali dati gli servono: è il caso di
`prospect-finder` (cerca, valuta, arricchisce, decide se cercare ancora), non di
`customer-strategist` (dove i dati li so già). Quindi **niente tool layer in Fase 1**. Quando
servirà, tre tool read-only con whitelist rigida:

```ts
const TOOLS = {
  cerca_articoli:  (q: string)     => integrazione.searchSemantica(q, 10),   // esistente
  dossier_cliente: (id: number)    => intelligence.dossier(id),              // esistente
  dati_impresa:    (piva: string)  => datiImpresa.get(piva),                 // esistente
};
// Nessun tool di scrittura. Mai. L'unica scrittura possibile e' AgentResult.azioni.
```

### 4.9 Coda azioni: materializzazione, API, UI

```ts
// AgentActionsService — l'unico punto in cui il lavoro di un agente tocca il mondo
async materializza(res: AgentResult, agente: string, runId: number) {
  for (const a of res.azioni) {
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO agent_action (run_id, agente, tipo, customer_id, titolo, motivazione,
                                payload, priorita, confidenza, autonomia, scade_il, dedup_key)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (dedup_key) DO NOTHING`, /* ... */);      // <- idempotenza gratis
  }
  for (const f of res.fatti ?? []) await this.salvaFatto(f, agente);   // + embedding
}

/** Approvazione umana -> effetto reale. Ogni tipo ha UNA implementazione, esplicita. */
async approva(id: number, adminId: number) {
  const a = await this.get(id);
  switch (a.tipo) {
    case 'offerta':
    case 'recupero_carrello':
      await this.intelligence.creaOfferta(a.customer_id, a.payload.varianti, a.titolo); break; // esistente
    case 'winback':
      await this.creaCampagnaBozza(a); break;    // Campaign status='draft': l'invio e' un secondo OK
    case 'prospect':
      await this.promuoviProspect(a); break;     // stato='qualificato', nessun contatto automatico
    case 'pricing':
    case 'strategia':
      break;                                     // informative: l'approvazione le archivia
  }
  await this.setStato(id, 'eseguita', adminId);
  await this.audit.log('agent_action.approva', { id, tipo: a.tipo });   // AuditLog esistente
}
```

**API** (`/api/admin/agents`): `GET /coda?stato=proposta`, `POST /azioni/:id/approva`,
`POST /azioni/:id/scarta`, `GET /config`, `PUT /config/:nome`, `POST /run/:nome`,
`GET /run?agente=`, `GET /costi`.

**UI — due pagine, entrambe cloni di UI già esistenti:**
1. **"Azioni consigliate"** — la coda ordinata per `priorita`, raggruppata per cliente: titolo, motivazione, badge confidenza, bottoni Approva / Scarta / Rimanda.
2. **"Agenti"** — clone della pagina sync (cron, attivo/manuale, ultima e prossima esecuzione, esito, "Esegui ora", log dei run) + editor del `prompt` e del budget.
3. Nella **scheda cliente** esistente: un tab "Azioni" che filtra la stessa coda.

### 4.10 Mercato, prezzi, prospect (gli agenti esterni)

Regola non negoziabile: **nessun dato personale o commerciale di Luis esce**. Le query verso il web
sono anonime e categoriali.

```
trend-scout → 1 chiamata con grounding + 1 di normalizzazione (§4.5)

  "Mercato italiano {settore} (vasi, fioriere, complementi da giardino) — {mese} {anno}:
   tendenze di acquisto di garden center e rivenditori, materiali/colori/formati in crescita
   e in calo, fascia di prezzo tipica al pubblico. Cita le fonti."

  → { trend: [{tema, direzione, evidenza, fonte}], stagionalita: [...], confidenza }
  → ogni item diventa knowledge_item(tipo='trend', valido_fino = +60gg, fonti = [...])
```

**Da segnale ad azione** — è il punto che separa "notizia" da "vendita": il trend viene **incrociato
in SQL** col catalogo. Se un tema in crescita corrisponde a famiglie con giacenza e rotazione bassa,
nasce un'azione `strategia` ("prepara promo su X tra 3 settimane"); altrimenti il fatto resta in
memoria e non disturba nessuno.

**price-scout** — confronto su fonti pubbliche consentite, **categoria per categoria** (non SKU per
SKU: il matching esatto è illusorio). Output = posizionamento della *fascia* Luis vs mercato, con
`fonti` sempre allegate. Cadenza mensile. Ceiling dichiarato: è un'indicazione di fascia, non un
listino comparato.

**prospect-finder** — parte dai clienti migliori (top decile per fatturato 12m), estrae il pattern
(ATECO, provincia, dimensione, famiglie acquistate), cerca aziende **simili non clienti** (registro
imprese via `DatiImpresaService` + web), esclude chi è già in `customers` o `prospect`, assegna uno
score e **si ferma lì**: il contatto lo decide un umano. Solo dati d'impresa pubblici, mai persone
fisiche — coerente con `ANALISI_DATI_LLM_GDPR_AIAct.md`.

### 4.11 Il profilo di Luis (la bussola) — quasi tutto SQL

```sql
-- KPI aziendali del periodo. Nota: importo_totale a volte e' 0 (bug noto dei dati importati),
-- quindi il fatturato si ricalcola dalle righe. Stesso fix gia' applicato altrove nel progetto.
WITH ord AS (
  SELECT o.id, o.customer_id, o.data_ordine,
         COALESCE(NULLIF(o.importo_totale,0),
                  (SELECT sum(r.prezzo * r.quantita) FROM righe_ordini r WHERE r.ordine_id = o.id)) AS importo
  FROM ordini_clienti o
  WHERE o.data_ordine >= now() - interval '12 months'
),
per_cliente AS (
  SELECT customer_id, sum(importo) AS tot FROM ord GROUP BY customer_id
)
SELECT (SELECT sum(tot) FROM per_cliente)                                   AS fatturato_12m,
       (SELECT count(*) FROM per_cliente)                                   AS clienti_attivi,
       -- concentrazione clienti (Herfindahl): 1 = tutto su un cliente. Il rischio n.1 di Luis.
       (SELECT sum(power(tot / NULLIF((SELECT sum(tot) FROM per_cliente),0), 2)) FROM per_cliente) AS hhi_clienti;
```

Più: mix per famiglia con delta YoY, clienti in crescita/calo, famiglie in declino, articoli mai
venduti, nuovi clienti vs persi. **Poi una sola chiamata LLM** che riceve questi numeri e produce
`sintesi`, `opportunita`, `rischi`, `mosse[]` (3-5, con priorità e KPI da guardare).

Salvato in `company_profile` **per periodo, senza update**: la sequenza dei periodi *è* la direzione
dell'azienda, ed è la risposta letterale alla domanda "dove stiamo andando".

### 4.12 Apprendimento (chiude il cerchio)

Un `@Cron` giornaliero collega le azioni al risultato: per ogni `agent_action` eseguita con
`customer_id`, cerca ordini del cliente nei 30 giorni successivi che contengano gli articoli
proposti → scrive `esito` e `esito_valore`. Da lì, gratis: conversione **per agente, per tipo di
azione, per segmento**. Che è esattamente ciò che serve per alzare o abbassare le soglie — e per
spegnere un agente che non produce.

*ponytail: attribuzione a finestra temporale, non causale. Sufficiente per decidere dove insistere;
se un giorno serve rigore, si tiene un gruppo di controllo.*

### 4.13 Ceiling dichiarati (dove si rompe, e cosa fare)
| Limite | Quando arriva | Upgrade |
|--------|---------------|---------|
| Cron in-process + advisory lock | più istanze backend, o job > 1h | BullMQ + Redis |
| `cosine` in Node su tutti i vettori | > ~20-30k `knowledge_item` | `sqlite-vec` affiancato, o pgvector se il DB si aggiorna |
| Polling eventi ogni 15' | serve latenza < 1 min | listener DB / coda |
| `responseSchema` + grounding non combinabili | subito, sugli agenti esterni | doppia chiamata (§4.5) |
| Prompt in DB senza versioning | quando il tuning diventa frequente | colonna `versione` + storico |

---

## 5. Roadmap (con effort e criterio di uscita)

| Fase | Contenuto | Effort | Si passa oltre quando… |
|------|-----------|--------|------------------------|
| **0 — Fondamenta** | migration §4.2 · `agents.module` · contratto · `AgentManagerService` · `generaJson` (§4.5) · estrazione 3 moduli (C6) · pagina "Agenti" | **3-5 gg** | un agente fittizio gira a cron, scrive `agent_run`, rispetta budget e lock |
| **1 — Valore interno** | `cart-recovery` · `churn-detector` · `offer` (wrapper) · `customer-strategist` · **coda "Azioni consigliate"** con approva/scarta | **1-2 sett.** | il commerciale apre la coda al mattino e trova azioni che approva davvero |
| **2 — Bussola** | `company-profiler` (§4.11) + pagina "Direzione" + storico periodi | **4-5 gg** | il primo dossier settimanale viene letto e discusso |
| **3 — Apprendimento** | feedback loop (§4.12) + metriche per agente | **2-3 gg** | si vede la conversione per tipo di azione |
| **4 — Mondo esterno** | `trend-scout` · `price-scout` · `prospect-finder` + pipeline prospect | **2-3 sett.** | primi prospect qualificati e primo incrocio trend↔catalogo utile |
| **5 — Scala** | BullMQ / indice vettoriale / tool layer — **solo su evidenza dai ceiling §4.13** | on demand | — |

**Perché quest'ordine.** La Fase 1 usa dati che Luis già possiede e produce valore misurabile in due
settimane. La Fase 4 è la più costosa (web + LLM) e la più incerta: si affronta **dopo** aver
dimostrato che la coda azioni viene usata davvero. E la Fase 3 prima della 4 non è un dettaglio:
senza feedback loop non sapremmo dire se il mercato serve o è solo interessante.

---

## 6. Rischi e mitigazioni

| Rischio | Mitigazione (concreta, non dichiarativa) |
|---------|------------------------------------------|
| Allucinazioni | l'LLM non seleziona mai: sceglie SQL. `responseSchema` sull'output. Ogni azione ha motivazione coi numeri |
| Azioni indesiderate | `AgentResult` è l'unico output; nessun tool di scrittura; approvazione umana su tutto ciò che esce |
| Costi | budget €/giorno per agente su `ai_usage` (già calcolato), 1 chiamata per cliente, finestra + cap notturni |
| Rumore nella coda | soglie di valore, `dedup_key`, `scade_il`, priorità in €. Meglio 5 azioni buone che 50 |
| Dati sporchi | `COALESCE(NULLIF(importo_totale,0), …)` già adottato; anomalie su `AnomaliaLog` |
| Privacy / AI Act | niente PII verso l'esterno, prospect solo aziende, fonti tracciate, audit, badge AI già in uso |
| Agente che si rompe | try/catch per run, errore su `agent_run` + `AnomaliaLog`, gli altri proseguono |
| Over-engineering | la Fase 0 non introduce **nessuna** dipendenza nuova: né Redis, né vector DB, né framework |

---

## 7. KPI

**Sistema:** azioni proposte/settimana · % approvate · % scartate (se > 50% le soglie sono sbagliate)
· costo €/azione approvata · run falliti.
**Business:** conversione azione→ordine per tipo · valore recuperato da carrelli · riattivazioni su
clienti `a_rischio` · prospect qualificati→clienti · tempo risparmiato per analisi cliente.
**Strategia:** dossier Luis letto e usato · mosse eseguite sul totale proposte.

---

## 8. Decisioni aperte (servono a te, non a me)

1. **Chi lavora la coda azioni** — solo admin, o anche gli agenti di vendita con vista sui propri clienti? Cambia permessi e UI.
2. **Budget AI mensile accettabile** — determina clienti/notte e cadenza degli agenti esterni.
3. **Prospecting sì o no in questa fase** — è la parte più costosa, più incerta e con più implicazioni (contatto a freddo). Si può rimandare senza toccare il resto.
4. **Mini PC LM Studio** — `EmbeddingService` è già pronto a puntarci (`EMBEDDINGS_PROVIDER=local`): spostare lì gli embedding azzera quella voce di costo.

---

### Il principio, in una riga
Il sistema più utile non è il più autonomo: è quello che **propone poche cose giuste, motivate coi
numeri, e lascia decidere a un umano** — digerendo tutto il resto da solo, di notte, a costo quasi zero.
