# LIA — Valutazione del legittimo interesse (art. 6.1.f GDPR)

> **BOZZA operativa.** Il bilanciamento va completato dal Titolare con elementi aziendali
> (dimensioni della clientela, aspettative, rapporti contrattuali). Non è un parere legale.

Il legittimo interesse non si dichiara: si documenta. Per ogni trattamento: interesse concreto,
necessità (perché non esiste un mezzo meno invasivo), bilanciamento con i diritti dell'interessato,
salvaguardie adottate, esito.

---

## 1. Analisi dell'utilizzo del portale

**Interesse**: capire quali parti del catalogo vengono consultate, dove il cliente si ferma, quali
ricerche non trovano risposta. Serve a migliorare assortimento, schede e assistenza commerciale.

**Necessità**: non esiste un mezzo equivalente meno invasivo. I dati sono di prima parte, raccolti solo
dopo il login, senza cookie aggiuntivi, senza terze parti, senza incrocio con siti esterni. Le
alternative (questionari, interviste) coprono una frazione dei clienti e arrivano in ritardo.

**Bilanciamento**:
- il cliente B2B sa di operare in un portale riservato e ha un rapporto contrattuale in corso;
- i dati sono relativi all'uso del servizio, non alla vita privata;
- nessuna decisione automatizzata con effetti giuridici;
- l'opposizione è prevista e va resa effettiva con un'interruttore nel profilo (requisito P1.3).

**Rischio per l'interessato**: basso, se l'opposizione funziona e la conservazione è limitata.

**Salvaguardie**: solo utenti autenticati, nessuna terza parte, retention 18 mesi (valutare 12),
accesso ristretto a commerciale e amministrazione, informativa dedicata, opposizione immediata.

**Esito**: legittimo interesse prevalente, **a condizione che** opposizione, retention e informativa
siano operative. Oggi l'opposizione non lo è: fino a quel momento il trattamento non è coperto.

---

## 2. Profilo commerciale del cliente con AI

**Interesse**: proporre al cliente articoli pertinenti e dare al commerciale un quadro aggiornato
dell'azienda (settore, stagionalità, prodotti non pertinenti). Riduce proposte inutili e chiamate a vuoto.

**Necessità**: le informazioni sono già disponibili (ordini, registro imprese, fonti pubbliche);
il trattamento automatico le organizza. Senza AI la stessa attività sarebbe manuale e limitata a pochi
clienti. **Non** è necessario inviare recapiti personali: la versione corretta usa solo dati aziendali.

**Bilanciamento**:
- i dati sono prevalentemente aziendali; le persone coinvolte sono referenti in contesto professionale;
- i referenti proposti dal web richiedono un trattamento a parte (nome, ruolo, fonte pubblica);
- nessun effetto giuridico: prezzi, fido e condizioni non sono decisi dall'AI;
- il cliente può chiedere di conoscere, correggere o opporsi.

**Rischio**: basso se restano esclusi recapiti e se i referenti hanno fonte verificabile.
Medio se il sistema produce nomi non verificati: in quel caso il rischio è di **inesattezza** (art. 5.1.d),
non di intrusione.

**Salvaguardie**: nessun recapito nei prompt; referenti solo con URL di fonte e stato "da verificare";
nessun dato verso il modello oltre il necessario; provider con DPA e senza training sui dati;
cancellazione del profilo alla cessazione del rapporto [DA IMPLEMENTARE]; possibilità di opposizione.

**Esito**: legittimo interesse prevalente **con minimizzazione obbligatoria**. La versione precedente
(recapiti nel prompt) non era coperta da questo bilanciamento.

---

## 3. Qualifica automatica delle richieste di accesso

**Interesse**: distinguere richieste reali da invii falsi o abusivi, prima di aprire un rapporto
commerciale e inviare credenziali. Riduce frodi e lavoro manuale.

**Necessità**: la verifica P.IVA e presenza web è automatizzabile; la verifica manuale ha costo e
tempi incompatibili con il volume. Nel prompt entrano **solo dati aziendali**; il nome del referente,
il telefono e il messaggio non vengono inviati.

**Bilanciamento**: il richiedente si aspetta una verifica prima dell'accesso; i dati sono aziendali;
la decisione finale è umana (nessun art. 22). Il modulo è pubblico: chiunque può inserire dati di
terzi, quindi serve la dichiarazione di titolarità (P2.6).

**Rischio**: basso. Rischio residuo: uso del modulo per profilare aziende terze. Mitigazione:
rate limit (già presente), dichiarazione nel form, cancellazione a 12 mesi.

**Salvaguardie**: solo dati aziendali nel prompt; esito "VERIFICARE" in caso di dubbio; revisione umana;
anonimizzazione automatica a 12 mesi; nessuna decisione automatica di esclusione.

**Esito**: legittimo interesse prevalente.

---

## 4. Sicurezza, log e registro delle operazioni

**Interesse**: proteggere il portale da accessi abusivi, ricostruire un incidente, dimostrare chi ha
fatto cosa (accountability, art. 5.2), adempiere agli obblighi di sicurezza (art. 32).

**Necessità**: senza log non si indaga un incidente né si dimostra la diligenza. I log di accesso
sono lo strumento minimo; conservarli indefinitamente non è necessario.

**Bilanciamento**: l'interessato non subisce effetti; i log sono consultati solo da personale
autorizzato; il contenuto deve essere minimizzato (niente token, niente querystring con dati personali).

**Rischio**: basso se il contenuto è tecnico e la retention breve. Diventa medio se i log contengono
credenziali o dati non pertinenti.

**Salvaguardie**: accesso ristretto, retention definita (90/180/730 giorni), URL senza parametri,
token redatti, IP troncato, email dei login falliti in HMAC.

**Esito**: legittimo interesse prevalente **dopo** minimizzazione e retention (P1.5).

---

## Regola di aggiornamento

Il LIA si rivede quando cambia una di queste cose:

- si aggiunge un fornitore o si cambia modello AI;
- si estende la retention o si aggiungono categorie di dati;
- arriva un reclamo o un'opposizione che mette in discussione il bilanciamento;
- cambia la normativa o una decisione del Garante.

Data della valutazione: **[DA COMPILARE]** — a cura di: **[DA COMPILARE]**.
