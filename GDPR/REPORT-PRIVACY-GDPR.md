# Report privacy / GDPR — Portale B2B Luis

> Analisi tecnica del codice, non parere legale. Da validare con consulente privacy.
> Data: novembre 2026 · Ambito: `backend/`, `frontend/` (portale), `frontend-vetrina/` (sito), schema Prisma, documenti privacy esistenti.

---

## 1. Quadro dei trattamenti (stato reale del codice)

| Trattamento | Dove | Base giuridica dichiarata |
|---|---|---|
| Account clienti, anagrafica, ordini | `backend/src/customers`, `ordini` | contratto + obbligo di legge |
| Tracciamento comportamentale (pagine, scroll, ricerche, IP) | `frontend/components/area/Tracker.tsx` → `backend/src/events` | legittimo interesse |
| Profilazione AI cliente + ricerca web | `backend/src/customer-profile`, `dati-impresa` | legittimo interesse |
| Ricerca AI testo/foto | `backend/src/integrazione` (Gemini) | contratto |
| Lead da form vetrina + indagine AI | `backend/src/leads` | precontratto + legittimo interesse |
| Marketing cataloghi (Brevo) | `backend/src/cataloghi`, `brevo.service.ts` | **non dichiarata** |
| Log tecnici/audit | `backend/src/audit`, `common/access-log.interceptor.ts` | legittimo interesse |

---

## 2. Criticità — priorità alta (da chiudere prima del go-live)

> Analisi di dettaglio di questi punti: `CRITICITA-ALTE-DETTAGLIO.md`.

| # | Problema | Prova | Correzione |
|---|---|---|---|
| **P1.1** | **Contatti personali dei clienti inviati a Google Gemini.** Il prompt di profilazione include `EMAIL: …; TELEFONO: …` e chiede di generare `contattiChiave` (nomi/ruoli). Contraddice l'informativa («nessun dato anagrafico verso l'AI»). | `customer-profile.service.ts:338` e `:357` | Togliere il blocco `Contatti:` dal prompt e non chiedere nomi di persone (`contattiChiave: []`). È la correzione più importante e costa 3 righe. |

