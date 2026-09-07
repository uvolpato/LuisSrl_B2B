# Specifica — Chatbot AI che segue il cliente

> Documento di progetto. Data: 2026-09-07 · Stato: proposta · Autore: opencode (per conto del committente)
> Contesto: `roadmap-b2b-luis.md` (To-do #6) · Complementa `DASHBOARD-SUGGERIMENTI-AI.md` §14 (agente per l'admin) e `ANALISI_DATI_LLM_GDPR_AIAct.md` (privacy/AI Act).
> In conflitto vince `specifiche-b2b-luis.md`.

---

## 1. Visione

Un **assistente conversazionale in-app** per il cliente B2B (rivenditore) che **"segue il
cliente"**: è disponibile ovunque nel portale, è consapevole del contesto (chi è il cliente,
il suo listino, i suoi ordini, la pagina che sta guardando) e risponde in linguaggio naturale
su:

| Area | Tipiche domande |
|---|---|
| **Ordini** | "Dov'è l'ordine 10432?", "Quando arriva?", "Quanto ho ordinato il mese scorso?", "Ci sono ordini ancora da confermare?" |
| **Articoli** | "Cerca vasi terracotta esterno", "Il vaso X è disponibile?", "Quanto costa il codice Y con il mio listino?", "Ci sono novità in legno?" |
| **Scadenze** | "Quali coupon scadono presto?", "Quando scadono le mie offerte?", "Ci sono ordini in attesa?", "Entro quando posso ordinare per la consegna di venerdì?" |
| **FAQ / uso** | "Come si ordina?", "Qual è il minimo d'ordine?", "Come funzionano le spedizioni?", "Che scadenze ci sono per pagare?" |

**"Segue il cliente"** significa:
1. **Contestualizzato**: identità dal cookie di sessione (mai richieste credenziali in chat).
2. **Proattivo**: badge con notifiche (ordini in attesa, scadenze imminenti) e micro-suggerimenti
   legati alla pagina aperta.
3. **Veritiero**: i fatti (prezzi, giacenza, stato ordini, scadenze) sono letti dal database
   tramite **tool**, mai generati dall'LLM.

---

## 2. Principi non negoziabili

