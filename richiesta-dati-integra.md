# Richiesta dati a Integra — Portale B2B Luis S.r.l.

**Destinatari:** **AGOMIR S.p.A.** (software house che sviluppa e distribuisce Integra)
**Mittente:** team progetto Portale B2B Luis S.r.l.
**Versione:** bozza 1.2 · 5 giugno 2026
**Documento collegato:** *Specifiche funzionali Portale B2B Luis S.r.l.* (`specifiche-b2b-luis.md`)

---

## 1. Scopo

Stiamo realizzando un portale e‑commerce **B2B** (riservato ai rivenditori) per Luis S.r.l. **Integra è la fonte primaria dei dati**: il portale è un canale di vendita allineato periodicamente. Questo documento elenca **i dati che chiediamo di esporre** (lettura) e **i dati che il portale restituirà a Integra** (ritorno), con i relativi **canali** e **requisiti minimi**, così da costruire l'integrazione senza scoprire in corsa che manca un campo.

Chiediamo cortesemente, dove possibile, di **esporre più del minimo** (i campi marcati come opzionali): aggiungere una colonna a una vista ora costa molto meno che richiederla a sviluppo avviato.

---

## 2. Canali

Il modello di integrazione ha **due direzioni con canali distinti**:

- **Lettura (Integra → portale): viste Postgres in sola lettura.** **Tutte** le entità che il portale legge da Integra sono esposte come viste. Ci permettono letture incrementali (filtro su `updated_at`) e join. Niente Excel in lettura.
- **Ritorno (portale → Integra): automazioni di import Excel** che caricano i dati prodotti dal portale direttamente in Integra. Queste automazioni sono **a carico di AGOMIR S.p.A.** I dati di ritorno comprendono almeno **ordini** e **anagrafica articoli con immagine associata** (vedi §5).

Non è prevista integrazione API in tempo reale. Per ogni entità deve esistere **una sola fonte di verità**.

---

## 3. Requisiti trasversali (validi per OGNI vista in lettura)

Per ogni vista esposta chiediamo che siano sempre presenti:

1. **Chiave univoca stabile** — i codici Integra (codice articolo, codice cliente, codice listino, ecc.). Non devono cambiare nel tempo; sono il riferimento con cui agganciamo e aggiorniamo i dati.
2. **`updated_at`** — data/ora dell'ultima modifica della riga (per letture incrementali "solo ciò che è cambiato").
3. **Flag di stato** — attivo / non attivo (o un flag "eliminato"/"dismesso"). Sul portale **non cancelliamo**: disattiviamo. Serve quindi sapere quando qualcosa va disattivato.
4. **Tipi e formati chiari** — date in ISO (`YYYY‑MM‑DD`), decimali con separatore coerente, unità di misura esplicite, codifica UTF‑8.

> Nota su una mappatura importante: nel portale la gerarchia **famiglia → linea → codice articolo** di Integra diventa **Famiglia → Articolo → Variante**. In particolare il campo **"linea"** è la chiave con cui **raggruppiamo i codici (varianti) in Articoli**, e il campo **"famiglia"** è la famiglia principale dell'articolo. Ci servono quindi questi due campi su ogni codice.

---

## 4. Entità richieste

Legenda priorità: **★ indispensabile** · **○ opzionale (gradito)**.
Tutte le entità di questa sezione sono richieste come **vista Postgres in sola lettura**.

### 4.1 Catalogo / anagrafica prodotti

**Famiglie** — ★
- ★ codice famiglia (chiave) · ★ descrizione · ○ codice famiglia padre (se gerarchia) · ○ immagine/riferimento

**Linee** *(→ diventano Articoli sul portale)* — ★
- ★ codice linea (chiave) · ★ descrizione · ★ riferimento famiglia · ○ colore · ○ riferimento immagine · ○ descrizione estesa

