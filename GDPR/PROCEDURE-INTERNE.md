# Procedure interne — diritti, violazioni, retention, DPO

> **BOZZA operativa.** Procedure da adottare formalmente e comunicare al personale interessato.
> I riferimenti normativi sono al GDPR e al Codice privacy (D.Lgs. 196/2003).

---

## 1. Richieste degli interessati (artt. 12-22)

### Canale

Un solo indirizzo presidiato: **contatti@luisbg.it** [DA CONFERMARE].
Oggi esistono tre indirizzi in uso (`contatti@`, `info@`, `shop@`): va scelto quello che fa da sportello
unico e gli altri vanno inoltrati lì.

### Tempi

- Risposta **entro 1 mese** dalla richiesta (art. 12.3).
- Proroga di **2 mesi** solo se la richiesta è complessa o numerosa, con comunicazione entro il primo mese.
- Le richieste si registrano in un foglio con: data, interessato, tipo, esito, data di chiusura.

### Verifica dell'identità

Prima di evadere: chiedere conferma dall'email dell'account, oppure un elemento noto non pubblico.
Non chiedere documenti oltre il necessario.

### Cosa si consegna per tipo di richiesta

| Richiesta | Cosa fare |
|---|---|
| **Accesso** (15) | Estratto di: account, anagrafica, contatti, ordini, eventi di utilizzo, profilo AI (testo), log che lo riguardano. Indicare finalità, categorie, destinatari, retention, fonte dei dati |
| **Rettifica** (16) | Correggere nel portale e, se il dato nasce nel gestionale, aprire la richiesta ad AGOMIR/contabilità |
| **Cancellazione** (17) | Rimuovere i dati personali del referente, conservare solo quanto richiesto da obblighi fiscali. Procedura tecnica: pseudonimizzazione (P1.4) + allineamento del gestionale. Non si cancellano fatture e documenti contabili (art. 17.3.b) |
| **Limitazione** (18) | Bloccare l'account (`stato = BLOCCATO`), sospendere profilazione e tracciamento, conservare i dati senza trattarli |
| **Portabilità** (20) | Esportazione completa dal pannello Clienti (icona download): JSON con anagrafica, indirizzi, contatti, ordini, eventi, profilo AI, sintesi, progetti e link cataloghi. Non contiene password né token |
| **Opposizione** (21) | Fermare il trattamento opposto (tracking e/o profilazione). Vale subito, senza motivazione dell'interessato. Restano attivi i trattamenti per contratto e obblighi di legge |
| **Decisione automatizzata** (22) | Non applicabile: le decisioni con effetti sono umane. Se cambia, va spiegata la logica |

### Cosa NON si fa

- Non si chiede il motivo della richiesta di opposizione o di cancellazione.
- Non si chiede un compenso, salvo richieste manifestamente infondate o ripetitive (art. 12.5).
- Non si risponde "non possiamo per motivi tecnici": se manca lo strumento, è un difetto da correggere.

### Strumenti mancanti (da realizzare)

- export dati per cliente (P2.5);
- toggle di opposizione nel profilo (P1.3);
- azione di pseudonimizzazione (P1.4);
- registro delle richieste (foglio o tabella dedicata).

---

## 2. Violazioni di dati personali (artt. 33-34)

### Rilevazione

Chiunque rilevi un accesso non autorizzato, una perdita, una modifica o una comunicazione indebita lo
segnala **subito** a: **[DA COMPILARE: responsabile interno + telefono + email]**.

Casi tipici per questo sistema: dump del database esposto, backup copiati o persi, credenziali admin
compromesse, errore di configurazione che mostra dati di un cliente a un altro, token dei cataloghi
diffusi, invio massivo con destinatari in chiaro.

### Valutazione (entro 24 ore)

Registrare: cosa è successo, quando, quali dati e quante persone, se i dati erano cifrati, se c'è
rischio per diritti e libertà (identità, reputazione, dati commerciali riservati).

### Notifica

- **Al Garante entro 72 ore** se c'è rischio (art. 33), salvo che il rischio sia improbabile.
- **Agli interessati** senza ritardo se il rischio è elevato (art. 34): cosa è successo, cosa facciamo,
  cosa possono fare.
- Se la notifica arriva oltre le 72 ore, va motivato il ritardo.

### Registro delle violazioni (art. 33.5)

Tenere anche quelle **non notificate**, con la motivazione. Contenuto minimo: data, descrizione,
categorie e numero di interessati, conseguenze, misure adottate, decisione sulla notifica.

### Contatti utili

Garante per la protezione dei dati personali — www.garanteprivacy.it — protocollo di notifica online.
Polizia postale per i reati informatici. Consulente privacy: **[DA COMPILARE]**.

---

## 3. Retention operativa

