# SKILLS — Competenze generiche di sviluppo

Riferimento operativo di dettaglio, indipendente dal progetto. Complementa `CLAUDE.md`
(regole operative). Ogni skill: quando si applica → come si applica.
Standard di riferimento aggiornati: OWASP Top 10:2025, WCAG 2.2 AA, Core Web Vitals 2026.

---

## 1. Scrittura di codice migliore

### Semplicità (YAGNI)
- Prima di scrivere: serve davvero? esiste già nel codebase? lo fa la standard library? lo fa la piattaforma nativamente?
- Niente astrazioni speculative: nessuna interfaccia con una sola implementazione, nessuna config per valori che non cambiano.
- La soluzione più corta che funziona è quella giusta — dopo aver capito il problema, non al posto di capirlo.

### Leggibilità
- Nomi che dicono cosa/perché; il codice si spiega da solo, i commenti spiegano solo i vincoli non deducibili.
- Funzioni corte, un livello di astrazione per funzione; early return al posto di if annidati.
- Coerenza con il codice circostante: stesso stile, stessi idiomi, stessa densità di commenti.
- Lo stile meccanico (indentazione, quote, import) lo impone il formatter: mai farlo a mano o discuterlo.

### DRY con giudizio
- Un solo punto di verità per ogni logica condivisa (un componente, un helper, un CONFIG).
- Duplicare due volte è accettabile; alla terza si estrae.
- Refactoring solo a comportamento invariato: prima i test/verifiche, poi la pulizia.

### Gestione errori (OWASP A10:2025 — Mishandling of Exceptional Conditions)
- Fallire presto e rumorosamente in sviluppo; degradare con grazia in produzione.
- **Fail closed, non fail open**: un errore in un controllo di sicurezza deve negare, mai concedere.
- Mai inghiottire eccezioni in silenzio: log con contesto (cosa, input, dove).
- Le risposte di errore delle API non sono dati: controllarle sempre prima di usarle.
- Messaggi d'errore all'utente senza dettagli interni (stack, query, path): quelli vanno solo nel log.

---

## 2. Frontend

### Componenti
- Un componente = una responsabilità; stato il più in basso possibile, sollevato solo quando condiviso.
- Rendering condiviso (immagini, card, badge) in un unico componente riusato ovunque: mai due implementazioni "uguali".
- Editor/anteprime WYSIWYG: l'anteprima applica esattamente il valore salvato, senza ricalcoli.

### CSS
- Scope: tutto sotto una classe radice di pagina/modulo; nomi generici collidono.
- CSS condivisi importati nel layout radice (persistono su navigazione client).
- Layout: flexbox/grid; `min-width:0` sui figli di grid/flex che devono restringersi; unità relative.
- Tabelle: i `<td>` restano table-cell (flex rompe `vertical-align`).

### Responsive
- Mobile-first; breakpoint verificati con viewport reale (≈375px), non a occhio.
- La pagina non sfora mai lateralmente: contenuti larghi in wrapper `overflow-x:auto`; elementi nascosti con `display:none`, non `position:absolute`.
- Target touch ≥ 24×24px (WCAG 2.2) — meglio 44px; testo minimo 14px.

### Dati e stato
- `fetch`: controllare `r.ok` prima di `r.json()`; stato di caricamento, vuoto ed errore sempre gestiti in UI.
- Aggiornare la lista dopo ogni mutazione (refetch o aggiornamento ottimistico coerente).
- Debounce sulle ricerche; paginazione dove la lista può crescere.

### Accessibilità (WCAG 2.2 AA)
- HTML semantico prima di ARIA; `alt` sulle immagini, `label` sugli input, `aria-label` sui bottoni-icona.
- Navigazione da tastiera completa: focus visibile con contrasto ≥3:1, Escape chiude i modali, niente interazioni solo-drag.
- Contrasto testo/sfondo ≥ 4.5:1.

### Performance (Core Web Vitals 2026)
- Obiettivi p75: **LCP ≤ 2,5s · INP ≤ 200ms · CLS < 0,1**.
- Budget JS ≈ 400KB gzipped per pagina interattiva: import dinamici per moduli pesanti; controllare cosa entra nel bundle prima di aggiungere librerie.
- Immagini: dimensioni corrette per il contenitore, formato moderno (webp/avif), `loading="lazy"` sotto la piega, dimensioni dichiarate (evita CLS).
- Caching HTTP su asset e risposte stabili (Cache-Control/ETag).

---

## 3. Backend

### API
- REST coerente: risorse al plurale, verbi HTTP corretti, status code corretti (400/401/403/404/409/500).
- Validazione input al confine con DTO/schema: ogni campo dichiarato, il resto scartato — e sapere che la whitelist scarta in silenzio.
- Risposte lato utente filtrate per visibilità; mai esporre campi amministrativi o interni.
- Paginazione, filtri e ordinamento server-side dove i dati crescono.

