# Specifica — Qualifica Lead con AI (Richiesta Accesso dalla Vetrina)

**Versione:** bozza 1.0
**Oggetto:** quando arriva una richiesta di accesso B2B dal sito pubblico, il
sistema fa un'**indagine automatica** (web + AI) per raccogliere il maggior
numero di informazioni sull'azienda, produce un **report di sintesi** con
**giudizio qualitativo a tre voci** e lo spedisce a `shop@luisbg.it` con un
**pulsante di approvazione** che, di lì a poco, crea il cliente in Integra
(Excel di import), lo importa nel B2B e genera l'invito.

> **Nota:** nessuna funzione di investigazione/esistenza web-search nel codebase
> attuale (verificato per grep). Il modulo è nuovo; riusa inviti, sync, export
> Excel e tracking AI già esistenti.

---

## 1. Flusso end-to-end

```
1. Visitatore   compila "Richiedi accesso" su www.luisbg.it
2. Vetrina      POST /api/v1/leads (o /api/auth/pubblico/richiedi-accesso)
                → salva Lead (stato NUOVO), risponde 201 subito (async)
3. LeadService  invoca IndagineService (Gemini + Google Search grounding)
                → raccoglie: anagrafica, P.IVA, sede, telefono, sito, email,
                  attività, presenza web, segnali di rischio
4. LeadService  valuta i segnali → verdetto: SCARTARE | VERIFICARE | BUONO
5. MailService  invia a shop@luisbg.it:
                - report di sintesi (HTML inline + PDF allegato)
                - pulsante Approva / Verifica / Scarta (link firmati, single-use)
6. Shop         clicca "Approva"
                → LeadService.creaCliente(lead):
                  a. genera .xlsx anagrafica sul tracciato Integra
                     (cartella monitorata, come export-ordini)
                  b. marca lead APPROVATO
7. AGOMIR       importa l'Excel in Integra → nasce il soggetto cliente
8. SyncManager  syncClienti() (già schedulata) → integra_clienti
                → importaClienti(codice) → customers (ruolo CLIENTE)
9. Automatismo  a import avvenuto: invita() → email invito + password provvisoria
                → cliente può accedere al B2B
```

## 2. Modello dati (additivo)

```
Lead                          // richiesta di accesso dalla vetrina
  id, createdAt
  nome, cognome?, ragioneSociale, email, telefono, cellulare?,
  partitaIva?, codiceFiscale?, sitoWeb?, indirizzo?, cap?, citta?, provincia?,
  messaggio?
  stato          NUOVO | IN_VALUTAZIONE | APPROVATO | SCARTATO | SOSPESO
  verdetto       SCARTARE | VERIFICARE | BUONO | null   (giudizio AI)
  reportJson     jsonb        // segnali raccolti, fonti, citazioni URL
  indagineA    timestamp?     // ultima indagine
  approvatoDa    int? → users.id
  approvatoIl    timestamp?
  tokenAzione    text? unique  // hash del token firmato per il pulsante mail
  customerId     int? → customers.id   // una volta creato

LeadEvent                       // append-only: indagini, cambi stato, click
  id, leadId, tipo, dettagli json, createdAt
```

Estensione a `Customer`: `leadId int?` (traccia provenienza; serve per
l'automatismo dell'invito — §6).

## 3. Indagine automatica (AI + web)

**Provider:** Gemini `gemini-2.5-flash`/`gemini-2.5-flash-pro` con **Google Search
grounding** (`google_search` tool) — l'API Gemini può navigare il web e citare
fonti. Se la configurazione non lo permette, fallback = indagine solo sui dati
dichiarati (verdetto più conservativo: VERIFICARE).

**Cosa verifica (in ordine di affidabilità):**

| Segnale | Come | Peso |
|---|---|---|
| Partita IVA | ricerca web (registro imprese, siti terzi), coerenza con ragione sociale | alto |
| Sito web | esistenza, contenuti coerenti con l'attività dichiarata (fiorista/garden/vasi) | alto |
| Ragione sociale | presenza web (P.IVA, nome azienda su directory, social) | medio |
| Email | dominio coerente con sito/azienda;Disposable/temp domains → rischio | medio |
| Telefono | formato italiano, presenza su directory | basso |
| Indirizzo | coerenza CAP/città/provincia | basso |
| Messaggio | spam/irrilevanza | basso |

