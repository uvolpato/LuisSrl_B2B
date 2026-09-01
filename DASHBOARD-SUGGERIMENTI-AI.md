# Dashboard AI — Box di suggerimenti personalizzati per il cliente

> Documento di progetto. Data: 2026-08-03 (rev. 3 — aggiunto §14 "Assistente commerciale: catalogo ad hoc") · Stato: proposta · Autore: Ugo Volpato
> Repo: `LuisSrl_B2B` · Correlati: `roadmap-b2b-luis.md` (Blocco 13), `CUSTOMER-TRACKING.md`,
> `RAG-RICERCA-SEMANTICA.md`, `MCP-B2B.md`, `ANALISI_DATI_LLM_GDPR_AIAct.md`

---

## 1. Executive summary

La dashboard cliente (`frontend/app/area/page.tsx`) mostra oggi **6 box con titoli e
immagini hardcoded** (`PRODUCT_BOXES`, riga 45). Nessun dato reale, nessuna
personalizzazione.

Obiettivo: box **configurabili dall'amministratore** — ogni box ha un **titolo e un
prompt** che dice cosa presentare (es. *titolo: "Provali", prompt: "prendi 10 articoli che
il cliente non ha mai acquistato, ma che secondo quello che ha comprato o visionato possono
interessargli"*). Un'agente AI aggrega **consumi reali, tracking comportamentale, progetti
del cliente, affinità (clienti simili), giacenza, listino e promozioni** e genera per ogni
cliente la selezione del box.

**Due requisiti chiave**
1. **Segnali pesati e configurabili**: quando proponiamo un prodotto contano acquisti,
   *progetti* e *tracking* insieme, ma la proporzione **non è fissa** — è un parametro
   editabile per box (l'admin la tarà sui dati reali).
2. **Interfaccia admin "titolo + prompt"**: l'admin definisce/edita i box senza toccare
   codice. Il sistema esegue il prompt in modo affidabile separando *vincoli duri*
   (SQL) dall'*intento semantico* (retrieval + LLM).

**Il ruolo dell'LLM (onesto)**: l'LLM **interpreta il prompt una volta, a edit-time**,
generando un *piano di query validato* e revisionabile dall'admin (vedi §4.1). A runtime il
motore esegue il piano in modo deterministico. **Niente framework "agentico" (LangChain/
LangGraph) per i box** — è una pipeline, non un agente (vedi §5).

**Approccio: pipeline ibrida** — motore deterministico (SQL/Prisma + coseno in Node su embedding array) che produce
*candidati* rispettando i vincoli + Gemini con *structured output* che sceglie/ordina/
giustifica. **Il modello non inventa mai prodotti: sceglie solo tra candidati reali.**

---

## 2. Stato attuale (verificato sul codice — agg. 2026-08)

> **Aggiornamento**: parti del piano sono già implementate. L'**engine backend esiste**
> (`src/dashboard/`: candidati deterministici + score pesato + coseno Node + cache
> `DashboardBox` + batch `@Cron` notturno + endpoint `GET /dashboard/suggerimenti`,
> `POST …/rigenera`). I **modelli** `Promozione`/`SuggestionBox`/`DashboardBox` esistono
> (schema + migration `20260803000000_dashboard_ai`).
> **Implementato** (agosto 2026): Fase 2 (LLM `rationale` per box via
> `IntegrazioneService.generaSintesiAI`, disattivabile con `DASHBOARD_RATIONALE=off`),
> Fase 3 (**CRUD admin dei `SuggestionBox`** — sezione "Box dashboard": titolo, prompt,
> n° articoli, pesi, scope famiglia/raccolta, `soloInOfferta`, ordine, attivo), Fase 5
> (wiring frontend: la dashboard consuma `GET /dashboard/suggerimenti`, box vuoti nascosti).
> **Manca ancora**: CRUD promozioni (il modello `Promozione` esiste ma senza UI — i box `soloInOfferta`
> restano vuoti finché non ci sono promozioni a DB). La **selezione/riordino LLM (Fase 2)** è ora
> implementata ma **dietro flag** (`DASHBOARD_LLM_SELECTION=on`); default `off` = ranking deterministico.

| Area | Stato |
|------|-------|
| 6 box dashboard | ✅ collegati: `frontend/app/area/page.tsx` consuma `GET /dashboard/suggerimenti` (box vuoti nascosti, `rationale` mostrato) |
| Engine box (deterministico) | ✅ `src/dashboard/dashboard.service.ts` (candidati + score + cache + cron + `rationale` LLM) |
| Ricerca semantica AI | ✅ `POST /api/catalogo/ricerca` (+ ricerca per immagine) |
| Tracciamento comportamentale | ✅ `CustomerEvent` (beacon, sessioni, funnel) — Blocco 12 |
| Sintesi AI cliente | ✅ `CustomerInsight` (testo + metriche JSONB + embedding) + `insight.simili()` (coseno) |
| Consumi reali | ✅ `OrdineCliente`/`RigaOrdine`, `Carrello`/`CartItem` |
| **Progetti del cliente** | ✅ `Progetto`/`ProgettoItem` — da integrare come segnale |
| Giacenza | ✅ view `b2b_giacenze` (ultimo inventario attivo) |
| Listini/prezzi per cliente | ✅ `enrichWithPrezzi(codiceListino)` |
| Prompt admin-editabili | ✅ pattern esistente (`PromptTemplate` per wizard descrizioni) — riutilizzabile |
| Promozioni/offerte | modello `Promozione` presente; ❌ nessuna UI admin (i box `soloInOfferta` restano vuoti senza promozioni a DB) |
| Box configurabili | ✅ CRUD admin `SuggestionBox` (sezione "Box dashboard") + engine + LLM `rationale` + frontend |

---

## 3. Box configurabili (interfaccia admin)

Non più 6 box fissi: l'admin gestisce una lista di box in una nuova sezione del Pannello
di Amministrazione. I 6 attuali diventano i **seed di default**.

**Editor box** (modale come `PromptTemplate`/`DescrizioneAiWizard`):

| Campo | Esempio |
|-------|---------|
| Titolo | "Provali" / "Natale" / "I tuoi prodotti in offerta" |
| Prompt | "prendi 10 articoli che il cliente non ha mai acquistato, ma che secondo quello che ha comprato o visionato possono interessargli" |
| N. articoli | 10 |
| Pesi segnali | acquisti 0.40 · tracking 0.25 · progetti 0.20 · affinità 0.15 |
| Vincoli duri | ☐ solo in offerta · ☐ escludi già acquistati · ☐ giacenza>0 · scope (famiglia/raccolta) |
| Attivo / Ordinamento | ✓ · 3 |
| **Test anteprima** | scegli un cliente campione → esecuzione dry-run → mostra quali prodotti uscirebbero |

Il prompt è **intento**: l'admin scrive in linguaggio naturale *cosa* mostrare; i vincoli
operativi (in offerta, esclusione acquisti, giacenza) sono **checkbox separate**, applicate
in SQL — così "mai acquistati" è sempre vero, mai lasciato al modello.

---

## 4. Architettura proposta

```
Cliente (dashboard /area) ── GET /dashboard/suggerimenti ──► NestJS src/dashboard/
                                                                    │
Admin (Pannello) ──────── CRUD /api/admin/suggestion-box ──────────┤
                                                                    ▼
                 ┌───────────────────────────────────────────────────┐
                 │ 1. CANDIDATI (deterministico, per box, niente LLM)│
                 │    a) base: attivi+configurati+visibili           │
                 │    b) vincoli duri in SQL (soloInOfferta,         │
                 │       escludiAcquistati, giacenza>0, scope)       │
                 │    c) intento semantico dal prompt → coseno Node      │
                 │       (riuso searchSemantica su articolo_embedding)│
                 │    d) score pesato: acquisti·w1 + tracking·w2 +    │
                 │       progetti·w3 + affinità·w4  (pesi per box)    │
                 │    e) top N candidati                              │
                 ├────────────────────────────────────────────────────┤
                 │ 2. LLM (Gemini, structured output JSON):           │
                 │    riceve {candidati, prompt admin, digest         │
                 │    cliente} → sceglie n articoli, ordina,          │
                 │    rationale "perché". Output validato (schema,    │
                 │    enum, max 2 frasi).                             │
                 ├────────────────────────────────────────────────────┤
                 │ 3. Fallback: se Gemini assente → box col solo      │
                 │    layer 1 (titolo admin, rationale generico).     │
                 └────────────────────────────────────────────────────┘
                             │  cache
                  ┌──────────▼────────────┐
                  │  tabella DashboardBox │   batch notturno + trigger
                  └───────────────────────┘   (ordine, promo, esaurito)
```

**Principi**
1. **Il LLM non genera la lista**: sceglie/ordina tra candidati già filtrati da SQL.
2. **Vincoli duri ≠ intento semantico**: mai delegare al LLM conteggi o esclusioni.
3. **Proporzione progetti/tracking configurabile** (pesi per box, default 40/25/20/15).
4. **Caching a batch**: niente Gemini on-load della dashboard. Costi in `AiUsage`.
5. **Fallback deterministico**: la dashboard non si rompe mai.

### 4.1 Dove vive l'LLM: planner a edit-time (non runtime)

La domanda "può essere l'LLM a generare la query?" ha risposta sì, ma il punto è *dove*:
generare la query a runtime (per cliente × box) replica errori e non-determinismo su tutto
il catalogo. La soluzione è farlo **una volta, mentre l'admin scrive il box**, con revisione
umana:

```
Admin: prompt "10 articoli mai acquistati, natalizi, in linea con gli acquisti"
   │
   ▼  LLM interpreta (Gemini, JSON schema) → genera un PIANO, visibile all'admin
   │   { escludiAcquistati: true,            ← estratto da "mai acquistati"
   │     ricercaTesto: "natalizi",           ← intento semantico (coseno su array)
   │     pesi: {acquisti:0.6, progetti:0.2, tracking:0.2},
   │     n: 10 }
   ▼
Admin: revisiona il piano + "Test anteprima" → vede i prodotti che uscirebbero
   ▼
Piano VALIDATO salvato → il job notturno lo esegue in modo deterministico
(SQL parametrizzata + coseno Node su array), zero chiamate LLM per cliente
```

Benefici: non-determinismo eliminato a runtime, errori catturati dall'admin in test,
una chiamata Gemini per *edit* (non per cliente×box), debug facile ("perché box vuoto?"
→ guarda il piano salvato).

Variante opzionale "pro" (solo se in futuro servono box dinamici su eventi): il piano
può essere rigenerato anche a runtime, ma solo come **JSON con parametri chiusi** compilato
dal backend in SQL parametrizzata, con queste regole non negoziabili:
- i **filtri di autorizzazione** (cliente vede solo ciò che può vedere: stato, configurato,
  listino) sono **sempre hardcoded**, mai LLM-decidibili;
- niente SQL raw dal modello: solo flag/filtri da vocabolario fisso;
- utente DB read-only + `LIMIT` + timeout + dry-run con `EXPLAIN`;
- log del prompt e del piano generato per audit/debug.

---

## 5. Framework consigliato

- **Niente framework "agentico" pesante** per i box: è query + riordino.
- **Motore**: TypeScript + Prisma + **coseno in Node su `articolo_embedding.text_vec` (double precision[])** — NON pgvector (non disponibile su PG12 Windows) — pattern di `insight.simili` e `searchSemantica`).
- **LLM**: Gemini via `IntegrazioneService.generaSintesiAI` con **JSON Schema** (`response_mime_type='application/json'`), come in `insight.service.ts`.
- **Admin prompt**: modale + CRUD come `PromptTemplate` (pattern già esistente).
- **Riservare un vero agente** (function-calling/LangGraph) solo a un futuro **chatbot
  consulente**; il modulo dashboard espone gli stessi servizi come tool MCP (`MCP-B2B.md`).

### 5.1 Perché NO LangChain/LangGraph qui (e quando sì invece)

Posizione onesta: **per i box non serve un framework agentico.**

- Il lavoro è *filtri → score → LLM che riordina*: una funzione, non un loop. Niente
  tool-selection, memory o state machine.
- "Delegare tutto a un agente" significa consegnare al modello **non-determinismo, costi e
  fragilità del prompt** per una flessibilità che qui non serve: un box che cambia risultati
  ogni notte su N clienti è un incubo da spiegare e da debuggare.
- LangChain è una dipendenza grossa con breaking change frequenti, che incapsula cose che
  qui si fanno in 20 righe (chiamata Gemini + JSON schema, già in `insight.service.ts`).

**Quando invece ha senso (e cosa usare):**
- Un **chatbot consulente** ("Cosa mi consigli di acquistare?"): l'agente sceglie tool, tiene
  stato, eventualmente chiede conferma all'admin → lì **LangGraph** (state machine +
  human-in-the-loop) o anche il **function-calling nativo di Gemini**.
