# Portale B2B Luis come server MCP — Progetto di valutazione

> Documento di pianificazione (nessuna implementazione richiesta).
> Data: 2026-08-03 · Stato: proposta · Autore: Ugo Volpato
> Repo: `LuisSrl_B2B` · Riferimenti: `RAG-RICERCA-SEMANTICA.md`, `ANALISI_DATI_LLM_GDPR_AIAct.md`, `DEPLOY.md`

---

## 1. Executive summary

MCP (Model Context Protocol) è un protocollo standard (JSON-RPC 2.0) che permette a un
agente AI di **chiamare "tool" del tuo backend** come se fossero API. Se il portale B2B
espone un server MCP, allora Claude, opencode, Cursor, Cline e altri agenti possono
interrogare il **catalogo, la ricerca semantica, le giacenze, i listini, gli ordini e gli
insight** direttamente sui dati reali — non su un export o una memoria statica.

Per un B2B come Luis (catalogo + clienti + listini differenziati + giacenze) il valore
principale è **interno/operativo**: assistere il commerciale e l'amministrazione con
dati sempre veri e aggiornati. Il rischio è esporre dati sensibili; va quindi progettato
con **solo lettura, token con scope, audit completo** e **nessuna esposizione su internet**.

**Verdetto: fattibile e conveniente, purché read-only in Fase 0 e con governance sui dati.**

---

## 2. Cosa è MCP e perché rilevante

- **MCP** = protocollo di integrazione agente ↔ strumento. L'agente chiede a un server
  MCP di eseguire un tool; il server risponde con dati strutturati (JSON).
- È lo standard promosso da Anthropic e adottato da molti client (Claude Desktop, Claude
  Code, opencode, Cursor, Cline, …). **Un solo server MCP = disponibile a tutti.**
- Due trasporti principali:
  - **stdio** — processo figlio lanciato dall'agente (Claude Desktop locale). Semplice,
    nessuna autenticazione di rete, ma disponibile solo localmente al PC.
  - **Streamable HTTP** — endpoint HTTP (il successore di SSE). Necessario per raggiungere
    gli agenti da remoto con autenticazione e centralità sul server.

---

## 3. Vantaggi (con onestà)

### 3.1 Vantaggi reali per un B2B

1. **Dati sempre veri** — l'agente non "inventa": risponde con giacenza, prezzo di
   listino e disponibilità letti dal DB al momento. Elimina il problema principale del
   RAG su export statico (dati vecchi, risposte sbagliate).
2. **Riutilizza il lavoro già fatto** — la ricerca semantica (incluso il miglioramento
   "basso e largo" appena deployato), gli insight AI cliente, il tracking eventi: sono
   già endpoint; MCP li "espone" agli agenti senza riscriverli.
3. **Un solo protocollo, tanti agenti** — integrazione scritta una volta, consumata da
   Claude, opencode, Cursor, ecc. (Config `mcpServers`).
4. **Commerciale più veloce** — esempi concreti:
   - *"Il cliente chiede se il vaso ARGO blu Ø24 è disponibile e il prezzo per il suo listino"*
     → tool `giacenza` + tool `prezzo_listino` con lo scope del cliente.
   - *"Quali articoli sono esauriti e da quanto?"* → tool `giacenze` (view `b2b_giacenze`).
   - *"Prepara un preventivo per il cliente X"* → tool `anagrafica` + `listino` + `ricerca`.
5. **Analisi operativa senza estrarre dati** — niente più xlsx manuali: l'agente interroga
   e riassume (vendite, esauriti, rotazione) rispettando i permessi.
6. **Standard e futuro-proof** — MCP è in forte adozione; investimento stabile.

### 3.2 Limiti e controindicazioni (da dire chiaramente)

- MCP **non sostituisce il portale**: è un canale per agenti, non per utenti finali.
- Espone una **superficie d'attacco aggiuntiva**; va chiuso da rete, con token e rate-limit.
- Aggiunge **manutenzione**: nuove versioni SDK, versioning dei tool.
- **Rischio governance**: se un agente risponde a terzi con dati veri, un errore di scope
  o di prompt diventa un errore aziendale reale. Serve audit e linee guida.
- Per un'azienda piccola i benefici si materializzano solo se **qualcuno usa davvero gli
  agenti** (es. il commerciale); altrimenti è manutenzione senza ritorno.

