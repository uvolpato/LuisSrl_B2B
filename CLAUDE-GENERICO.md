# CLAUDE.md — Regole operative di sviluppo (generiche)

Regole universali, valide in ogni sessione. Il dettaglio tecnico è in `SKILLS.md`
(caricare solo quando serve — progressive disclosure). Questo file resta corto
di proposito: oltre le ~200 istruzioni l'aderenza degrada.

## Stile di risposta
- Sintetico sempre: risposte brevi, niente riepiloghi lunghi né opzioni non richieste.
- Codice prima, spiegazione dopo (max 3 righe). Un consiglio alla volta.

## Metodo di lavoro
- Un blocco alla volta; a fine blocco: cosa è stato fatto, come provarlo, attendi OK.
- Gerarchia delle fonti in conflitto: specifica > prototipo > conversazione; la decisione dell'utente in chat vince su tutto.
- Criticità o ambiguità → fermarsi e chiedere, non inventare.
- Prima di codice nuovo: piano sintetico (max 5 passi), attendere approvazione.
- Non toccare ciò che funziona: refactoring e "miglioramenti" non richiesti si propongono, non si applicano.
- Azioni irreversibili (cancellare dati/file, deploy, invii esterni, reset): consenso esplicito prima.
- Correggere la causa, non il sintomo: prima di toccare una funzione, controllare tutti i chiamanti.
- Dati di test: chi li crea li dichiara e lascia lo script per ricrearli.
- Regole di stile: le fa rispettare il linter/formatter, non vanno scritte qui né discusse.

## Definition of Done
Compila (type-check/build) · verificato davvero (API con sessione reale, UI nel browser a viewport reale) · committato pulito (conventional commits, diff letto per intero) · esito dichiarato onestamente, incluso ciò che non si è potuto verificare.

## Processi e ambiente
- Server dev in terminali chiusi o job in background muoiono: usare finestre/servizi persistenti.
- "Non funziona più niente" = prima verifica: processi vivi? porte in ascolto? poi il codice.
- Non rigenerare artefatti (client ORM, build) mentre il processo che li usa gira (lock file).
- Un server di produzione serve la build vecchia: per verificare modifiche serve il dev server.

## Più agenti in parallelo
- Un'area/feature per agente, confini a livello di file; refactoring globali mai in parallelo.
- Isolamento preferito: un git worktree/branch per agente; 2-3 agenti max, oltre si è colli di bottiglia sulla review.
- Mai kill globali dei processi (uccidono i server degli altri): solo per PID/porta.
- Rileggere un file prima di modificarlo se un altro può averlo toccato; un "bug" improvviso è spesso l'ambiente cambiato da un altro agente.
- Working tree pulito a fine sessione; migration/seed del DB governate da un agente per volta.
- Convergenza su un branch di integrazione: merge + test lì, poi su main; riconciliazione fatta da uno solo.

## Database
- Mai operazioni distruttive (reset, drop, push con perdita dati) senza consenso esplicito.
- I sync di schema droppano ciò che non conoscono: per oggetti creati a mano, migration additive (`IF NOT EXISTS`).
- Ogni dato/oggetto creato a mano nel DB ha uno script idempotente versionato: se non è nel repo, è già perso.
- Migration fallita a metà blocca le successive: lo stato delle migration è la prima diagnosi.

## Sicurezza (minimo sempre attivo — dettagli in SKILLS.md §4)
- Segreti solo da variabili d'ambiente; `.env` mai versionato, `.env.example` aggiornato.
- Autorizzazione verificata server-side sui dati, non solo sulle route (OWASP A01).
- Validazione input al confine; query parametrizzate; sanitizzare ciò che tocca filesystem/HTML.
- Mai dati sensibili nei prompt AI, nei log o in servizi esterni.

## Riferimenti
- `SKILLS.md` — competenze tecniche di dettaglio (frontend, backend, sicurezza OWASP 2025, test, multi-agente, integrazioni).
- In un progetto reale aggiungere qui sopra: comandi esatti (build/test/lint/run), mappa della codebase, stack — sono la sezione a più alto valore.
