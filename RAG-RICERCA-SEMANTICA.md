# RAG — Ricerca articoli semantica e per immagine

Versione: bozza 1.0 — 16 luglio 2026
Riferimenti: `roadmap-b2b-luis.md` (Blocco 4 embedding, Blocco 10 AI lato cliente),
`SKILLS.md`, `costi-e-architettura.md`

Obiettivo: cercare articoli **per significato** (frase in linguaggio naturale) e
**per similarità visiva** (l'utente carica una foto → articoli simili), riusando
l'infrastruttura già presente. Nessun database vettoriale nuovo: pgvector è già
abilitato su `LuisSrlDb`.

---

## 1. Principio architetturale

Un **unico spazio vettoriale multimodale** (testo e immagini nello stesso spazio):
così una foto interroga il catalogo, una frase pure, e in prospettiva una foto può
recuperare articoli descritti solo a testo. È la scelta che minimizza il codice: un
solo modello, una sola tabella di embedding, una sola query di ranking.

Alternativa scartata: modello testo (es. `text-embedding-3`) + modello immagini
separato → due spazi, doppia pipeline, nessun cross-modale. Si adotta solo se il
modello multimodale non regge la qualità sul dominio (vasi, complementi, oggettistica).

### Cosa NON si aggiunge (regola ponytail / YAGNI)
- Nessun Pinecone/Weaviate/Qdrant: **pgvector** sul Postgres esistente.
- Nessun reranker, nessun chunking, nessuna cache Redis dei vettori query finché il
  volume articoli (centinaia/poche migliaia) non lo giustifica. Aggiungere quando la
  latenza misurata lo richiede, non prima.

---

## 2. Fornitore di embedding

Due strade, entrambe compatibili con l'architettura. La scelta dipende da GPU e privacy.

| | **A — Mini PC locale (LM Studio)** | **B — API hosted (jina-clip-v2)** |
|---|---|---|
| Dove gira | Mini PC 128GB in LAN (già usato per Qwen vision/descrizioni) | Cloud, chiamata HTTPS |
| Multimodale | Sì, se il modello caricato è CLIP-like / vision embedding | Sì, testo+immagine stesso spazio |
| Costo marginale | ~0 (elettricità già contata) | a consumo (embedding batch economici) |
| Privacy | Massima: le foto non escono dalla LAN | Le immagini vanno al provider |
| Rischio | Dipende dal modello disponibile in LM Studio | Dipendenza esterna, rete |

**Scelta attuale (il Mini PC non è ancora arrivato): provider = Gemini.** Si riusa
`GEMINI_API_KEY`, endpoint e pattern già presenti per descrizioni/immagini; il testo
articolo va a Google, ma *ci va già* per generare le descrizioni → nessuna nuova
esposizione. Il provider è astratto in `EmbeddingService` (metodi `embedGemini`/`embedLocal`):
all'arrivo del Mini PC basta `EMBEDDINGS_PROVIDER=local` + rilanciare il backfill.

```
EMBEDDINGS_PROVIDER = gemini | local          # default gemini
EMBEDDINGS_MODEL    = gemini-embedding-001     # o modello LM Studio
EMBEDDINGS_DIM      = 768                       # deve combaciare con la colonna vector(N)
EMBEDDINGS_URL      = http://mini-pc:1234/v1    # solo provider local
```
tutto da `.env`, mai versionato.

**Nota dimensione (cambio provider):** se il Mini PC userà un modello con dim diversa
(es. bge-m3 = 1024), aggiornare `EMBEDDINGS_DIM`, rigenerare la colonna `text_vec` e
rilanciare il backfill. È previsto: il backfill è idempotente.

### Storage: niente pgvector (scelta obbligata in prod)
pgvector **non è installabile** su PostgreSQL 12 Windows senza compilazione MSVC, e i
binari di dev (Docker/Linux) non sono portabili su Windows. Quindi l'embedding è salvato
in una **colonna array standard** (`double precision[]`) e la **similarità coseno è
calcolata in Node** sugli articoli visibili. A poche migliaia di articoli sono
millisecondi. *Ceiling:* se il catalogo cresce di ordini di grandezza, migrare a pgvector
(colonna `vector` + indice HNSW) e cambiare `searchSemantica`.

### Stato implementazione (Fase 1+2 fatte — solo testo)
- `backend/prisma/embedding-setup.sql` — tabella `articolo_embedding` con `text_vec double precision[]` (nessuna estensione).
- `backend/src/integrazione/embedding.service.ts` — `EmbeddingService` (Gemini/local).
- `IntegrazioneService.searchSemantica()` + `reembedArticolo()` (hook fire-and-forget su salvataggio/configura).
- `POST /api/catalogo/ricerca {q}` (guard cliente) → card catalogo + `score`.
- `backend/scripts/backfill-embeddings.ts` (`npm run embeddings:backfill`).
- Frontend: modale "Ricerca intelligente" collegata (solo testo); risultati nella griglia catalogo. Ricerca per immagine ancora "in arrivo".
- **Query rewrite + boost colore** (`SEARCH_QUERY_REWRITE=on|off`): prima di embeddare, Gemini riscrive la query in keyword normalizzate di dominio ed estrae il colore (es. "marrone chiaro"→"nocciola"); il colore viene ripetuto nel testo embeddato e dà un bonus di ranking (`SEARCH_COLOR_BOOST`, default 0.15) agli articoli col colore corrispondente. Verificato in dev: "vaso marrone chiaro" → solo ARGO NOCCIOLA 0.92 (vs 0.79 senza rewrite). Costo: +1 chiamata Gemini per ricerca; fallback alla query grezza se non disponibile.
- Verificato in dev: backfill 2/2 articoli, query "vaso grande da esterno" → score ~0.78.

---

## 3. Cosa si indicizza

Per ogni **articolo configurato e attivo**:

- **Blob testo** = `nome_portale ?? nome` + linea + famiglia + descrizione AI +
  attributi extra rilevanti. Un vettore `text_vec`.
- **Immagine cover** (posizionamento già impostato in admin). Un vettore `img_vec`.
  - Decisione aperta: solo cover (semplice/economico) o tutte le foto (recall visivo
    migliore, più righe/costo). Default consigliato: **solo cover** in Fase 1.

Si indicizzano solo gli articoli visibili al cliente (stesso filtro del catalogo:
`configurato = true AND attivo = true`), così la ricerca non può rivelare bozze.

---

## 4. Modello dati (pgvector, migration additiva)

```sql
-- estensione già presente; additivo e idempotente
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS articolo_embedding (
  articolo_id  INTEGER PRIMARY KEY REFERENCES articoli(id) ON DELETE CASCADE,
  text_vec     vector(1024),
  img_vec      vector(1024),
  fonte_hash   TEXT,          -- hash del blob/immagine: salta il re-embed se invariato
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- indici ANN: cosine distance (<=>)
CREATE INDEX IF NOT EXISTS idx_artemb_text
  ON articolo_embedding USING hnsw (text_vec vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_artemb_img
  ON articolo_embedding USING hnsw (img_vec vector_cosine_ops);
```

Regola DB del progetto: additivo con `IF NOT EXISTS`, nessun DROP, script idempotente
versionato in `backend/prisma/` (allineato a `restore-b2b-views.sql` &co.).
`fonte_hash` evita di ri-embeddare ciò che non è cambiato (costo/tempo).

---

## 5. Backend

### 5.1 `EmbeddingService`
Interfaccia minima, un solo punto che parla col provider:
```ts
embedText(text: string): Promise<number[]>          // -> text_vec
embedImage(buf: Buffer): Promise<number[]>          // -> img_vec (immagine normalizzata con sharp)
```
Fire-and-forget dove serve: un embedding fallito **non deve** far fallire la richiesta
utente (log + retry differito).

### 5.2 Backfill idempotente — `backend/scripts/backfill-embeddings.ts`
Per ogni articolo configurato+attivo: costruisce il blob, calcola `fonte_hash`,
se cambiato → `embedText` + (legge la cover da disco, anti path-traversal come
`img.controller.ts`) `embedImage` → **upsert** in `articolo_embedding`. Rilanciabile
senza duplicati. Batch con concorrenza limitata per non saturare il Mini PC.

### 5.3 Re-embed incrementale
Hook sul salvataggio articolo / cambio immagine (stessi punti dove oggi si aggiornano
le immagini in `integrazione.service.ts`): ricalcola solo quella riga, fire-and-forget.
Alla cancellazione articolo: `ON DELETE CASCADE` pulisce l'embedding.

### 5.4 Endpoint di ricerca
Sotto guard cliente (come `/api/catalogo`). **Filtri SQL prima, ranking vettoriale dopo**:
i vincoli di visibilità/famiglia/linea/stato restano autorevoli, il vettore riordina.

```
POST /api/ricerca/semantica   { q, filtri?, k? }
  -> embedText(q)
  -> SELECT ... FROM articoli a JOIN articolo_embedding e ...
     WHERE <filtri catalogo> ORDER BY e.text_vec <=> $1 LIMIT k;

POST /api/ricerca/immagine     (multipart: file, filtri?, k?)
  -> embedImage(file)   (normalizza con sharp, valida tipo/dimensione al confine)
  -> ... ORDER BY e.img_vec <=> $1 LIMIT k;
```
Ritorna gli articoli in forma catalogo (stessa DTO di `/api/catalogo`) + `score`.

---

## 6. Frontend

- **Catalogo cliente**: la barra di ricerca esistente guadagna due modalità:
  - **testo** → `/api/ricerca/semantica` (oltre/insieme alla ricerca testuale attuale).
  - **carica foto** → `/api/ricerca/immagine` (input file / drag&drop / fotocamera su
    mobile — i rivenditori usano tablet in negozio).
- Risultati riordinati per `score`, stessa griglia card del catalogo. Nessuna nuova
  pagina: si riusa la vista esistente.

---

## 7. Privacy e sicurezza

- **Foto caricate dal cliente**: elaborate per l'embedding e **non conservate** (o
  conservate solo se il cliente lo richiede). Con provider locale (opzione A) non
  lasciano la LAN.