**Vincoli (non negoziabili):**
- **Mai** dati personali sensibili nei prompt oltre a quelli necessari all'indagine.
- Ogni affermazione del report porta la **fonte (URL)** o è marcata "non verificato".
- Timeout indagine (es. 20s): scade → stato `IN_VALUTAZIONE`, retry manuale.
- Ogni chiamata Gemini tracciata via `AiUsageService.record({ tipo: 'lead_indagine', ... })`
  (già esiste, prezzi da `site_config`).

## 4. Verdetto a tre voci (definizioni operative)

| Verdetto | Significato | Azione sistema |
|---|---|---|
| **BUONO** | tutti i dati essenziali confermati (P.IVA coerente + sito attivo o presenza web solida + email non usa-e-getta) | pulsante "Approva" in primo piano |
| **VERIFICARE** | dati parziali o ambigui: serve approfondimento specifico **attraverso uno dei canali indicati** (cellulare, email, telefono) | pulsante "Approva" + checklist di verifica con i canali |
| **SCARTARE** | dati chiaramente fake (P.IVA inesistente, dominio temporaneo, sito inesistente, nome azienda assente ovunque) | suggerimento "Scarta" in evidenza; approvazione ancora possibile ma richiede conferma esplicita |

**Regola di sicurezza (fail closed):** se l'indagine non riesce o Gemini non è
raggiungibile → `VERIFICARE`, mai `BUONO`. L'AI propone, l'umano decide: il
pulsante di approvazione è sempre disponibile, mai automatico.

## 5. Mail a shop@luisbg.it

Template `lead-segnalazione.html` (da aggiungere a `backend/src/mail/templates/`),
stile `email-notifica-ordine-interna.html`:

- Intestazione: "Nuova richiesta accesso B2B — <ragioneSociale>"
- Dati del lead (anagrafica, P.IVA, contatti, messaggio)
- **Report di sintesi** con segnali, fonti e verdetto a tre voci
- **Pulsanti** (link firmati, §7): Approva · Verifica · Scarta
- Link admin alla scheda lead (se loggati)

Il **report completo** è anche allegato in PDF (generazione via `sharp`/`exceljs`
no — meglio: HTML→PDF con `@react-pdf` o semplice HTML ben formattato; ponytail:
v1 = report HTML inline + JSON scaricabile, PDF solo se richiesto).

## 6. Automazione Integra → B2B → invito

**Catena esistente (riuso):**

1. `LeadService.creaCliente(lead)` genera `.xlsx` sul tracciato anagrafica
   clienti Integra, nella **cartella monitorata** (`EXPORT_ORDINI_DIR`-style:
   `IMPORT_CLIENTI_DIR`). **Ponytail:** riusa `export-ordini.service.ts` come
   modello (ExcelJS, nome temporaneo → rename, marcatura).
2. AGOMIR importa in Integra → soggetto cliente con `codice_cliente`.
3. `SyncService.syncClienti()` (già schedulata ogni 15 min via `sync_config`)
   aggiorna `integra_clienti`.
4. `importaClienti([codice])` (già esistente) crea `customers` con
   `codiceCliente`, `codiceListino`, indirizzi.
5. **Novità:** a import avvenuto, se `customer.leadId` è valorizzato e
   `invitatoAt` è null → `invita()` automatico (password provvisoria + email).
   L'invito automatico si applica **solo** ai clienti nati da lead approvati
   (flag `leadId`), mai a tutti gli importati.

**Tracciato Excel clienti:** il formato di import anagrafica **non è nel repo**
(ordinì lo è, clienti no). **Da concordare con AGOMIR** (§8, blocca Fase 2).

## 7. Sicurezza (OWASP Top 10:2025)

- **A01:** i link dei pulsanti sono **token HMAC-SHA256** (`leadId + azione + scadenza`),
  **single-use** (marcato usato in `LeadEvent`), **TTL 7 giorni**, azione
  registrata in audit con IP. Nessuna sessione richiesta: il token *è* l'autorità.
- **A02:** endpoint pubblico con **rate limit dedicato** (es. 3/min/IP) + honeypot
  anti-spam; reCAPTCHA v3 opzionale.
- **A04:** token azione salvato solo come hash; report senza dati sensibili extra.
- **A05:** DTO `class-validator` + whitelist su `POST /leads`; URL dei pulsanti
  generati server-side (nessun `next`/`url` parametrizzabile dal client).
- **A07:** retry dell'indagine rate-limited; `AiUsageService` traccia i costi.
- **A09:** ogni evento (indagine, click, approvazione, import, invito) in
  `audit_log`/`LeadEvent`; mail di scarto non inviata al lead.
- **A10:** l'AI non decide accessi: propone un verdetto; l'approvazione è
  sempre umana (fail closed §4).