### Database
- Query parametrizzate sempre; mai concatenare input nelle query.
- Migration additive e reversibili; mai sync distruttivi su DB con dati senza consenso.
- Ogni oggetto/dato creato a mano ha uno script idempotente versionato.
- Transazioni per operazioni multi-tabella; indici sulle colonne di ricerca/join.
- N+1: caricare le relazioni in una query (include/join), non in loop.

### Robustezza
- Timeout sulle chiamate esterne; retry solo su errori transitori.
- Idempotenza dove ha senso (import, upsert con chiave naturale).
- Log strutturati con contesto; niente dati sensibili nei log.

### Osservabilità
- Endpoint di health (`/health`) che verifica anche il DB.
- Log correlabili per richiesta (id richiesta o utente nel contesto).
- In produzione monitorare: errori 5xx, latenza, spazio disco, processi vivi.

### Dipendenze (OWASP A03:2025 — Software Supply Chain Failures)
- Prima di aggiungere una libreria: è mantenuta? quanto pesa? bastano poche righe fatte in casa?
- Lockfile sempre committato; install riproducibile (`npm ci` o equivalente).
- Audit dipendenze (`npm audit` o equivalente) periodico; attenzione a pacchetti con maintainer cambiati o typosquatting.
- Aggiornamenti minori regolari, major pianificati; pin delle versioni in CI/build.

---

## 4. Sicurezza (riferimento: OWASP Top 10:2025)

Ordine di priorità 2025: A01 Broken Access Control (include SSRF) · A02 Security
Misconfiguration · A03 Supply Chain · A04 Cryptographic Failures · A05 Injection ·
A06 Insecure Design · A07 Authentication Failures · A08 Software/Data Integrity ·
A09 Logging & Alerting Failures · A10 Mishandling of Exceptional Conditions.

### Autorizzazione (A01 — rischio n.1)
- Controllo sui **dati** oltre che sulle route: l'utente può vedere *questa* risorsa, non solo *questo tipo* di risorsa.
- Deny by default; ruoli/permessi verificati server-side; il frontend nasconde, il backend nega.
- URL/id indovinabili non sono un controllo di accesso; validare anche le richieste server-to-server (SSRF).

### Configurazione (A02 — in forte crescita)
- Niente default di fabbrica in produzione (credenziali, porte aperte, pagine di debug, error verbose).
- Header di sicurezza (Helmet o equivalente), CORS ristretto alle origini note.
- Superficie minima: servizi e porte non necessari spenti; backend/DB mai esposti direttamente.

### Autenticazione e sessioni (A07)
- Password: hashing forte (argon2/bcrypt), mai in chiaro da nessuna parte.
- Sessioni: cookie HttpOnly + SameSite + Secure (in produzione); mai token in localStorage.
- Rate limit sul login; lockout o backoff sui tentativi falliti.
- Dietro reverse proxy: trust proxy configurato, altrimenti i cookie Secure rompono il login.

### Input e output (A05)
- Validare tutto ciò che entra (tipo, lunghezza, formato); sanitizzare ciò che finisce in filesystem (path traversal), query (injection), HTML (XSS).
- CSRF sulle mutazioni con sessione cookie.
- Upload: whitelist di tipi/estensioni, limite di peso, nome file rigenerato.

### Segreti e dati
- Segreti solo da variabili d'ambiente; `.env` mai versionato, `.env.example` sempre aggiornato.
- Credenziali dedicate a privilegi minimi per ogni servizio (DB, integrazioni).
- Mai dati sensibili (credenziali, dati personali) nei prompt AI, nei log o in servizi esterni.

### Logging e allerta (A09)
- Loggare login falliti, cambi permessi, azioni admin, errori di validazione ripetuti.
- Un log che nessuno guarda non è un controllo: definire chi/cosa viene avvisato.

---

## 5. Verifica e qualità

### Prima di dire "fatto"
- Type-check/build su tutto il codice toccato.
- API testate con sessione reale (login + chiamata + asserzione sul risultato).
- UI verificata nel browser con screenshot; ricordare che il server di produzione serve la build vecchia.
- Esito onesto: dichiarare ciò che non si è potuto verificare.

### Test
- Ogni logica non banale lascia dietro almeno un check eseguibile (test o script con assert).
- Piramide: tanti unit veloci, alcuni test di integrazione, pochi e2e.
- Testare il comportamento, non l'implementazione (i refactoring non devono rompere i test).
- Testare i confini: input vuoto, errore del server, valori limite.
- Bug fixato = test che lo avrebbe intercettato.