- Validazione al confine su tipo/dimensione dell'immagine (riuso pattern `img.controller.ts`:
  no path-traversal, whitelist estensioni, limite byte).
- Chiavi provider solo da `.env`. Nessun dato sensibile nei log o verso servizi esterni
  (regola sicurezza del progetto / OWASP).
- L'indice contiene **solo** articoli già visibili al cliente: la ricerca non è un canale
  per esporre bozze o articoli nascosti.

---

## 8. Piano di consegna (fasi)

**Fase 1 — Infrastruttura (backend).**
Migration `articolo_embedding` + indici · `EmbeddingService` (provider locale) ·
script backfill idempotente. *Si vede:* tabella popolata, nessuna UI.

**Fase 2 — Ricerca (query + UI).**
Endpoint `/api/ricerca/semantica` e `/api/ricerca/immagine` · toggle testo/foto nella
barra catalogo · risultati per score. *Si vede:* "vasi rettangolari grandi da esterno"
trova risultati; una foto trova articoli simili.

**Fase 3 — Incrementale e qualità.**
Re-embed on-save · `fonte_hash` per saltare l'invariato · tuning `k`/soglia score ·
(solo se serve) indicizzare tutte le foto, reranker, cache query.

Copre e dettaglia il **Blocco 10 — AI lato cliente** della roadmap; l'embedding della
descrizione previsto nel **Blocco 4** confluisce qui (stessa tabella `articolo_embedding`).