- In ogni caso il motore dei box resta il layer sottostante: l'agente ci chiama sopra, non lo
  sostituisce.

---

## 6. Modello dati nuovo

```prisma
model Promozione {
  id            Int      @id @default(autoincrement())
  titolo        String
  tipo          String   // SCONTO | PERCENTUALE | OMAGGIO | VETRINA
  valore        Decimal?
  dataInizio    DateTime
  dataFine      DateTime
  famiglie      String[]
  articoli      String[]
  priorita      Int      @default(0)
  attiva        Boolean  @default(true)
  @@map("promozioni")
}

model SuggestionBox {
  id                Int      @id @default(autoincrement())
  titolo            String
  prompt            String
  nArticoli         Int      @default(10)
  pesi              Json     @default("{\"acquisti\":0.40,\"tracking\":0.25,\"progetti\":0.20,\"affinita\":0.15}")
  soloInOfferta     Boolean  @default(false)
  escludiAcquistati Boolean  @default(true)
  scopeFamiglia     String   @default("")
  scopeRaccolta     String   @default("")
  attiva            Boolean  @default(true)
  ordinamento       Int      @default(0)
  createdAt         DateTime @default(now()) @map("creato_il")
  updatedAt         DateTime @updatedAt @map("aggiornato_il")
  @@map("suggestion_boxes")
}

model DashboardBox {
  id          Int      @id @default(autoincrement())
  customerId  Int
  boxId       Int
  titolo      String
  rationale   String?
  prodotti    Json     // [{codiceLinea, nome, immagine, prezzo, giacenza, promo?}]
  generatoIl  DateTime
  @@unique([customerId, boxId])
  @@map("dashboard_boxes")
}
```

