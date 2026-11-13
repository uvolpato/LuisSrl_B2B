# Criticità alte (P1) — analisi di dettaglio

> Verifica sul codice reale (nessuna ispezione del DB in produzione, nessun test runtime).
> Riferimento: `REPORT-PRIVACY-GDPR.md`, sezione 2. Questo file è la base per i file per-attività.

## Riepilogo

| # | Criticità | Rischio | Sforzo | Chiude il rischio |
|---|---|---|---|---|
| P1.1 | Contatti personali verso Google Gemini | Alto (violazione + informativa falsa) | ~1 h | Codice |
| P1.2 | Nessuna informativa nel portale | Alto (art. 12-13, accountability) | 0,5-1 g | Codice + testo |
| P1.3 | Nessun opt-out al tracciamento | Alto (art. 21 inesercitabile) | 0,5 g | Codice |
| P1.4 | Cancellazione inefficace e distruttiva | Alto (art. 17 + dati fiscali) | 1-1,5 g | Codice + decisione |
| P1.5 | Log senza retention e con token/PII | Medio-alto (art. 5.1.e, riservatezza) | 0,5 g | Codice + numeri |
| P1.6 | Marketing Brevo senza prova di consenso | Alto (ePrivacy art. 130) | 1 g | Codice + processo |

---

## P1.1 — Contatti personali dei clienti inviati a Google Gemini

### Cosa succede davvero

1. Ogni domenica alle 04:00 gira `CustomerProfileService.generaTuttiSettimanale()` (`customer-profile.service.ts:155`).
2. Per ogni `Customer` con `stato = ATTIVO` (se il profilo ha più di 7 giorni) costruisce il prompt con `raccogliDati()`.
3. `raccogliDati()` carica i `ContattoCliente` del cliente (`tipo = EMAIL | TELEFONO | NOTA`, `contenuto` libero).
4. `buildPrompt()` li inserisce **in chiaro** nel testo:

```
- Contatti: EMAIL: mario.rossi@vivaio.it; TELEFONO: 035 1234567; NOTA: ...
```

(`customer-profile.service.ts:338`) e chiede al modello anche `contattiChiave: [{ nome, ruolo }]` (`:357`).
5. La chiamata va a **Google Gemini con Google Search grounding** (piano a pagamento), e la risposta viene salvata in `customer_profile.contatti`.

Quindi: email, telefoni e note libere dei referenti escono verso Google **ogni settimana**, per tutti i clienti attivi. Contraria a:
- `informativa-privacy-b2b.md` §6 e §8 («Google… descrizioni prodotto», nessun dato anagrafico);
- `ANALISI_DATI_LLM_GDPR_AIAct.md` §1 («Nessun dato anagrafico del cliente viene mai inviato a Gemini»).

Non è solo un problema di informativa: il modello **genera nomi di persone** (`contattiChiave`) che poi vengono mostrati al commerciale. Un LLM può inventarli (art. 5.1.d, esattezza) e il dato falso resta nel DB.

### Verifica fatta sugli altri flussi AI

| Flusso | Dati personali? | Nota |
|---|---|---|
| `leads/indagine.service.ts` | No | prompt dichiara solo ragione sociale, P.IVA, dominio email, comune, tipo attività; corretto |
| `coupon.service.ts:208` | No | solo statistiche aggregate |
| `insight.service.ts:128` | No contatti | usa ordini/eventi; attenzione: include il **testo delle ricerche** (`ricerche: ...`), che può contenere PII digitata dal cliente |
| `integrazione` (descrizioni/immagini/embedding) | No | dati prodotto |
| `customer-profile` | **Sì** | unico punto da correggere |

### Correzione

1. **Rimuovere** la riga `Contatti:` dal prompt. Se serve contesto, passare solo la cardinalità: `Contatti censiti: 3` (nessun contenuto).
2. **Rimuovere `contattiChiave`** dall'output richiesto e dal salvataggio, oppure ammettere solo ruoli senza nomi (`"ruolo": "titolare"`).
3. **Ripulire i dati già salvati**: one-shot che azzera `customer_profile.contatti` per tutte le righe esistenti (altrimenti nomi inventati restano visibili al commerciale).
4. Aggiornare l'informativa solo se resta qualcosa di personale nel prompt (dopo 1-2 non resta nulla → l'informativa attuale torna corretta).