---

## 9. Rischi noti (da valutare a occhi aperti)

Ordinati per gravità. Il rischio è quasi tutto sul canale **immagine**, non sul testo.

1. **Similarità visiva ≠ identità di catalogo.** CLIP cattura "vaso, terracotta, da
   esterno", non "questo SKU, 40 cm, rettangolare". Se il rivenditore fotografa un
   prodotto per trovare *quello*, ottiene somiglianti, non il match esatto. È il
   fraintendimento più probabile lato utente → gestire le aspettative in UI.
2. **Gap di dominio sulle cover.** Le cover sono foto *ambientate* (scena, luce,
   props): l'embedding si aggancia allo sfondo, non all'oggetto. La foto del cliente
   (sfondo bianco, in mano) è un'altra distribuzione. **Indicizzare il pack-shot grezzo,
   non l'ambientata** — è la singola scelta che pesa di più sulla qualità.
3. **Embedding immagine locale = assunzione non verificata.** LM Studio serve bene
   LLM/vision-language; che esponga un *endpoint di embedding immagini* CLIP-like è da
   confermare. Il testo locale è facile, l'immagine è il rischio vero. Senza, si è
   costretti su hosted (jina), che porta le foto fuori dalla LAN.
4. **Cross-modale sopravvalutato.** Foto → articoli descritti solo a testo funziona
   *solo* con un unico modello multimodale per `text_vec` e `img_vec`. Con due modelli
   separati non esiste. Non prometterlo finché non è dimostrato.