- `Promozione`: admin o sync (fonte da decidere). Prerequisito dei box "offerta".
- `SuggestionBox`: definizione dei box (titolo+prompt+pesi+vincoli). Seed = i 6 attuali.
- `DashboardBox`: cache per cliente; upsert per `(customerId, boxId)`.

---

## 7. Segnali → fonte → peso

| Segnale | Fonte | Peso default |
|---------|-------|--------------|
| Consumi (famiglie/categorie preferite) | `RigaOrdine`+`Articolo`+`Famiglia` | 0.40 |
| Tracking (visti/salvati/carrello recenti) | `CustomerEvent`, `Carrello` | 0.25 |
| **Progetti del cliente** | `ProgettoItem` | 0.20 |
| Affinità (clienti simili) | `CustomerInsight` + `insight.simili()` | 0.15 |
| Intento semantico del prompt | coseno Node su `articolo_embedding.text_vec` (array) | filtro/score |
| Giacenza | view `b2b_giacenze` | filtro/boost |
| Prezzo personalizzato | `enrichWithPrezzi` | presentazione |
| Promozioni | `Promozione` | filtro (soloInOfferta) |

> I pesi sono **per box**, editabili in admin. Non serve decidere oggi la proporzione
> progetti/tracking: si parte dai default e si tarà sui dati (vedi §13 "misurazione").