### Verifica

Test unitario su `buildPrompt`: nessuna occorrenza di `@`, né di pattern telefonico nel testo restituito. E, dopo il fix, `select contatti from customer_profile` → tutte vuote.

**Sforzo:** ~1 ora (3 modifiche + test + one-shot).

### Stato: corretto in codice (13/11/2026)

- `buildPrompt` non contiene più recapiti: solo `Referenti censiti: N (recapiti non trasmessi)`.
- Output del modello: `referentiChiave: [{ nome, ruolo, fonte }]`; nessuna fonte = scartato.
- `filtraReferentiPubblici()` (`referenti-pubblici.ts`) scarta: senza `fonte` https, nome con `@` o numeri lunghi, doppioni; aggiunge `stato: 'da-verificare'`.
- Scheda cliente: colonna **Fonte** + didascalia «da verificare».
- `informativa-privacy-b2b.md` §3 e §6 aggiornate (fonte pubblica, niente recapiti all'AI, opposizione).
- Pulizia dei profili esistenti: `node scripts/reset-referenti-web.cjs` (idempotente).
- Test: `referenti-pubblici.spec.ts` (4 casi). `tsc` pulito backend e frontend.
- **Verificato il 13/11/2026**: profilo rigenerato su un cliente reale (Gemini + ricerca web, HTTP 201). Risultato: **0 referenti proposti** — il modello non ha trovato pagine pubbliche che nominassero persone, quindi non ha inventato nulla. Comportamento corretto (fail closed). La sezione resta vuota finché non esiste una fonte.

---

## P1.2 — Il portale B2B non ha informativa

### Cosa succede davvero

Flusso reale di primo accesso:

```
invito email → /login → MustChangePasswordModal → /area
```

In nessun passaggio compare un'informativa:
- non esiste `frontend/app/privacy/` (la vetrina ne ha una, il portale no);
- `components/area/AreaFooter.tsx` non ha link privacy né cookie;
- `Customer` in Prisma non ha campi `privacyVersione` / `privacyAccettataIl` (li ha solo `Lead`, `schema.prisma:688-690`);
- l'email di invito (`mail.service.ts:115`) non cita l'informativa;
- la vetrina dichiara il contrario: «L'uso del portale… è regolato da un'informativa specifica, mostrata al primo accesso» (`frontend-vetrina/src/app/privacy/page.tsx:99-103`).

Nel frattempo il portale tratta: account, tracciamento comportamentale con IP, profilazione AI, ricerche con AI, foto caricate.

### Perché è alta

- **Art. 12-13**: l'informativa va data *al momento della raccolta*. Il primo login è quel momento.
- **Art. 5.2 (accountability)**: oggi non c'è prova che l'informativa sia stata consegnata.
- **Art. 21**: senza informativa l'utente non sa di poter opporsi al tracciamento.
- La vetrina contiene un'**affermazione non vera**: da correggere anche quella se il portale non si adegua.

### Correzione

1. Migration additiva su `Customer`: `privacyVersione String?`, `privacyAccettataIl DateTime?`.
2. Pagina `/privacy` nel portale: prendere `informativa-privacy-b2b.md`, pubblicarla come pagina Next (IT; EN opzionale).
3. Modale bloccante al primo login **dopo** il cambio password, con «Ho letto» → `POST /api/privacy/accetta {versione}`, che salva versione + data; si ripresenta se `PRIVACY_VERSIONE` cambia.
4. Link in `AreaFooter` + una voce in `ProfileSection`.
5. Allineare le versioni: `PRIVACY_VERSIONE` (backend, oggi `2026-10`) e la costante della vetrina devono essere la stessa fonte (o due costanti esplicitamente allineate).
6. Nell'informativa del portale devono comparire: tracciamento e opposizione, profilazione AI e Google, foto caricate, corrieri, Brevo (solo marketing), retention, diritti, trasferimenti.

### Verifica

Login cliente di test → modale; accettazione salvata con versione/data; refresh non la ripete; cambiando `PRIVACY_VERSIONE` la ripete. Controllo che l'endpoint sia protetto da sessione + CSRF.

**Sforzo:** 0,5-1 giorno (il testo esiste già, va adattato).

---

## P1.3 — Il diritto di opposizione al tracciamento non è esercitabile

### Cosa succede davvero

- `Tracker.tsx` è montato nell'area e invia `page.view`, `page.leave`, `scroll.depth` per **ogni cliente loggato**, senza condizioni.
- Il backend aggiunge IP e attore (`events.service.ts:21,68`) e salva anche `ricerca` con **testo libero** (`integrazione.service.ts:1365`).
- `EventsService.track/trackBatch` non consulta nessuna preferenza.
- I dati alimentano dashboard, timeline admin, `insight` (che li manda all'AI) e i conteggi del profilo cliente.

L'informativa §5 promette: «puoi opporti in qualsiasi momento… cesseremo la registrazione» — con la nota `[DA COMPLETARE: oggi l'opposizione va gestita a mano]`. Quel «a mano» non esiste: non c'è nessun punto in cui si possa fermare la registrazione se non cancellando gli eventi.

### Perché è alta

Art. 21.2-3: l'opposizione deve essere **possibile, gratuita e immediata**; art. 21.5: va offerta con mezzi automatizzati. Un'informativa che promette un diritto non implementato è più grave di un'informativa che non lo promette.

### Correzione

1. `trackingOptOut Boolean @default(false)` su `Customer`.
2. In `EventsService.track()` e `trackBatch()`: uscire se il cliente ha l'opt-out. Per non fare una query per evento, cache in memoria di 60 s (`Map<number, boolean>`); il volume è basso.
3. Mantenere solo il minimo contrattuale/di sicurezza: gli eventi `ordine.create` li scrive il backend per il funzionamento, meglio continuare a scriverli in una tabella diversa o accettarli come "esecuzione del contratto" dichiarandolo. Decisione da prendere, non tecnica.
4. Toggle in `ProfileSection` («Non registrare il mio utilizzo») + endpoint `PATCH` con CSRF.
5. All'opt-out: smettere di raccogliere; gli eventi passati si conservano fino alla retention (dichiararlo). Se l'interessato chiede anche la cancellazione, è una richiesta art. 17 separata (P1.4).
6. Coerenza: se l'opt-out è attivo, `customer-profile` e `insight` non devono usare i conteggi di tracking come segnale (il profilo non deve "profilare" chi si è opposto).

### Verifica

Toggle attivo → navigazione → `select count(*) from customer_event where customer_id = X` non cresce; il profilo AI non usa più i tracking.

**Sforzo:** ~0,5 giorno.

---

## P1.4 — Cancellazione: oggi è o inefficace o distruttiva

### Cosa succede davvero

`DELETE /api/customers/:id` (`customers.controller.ts:163` → `customers.service.ts:365`):

1. Rifiuta solo se esistono ordini `B2B-…` con `numeroIntegra = null` (ordini locali non ancora esportati).
2. Altrimenti esegue `customer.delete()`.
3. **`OrdineCliente.customer` è `onDelete: Cascade`** (`schema.prisma`, modello `OrdineCliente`): la delete **cancella anche tutti gli ordini e le righe**. Idem contatti, indirizzi, progetti, carrello.
4. Poi cancella a mano eventi, profilo, insight, box, campaignUsage.

Due problemi opposti:

- **Cancellare davvero distrugge documenti contabili** che per legge vanno conservati 10 anni (art. 17.3.b: la cancellazione non si applica se c'è un obbligo legale). Il controllo attuale non lo impedisce.
- **Non cancellare non è una cancellazione.** E anche se si cancellasse, `importaClienti()` (`integrazione.service.ts:2776`) ricrea il cliente da `integra_clienti` alla successiva importazione/sync, perché la chiave è `codiceCliente`. La cancellazione verrebbe annullata dal gestionale.

Oggi quindi: nessuna delle due operazioni è corretta, e l'informativa §12 promette la cancellazione.

### Modello corretto (tre operazioni distinte)

| Operazione | Cosa fa | Quando |
|---|---|---|
| **Blocco** (esiste) | `stato = BLOCCATO`, niente accesso, dati intatti | morosità, contenzioso, richiesta temporanea |
| **Anonimizzazione** (da aggiungere) | azzera dati personali del referente: `email → anon-{id}@invalid`, `nome`, `telefono`, `telefonoFisso`, contatti, note libere, eventi, profilo AI, insight; **mantiene** ragione sociale, P.IVA, ordini, documenti; `anonimizzatoIl = now()` | richiesta art. 17 con ordini/documenti esistenti (il caso normale) |
| **Cancellazione reale** | delete fisico | solo senza obblighi di conservazione (lead, cliente mai ordinato) |

Punti tecnici:

1. Riusare il pattern già scritto per i lead: `leads/conservazione.ts` + `conservazione.service.ts` hanno già `datiAnonimi()` e il job notturno. È lo stesso lavoro, da adattare al `Customer`.
2. `importaClienti()` deve **saltare** i clienti con `anonimizzatoIl` valorizzato (altrimenti il gestionale li resuscita).
3. `deleteCustomer` va vincolato: se esistono ordini o documenti → solo anonimizzazione.
4. `audit_log` contiene `entitaId` e dettagli: va incluso nella procedura o coperto dalla retention (P1.5).
5. Integra resta la fonte: o si anonimizza anche lì (tracciato AGOMIR) o l'informativa dichiara che i dati aziendali e i documenti fiscali restano. La seconda è legittima; la prima è più pulita.
6. Assegnare anche alla cessazione del rapporto un job di anonimizzazione automatica dopo il periodo di conservazione.

### Verifica

Anonimizzare un cliente di test → il login con la vecchia email fallisce, `importaClienti` sullo stesso `codiceCliente` non ripristina email/nome, gli ordini restano, l'audit registra l'operazione.

**Sforzo:** 1-1,5 giorni (migration + servizio + guardia sull'import + test).

---

## P1.5 — Log senza retention, con PII e con token

### Cosa succede davvero

`AccessLogInterceptor` è globale (`app.module.ts`) e scrive una riga `audit_log` per **ogni richiesta HTTP**, con `url = req.originalUrl` (`access-log.interceptor.ts:42`), cioè **path + query string**.

Contenuto tipico:

- `/api/catalogo/ricerca` → la ricerca è nel body (non loggata), ma `/api/customers?search=mario+rossi` sì;
- `/api/leads/azione?l=…&a=…&e=…&s=…` → **token HMAC dei pulsanti approva/verifica/scarta** nelle email;
- `/api/cataloghi/<token>` e `/api/progetti/pubblico/<token>` → **token bearer** dei link condivisi;
- `/api/auth/login` fallito → `dettagli: { email }` in chiaro (`audit.service.ts:52`);
- IP su ogni riga.

E **non esiste alcun job di retention**: nessun `auditLog.deleteMany` in tutto il backend. La tabella cresce per sempre, e finisce nei backup.

Una nota di merito: `cataloghi` e `progetti` pubblici usano `ipHash` per gli eventi (`schema.prisma`, `DownloadEvent.ipHash`): lì la minimizzazione c'è.

### Perché è alta

- Art. 5.1.e: i log di accesso non hanno bisogno di 5 anni di storia.
- Riservatezza: un token nei log è una credenziale in chiaro (chi legge i log può aprire i link o scaricare i cataloghi). I token sono revocabili, ma restano validi finché non lo si fa.
- Volume: 1 riga per richiesta, per sempre, su un server con backup.

### Correzione

1. `logAccess` salva **solo il path** (split su `?`) e, per le route con token nel path, `/<token-redatto>` o un hash del token.
2. Cron di retention con soglia in env: es. `http.access` 90 giorni, `http.error` 180, azioni admin/security 24 mesi. L'indice `[azione, createdAt]` esiste già → il purge è economico.
3. Non salvare l'email in chiaro nei login falliti: hash o rimozione dopo N giorni (basta la retention).
4. Documentare le durate nell'informativa (oggi `[DA COMPLETARE]`).
5. Verificare che i backup abbiano la stessa retention dei log (P2.4).

### Verifica

Dopo una ricerca: nessun `q=` in `audit_log`; dopo un accesso ai link token: nessun token in chiaro. Simulando la soglia: righe rimosse.

**Sforzo:** ~0,5 giorno.

---

## P1.6 — Marketing Brevo senza prova del consenso

### Cosa succede davvero

```
creaMailing → importContatti (file XLSX/CSV: solo email + nome)
            → oppure importClienti (clienti ATTIVI da anagrafica)
            → DownloadLink { email, nome, token, customerId? }
            → inviaABrevo → BrevoService.importaContatti → lista "Cataloghi"
            → email marketing con CATALOGO_LINK + {{ unsubscribe }}
```

`DownloadLink` non ha **nessun** campo che dica da dove viene quell'email o con quale base è stata inserita. Il file importato può essere qualsiasi elenco. Il footer dell'email è buono (titolare, diritti, unsubscribe, «rispondi con *cancella*»), ma:

- l'unsubscribe gestito da Brevo **non copre** il percorso CSV manuale (che è fuori da Brevo);
- «rispondi con *cancella*» è una promessa senza processo: non c'è una tabella di esclusione locale né un job;
- nessuna traccia del consenso → art. 7.1 e art. 5.2 non sono soddisfatti se qualcuno contesta l'invio.

### Perché è alta

Art. 130 c.4 Codice privacy (soft opt-in): si può scrivere a clienti esistenti per prodotti analoghi **con opt-out in ogni messaggio**. Per tutti gli altri serve consenso. Con un import da file non si sa in quale caso si ricade, e la prima email promozionale a un indirizzo senza base è una violazione ePrivacy (sanzionabile).

### Correzione

1. `DownloadLink`: `consensoMarketing DateTime?`, `fonteConsenso String?` (`soft-opt-in-cliente`, `consenso-form`, `richiesta-diretta`, …), `escluso Boolean @default(false)`.
2. `importContatti` **richiede** un parametro obbligatorio con la fonte dichiarata dall'admin; righe senza fonte valida → non create (fail closed).
3. `inviaABrevo` esclude `escluso = true` e chi è nell'elenco di esclusione.
4. Tabella/flag `marketingExclusion` alimentata da: unsubscribe Brevo (webhook già presente, `cataloghi.service.ts:82`), email «cancella», richiesta dell'interessato.
5. Non includere nel calcolo di `importClienti` i clienti `BLOCCATI` o anonimizzati.
6. Annotare nell'informativa la base del marketing.

### Verifica

Import senza fonte → rifiutato; contatto senza consenso → non arriva a Brevo; unsubscribe → non viene reimportato.

**Sforzo:** ~1 giorno (migration + validazione + esclusione + test).

---

## Cose emerse durante il dettaglio

1. **P1.4 + P1.5 si toccano**: anonimizzare un cliente deve coprire anche `audit_log` (o la retention lo fa per tempo).
2. **P1.3 + P1.1 si toccano**: entrambi alimentano il profilo AI; se l'utente si oppone al tracciamento, il profilo non deve usare quei segnali.
3. **P1.2 dipende da decisioni, non da codice**: DPIA/screening, LIA, base giuridica del marketing, numeri di retention. Vanno decisi prima di scrivere l'informativa definitiva.
4. **Verifica in produzione**: assicurarsi che `ADMIN_PASSWORD` non sia il default `LuisAdmin2026!` (le credenziali dev sono nel bundle frontend in `LoginForm.tsx`, disattivate a runtime ma presenti nel file). `DEPLOY.md:96,221` lo prevede.
5. La retention dei lead funziona ed è un buon modello da copiare per il cliente (`conservazione.ts`).

## Ordine consigliato

1. **P1.1** — 1 ora, toglie la contraddizione più evidente con l'informativa.
2. **P1.5** — 0,5 giorno, riduce superficie e rende i log difendibili.
3. **P1.2** — 1 giorno, chiude art. 12-13 e rende vera la vetrina.
4. **P1.3** — 0,5 giorno, rende reale l'opposizione promessa.
5. **P1.6** — 1 giorno, mette in regola il marketing.
6. **P1.4** — 1-1,5 giorni, l'unica che tocca dati fiscali: va decisa con il commercialista/consulente.

## Decisioni che servono prima del codice

| Decisione | Serve per |
|---|---|
| Quanto tenere `audit_log` (90/180/730 giorni) | P1.5, informativa |
| Se conservare nomi dei contatti nel profilo AI (consiglio: no) | P1.1 |
| Opposizione solo al tracciamento o anche alla profilazione | P1.3, informativa |
| Testo della clausola art. 17: anonimizzazione + conservazione fiscale | P1.4, informativa |
| Base del marketing (soft opt-in clienti / consenso / entrambi) | P1.6 |
| DPIA sì/no (consiglio: screening scritto + DPIA) | tutte, informativa |