| Dato | Durata | Meccanismo |
|---|---|---|
| Eventi di utilizzo del portale | 18 mesi | `EventsService.purgeOld` (cron giornaliero) |
| Testo libero delle ricerche | 6 mesi (`RICERCA_RETENTION_MONTHS`) | `EventsService.purgeOld` |
| Lead non convertiti | 12 mesi, poi anonimizzazione | `ConservazioneLeadService` (cron) |
| Profilo AI del cliente | finché attivo | Da aggiungere: cancellazione alla cessazione |
| Account e anagrafica | durata del rapporto | Allineato al gestionale |
| Ordini e documenti fiscali | 10 anni | Conservazione obbligatoria |
| Log di accesso | 90 giorni | `AuditService.purgeOld` (cron 04:00) |
| Log di errore | 180 giorni | `AuditService.purgeOld` |
| Azioni amministrative | 24 mesi | `AuditService.purgeOld` |
| Sessione | 8 ore | Cookie e store su DB |
| Backup | **[DA DECIDERE: 30 gg + mensili]** | Da implementare, con cifratura |
| Contatti Brevo e link cataloghi | fino a revoca + **[DA DECIDERE]** | Revoca e lista di esclusione (P1.6) |

Regola: quando la durata scade, il dato si cancella o si anonimizza in modo irreversibile, **anche nei
backup** (alla rotazione successiva). Una retention scritta e non eseguita è peggio di nessuna retention.

### 3.1 Backup (procedura minima)

1. **Contenuto**: dump del database (`pg_dump -F c`) e cartella immagini/PDF.
2. **Cifratura**: il dump si cifra prima di uscire dal server (es. `age` o 7-Zip con password forte);
   la chiave si custodisce separata dal backup, non nel repository.
3. **Frequenza**: giornaliera, con copia settimanale e mensile; copia fuori sede almeno settimanale.
4. **Retention**: 30 giorni per le giornaliere, 6 mesi per le mensili **[DA CONFERMARE dal Titolare]**.
5. **Ripristino**: prova documentata ogni 6 mesi, con data, esito e durata.
6. **Registro**: chi ha eseguito, dove è la copia, quando è stata verificata.
7. **Diritti**: una richiesta di cancellazione si applica anche ai backup alla rotazione successiva;
   va annotata per non ripristinare dati cancellati.

---

### 3.2 Fine del rapporto (anagrafica master: Integra)

L'anagrafica è governata da Integra: il portale ne è una copia. Quindi la "fine del rapporto" è un fatto
che arriva dal gestionale, non dal portale.

- **Segnale**: il cliente non esiste più in `integra_clienti` (o è disattivato) **e** l'accesso è bloccato.
- **Effetto automatico**: il job mensile `CustomerProfileService.pulisciProfiliCessati` cancella il profilo
  commerciale e le sintesi AI dei clienti bloccati, assenti da Integra e senza ordini da
  `PROFILO_RETENTION_MESI` (default 24 mesi). Se `integra_clienti` è vuota o non raggiungibile non cancella
  nulla (fail closed).
- **Cosa resta**: anagrafica, ordini e documenti (dati contrattuali e fiscali).
- **Dati personali del referente**: si rimuovono con la pseudonimizzazione (azione admin o richiesta art. 17),
  dopo la conservazione obbligatoria.
- **Ritorno attivo**: se il cliente ricompare in Integra, il profilo viene rigenerato dal batch settimanale.

## 4. DPO — valutazione di non obbligatorietà

Il DPO non è obbligatorio (art. 37) perché:

- non siamo autorità pubblica né organismo pubblico;
- l'attività principale non è un monitoraggio regolare e sistematico degli interessati **su larga scala**:
  il monitoraggio riguarda i clienti B2B autenticati del portale, non la popolazione o il traffico pubblico;
- l'attività principale non consiste nel trattamento su larga scala di categorie particolari (art. 9)
  o di dati relativi a condanne penali.

**Conclusione**: nessun obbligo di nomina. Decisione da riesaminare se:
la base clienti cresce di ordine di grandezza, si aggiungono consumatori finali, si introducono dati
sensibili o sorveglianza su larga scala.

Data della valutazione: **[DA COMPILARE]** — a cura di: **[DA COMPILARE]**.

---

## 5. Formazione e autorizzati (artt. 29, 32)

- Elenco degli autorizzati con: nome, ruolo, permessi, data di istruzione.
- Istruzioni scritte su: accesso minimo, divieto di esportare dati, gestione password, segnalazione incidenti.
- Formazione iniziale e aggiornamento annuale, con registro delle presenze.
- Alla cessazione: revoca immediata dell'accesso e restituzione dei dati.

## 6. Verifica in due passaggi degli amministratori

- Metodo: **codice di 6 cifre inviato via email** all'indirizzo dell'account, attivabile da
  **Pannello di amministrazione → Sicurezza**. Nessuna app da installare.
- Il codice vale **10 minuti**, una sola volta, massimo **5 tentativi**. Si può reinviare (3 volte al minuto).
- Se l'invio email fallisce il login non si blocca: il cliente admin usa «Reinvia il codice».
- **Dispositivi fidati**: dopo la verifica il browser può essere certificato per 90 giorni (solo se l'admin
  sceglie «Ricorda questo dispositivo»). Il token vive nel cookie `luis.device`, in DB solo l'hash.
  Si revoca da **Sicurezza → Dispositivi fidati**; il cambio password e la disattivazione revocano tutti i
  dispositivi. Il dispositivo fidato salta il codice, mai la password.
- Disattivazione: richiede la password dell'account.
- Recupero: se l'admin perde l'accesso alla casella email, l'accesso si sblocca solo dal database
  (`users.mfa_attivo = false, otp_codice_hash = null`) da parte di IT, con annotazione e audit.
- Obbligatorietà: consigliata per tutti gli admin; da rendere obbligatoria con un flag applicativo
  quando il parco amministratori cresce.