---

## 8. API

- `GET /dashboard/suggerimenti` (guard customer) → box attivi da cache (o fallback).
- `POST /dashboard/suggerimenti/rigenera` (admin, on-demand) → forza rigenerazione.
- `GET/POST/PUT/DELETE /api/admin/suggestion-box` → CRUD box (admin).
- `POST /api/admin/suggestion-box/:id/test` → **anteprima dry-run** su cliente campione:
  esegue il motore senza scrivere e ritorna i prodotti che uscirebbero.
- `GET/POST/PUT/DELETE /api/admin/promozioni` → CRUD promo (admin).
- Job `@nestjs/schedule` notturno: rigenera i box dei clienti attivi.

---

## 9. Privacy e GDPR

- Box **per-cliente**: nessuna altra entità commerciale nelle risposte.
- Prompt LLM con **candidati minimizzati** (id, nome, famiglia, prezzo, giacenza, promo):
  mai dati di altri clienti, mai dati personali estesi.
- **Log di ogni rigenerazione** (`AiUsage` + audit): box, prompt, costo, esito.
- Retention coerente con `CUSTOMER-TRACKING.md` (eventi grezzi 12-24 mesi).
- I prompt dei box sono **admin** (trusted); comunque si applicano i guardrail anti
  injection e il rationale in output è limitato (max 2 frasi).