### Debug metodico
- Riprodurre prima di correggere; leggere l'errore vero (log del server, non solo la UI).
- Verificare le assunzioni di base per prime: processo vivo? porta in ascolto? dato presente? cache stantia?
- Cambiare una cosa alla volta; se un fix non ha effetto, chiedersi se il codice modificato sta davvero girando.

### Git
- Commit atomici, messaggio = cosa + perché; formato conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`).
- Mai committare: log, cookie, dump, file temporanei, segreti, build.
- Prima del commit: `git status` letto per intero — sapere cosa si sta includendo.

### Rilascio e rollback
- Funzionalità rischiose dietro feature flag: si spengono senza deploy.
- Ogni deploy ha una via di ritorno provata (tag/commit precedente + migration reversibili).
- Backup non testato con un restore = nessun backup: provare il ripristino periodicamente.

---

## 6. Sviluppo assistito da AI

### Regole base (anche con un solo agente)
- Il codice generato è una proposta: leggerlo e capirlo prima di accettarlo; se non lo sapresti spiegare, non committarlo.
- Review del diff completo prima di ogni commit (`git diff` letto, non scorso).
- L'agente deve verificare ciò che afferma (build, test, browser): "dovrebbe funzionare" non è uno stato accettabile.
- Dati creati dall'agente per test: dichiararli sempre e lasciarne lo script di ricreazione.
- Il CLAUDE.md di progetto: corto (<200 istruzioni), comandi esatti in cima, solo regole universali, dettagli in file separati referenziati (progressive disclosure). Le regole di stile le fa il linter, non l'LLM.

### Più agenti in parallelo

**Isolamento (la regola d'oro: ciò che non è isolato verrà rotto)**
- Decomporre per dominio/feature con confini a livello di **file**: mai due agenti sugli stessi file da direzioni diverse.
- **Un git worktree per agente** (stesso `.git`, directory di lavoro separate): i conflitti si spostano al merge, dove git li rileva, invece di avvenire in silenzio durante il lavoro.
- Partire con **2-3 agenti**: la complessità di riconciliazione cresce in modo non lineare; oltre 4-8 worktree il collo di bottiglia è la review umana, non gli agenti.
- **Porte e processi separati** per agente; mai kill globali (solo PID/porta).
- Artefatti condivisi (client ORM, build, cache) rigenerati con i processi degli altri fermi o su copie isolate.

**Coordinamento**
- Una **fonte di verità condivisa dei task** (board/file markdown): ogni agente prende un task, lo marca in-progress, lo marca done. Previene lavoro duplicato.
- Un file di note condiviso nel repo (`DEVELOPER_NOTES.md`): decisioni, gotcha, dati di test — ciò che l'altro agente non deduce dal codice.
- Interfacce condivise (API, schema DB, tipi) si cambiano **prima** e si comunicano: sono il contratto tra agenti.

**Diffidenza operativa (l'ambiente cambia sotto i piedi)**
- Prima di diagnosticare un bug, riverificare le assunzioni: file cambiato? server riavviato? dati risincronizzati da un altro agente?
- Rileggere un file prima di modificarlo se un altro può averlo toccato.

**Convergenza (dove il parallelo si paga)**
- **Branch di integrazione**: merge di tutti i branch lì, test, fix conflitti, poi merge pulito su main.
- Il DB è uno solo: migration e seed governate da un agente per volta.
- Merge/riconciliazione fatta da una persona o da un solo agente designato, con diff letto per intero.
- Test e gate automatici richiesti prima del merge; working tree pulito a fine sessione.

**Antipattern**
- Due agenti che "si aiutano" sullo stesso bug: fix in conflitto raddoppiati.
- Un agente che ripara i sintomi causati dall'altro (server killato, dati cambiati) credendoli bug del codice.
- Refactoring globali (rename, format) in parallelo con altro lavoro: collide con tutto.
- Task interdipendenti assegnati in parallelo: la dipendenza va serializzata.

### Strumenti utili
- **Ponytail** (plugin Claude Code, [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)): forza la soluzione più semplice che funziona (YAGNI). Comandi: `/ponytail-review` (over-engineering nel diff), `/ponytail-audit` (audit repo), `/ponytail-debt` (shortcut marcati).
- **Headroom** ([headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom)): proxy locale di compressione contesto (~15-20% token in meno per il coding; dati locali, originali recuperabili). `pip install "headroom-ai[all]"` + `headroom wrap claude`. Layer in più: provarlo su sessioni non critiche.

---

## 7. Integrazioni esterne

- Sola lettura sulla sorgente (viste, utenti read-only); la scrittura verso l'esterno passa per tracciati concordati.
- Mapping campi centralizzato in un CONFIG unico e documentato.
- Non assumere l'esistenza di campi: verificare il tracciato reale con dati veri prima di modellare.
- Fallback e messaggi chiari quando la sorgente non risponde; mai bloccare tutta l'app per un'integrazione giù.