1. **Nessun numero inventato (fail closed)**: prezzi, sconti, giacenza, stati e scadenze
   vengono **sempre** da tool deterministici eseguiti server-side e autorizzati sul cliente.
   Se un tool fallisce, il chatbot risponde onestamente ("non riesco a leggere i dati, riprova"),
   mai inventando. (OWASP A10: fail closed, non fail open; coerenza con la regola "il backend è
   l'unica fonte di verità".)
2. **Solo lettura**: il chatbot risponde e orienta, non esegue azioni (niente creazione/annullo
   ordini, nessuna modifica dati) nella v1.
3. **Mai dati anagrafici verso l'LLM**: l'identità del cliente è tradotta in un segnaposto
   (`cliente #<id>`, `listino <codice>`) prima di costruire il prompt; al provider arrivano solo
   dati di business minimi (stati, codici articolo, testo richiesta). Vincolo GDPR come da
   `ANALISI_DATI_LLM_GDPR_AIAct.md` (lì: "nessun dato anagrafico va a Gemini").
4. **Trasparenza (AI Act, art. 50)**: il chatbot è chiaramente marcato "AI" e fa capire che è
   un'IA (microcopy in ogni apertura del pannello).
5. **Dati per cliente**: ogni tool è limitato al `customerId` autenticato; impossibile leggere
   ordini/articoli di altri clienti o dati admin (OWASP A01 Broken Access Control).
6. **Sigillo di qualità di progetto**: type-check pulito, verifica reale con sessione autenticata,
   errori tradotti (pattern `tServer`), WCAG 2.2 AA, niente sforo mobile, costi tracciati in
   `ai_usage`.

---

## 3. Cosa risponde — dominio dei tool

L'LLM sceglie tra tool (function-calling). Ognuno è **solo backend**, autorizzato sul cliente
autenticato, e con **output validato** (tipi e limiti) prima di ripassare all'LLM.

| Tool | Cosa restituisce | Fonte dati |
|---|---|---|
| `statoOrdini` | Elenco ordini del cliente (num, data, stato, totale) con filtro opzionale per periodo/stato | `ordini_clienti` + layer stati |
| `dettaglioOrdine` | Righe (codice, nome, qta, prezzo), spedizione, indirizzo, totale | `ordini_clienti` / view Integra |
| `statoSpedizione` | Stato consegna / data prevista se presente | campo stato ordine (attesa/confermato/inoltrato/evaso) |
| `ricercaArticoli` | Top-N per ricerca testuale/semantica (riusa embedding esistenti), con disponibilità | motore Blocco 5/13 |
| `schedaArticolo` | Descrizione, colori, varianti, prezzo **del listino cliente**, disponibile/non | layer listini + giacenza |
| `giacenzaVariante` | "disponibile / non disponibile" (+ quantità solo se il cliente può vederla per il carrello) | giacenza Integra |
| `scadenzeCliente` | Ordini in attesa di conferma, coupon assegnati in scadenza (`validTo`), scadenza listino se presente | coupon, ordini, listini |
| `faq` | Risposte da knowledge base strutturata (minimo d'ordine, spedizioni, modalità ordine, resi, pagamenti) | `knowledge_base` (nuova) o file di configurazione versionato |
| (v2) `assistenzaContatto` | Apre richiesta di supporto / rimanda al contatto Luis | — |

Regole:
- **Prezzi IVA esclusa** (regola di progetto) e mai modificati dall'LLM.
- Giacenza esposta al cliente solo come "disponibile / non disponibile" (regola funzionale).
- L'LLM può **comporre la frase**, evidenziare link (ordine #, scheda articolo), ma i valori
  numerici derivano dai tool.

---

## 4. Proattività ("segue il cliente")

- **Entry point**: FAB "AI" (icone coerenti col design), sempre disponibile, con **badge**
  mostrato solo se utile (es. ≥1 ordine in attesa, coupon in scadenza nei prossimi 7 giorni).
- **Suggerimenti contestuali** per pagina (leva sul `ProductContext` già usato altrove):
  - pagina ordine → "Vuoi sapere quando è stato inoltrato l'ordine #X?" ;
  - scheda articolo → "Questo articolo è disponibile?" ;
  - dashboard → "Riepiloga i miei ordini in attesa".
- **FAQ veloci** (chip) in zona dashboard/area cliente.
- Niente email/push proattivi fuori dall'app nella v1 (valutare in v2).

---

## 5. Architettura

```
Cliente (UI) ── FAB + pannello chat ──► POST /api/chatbot/messages
                                            │
                                            ▼
                                  ChatbotController (DTO, rate limit per utente)
                                            │
                                            ▼
                                  ChatbotService: loop function-calling
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                    LLM (Gemini         tool executor       thread/messaggi
                    o LM Studio)        (DB, auth sul         (persistenza,
                    prompt system +     customerId, output     costi in ai_usage)
                    tools JSON          validato)
```

- **Backend (NestJS)**: nuovo modulo `ChatbotModule`:
  - `ChatbotController` — route `POST /api/chatbot/messages`, `GET /api/chatbot/suggestions`,
    `GET /api/chatbot/threads/:id` (storico propri conversazioni).
  - `ChatbotService` — orchestrazione del loop tool-calling + persistenza.
  - `ChatbotToolsRepository` — i singoli tool (query parametrizzate, scoped `customerId`).
  - `LlmGateway` — astrazione sottile sul provider (Gemini HTTP come oggi; LM Studio
    OpenAI-compat per il Mini PC in LAN), configurabile via `.env` (`CHATBOT_PROVIDER`,
    `CHATBOT_MODEL`). Riuse il pattern di `embedding.service.ts`.
- **Frontend (Next.js)**: componente riusabile `AiChat` (unico solo, come `PositionedImage`):
  drawer laterale (mobile 375px ok), FAB con badge, chip suggerimenti, lista messaggi con
  timestamp, errori tradotti, stati caricamento/vuoto/errore gestiti, `r.ok` prima di `r.json()`.
  Nel **pannello admin resta fuori** (i tool sono del cliente; l'admin ha già il Blocco 14).
- **Provider**: partire da **Gemini function-calling** (piano a pagamento già attivo, DPA
  favorevole per dati non anagrafici). LM Studio locale è un'alternativa senza trasmissione
  esterna ma con qualità tool-calling inferiore: impostarla come opzione configurabile, non
  default.

---

## 6. Modello dati (additivo, migration versionate)

```prisma
model ChatbotThread {
  id         Int      @id @default(autoincrement())
  customerId Int                            // proprietà: solo il cliente autenticato
  title      String
  createdAt  DateTime @default(now()) @map("creato_il")
  updatedAt  DateTime @updatedAt @map("aggiornato_il")
  messages   ChatbotMessage[]
  @@map("chatbot_thread")
}

model ChatbotMessage {
  id         Int      @id @default(autoincrement())
  threadId   Int
  role       String   // user | assistant
  content    String
  toolCalls  Json?    // { tool, argomenti, esito } per audit/riepilogo
  createdAt  DateTime @default(now()) @map("creato_il")
  @@index([threadId])
  @@map("chatbot_message")
}
```

- `ai_usage` (esistente) traccia il costo per sessione (`tipo='chatbot'`).
- **Retention**: conversazioni cliente 12–24 mesi con job di pulizia (allineata a
  `CUSTOMER-TRACKING.md`); accesso solo al proprietario e agli admin.
- Nessun dato personale in più del necessario: `title` è un riassunto generato (opzionale).

---

## 7. Flusso conversazione (max 5 passi)

1. `POST /api/chatbot/messages` → DTO (whitelist: `threadId?`, `testo` con max lunghezza) →
   rate limit per utente (riusa il `getTracker` `user:<id>` attivo) → recupera/convalida thread
   (proprietà `customerId`).
2. **Costruzione contesto**: identità minima (`cliente #id`, `listino`), eventuale contesto di
   pagina, domande disponibili → prompt di sistema con le regole del §2.
3. **Loop function-calling**: invoca LLM con tools JSON; se richiede un tool → esegue il tool
   (auth scoped, output validato) → recap → ripete **fino a max 6 turni tool**; a fine loop
   risposta finale. Su errore del tool → messaggio onesto, niente fallback creativo.
4. **Persistenza**: salva `ChatbotMessage` (user e assistant), log costi in `ai_usage`.
5. **Risposta**: testo + riferimenti renderizzati come link (es. ordine #10432 → pagina ordine,
   codice articolo → scheda), frase di trasparenza se necessario.

---

## 8. Sicurezza e privacy

- **Autorizzazione dati** (A01): ogni tool riceve `customerId` dalla sessione e filtra; nessun
  endpoint amministrativo raggiungibile (già separati i layer cliente/admin).
- **Rate limit**: applica il throttling per utente già configurato (limite tollerante per chat);
  validazione input a confine con DTO.
- **Sanitizzazione output**: il testo risposto dall'LLM è **escapato** prima del render,
  niente HTML/JS (XSS). Metadata tool resi come componenti React, non markup dal modello.
- **Privacy**: minimizzazione (mai anagrafiche verso LLM), informativa aggiornata, registro
  trattamenti con la voce "assistente AI", retention conversazioni. Rispettare i punti
  `ANALISI_DATI_LLM_GDPR_AIAct.md` (piano a pagamento + DPA; avviso che è IA).
- **Log**: loggare accessi/errori del chatbot senza contenuto sensibile; mai testo conversazione
  nei log.

---

## 9. UX

- FAB "AI" in basso a destra; pannello drawer 360–420px (full-width su mobile), header con
  badge "Assistente AI" e bottone chiudi.
- Chip di domande rapide (contestuali alla pagina), input con placeholder, invio con Enter/tasto.
- Messaggi: bubble utente/assistente, timestamp, link ai contenuti reali, indicatori di
  "sto scrivendo"; errori mostrati come frase tradotta (`tServer`).
- Microcopy AI Act: "Assistente AI — le risposte possono essere imprecise. Verifica sempre i
  dati nei tuoi ordini e articoli."
- Target CWV rispettati (il pannello è renderizzato solo a apertura, import dinamico del
  componente).

---

## 10. Fuori scope v1

- Azioni in chat (creare/annullare ordini, modificare profilo, applicare coupon).
- Notifiche push/email proattive (v2).
- Multilingua (v2, l'inglese server-side è già pronto nei messaggi).
- Esportazione conversazioni / integrazione MCP del chatbot (v2).

---

## 11. Criticità e assunzioni

- **[DA DEFINIRE]** Fonte univoca di "scadenze": assumo *stato ordine `attesa`* + *coupon con
  `validTo`* + *eventuale scadenza listino*; da validare coi dati reali Integra.
- **Tool-calling con dati reali**: serve una prova con prompt reali prima della v1 completa
  (replicare il pattern del "test anteprima" dei box, dry-run senza scrivere thread).
- La giacenza resta "disponibile / non disponibile" per il cliente; il prezzo è sempre dal
  listino cliente, IVA esclusa.
- Costi agentici (più chiamate per conversazione): monitorare `ai_usage` e, se serve, limite
  messaggi/sessione.

---

## 12. Piano di sviluppo (5 passi)

1. **Backend core**: modello `ChatbotThread`/`ChatbotMessage` + migration + modulo NestJS con
   tool `statoOrdini`, `dettaglioOrdine`, `statoSpedizione`, `scadenzeCliente`, `faq`.
2. **Tool articoli/listino**: riuso del motore di ricerca/embedding e del layer listini/giacenza
   (`schedaArticolo`, `ricercaArticoli`, `giacenzaVariante`).
3. **Frontend**: componente `AiChat` + FAB/badge + suggerimenti contestuali per pagina.
4. **Collaudo**: sessione reale per cliente di test, verifiche 429/errore/limiti, WCAG a 375px,
   audit sicurezza (revisore) e GDPR.
5. **Hardening**: monitoraggio costi, retention, trasparenza AI, aggiornamento `ANALISI_...` e
   informativa.