> **P1.1 — corretto in codice (13/11/2026):** recapiti fuori dal prompt, referenti solo con `fonte` (URL) e stato `da-verificare`, filtro server `filtraReferentiPubblici`, script di pulizia `backend/scripts/reset-referenti-web.cjs`. Resta da eseguire lo script, rigenerare i profili e controllare il primo output reale.
>
> **P1.2–P1.6 — implementati in codice (13/11/2026):** informativa del portale con prova di presa visione (`privacyVersione`/`privacyAccettataIl`, modale al primo accesso, pagina `/privacy`); opposizione al tracciamento con effetto immediato (`trackingOptOut`, toggle nel profilo, esclusione dai segnali AI); pseudonimizzazione del referente (`datiPersonaliRimossiIl`, azione admin, guardia su ordini e sull'import da gestionale); log con retention 90/180/730 giorni, URL senza querystring, token redatti, email in HMAC; marketing con fonte del consenso obbligatoria, esclusione degli invii senza base e lista di esclusione alimentata dal webhook Brevo. Migration `20261113000000_privacy_gdpr` applicata. Verificato con API reali e browser; cron di retention non eseguito (gira alle 04:00).
>
> Restano aperti solo gli adempimenti documentali e le decisioni del Titolare (vedi §5).
>
> **P2 — stato (13/11/2026):** export dati per accesso e portabilità (JSON dal pannello Clienti, senza credenziali né token), invito con **link monouso** (token in hash, 7 giorni, pagina `/attiva`), **verifica in due passaggi via email** per gli admin (codice 6 cifre, 10 minuti, 5 tentativi, dispositivi fidati 90 giorni), dichiarazione di titolarità nel form vetrina, retention separata del testo delle ricerche (6 mesi), `sessionToken` salvato in hash, fine rapporto definita su Integra con pulizia automatica di profilo e sintesi AI, informativa aggiornata su fonte dei referenti, provider dati impresa e corrieri, specifica backup per il sistemista, fac-simile di nomina e istruzioni per gli autorizzati.
| **P1.2** | **Il portale B2B non mostra alcuna informativa.** Non esiste pagina `/privacy` in `frontend/app`, nessun link, nessuna accettazione: sul `Customer` non esistono campi privacy (esistono solo sul `Lead`). La vetrina però dichiara «informativa specifica mostrata al primo accesso» → affermazione oggi falsa. | `prisma/schema.prisma` (Customer), `frontend-vetrina/src/app/privacy/page.tsx:102` | Aggiungere `privacyVersione` + `privacyAccettataIl` su `Customer`, pagina informativa versionata, modale al primo login, link in profilo/footer. |
| **P1.3** | **Diritto di opposizione al tracciamento non esercitabile.** Il Tracker parte sempre per ogni cliente loggato; `EventsService.track` non controlla nulla. L'informativa promette l'opposizione. | `Tracker.tsx`, `events.service.ts:18-27` | Flag `trackingOptOut` sul `Customer`, rispettato in `track()`/`trackBatch()`, con toggle nel profilo. |
| **P1.4** | **Cancellazione non efficace.** `importaClienti()` ricrea il cliente da Integra per `codiceCliente` dopo un delete; e cancellare davvero distrugge la prova fiscale degli ordini. | `integrazione.service.ts:2853`, `customers.service.ts:383` | Definire la cancellazione come **anonimizzazione** dei campi personali + blocco + flag `anonimizzatoIl` che l'import salta; conservare solo ordini/azienda per obblighi fiscali. Documentarlo nell'informativa. |
| **P1.5** | **Log di audit conservati per sempre e con PII.** `http.access` salva l'URL completo (incluse query string di ricerca), più email dei login falliti e IP. Nessun job di retention. | `access-log.interceptor.ts:42`, `audit.service.ts:52` | Cron di retention (es. 12 mesi; 24 per eventi di sicurezza), URL senza querystring, e non salvare l'email nei log di login fallito oltre il necessario. |
| **P1.6** | **Marketing Brevo senza prova di consenso.** `DownloadLink`/`Mailing` non hanno campi consenso; l'admin importa email da file Excel. L'unsubscribe c'è (buono), ma manca la base. | `cataloghi-admin.service.ts:220-237`, `schema.prisma` (DownloadLink) | Campi `consensoMarketing` + `fonte`/data; import che richiede di dichiarare la fonte; per i clienti esistenti usare il soft opt-in (prodotti analoghi) documentato; esclusione automatica di chi non ha titolo. |

---

## 3. Criticità — priorità media

| # | Problema | Correzione |
|---|---|---|
| P2.1 | Referenti/contatti di terzi nel CRM: nessuna informativa art. 14 (dati non raccolti presso l'interessato) | Clausola «dati ottenuti da Integra, fonti pubbliche e segnalazione del cliente» + obbligo del cliente di informare i propri referenti |
| P2.2 | Profilo AI: nessun diritto di accesso/opposizione, nessun campo, nessuna cancellazione alla cessazione del cliente | Endpoint admin di consultazione + cancellazione nel job di chiusura rapporto |
| P2.3 | Password provvisoria in chiaro via email, nessun MFA per gli admin, `sessionToken` in chiaro su DB | Link monouso invece della password in email; MFA admin; token hashato (art. 32) |
| P2.4 | Backup: schedulazione sì, ma retention, cifratura e test di restore non definiti (e `[DA COMPLETARE]` in informativa) | Definire retention (es. 30 giorni + mensili), cifratura del dump, un restore di prova documentato |
| P2.5 | Nessun export dati per portabilità | Export JSON/CSV per cliente (dati account, ordini, contatti) dal pannello admin |
| P2.6 | Il form pubblico accetta dati di un referente terzo senza dichiarazione | Checkbox «dichiaro di avere titolo a fornire i dati di questa persona» |
| P2.7 | `DELETE /customers/:id` esposto senza salvaguardia dei dati fiscali | Bloccare in presenza di ordini/documenti contabili (solo anonimizzazione) |
| P2.8 | Testo libero delle ricerche salvato 18 mesi negli eventi | Va bene se dichiarato; valutare 6-12 mesi e non mostrarlo a chi non serve |
| P2.9 | `DATI_IMPRESA_API_URL` (fornitore P.IVA) non citato in informativa | Aggiungere ai destinatari e nominare responsabile |
| P2.10 | Vettori/corrieri ricevono indirizzo e telefono ma non sono nell'elenco destinatari | Aggiungere e nominare responsabile del trattamento |

---

## 4. Criticità — priorità bassa

- Cookie policy solo sulla vetrina: manca quella del portale (che usa `luis.sid` 8h + `lang` 12 mesi — tecnici, nessun banner necessario).
- `[DA CONFERMARE]` sul contatto privacy (`contatti@luisbg.it` vs `shop@luisbg.it`).
- Contatto di assistenza/manutenzione IT: se accede al DB va nominato responsabile.
- Etichette AI e badge: già a posto (AI Act art. 50); manca la formazione (art. 4).

---

## 5. Burocrazia extra per mettersi in regola

Nessuna registrazione preventiva al Garante, nessun DPO obbligatorio. Serve questo, con prova archiviata:

1. **Registro delle attività di trattamento (art. 30)** — tenetelo: l'esenzione <250 dipendenti non si applica (trattamenti non occasionali + AI + profilazione). Una tabella per trattamento con finalità, base giuridica, categorie, destinatari, trasferimenti, retention, misure.
2. **Nomine a responsabile (art. 28)** per: Google/Gemini (accettare il Cloud DPA e conservarne prova), Brevo, Microsoft 365/posta, AGOMIR/Integra, provider dati impresa, hosting/Caddy e tunnel, consulente IT. Verificare DPF/SCC per USA.
3. **Autorizzati interni (art. 29)**: elenco nominativo con istruzioni scritte e ruoli/permessi coerenti (admin, commerciale, amministrazione).
4. **LIA — bilanciamento del legittimo interesse** per: tracciamento comportamentale, profilazione AI, indagine automatica sui lead, log di sicurezza. Un documento per ciascuno con salvaguardie e diritto di opposizione.
5. **DPIA (art. 35)**: fate almeno lo screening scritto; con tracciamento sistematico **e** AI siete a due criteri EDPB → la DPIA completa è fortemente consigliata. Se decidete di no, motivate.
6. **Retention policy scritta** allineata al codice (eventi 18 mesi, lead 12, ordini 10 anni, log/backup da definire) e verifica che i cron girino.
7. **Procedura diritti (artt. 15-22)**: canale, verifica identità, risposta entro 1 mese, modelli, registro delle richieste.
8. **Procedura data breach (artt. 33-34)**: rilevazione, valutazione, notifica al Garante entro 72h, registro violazioni, comunicazione agli interessati se rischio elevato.
9. **Informativa portale + cookie policy portale**, versionate e allineate a `PRIVACY_VERSIONE`.
10. **Marketing**: consenso o soft opt-in documentato, unsubscribe attivo (c'è), lista di esclusione.
11. **AI Act**: inventario dei sistemi AI, formazione del personale (art. 4, già in vigore), valutazione di rischio minimo documentata.
12. **Sicurezza art. 32**: MFA admin, backup cifrati con restore testato, revisione accessi, gestione revoca account, aggiornamenti.
13. **Valutazione DPO**: una riga scritta che motiva la non obbligatorietà (già affermato, ma non documentato).

---

## 6. Ordine di lavoro consigliato

- **Fase 1 (prima di andare in produzione):** P1.1 (3 righe di codice), P1.2, P1.3, P1.6 + registro art. 30, nomine art. 28, informativa del portale.
- **Fase 2 (30-60 giorni):** P1.4 procedura di anonimizzazione, P1.5 retention log, export/portabilità, LIA, DPIA, procedura breach, MFA e backup.
- **Fase 3:** AI Act (formazione + inventario), rifiniture P2/P3.

---

## 7. Documenti prodotti

| Documento | Contenuto | Stato |
|---|---|---|
| `REGISTRO-TRATTAMENTI.md` | Registro art. 30, 11 trattamenti | bozza |
| `LIA-LEGITTIMO-INTERESSE.md` | Bilanciamento per tracking, profilazione, lead, log | bozza |
| `DPIA-SCREENING.md` | Screening art. 35: 5 criteri su 9, DPIA consigliata | bozza |
| `NOMINE-RESPONSABILI.md` | Fornitori, stato nomine, trasferimenti | da firmare |
| `PROCEDURE-INTERNE.md` | Diritti, violazioni, retention, DPO | bozza |
| `COOKIE-POLICY-PORTALE.md` | Testo da pubblicare sul portale | da pubblicare |
| `AI-ACT-INVENTARIO.md` | Inventario sistemi AI e obblighi | bozza |
| `SPECIFICA-BACKUP.md` | Specifica per il sistemista (cifratura, restore, retention) | da consegnare |
| `NOMINA-RESPONSABILE-TEMPLATE.md` | Fac-simile nomina art. 28 | da firmare |
| `ISTRUZIONI-AUTORIZZATI-TEMPLATE.md` | Istruzioni art. 29 per il personale | da firmare |
| `word/` | Versioni Word con carta intestata Luis e modello `CARTA-INTESTATA-LUIS.docx` | pronte |
| `CRITICITA-ALTE-DETTAGLIO.md` | Analisi P1.1-P1.6 | aggiornato |

## 8. Limiti dell'analisi

- Nessuna ispezione del DB reale (volumi, efficacia dei cron, tabelle `integra_*`) né test in browser.
- Header di sicurezza del frontend e contratti dei fornitori non verificati.
- La qualificazione giuridica (DPIA obbligatoria sì/no, base del marketing, conservazione post-contratto) va confermata da un consulente privacy; P1.1 però è un fatto di codice e va corretto comunque.

---

*Prossimo passo concordato: un file per attività dentro questa cartella, così ogni punto è valutabile separatamente.*