**Prodotti / Varianti** *(una riga per codice articolo = unità ordinabile)* — ★
- ★ codice articolo (chiave variante)
- ★ riferimento **linea** (per aggregare in Articolo)
- ★ riferimento **famiglia**
- ★ descrizione
- ★ **colore**
- ★ **dimensioni in campi separati** (es. altezza, diametro, larghezza… non un'unica stringa) con relativa unità
- ★ **multiplo d'ordine / confezione** (es. pezzi per confezione) e unità di misura di vendita
- ★ stato attivo/dismesso · ★ aliquota IVA
- ○ EAN/barcode · ○ peso · ○ volume/ingombro · ○ materiale · ○ provenienza · ○ codice fornitore · ○ fattori di conversione UM (pezzo ↔ confezione) · ○ nome/riferimento file immagine

> Le **immagini** (file) e le **descrizioni AI** sono gestite sul portale; da Integra ci basta, se disponibile, il **riferimento/nome file** per agganciarle. Indicateci quali tra **colore** e **descrizione** sono affidabili in Integra.

### 4.2 Prezzi e condizioni commerciali

**Listini** — ★
- ★ codice listino (chiave) · ★ descrizione · ○ valuta · ○ validità (date da/a)

**Righe listino (prezzi)** — ★
- ★ codice listino · ★ codice articolo · ★ prezzo unitario **IVA esclusa** · ○ validità (date da/a)

**Sconti** — ★
- ★ sconto cliente (a livello anagrafica)
- ★ eventuale sconto per **articolo** e per **famiglia**, **se gestiti in Integra** (indicare dove risiedono)
- ★ regola di combinazione degli sconti (cumulativi a cascata o "il maggiore vince")
- ○ prezzi/sconti a **scaglioni di quantità** · ○ promozioni a tempo (prezzo speciale con finestra di validità)

**Fiscale** — ○
- ○ tabella aliquote IVA · ○ esenzioni / regimi particolari

### 4.3 Clienti

**Anagrafiche clienti** — ★
- ★ codice cliente (chiave) · ★ ragione sociale · ★ P.IVA / codice fiscale
- ★ **listino assegnato** · ★ **stato attivo/bloccato**
- ★ email · ○ telefono
- ○ condizioni di pagamento · ○ **fido/credito** · ○ agente/rappresentante · ○ lingua · ○ valuta · ○ minimo d'ordine (valore o quantità)
- ○ dati e‑fattura (codice SDI / PEC)

**Indirizzi** — ★
- ★ codice cliente · ★ tipo (sede/spedizione/fatturazione) · ★ indirizzo completo · ★ supporto a **più indirizzi di spedizione** per cliente

### 4.4 Magazzino / disponibilità

**Giacenze** *(l'entità più frequentemente aggiornata)* — ★
- ★ codice articolo · ★ quantità disponibile · ★ unità di misura · ★ **`updated_at`**
- ○ codice magazzino (se più magazzini) e giacenza per magazzino
- ○ quantità impegnata · ○ quantità in arrivo da fornitore + **data prevista di rientro** · ○ lead time

### 4.5 Ordini — ritorno da Integra verso il portale

Gli **ordini nascono sul portale** e vengono inviati a Integra (vedi §5). Da Integra ci serve il **giro di ritorno**:

**Stato ordine** — ★
- ★ riferimento ordine portale ↔ numero ordine Integra · ★ **stato** (ricevuto / in lavorazione / spedito) · ★ date dei cambi stato

**Spedizioni / DDT** — ★
- ★ riferimento ordine · ★ quantità spedite (per riga) · ★ numero DDT · ○ **tracking** corriere
- ○ fatture e stato pagamento

### 4.6 Tabelle di decodifica (lookup)

- ★ colori · ★ unità di misura · ★ stati/causali ordine · ★ aliquote IVA
- ○ paesi · ○ valute · ○ lingue · ○ classi/categorie merceologiche · ○ metodi di spedizione/corrieri

---

## 5. Dati di ritorno: dal portale verso Integra (automazioni Excel AGOMIR)

Ciò che **il portale produce e restituisce a Integra**, importato tramite **automazioni Excel a carico di AGOMIR**. Tracciati da concordare.

**Ordini** (★)
- Testata ordine: cliente, data, riferimento ordine portale, totale IVA esclusa.
- Righe ordine: codice articolo (variante), quantità, multiplo, prezzo netto applicato, sconti applicati.
- Marcatura "esportato" lato portale per evitare doppioni.

**Anagrafica articoli arricchita** (★)
- Associazione **articolo ↔ immagine** generata/gestita sul portale, riportata in Integra.
- Eventuale **descrizione (anche AI)** prodotta sul portale. ○
- I **file immagine** non viaggiano nel foglio Excel: il tracciato porta **riferimento/URL o nome file**; modalità di trasferimento dei file da concordare con AGOMIR.

**Altri dati di ritorno proposti** (○, da valutare insieme)
- Associazioni **Articolo ↔ Raccolta/collezione** (Novità, Natale 2026…), se utili anche in Integra.
- Note/attributi aggiunti sul portale.

---

## 6. Strategia di sincronizzazione (come intendiamo allinearci)

Condividiamo l'approccio così possiamo concordare cadenze e dettagli:

1. **Master per dato.** Integra è master per i dati gestionali; il portale è master per i propri (raccolte/collezioni, immagini, descrizioni AI, credenziali). La lettura non sovrascrive i dati di portale. Lo **stato ordine** è master in Integra.
2. **Upsert per chiave.** Aggiorniamo/aggiungiamo per codice articolo; operazione ripetibile senza duplicare.
3. **Snapshot vs incrementale.** Lettura completa per dati medio‑piccoli (catalogo, listini); **delta su `updated_at`** per i dati frequenti (giacenze); riconciliazione completa periodica (es. notturna).
4. **Cadenze (da concordare):** giacenze ogni 15–60 min; prezzi/clienti/catalogo giornaliero o on‑change; stato ordini frequente.
5. **Ordine per dipendenze:** lookup → famiglie → linee/articoli → varianti → listini → prezzi → clienti → giacenze → stato ordini. Le righe "orfane" le mettiamo in quarantena e ritentiamo.
6. **Staging + validazione** lato portale, con report errori; le righe non valide non bloccano le altre.

---

## 7. Domande aperte per AGOMIR

1. Confermate che **tutte** le entità di lettura (§4) possono essere esposte come **viste Postgres**, con accesso in sola lettura dedicato al portale?
2. Tutte le viste possono includere **`updated_at`** e un **flag stato/eliminato**?
3. I campi **"linea"** e **"famiglia"** sono presenti e stabili su ogni codice? Come si chiamano esattamente?
4. **Colore** e **descrizione** prodotto sono affidabili in Integra o li gestiamo sul portale?
5. Le **dimensioni** sono su **campi separati e numerici** (con unità) o in un'unica descrizione?
6. **Sconti** (cliente / articolo / famiglia): dove sono gestiti e con quale **regola di combinazione**?
7. Come gestite il **multiplo/confezione** e le **conversioni di unità** (pezzo ↔ confezione)?
8. Per le **giacenze**: uno o più magazzini? Disponibilità futura/in arrivo?
9. Per i **dati di ritorno** (ordini, articoli con immagine): quali **tracciati Excel** e quali **automazioni di import** prevedete? Come gestiamo il trasferimento dei **file immagine**?
10. **Frequenze** di aggiornamento sostenibili per ciascuna vista/automazione.

---

*Documento di richiesta dati. Le risposte verranno consolidate nelle viste e nei tracciati definitivi prima dello sviluppo dell'integrazione.*