---

## 10. Costi LLM (stima)

- Gemini `flash` + JSON: ~€0,000x per (box × cliente) a rigenerazione.
- Batch notturno su N clienti attivi × B box attivi: da pochi **centesimi** a qualche
  decina di centesimi a notte (dipende da B e N).
- Il caching è la leva: si rigenera solo ciò che cambia. **Limite consigliato: ≤10 box
  attivi** per contenere costi e qualità.

---

## 11. Fasi del progetto

| Fase | Contenuto | Output |
|------|-----------|--------|
| **0** | Tabella `Promozione` + CRUD admin | box "offerta" con dati veri |
| **1** | Motore deterministico: vincoli SQL + intento semantico + **score pesato (acquisti/tracking/progetti/affinità)** | box funzionanti con titoli admin, senza LLM |
| **2** | Gemini structured output: selezione/ordine/rationale per cliente | ✅ implementato dietro flag `DASHBOARD_LLM_SELECTION` |
| **3** | **Admin UI box**: CRUD titolo+prompt+pesi+vincoli + **LLM-planner a edit-time** (genera il piano di query revisionabile) + **anteprima test** | ✅ implementato (vedi §15) |
| **4** | Batch notturno + trigger + monitoraggio `AiUsage` | costi sotto controllo |
| **5** | Frontend dashboard: box da dati reali, nascosti se vuoti + tracciamento click-per-box | misurazione e taratura pesi |
| **6** | **Assistente commerciale: catalogo ad hoc** (vedi §14) — agente conversazionale che usa i tool del motore per costruire cataloghi personalizzati, con conferma umana | catalogo ad hoc interattivo |

---

## 12. Esempi concreti

1. **Box admin "Provali"** — prompt: *"prendi 10 articoli che il cliente non ha mai
   acquistato, ma che secondo quello che ha comprato o visionato possono interessargli"*.
   Motore: SQL esclude gli acquistati → candidati per affinità a acquisti+tracking+progetti
   → Gemini seleziona 10 e scrive il "perché".
2. **Box admin "Natale"** — prompt: *"proponi 10 articoli natalizi in linea con gli
   acquisti del cliente"*. Motore: retrieval semantico di "articoli natalizi" (raccolte/tag/
   embedding) filtrato per le famiglie preferite → Gemini ordina.
3. **"Riprendi da dove hai lasciato"** → tracking (visti) + carrello + progetti, con
   giacenza>0. Pesi spostati verso tracking/progetti.
4. **Cliente nuovo** → niente cronologia: pesi su affinità/best seller; i box senza
   candidati non appaiono.

---

## 13. Rischi e controindicazioni (onesti)