---

## 4. Architettura proposta

```
Agenti (Claude Desktop, opencode, Cursor, ...)
        │  MCP Streamable HTTP (JSON-RPC)
        ▼
Reverse proxy (Caddy/PM2) ──  solo HTTPS + token  ──►  Backend NestJS
                                                        │  modulo src/mcp/
                                                        │    - trasporto Streamable HTTP (/mcp)
                                                        │    - registrazione tool dai servizi esistenti
                                                        │    - scope resolution (permission system esistente)
                                                        ▼
                                                  PostgreSQL (LuisSrlDb)
                                                        │  view b2b_giacenze, listini, articoli, clienti, ordini
```

- **Endpoint**: `/mcp` sul backend (porta 3001), raggiungibile solo in intranet/VPN o via
  reverse proxy autenticato. **Mai su internet pubblico.**
- **SDK**: `@modelcontextprotocol/sdk` (ufficiale TypeScript) — `McpServer` + `StreamableHTTPServerTransport`.
- **Modello a permessi riusato**: il portale ha già `@RequirePermission(...)`; lo stesso
  sistema definisce cosa un agente (identificato da un token) può chiamare.

### 4.1 Tool proposti (Fase 0, tutti read-only)

| Tool | Dati | Servizio esistente |
|------|------|--------------------|
| `catalogo.ricerca` | ricerca testuale **e semantica** (rewrite + boost forma) | `searchSemantica` |
| `catalogo.articolo` | dettaglio articolo: varianti, dimensioni, prezzo, disponibilità | card/`findMany`+prezzi |
| `catalogo.giacenze` | giacenza per articolo/variante (view `b2b_giacenze`) | view dedicata |
| `listino.prezzo` | prezzo per cliente/listino (`codiceListino`) | `enrichWithPrezzi` |
| `anagrafica.cliente` | dati anagrafici cliente (minimizzati) | modulo customers |
| `ordini.stato` | stato/ultimi ordini cliente | modulo ordini/carrello |
| `insight.cliente` | sintesi AI cliente (Fase 2/3 tracking) | events/insight |
| `catalogo.schemi` | **resource** con schema Prisma (per far capire la struttura all'agente) | — |

### 4.2 Cosa NON esporre in Fase 0
- Scritture (stato articolo, creazione utenti, ordini) — rimandate a Fase 2 con workflow.
- Dati bancari/pagamenti, password, segreti.
- Export massivi (niente tool "dump di tutta la tabella").

---

## 5. Autenticazione

MCP su HTTP è **machine-to-machine**: niente cookie/sessione del portale.

- **Bearer token** nell'header `Authorization` di ogni chiamata.
- Ogni token = **identità applicativa** con scope (`catalogo.read`, `listini.read`,
  `clienti.read`, `ordini.read`, ...) mappati ai permessi del portale.
- **Lifecycle**: generazione via admin, scadenza, rotazione, **revoca immediata**.
- Tokens in `.env`/secret manager, **mai** nel repo né nei log.
- Per **Claude Desktop locale (stdio)**: nessuna auth di rete; il rischio è circoscritto
  al PC (file system locale). Valido solo per uso personale.

---

## 6. Privacy e GDPR

Il progetto ha già `ANALISI_DATI_LLM_GDPR_AIAct.md`: MCP deve rispettarne i principi.

1. **Minimizzazione** — ogni tool espone solo i campi necessari (es. cliente: nome, codice,
   listino; **niente** dati di pagamento). API di risposta dedicate, non il modello intero.
2. **Pseudonimizzazione** — uso di id interni/anonimi quando possibile.
3. **Audit di ogni chiamata** — log di *chi (token/agente), cosa (tool+argomenti), quando*,
   riusando l'infrastruttura audit/eventi già presente. Conservazione con retentions.
4. **Accesso per ruolo** — token commerciale ≠ token analisi ≠ token amministrazione.
   Un agente che risponde al cliente A **non deve** leggere il listino/prezzo del cliente B.
5. **Nessuna esportazione** — tool di sola query, mai "scarica tutto"; rate limiting per tool.
6. **Privacy by design** — se un agente deve rispondere a un cliente terzo, la risposta
   deve passare dal flusso del portale (con permessi e profilazione), non da MCP aperto.
7. **Risposte AI** — se gli agenti usano LLM esterni (Claude, Gemini), applicare il
   **modello dell'analisi GDPR/AIAct**: la chiamata MCP restituisce **dati strutturati**,
   non testo libero di prodotti; l'LLM del cliente può generare testo ma non deve ricevere
   più dati del necessario (minimizzazione al prompt).

---

## 7. Sicurezza e questioni sensibili

| Area | Misura |
|------|--------|
| Rete | `/mcp` solo su localhost/intranet/VPN; mai 80/443 pubblico. Reverse proxy con token. |
| Token | Bearer, scoped, revocabili, rotazione. Secret in `.env`/vault. |
| Rate limit | riuso del modulo `@nestjs/throttler` già presente (429 anche su `/mcp`). |
| Input | **mai SQL libero**: tutti i tool passano da servizi/Prisma validati; gli agenti possono inviare input "creativi" → validazione e whitelist. |
| Prompt injection | i tool ritornano **JSON strutturato** (non testo da elaborare come istruzioni); istruzioni esplicite al tool; niente azioni distruttive in Fase 0. |
| Segretezza commerciale | listini differenziati per cliente; mai risposta cross-cliente. Giacenze = dati operativi interni, non divulgabili a competitor. |
| Dati transazionali | ordini/carrelli solo con scope dedicato e audit. |
| Dati comportamentali (beacon) | dati personali → minimizzati e loggati. |
| Responsabilità | linea guida interna: uso degli agenti solo per task autorizzati; log come prova; eventuale supervisione umana su output verso clienti. |
| Backup | nessuna variazione rispetto a `DEPLOY.md` (MCP read-only non tocca dati). |

**Rischio residuo principale**: il *prompt injection* via dati di catalogo/descrizioni.
Mitigazione: risposte strutturate + nessun tool "esegui istruzioni dal testo".

---

## 8. Roadmap

| Fase | Contenuto | Criterio di uscita |
|------|-----------|--------------------|
| **0** | `/mcp` read-only: catalogo + ricerca (semantica) + giacenze. Token statico. | Test con Claude Desktop + opencode; nessuna scrittura. |
| **1** | Listini per cliente + anagrafica minimizzata + audit per token/scope. | Un commerciale usa davvero un agente per 1 settimana. |
| **2** | Eventuali tool di scrittura con **doppia conferma** e workflow (solo se richiesti). | Definizione del processo aziendale. |
| **3** | Publishing interno (connetti gli agenti del team alla config centrale). | Guida `AGENTS-CONFIG.md`. |

---

## 9. Esempi d'uso (B2B)

1. **Commerciale**: *"Trova un vaso basso e largo in ceramica, disponibile, colore blu,
   per il cliente Rossi"* → `catalogo.ricerca` + `listino.prezzo` → risposta con articoli,
   giacenza e prezzo corretto per il listino di Rossi.
2. **Back office**: *"Elenca i 5 articoli più a lungo esauriti e le rispettive linee"* →
   `catalogo.giacenze` (view `b2b_giacenze`, ultimo inventario).
3. **Amministrazione**: *"Quanti ordini aperti ha il cliente Bianchi e in quale stato?"* →
   `ordini.stato` (scope ordini.read + audit).
4. **Marketing/AI**: *"Genera una descrizione per la nuova famiglia X basata sugli articoli
   reali"* → `catalogo.ricerca`/`catalogo.articolo` (dati reali al modello, minimizzati).

---

## 10. Costi e controindicazioni

- **Costi**: sviluppo modulo MCP (~1-2 giorni per la Fase 0 riusando i servizi esistenti),
  manutenzione SDK, infrastruttura token/audit.
- **Controindicazioni**: superficie d'attacco extra; rischio scope se mal configurato;
  il valore dipende dall'adozione reale da parte del team.
- **Non adatto a**: sostituire il portale, esporre MCP a clienti finali, scrivere dati
  senza processo.

---

## 11. Decisione richiesta

- [ ] Confermi la **Fase 0 read-only** su `/mcp` (trasporto HTTP Streamable + token)?
- [ ] Token di test per **quale agente** per primo (Claude Desktop locale / opencode)?
- [ ] Gestione token: admin a mano in `.env` (Fase 0) o API dedicata (Fase 1)?