## 8. Punti aperti / da concordare

| # | Punto | A chi | Blocca? |
|---|---|---|---|
| 1 | **Tracciato Excel import anagrafica clienti** (colonne, formato date, cartella monitorata) | AGOMIR | **sì** (Fase 2) |
| 2 | Google Search grounding disponibile sulla `GEMINI_API_KEY` in uso (o piano a pagamento)? | admin/tecnico | no (fallback VERIFICARE) |
| 3 | Verifica P.IVA dedicata (API registro imprese/Indice PA) o solo web search? | amministrativo | no |
| 4 | PDF del report: serve davvero o basta HTML inline? | shop@ | no |
| 5 | Il lead è un *nuovo* cliente o un cliente Integra esistente che chiede l'accesso? (match su P.IVA/email in `integra_clienti` → se esiste già, salta la creazione e va diretto all'invito) | prodotto | no (v1: check P.IVA, se match → VERIFICARE con nota "cliente già in Integra") |

## 9. Piano a fasi

| Fase | Contenuto | Deliverable | Stima |
|---|---|---|---|
| **1 — Fondamenta** | modelli `Lead`/`LeadEvent` + migration; `POST /leads` pubblico + rate limit; DTO; template `lead-segnalazione.html`; registrazione eventi | lead salvato + mail grezza a shop@ | 2 gg |
| **2 — Indagine AI** | `IndagineService` (Gemini + search grounding, timeout, fallback); segnali; `AiUsageService.record`; report HTML | report con fonti | 2–3 gg |
| **3 — Verdetto + pulsanti** | logica verdetto a tre voci; token HMAC single-use + TTL; endpoint azioni `POST /leads/:id/azioni/:verdetto?token=`; audit | approvazione dalla mail | 2 gg |
| **4 — Excel Integra** | generatore `.xlsx` anagrafica (pattern export-ordini); `IMPORT_CLIENTI_DIR` | Excel pronto per AGOMIR | 1–2 gg *(dipende da §8.1)* |
| **5 — Automazione invito** | `leadId` su Customer; post-import invito automatico; verifica match cliente esistente | catena completa | 1–2 gg |
| **6 — Hardening** | rate limit, spam, collaudo end-to-end con lead di test, dashboard lead in admin (opzionale) | produzione | 1–2 gg |

**Totale: ~9–13 gg** (di cui 2–3 gg bloccati su AGOMIR per il tracciato).

## 10. Collaudo

- Lead di test con P.IVA reale, P.IVA fake, dominio usa-e-getta: verificare i
  tre verdetti attesi.
- Doppio click sul pulsante: il secondo deve fallire (token consumato).
- Token scaduto (forzare TTL breve in test): 410 Gone.
- `AiUsage.record` presente in `ai_usage` con `tipo='lead_indagine'`.
- Simulazione import: cliente in `integra_clienti` con `leadId` → invito
  automatico (verificare `invitatoAt` e mail in `TEST_EMAIL`).

---

## Riferimenti

- `backend/src/customers/customers.service.ts` — `create`, `invita` (password provvisoria + email).
- `backend/src/integrazione/integrazione.service.ts` — `importaClienti(codici)` (`:2772`).
- `backend/src/integrazione/sync.service.ts` — `syncClienti()` (`:421`), `SyncManagerService` (schedulazioni da `sync_config`).
- `backend/src/export-ordini/export-ordini.service.ts` — pattern export Excel verso cartella monitorata (ExcelJS, tmp→rename, marcatura idempotente).
- `backend/src/mail/mail.service.ts` — template-based (`MAIL_TEMPLATES_DIR`), `sendNotificaOrdineInterna` (mail a `shop@luisbg.it`).
- `backend/src/mail/templates/` — prototipi email (`email-notifica-ordine-interna.html`, `invito.html`, `ordine-conferma.html`, `password-reset.html`): riferimento di stile per `lead-segnalazione.html`.
- `backend/src/ai-usage/ai-usage.service.ts` — `record()` tracking costi AI.
- `backend/src/integrazione/embedding.service.ts` — pattern chiamata Gemini (`x-goog-api-key`).
- `backend/src/integrazione/catalogo-public.controller.ts` — pattern controller pubblico (flag `.env`, filtro campi).
- `specifica-sito-vetrina.md` — form "Richiedi accesso" (Fase 4).
- `specifica-api-dropshipping.md` — partner API (contesto terze parti).
- `backend/prisma/ordini-fdw-spec.md` — tracciato ordini Integra (modello per il tracciato clienti).