- **Prompts vaghi/contraddittori** → zero o scarsi risultati. Mitigazione: il box si
  nasconde se non trova candidati; l'**anteprima test** in admin mostra subito l'esito e
  l'admin può riscrivere il prompt.
- **Il LLM non esegue vincoli esatti**: "mai acquistati", conteggi e giacenza sono SQL.
  Mai fidarsi del modello per esclusioni.
- **Proporzione progetti/tracking sconosciuta**: è volutamente un parametro. Ma senza
  misura non la tarrerai: il **tracciamento click-per-box** (già possibile con i
  `CustomerEvent`) è la base per capire quali box/pesi funzionano.
- **Costi crescono con N box**: limite box attivi (≤10), caching a batch, monitoraggio.
- **Over-personalizzazione** (troppo "hai guardato" è creepy): rationale dosato e mix di
  box esplorativi (offerta/top) + personalizzati.
- **Dipendenza da Gemini**: fallback deterministico sempre attivo.

---

## 14. Assistente commerciale — catalogo ad hoc (futuro, Blocco 14)

Scenario: un **agente di commercio** costruisce un **catalogo personalizzato** per un
cliente *interagendo con l'AI* — "creami un catalogo per Rossi con terracotta primaverile,
escludi ciò che ha già comprato", "aggiungi i fiberstone ordinati per margine", "salva".
Qui **sì che serve un agente** (conversazionale, stateful, con scelta di tool), a
differenza dei box (batch e deterministici).

### Perché qui l'agente sì, nei box no

| | Box dashboard (§4) | Catalogo ad hoc (questo §) |
|---|---|---|
| Natura | batch notturna, deterministico | interattivo, in sessione |
| Stato | cache (`DashboardBox`) | **`BozzaCatalogo` che evolve** |
| LLM | planner una tantum + riordino | loop continuo (tool-calling) |
| Umano | admin in fase di configurazione | commerciale in ogni passo |
| Esito | box fissi | catalogo personalizzato salvato/condiviso |

### Architettura

```
Commerciale (UI "Crea catalogo") ── chat ──► Agente (Gemini function-calling)
                                                 │  tools = STESSI del motore:
                                                 │   ricerca semantica, articolo,
                                                 │   giacenza, listino cliente,
                                                 │   promozioni, progetti cliente,
                                                 │   aggiungi/rimuovi da bozza, salva
                                                 ▼
                                           stato: BozzaCatalogo (DB)
                                           righe + criteri + storico modifiche
                                           (riprendibile, non solo in memoria)
                                                 │
                                                 ▼
                                           Human-in-the-loop: conferma PRIMA di salvare
                                           → export PDF/Excel / condivisione
```

```prisma
model BozzaCatalogo {
  id          Int      @id @default(autoincrement())
  operatoreId Int              // agente di commercio che la sta costruendo
  clienteId   Int              // cliente destinatario (se prevista)
  titolo      String
  criteri     Json             // {famiglie, colori, fasciaPrezzo, escludiAcquistati, …}
  righe       Json             // [{codiceLinea, nome, prezzo, giacenza, note}]
  stato       String           // BOZZA | IN_REVISIONE | SALVATO | CONDIVISO
  conversazione Json?          // storico chat (per riprendere la sessione)
  createdAt   DateTime @default(now()) @map("creato_il")
  updatedAt   DateTime @updatedAt @map("aggiornato_il")
  @@map("bozze_catalogo")
}
```

### Framework (onesto)

- **Partire dal function-calling nativo di Gemini** + tabella `BozzaCatalogo`: un loop
  ben progettato con stato persistito copre ~90% del valore, senza dipendenze.
- **LangGraph (o LangGraph.js) solo se** servono: multi-agente, workflow con rami,
  interrupt formali human-in-the-loop (pausa/ripresa), checkpoints. È un'aggiunta
  successiva, non un prerequisito.
- **Sinergia MCP**: gli stessi tool esposti via `MCP-B2B.md` permettono di usare questo
  agente anche dentro Claude/opencode, non solo nel portale.

### Rischi specifici