5. **Sul testo, il RAG è probabilmente over-engineering.** Su poche migliaia di
   articoli, Postgres full-text + trigram (`pg_trgm`) su nome/linea/famiglia copre l'80%
   delle query a costo zero. Il valore degli embedding è quasi tutto nella ricerca
   *per immagine*. Valutare se la ricerca semantica testuale serve davvero.
6. **Italiano.** Molti modelli sono english-first; la qualità sul gergo di prodotto IT
   va verificata sul modello scelto, non assunta.
7. **Indice stale silenzioso.** Un re-embed fire-and-forget che fallisce degrada
   l'indice senza sintomi (vettori mancanti/vecchi). Serve un **job di riconciliazione**
   periodico (confronta `fonte_hash`, ri-embedda i mancanti), non solo gli hook.
8. **Nessuna verità di riferimento.** "Semantico" è soggettivo: senza un set etichettato
   non si sa se è buono prima di mostrarlo al cliente; le regressioni di ranking sono
   invisibili.
9. **Contesa sul Mini PC.** Ogni ricerca è un'inferenza sulla stessa GPU che genera le
   descrizioni: ricerche a raffica vanno in coda dietro un job di descrizione.
10. **Versione pgvector su PG12 (prod).** HNSW richiede pgvector ≥ 0.5. Se il build in
    produzione non lo supporta si ripiega su `ivfflat`, che a basso volume rende peggio
    e va "addestrato". Verificare `SELECT extversion FROM pg_extension WHERE extname='vector';`
    prima della migration.

### Pilota di validazione (mezza giornata, prima di impegnarsi sul Blocco 10)
Obiettivo: sapere se il canale immagine regge **prima** di costruirlo.
- Raccogliere **20-30 foto reali** scattate col telefono dai rivenditori (sfondo vario,
  in mano) su articoli noti presenti a catalogo.
- Indicizzare i **pack-shot grezzi** (non le ambientate) di quegli articoli col modello
  immagine candidato (prima scelta: Mini PC; fallback: jina).
- Misurare **recall@5**: la foto reale trova l'articolo giusto nei primi 5? Etichettare
  ogni caso hit/miss e annotare i fallimenti tipici (scena vs oggetto, colore, forma).
- **Soglia di go:** se il modello immagine non è esponibile in locale, o recall@5 è
  scarso sulle foto reali, **fermarsi** — si risparmia l'intero Blocco 10, oppure si
  ripiega su ricerca testuale (full-text/trigram) senza vettori.

---

## 10. Decisioni aperte (da confermare prima della Fase 1)

1. **Provider**: Mini PC locale (consigliato) o jina-clip-v2 hosted?
2. **Immagini indicizzate**: solo cover ambientata o **pack-shot grezzo** (consigliato)?
   E: solo cover o tutte le foto per articolo?
3. **Dimensione vettore** (`EMBEDDINGS_DIM`): dipende dal modello scelto al punto 1.
4. **Ricerca testuale**: serve davvero il vettore, o basta full-text + trigram?