- Il commerciale può generare un catalogo "sbagliato" → **conferma prima del salvataggio**
  e storico modifiche (annulla/riprendi).
- I prezzi restano dal layer deterministico (`enrichWithPrezzi`), mai scritti dal LLM.
- Costi: agentico = più chiamate per sessione; il limite è per sessione utente, non a batch
  — monitorare con `AiUsage`.
- GDPR: la bozza contiene dati cliente → permessi per operatore, audit di salvataggio,
  retention coerente con il resto.

---

## 15. Fase 2 implementata — selezione LLM, profilo e dedupe (agg. 2026-09)

Comportamento attuale del motore (`src/dashboard/dashboard.service.ts`):

1. **Vincoli SQL** (`poolVincoli`): attivi/configurati/visibili, scope famiglia/raccolta,
   `escludiAcquistati`, giacenza > 0, `soloInOfferta`, **esclusione articoli già usati
   da altri box** (`esclusi`).
2. **Ricerca semantica** (`intentoSemantico`): incorpora **prompt del box + profilo del
   cliente** (solo box `cliente`) e tiene *tutti* gli articoli con coseno positivo —
   nessun taglio duro (rimossi `BOX_SEMANTIC_FLOOR`/`BOX_SEMANTIC_MARGIN`).
3. **Ranking pesato**: `scoreCandidato` sui segnali (acquisti/tracking/progetti/affinità);
   fonte = ordini del cliente (`cliente`) o best-seller globali (`generale`).
4. **Fase 2 (LLM)** — dietro `DASHBOARD_LLM_SELECTION=on` (`off` = top-N deterministico):
   l'LLM (`gemini-flash`, JSON `{articoli, rationale}`) sceglie/ordina N tra i primi M
   candidati pesati e scrive il perché. Output **validato** (solo codici tra i candidati,
   max N); su errore/JSON invalido → fallback deterministico. Costo tracciato in `ai_usage`
   con `tipo='box'`.
5. **Profilo cliente nel contesto** (box `cliente`): `InsightService.latest` (sintesi AI) +
   `CustomerProfile` (`settore`, `interessiPrincipali`, `nonCompreraMai`). Il profilo
   arricchisce sia l'embedding della ricerca semantica sia il digest dato all'LLM
   (con "Da NON proporre: …" esplicito).
6. **Dedupe tra box**: greedy sequenziale — i box `generale` escludono gli articoli degli
   altri box generale; i box `cliente` escludono gli articoli degli altri box cliente **e**
   quelli dei box generale (che restano condivisi `customerId=0`). `generaBox`/
   `generaBoxGenerale` ritornano `{ articoli, rationale }`.

**Rollback**: `DASHBOARD_LLM_SELECTION=off` (default) ripristina il ranking deterministico
precedente senza toccare codice. Flag documentato in `backend/.env.example`.

### 15.1 Fase 3 — planner a edit-time + anteprima test (implementata)

- **Campo `ricercaTesto`** su `SuggestionBox` (migration additiva): testo semantico distillato
  dal prompt; se vuoto l'engine usa `box.prompt`. `intentoSemantico` incorpora
  `ricercaTesto || prompt` + profilo cliente.
- **`POST /api/dashboard/suggerimenti/pianifica`** (admin): l'LLM interpreta il prompt e
  restituisce un piano `{ ricercaTesto, escludiAcquistati, soloInOfferta, nArticoli, pesi, note }`
  (vocabolario chiuso, niente SQL raw). L'admin lo revisiona e salva.
- **`POST /api/dashboard/suggerimenti/test`** (admin): anteprima **dry-run** del motore su un
  cliente campione (o `?clienteId=`) **senza scrivere la cache** — esegue `generaBox`/
  `generaBoxGenerale` e restituisce `{ articoli, rationale }`.
- **UI editor box** (`BoxSuggerimentiSection`): campo "Ricerca semantica", bottone
  "Interpreta il prompt (AI)" (prefill campi dal piano + nota) e "Test anteprima"
  (mostra gli articoli che uscirebbero).
