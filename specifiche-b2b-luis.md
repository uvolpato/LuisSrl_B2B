# Specifiche funzionali – Piattaforma B2B Luis S.r.l.

**Cliente:** Luis S.r.l. – Via F. Bellafino 28/30 (Centro Galassia), 24126 Bergamo
**Settore:** commercio all'ingrosso di articoli per fioristi e garden (vasi in ceramica, cotto portoghese, materiale per allestimenti)
**Tipo progetto:** portale e‑commerce B2B riservato ai clienti rivenditori
**Versione documento:** bozza 1.13
**Data:** 29 giugno 2026

> Aggiornamento v1.13: descrizione AI a due livelli — breve (pubblica) e dettagliata (solo motore, con trascrizioni immagini CARICATE), più ricerca per immagine (upload cliente → trascrizione AI → similarità vettoriale). Aggiunte entità al glossario §2, nuovi §12.3–12.5, nuovi punti §14.17–20.
> Aggiornamento v1.12: terminologia — il codice identificativo della Variante è indicato come **"codice articolo"** (anziché "codice Integra"). I riferimenti plurali generici ai codici di Integra restano invariati.
> Aggiornamento v1.11: canali di integrazione — **lettura via viste Postgres**; **ritorno via Excel (automazioni AGOMIR S.p.A.)**.
> Aggiornamento v1.10: integrazione Integra — entità da richiedere (§11.6) e strategia di sincronizzazione (§11.7).

> Nota: i prezzi sul portale si intendono **IVA esclusa**, coerentemente con la natura B2B (rivendita).

---

## 1. Obiettivo e ambito

Realizzare un portale B2B ad accesso riservato che consenta ai clienti rivenditori di Luis S.r.l. di consultare il catalogo, vedere i prezzi personalizzati in base al proprio listino e ai propri sconti, **vedere la giacenza/disponibilità degli articoli**, comporre ordini (con gestione di dimensioni e confezioni multiple) e seguirne lo stato fino alla spedizione.

I dati del portale (anagrafiche, catalogo, listini, giacenze) sono **caricati dal gestionale Integra tramite file Excel** e i dati prodotti dal portale (in primo luogo gli ordini) sono **esportati dal sito in Excel**. Il portale non è quindi la fonte primaria dei dati anagrafici/contabili, ma un canale di vendita sincronizzato con Integra (vedi §11).

Non rientrano in questa fase (salvo diversa indicazione): vendita al pubblico, pagamenti online, integrazione automatica/in tempo reale via API con Integra (lo scambio avviene via Excel), integrazione con corrieri. Vedi §13 "Punti da definire".

---

## 2. Glossario / entità principali

| Entità | Descrizione |
|--------|-------------|
| **Articolo** | **Entità "prodotto" del catalogo.** Porta **immagini (galleria), colore e descrizione AI**. È l'elemento navigato dal cliente e indicizzato dalla ricerca semantica. Ha **1..N Varianti**. Appartiene a **una Famiglia principale** (da Integra) e a **zero o più Raccolte** (di portale). |
| **Variante (codice articolo)** | **Unità ordinabile.** Ogni **codice articolo corrisponde a una variante**. Appartiene a **un solo Articolo**. Ha dimensioni/attributi, eventuale confezione/multiplo d'ordine, una **giacenza**, prende il prezzo dal listino del cliente e porta tutti i dati provenienti dal gestionale. |
| **Famiglia (principale)** | Raggruppamento **gerarchico** che arriva da **Integra**: ogni Articolo ha **una sola** Famiglia principale. È **non modificabile** lato portale B2B (read‑only). Ha **una sola immagine**. |
| **Raccolta (collezione di portale)** | Raggruppamento **secondario** di tipo raccolta/etichetta (es. "Novità", "Natale 2026"), **gestito e modificabile sul portale**. Un Articolo può stare in **più Raccolte** (o in nessuna). Ha **una sola immagine**. *(Il cliente/utente può chiamarle anch'esse "famiglie".)* |
| **Dimensione (attributo)** | Caratteristica della Variante (es. altezza, diametro) usata per selezionare la variante dentro l'Articolo. Filtri a cascata. (Il **colore** è invece una proprietà dell'Articolo.) |
| **Giacenza** | Quantità disponibile a magazzino **per variante (codice articolo)**, mostrata al cliente. Aggiornata via import da Integra. |
| **Listino** | Insieme di prezzi **per variante (codice articolo)**. Ogni cliente è associato a un listino di riferimento. |
| **Cliente** | Rivenditore invitato. Ha un listino assegnato e sconti (cliente / articolo / famiglia). Può essere **bloccato ma mai cancellato**. |
| **Ordine** | Documento d'acquisto del cliente, con un proprio stato di avanzamento. |
| **Integra** | Gestionale aziendale, **fonte primaria dei dati**. **Lettura** via **viste Postgres**; **ritorno** (ordini, articoli con immagini…) via **automazioni Excel sviluppate da AGOMIR S.p.A.** Fornisce la gerarchia **Famiglia → Linea → Codice articolo**, che sul portale diventa **Famiglia principale → Articolo → Variante**. |
| **AGOMIR S.p.A.** | Software house che **sviluppa e distribuisce Integra**. Controparte tecnica per le viste in lettura e per le automazioni Excel di import dei dati di ritorno in Integra. |
| **Descrizione breve** | Testo pubblico dell'Articolo (1-3 frasi, stile marketing). Mostrato in scheda prodotto, griglia catalogo e risultati ricerca. Generabile dall'AI e modificabile manualmente dall'admin. |
| **Descrizione dettagliata** | Testo esteso dell'Articolo (paragrafo), non esposto al pubblico. Integra dati di prodotto + trascrizione delle immagini. Alimenta il database vettoriale (pgvector) per la ricerca semantica e RAG. Aggiornabile manualmente dall'admin. |
| **Trascrizione immagine** | Descrizione testuale generata dall'AI del contenuto visivo di un'immagine CARICATA (forma, materiali, texture, stile, elementi presenti). Serve a catturare ciò che è visibile nell'immagine ma non espresso nei dati strutturati. Ogni immagine CARICATA ha la propria trascrizione. |

---

## 3. Catalogo: famiglie, articoli, varianti e raccolte

### 3.1 Struttura di raggruppamento
Il catalogo riflette la gerarchia di aggregazione di Integra, più le raccolte gestite sul portale:

- **Famiglia principale = raggruppamento gerarchico (da Integra).** Ogni Articolo ha **una sola** Famiglia principale. È **non modificabile** lato portale.
- **Articolo = entità "prodotto".** Porta **immagini, colore e descrizione AI**. È ciò che il cliente vede a catalogo e ciò che la ricerca semantica indicizza. Ha **1..N Varianti**.
- **Variante (codice articolo) = unità ordinabile.** Ogni codice articolo è una variante con proprie dimensioni, prezzo (da listino), multiplo, giacenza e tutti i dati provenienti dal gestionale.
- **Raccolta = raggruppamento secondario (di portale).** Collezioni/etichette (es. `Novità`, `Natale 2026`) **gestite e modificabili sul portale**: un Articolo può appartenere a **più Raccolte** (o a nessuna).

Relazioni:

```
Famiglia principale (1) ──< Articolo (1) ──< Variante (codice articolo)   [da Integra, gerarchico]
        (una Famiglia ha N Articoli; un Articolo ha 1..N Varianti)

Raccolta (N) >──────────< Articolo                                        [di portale, modificabile]
        (un Articolo può stare in più Raccolte)
```

- La gerarchia **Famiglia principale → Articolo → Variante** arriva da Integra (vedi §11.2). La Famiglia principale è una sola per Articolo ed è **read‑only** sul portale.
- Le **Raccolte** servono per navigazione e promozioni; lo stesso Articolo può comparire in più Raccolte **senza essere duplicato**.
- Gli **articoli "senza linea"** rientrano nel modello come Articoli con **una sola Variante** (l'aggregazione delle varianti in Articoli deriva dal campo "linea" di Integra; vedi §11.2).

### 3.2 Stato di pubblicazione
- Articoli, raccolte e singole varianti devono poter essere **attivati/disattivati** (visibili o nascosti) senza essere cancellati, per gestire l'assortimento stagionale. *(La Famiglia principale, essendo gerarchia Integra, segue il dato del gestionale.)*

---

## 4. Selezione e presentazione delle varianti

### 4.1 Concetto
- Ogni Articolo aggrega **varianti con dimensioni diverse** (es. la stessa serie in più misure).
- Le dimensioni sono **attributi della Variante** (es. 1ª dimensione = altezza, 2ª = diametro, ecc.). Il numero e il significato delle dimensioni può variare per Articolo. Il **colore** è invece una proprietà dell'Articolo, non una dimensione della variante.

### 4.2 Selezione filtrata (menu a tendina a cascata)
I menu a tendina dipendenti servono soprattutto come **filtro** quando le varianti sono numerose (vedi §4.4):
1. Il cliente seleziona la **1ª dimensione**.
2. Le opzioni della **2ª dimensione** vengono **filtrate** in base alla 1ª selezione (mostra solo i valori effettivamente disponibili per quella scelta).
3. Le opzioni della **3ª dimensione** vengono filtrate in base **alla 1ª e alla 2ª** selezione.
4. La combinazione selezionata risolve in una **variante specifica (codice articolo)**. Solo le combinazioni esistenti (con una variante reale) sono selezionabili: le altre **non vengono mostrate** (o sono disabilitate).

### 4.3 Requisiti tecnici
- Il sistema deve conoscere, per ogni combinazione valida di dimensioni **all'interno di un Articolo**, la **variante (codice articolo)** corrispondente con prezzo, confezione/multiplo e disponibilità.
- Il numero di livelli di dimensione deve essere **configurabile** (almeno 1, tipicamente fino a 3). Prevedere flessibilità per Articoli con meno di 3 dimensioni o con una sola variante.

### 4.4 Scheda prodotto: griglia d'ordine delle varianti
Soluzione adottata per la presentazione delle varianti sulla scheda prodotto, pensata per il B2B (i rivenditori ordinano spesso più misure insieme):

- **Testata = Articolo.** In alto: galleria immagini, **colore** e **descrizione AI**. Poiché il colore è una proprietà dell'Articolo, una scheda mostra **un solo colore**; gli articoli di colore diverso sono Articoli distinti → prevedere uno **switcher di colore** che porta all'Articolo corrispondente. **[DA CONFERMARE]**
- **Corpo = griglia d'ordine.** Tutte le Varianti dell'Articolo sono elencate **in tabella**, una per riga, con:
  - **dimensioni** + codice articolo;
  - **prezzo**: listino barrato − sconto % = **netto** (IVA esclusa), secondo §7;
  - **disponibilità binaria** "disponibile / non disponibile" (§10); righe non disponibili con campo quantità disabilitato;
  - **campo quantità** con incrementi pari al **multiplo d'ordine** (§5).
- **Aggiunta in blocco.** Un unico pulsante **"Aggiungi al carrello"** inserisce tutte le quantità valorizzate in una sola azione; in quel momento scatta il **controllo giacenza** (§10.4).
- **Molte varianti.** Se le combinazioni sono numerose (3 dimensioni piene), i **menu a tendina a cascata (§4.2) fungono da filtro** sopra la griglia, che mostra solo le varianti corrispondenti alla selezione.
- **Articolo con una sola variante** (es. ex "articoli senza linea"): nessuna griglia, si mostra una **riga singola** con prezzo, disponibilità e quantità.

**Esempio** (Articolo *Vaso Toscana* — colore terracotta; prezzi IVA esclusa):

| Dimensioni | Cod. Integra | Prezzo | Disponibilità | Quantità |
|------------|--------------|--------|---------------|----------|
| Ø18 · h 30 cm | 100231 | ~~€ 10,00~~ −20% → **€ 8,00** /pz | disponibile | 12 (conf. da 6) |
| Ø22 · h 40 cm | 100232 | ~~€ 14,00~~ −20% → **€ 11,20** /pz | disponibile | 6 (conf. da 6) |
| Ø26 · h 50 cm | 100233 | **€ 16,00** /pz | non disponibile | — (disabilitata) |

> In fondo alla griglia: totale delle righe valorizzate e pulsante unico **"Aggiungi al carrello"**.

---

## 5. Quantità e confezioni multiple

- Alcune varianti sono vendute in **confezioni** (es. confezione da 6 pezzi).
- Ogni variante ha un parametro **"multiplo d'ordine"** (default = 1).
- Quando il multiplo è > 1, il cliente deve poter ordinare **solo in multipli** di tale valore (es. 6, 12, 18…).
- L'interfaccia di inserimento quantità deve:
  - proporre incrementi/decrementi pari al multiplo;
  - bloccare/segnalare l'inserimento di quantità non valide (es. 7 quando il multiplo è 6), arrotondando o avvisando l'utente;
  - mostrare chiaramente l'unità (es. "1 confezione = 6 pz") e indicare se prezzo e quantità sono riferiti al pezzo o alla confezione **[DA CONFERMARE]**.

---

## 6. Immagini

| Entità | Numero immagini | Note |
|--------|-----------------|------|
| **Articolo** | molte (galleria) | l'Articolo porta l'intera **galleria immagini** + **colore** + **descrizione AI**; definire immagine di copertina e ordinamento |
| **Famiglia principale** | 1 | immagine rappresentativa (dato gerarchico da Integra) |
| **Raccolta** | 1 | immagine rappresentativa della collezione (gestita sul portale) |
| **Variante (codice articolo)** | nessuna propria | le immagini sono ereditate dall'Articolo; eventuale immagine specifica per variante **[DA CONFERMARE]** |

Requisiti:
- Caricamento multiplo sull'**Articolo**, con possibilità di **ordinare** le immagini e impostare una **immagine di copertina**.
- Gestione di formati e ridimensionamenti automatici (thumbnail per listino/griglia, immagine grande per la scheda).
- **[DA DEFINIRE]** limiti di peso/dimensione e numero massimo di foto per Articolo.

---

## 7. Prezzi e sconti

### 7.1 Prezzo base
- Ogni cliente è associato a **un listino di riferimento**.
- Il prezzo di partenza è quello definito nel **listino del cliente** per la **variante (codice articolo)**.

### 7.2 Tipologie di sconto
1. **Sconto cliente** – impostato sull'anagrafica del cliente (vale su tutto il catalogo).
2. **Sconto articolo** – impostato a livello di Articolo. Poiché ogni variante appartiene a **un solo Articolo**, lo sconto articolo è univoco per la variante. *(Sostituisce il "sconto linea" del requisito originale, ora che la Linea non esiste più.)* **[DA CONFERMARE]**
3. **Sconto famiglia** – impostato a livello di **Famiglia principale** e/o di **Raccolta**.
   - Poiché l'Articolo ha una Famiglia principale e può appartenere a **più Raccolte**, quando esistono più gruppi con sconto **si applica lo sconto più alto** tra Famiglia principale e Raccolte cui appartiene l'Articolo. **[DA CONFERMARE]** se lo sconto possa essere impostato solo sulla Famiglia principale o anche sulle Raccolte.

### 7.3 Regola di calcolo
Per ogni **variante** nel carrello:

1. `prezzo_base` = prezzo dal listino del cliente per la variante (codice articolo).
2. `sconto_famiglia` = **massimo** tra gli sconti della **Famiglia principale** e delle **Raccolte** cui appartiene l'**Articolo** della variante.
3. `sconto_articolo` = sconto dell'**Articolo** della variante (se presente).
4. `sconto_cliente` = sconto dell'anagrafica cliente (se presente).
5. `prezzo_netto` = `prezzo_base` ridotto secondo gli sconti applicabili.

> **[DA CONFERMARE – regola di combinazione]**
> Va deciso **come si combinano** sconto cliente, sconto articolo e sconto famiglia. Due interpretazioni tipiche:
>
> - **A) "Il maggiore vince" (best‑wins):** si applica un solo sconto, il più alto tra cliente / articolo / famiglia.
>   `prezzo_netto = prezzo_base × (1 − max(sconto_cliente, sconto_articolo, sconto_famiglia))`
> - **B) Sconti a cascata (cumulativi):** gli sconti si applicano in sequenza l'uno sull'altro.
>   `prezzo_netto = prezzo_base × (1 − sconto_cliente) × (1 − sconto_articolo) × (1 − sconto_famiglia)`
>
> La specifica del cliente è esplicita **solo** per le famiglie ("prende quello maggiore"). Si propone come **default** l'opzione **A (best‑wins)**, coerente con la logica "del maggiore" già richiesta, ma va confermato. La regola tra famiglie (massimo) resta valida in entrambi i casi.

### 7.4 Visualizzazione
- Il cliente vede **sempre il proprio prezzo netto** (già scontato), IVA esclusa.
- Si mostra inoltre il **prezzo di listino barrato** (prezzo base prima degli sconti) e lo **sconto applicato** (in percentuale), accanto al prezzo netto. Esempio: ~~€ 10,00~~ −20% → **€ 8,00**.
- Lo sconto mostrato è quello **effettivamente applicato** secondo la regola di calcolo (§7.3). **[DA CONFERMARE]** se, nel caso di più sconti combinati, esporre la singola percentuale risultante oppure il dettaglio dei singoli sconti (cliente/articolo/famiglia).

---

## 8. Ordini e stati

### 8.1 Ciclo di vita dell'ordine
Il cliente deve poter consultare i propri ordini suddivisi per stato:

| Stato | Significato |
|-------|-------------|
| **Fatto / Ricevuto** | ordine inviato dal cliente e acquisito dal sistema |
| **In lavorazione** | ordine in preparazione presso Luis S.r.l. |
| **Spedito** | merce partita |
| **Storico** | ordini chiusi/archiviati (consultabili ma non modificabili) |

- Gli stati sono gestiti lato Luis S.r.l. (back office); il cliente li vede in sola lettura.
- **[DA DEFINIRE]** se serve uno stato intermedio "annullato" e/o "in attesa di conferma".
- Ogni ordine mostra: numero, data, righe (**variante / codice articolo**, dimensioni, quantità, multiplo, prezzo netto), totale IVA esclusa, stato corrente.

### 8.2 Storico
- Lo **storico ordini** deve essere sempre disponibile al cliente e collegato in modo permanente all'anagrafica cliente (vedi §9 sul divieto di cancellazione).
- Funzione utile (da valutare): **"riordina"** a partire da un ordine storico.

---

## 9. Gestione clienti e accessi

### 9.1 Invito
- I clienti **non si auto‑registrano**: vengono **invitati** nel sistema (da parte di Luis S.r.l.).
- All'invito si associano almeno: listino di riferimento ed eventuali sconti.

### 9.2 Blocco, non cancellazione
- Un cliente, una volta nel sistema, **non può essere cancellato**, per preservare lo **storico ordini**.
- Un cliente può essere **bloccato**: in stato bloccato non può accedere/ordinare, ma i suoi dati e ordini restano nel sistema.
- Distinguere chiaramente lo stato **attivo** / **bloccato** dell'anagrafica.

### 9.3 Anagrafica cliente
Contiene almeno: dati anagrafici/fiscali, listino assegnato, sconto cliente, stato (attivo/bloccato), riferimenti per la spedizione/fatturazione.
- **Un solo utente/accesso per cliente**: ogni azienda ha un unico account. Non sono previsti accessi separati per più persone della stessa azienda (le credenziali sono eventualmente condivise internamente dal cliente).

---

## 10. Giacenza e disponibilità

### 10.1 Obiettivo
Indicare ai clienti se una variante è **disponibile o meno** a magazzino e impedire ordini non evadibili, **senza esporre le quantità esatte** di magazzino.

### 10.2 Dato di giacenza
- La giacenza è gestita a livello di **variante (codice articolo)**.
- Il valore (quantità) proviene da **Integra** ed è aggiornato tramite import Excel (§11); il portale **non ricalcola** la giacenza, la riceve.
- La quantità è **memorizzata ma non mostrata** al cliente: serve internamente per l'indicatore di disponibilità (§10.3) e per il controllo a carrello (§10.4).
- Per ogni variante si memorizza almeno: quantità disponibile e data/ora dell'ultimo aggiornamento.

### 10.3 Visualizzazione al cliente
- Al cliente si mostra **solo un indicatore binario**: **"disponibile" / "non disponibile"** (nessuna quantità numerica, nessun semaforo a fasce).
- Regola: "disponibile" quando la giacenza è > 0, "non disponibile" quando è ≤ 0. **[DA CONFERMARE]** eventuale soglia minima diversa da 0.
- L'indicatore è mostrato sulla scheda Articolo (per la variante selezionata) e, dove utile, nei risultati di catalogo.

### 10.4 Controllo disponibilità all'inserimento nel carrello
- All'**inserimento dell'articolo/variante nel carrello** il sistema **verifica che la giacenza sia sufficiente** a soddisfare la quantità richiesta (`quantità richiesta ≤ giacenza disponibile`).
- Se la quantità non è sufficiente, l'inserimento viene **bloccato/segnalato** (l'ordine non può superare la disponibilità). **[DA CONFERMARE]** il messaggio/comportamento esatto (es. proposta della quantità massima ordinabile).
- Il confronto avviene nella **stessa unità** della giacenza e tiene conto del **multiplo d'ordine** (§5): pezzi vs confezioni da chiarire (§5/§10.2). **[DA CONFERMARE]**
- Poiché l'allineamento avviene via Excel (non in tempo reale), il controllo è fatto sulla giacenza **dell'ultimo import**: il valore è quindi indicativo e può non riflettere movimenti successivi in Integra.

---

## 11. Integrazione dati con Integra

### 11.1 Principio generale
- **Integra è la fonte primaria** dei dati. Il portale è un canale di vendita allineato periodicamente.
- Lo scambio avviene su **due direzioni con canali distinti**:
  - **Lettura (Integra → portale): tutte le entità in lettura sono esposte come viste in sola lettura sul database Postgres** di Integra.
  - **Ritorno (portale → Integra): tramite automazioni di import Excel** che caricano i dati direttamente in Integra. Tali automazioni sono **sviluppate da AGOMIR S.p.A.**, software house che sviluppa e distribuisce Integra.
- Non è prevista integrazione API in tempo reale.
- I dati di ritorno comprendono almeno gli **ordini** e l'**anagrafica articoli arricchita con l'immagine associata** (vedi §11.3).
- Per i dettagli operativi (elenco completo entità/campi e viste) si rimanda al documento separato **"Richiesta dati a Integra"**, da condividere con **AGOMIR S.p.A.**.

### 11.2 Lettura (Integra → portale, viste Postgres)

**Mappatura chiave (Integra → portale).** Integra fornisce una gerarchia di aggregazione su tre livelli — **Famiglia → Linea → Codice articolo** — che sul portale diventa:

| Concetto Integra | Entità portale | Note |
|------------------|----------------|------|
| Campo **"famiglia"** | **Famiglia principale** | gerarchica, 1 per Articolo, **non modificabile** sul portale |
| Campo **"linea"** | **Articolo** | chiave di aggregazione delle varianti |
| **Codice articolo** | **Variante** | unità ordinabile |
| Più codici con la stessa "linea" | varianti **aggregate nello stesso Articolo** | |
| Più "linee" con la stessa "famiglia" | Articoli **nella stessa Famiglia principale** | |

> Sul portale **non esiste l'entità Linea**: "linea" è solo la **chiave per aggregare le varianti in Articoli**. La **Famiglia principale** arriva da Integra ed è read‑only; le **Raccolte** (Novità, Natale 2026…) sono invece **create e gestite sul portale**, non da Integra. Un codice con "linea" assente/unica genera un Articolo con una sola Variante.

Dati tipicamente letti (tutti via vista):
- **Anagrafiche clienti** (con listino assegnato, sconti, stato attivo/bloccato).
- **Listini** (prezzi **per variante / codice articolo**).
- **Catalogo**: per ogni codice articolo (Variante) i campi **"linea"** (→ Articolo) e **"famiglia"** (→ Famiglia principale), con dimensioni e multipli d'ordine.
- **Giacenze** per variante / codice articolo (§9).
- **Stato ordini / spedizioni** (giro di ritorno informativo, §8).

Requisiti della lettura:
- **Viste stabili** con struttura concordata; **[DA DEFINIRE]** i nomi/formati dei campi "linea" e "famiglia" usati per costruire Articoli e Famiglia principale.
- **Chiavi**: il **codice articolo** identifica la Variante; il campo **"linea"** identifica l'**Articolo**; il campo **"famiglia"** identifica la **Famiglia principale**; servono inoltre chiavi per cliente e listino, per fare match in *upsert* senza duplicare.
- Ogni vista espone **`updated_at`** e un **flag stato/attivo** (vedi §11.5).
- **Immagini e descrizione AI** non arrivano da Integra: sono **gestite sul portale**. Il **colore** e la descrizione possono invece arrivare da Integra. **[DA CONFERMARE]** quali campi sono affidabili in Integra (§6, §12).
- Le **Raccolte** non esistono in Integra: l'associazione Articolo↔Raccolta è gestita sul portale e indipendente dalla lettura.

### 11.3 Ritorno (portale → Integra, automazioni Excel di AGOMIR)
Il portale produce file Excel che vengono importati in Integra tramite **automazioni sviluppate da AGOMIR S.p.A.** Dati di ritorno:
- **Ordini** ricevuti dal portale (testata + righe: cliente, **variante / codice articolo**, dimensioni, quantità, multiplo, prezzo netto applicato, sconti, totale IVA esclusa).
- **Anagrafica articoli arricchita**: associazione **articolo ↔ immagine** (e, se utile, descrizione AI) generata sul portale e riportata in Integra.
- Altri dati di ritorno **proposti** (da confermare): associazioni Articolo↔Raccolta/collezioni, eventuali note/attributi aggiunti sul portale. **[DA CONFERMARE]**

Requisiti del ritorno:
- Tracciati Excel **concordati con AGOMIR** e compatibili con le automazioni di import in Integra. **[DA DEFINIRE]** i tracciati esatti.
- Generazione **su richiesta** dal back office e/o **pianificata**; **marcatura "esportato"** per evitare doppioni (in particolare per gli ordini).
- Le **immagini** (file binari) non viaggiano nell'Excel: il tracciato porta il **riferimento/URL o nome file**; modalità di trasferimento dei file da concordare con AGOMIR. **[DA DEFINIRE]**

### 11.4 Coerenza dei dati
- Definire chiaramente la **direzione "master"** di ogni dato per evitare conflitti (es. lo stato ordine può essere aggiornato in Integra e re‑importato? §8). **[DA DEFINIRE]**
- Mantenere i **codici di Integra** come identificativi anche sul portale, per garantire allineamento bidirezionale.

### 11.5 Canali di integrazione
- **Lettura → viste Postgres (sola lettura).** Tutte le entità che il portale legge da Integra sono esposte come viste: catalogo, listini/prezzi, clienti, **giacenze**, stato ordini/spedizioni. Consentono pull incrementali (filtrando su `updated_at`) e join.
- **Ritorno → automazioni Excel di AGOMIR.** I dati prodotti dal portale (ordini, anagrafica articoli con immagine, ecc.) sono importati in Integra tramite automazioni Excel sviluppate da **AGOMIR S.p.A.**
- **Una sola fonte "master" per entità**: per ogni dato un solo canale autorevole, per evitare due verità sullo stesso campo.
- Requisito trasversale: **ogni vista** espone una **chiave univoca stabile** (codici Integra), una colonna **`updated_at`** e un **flag stato/attivo (o "eliminato")**. Sono la base delle sincronizzazioni incrementali e del rilevamento delle dismissioni.

### 11.6 Entità da richiedere a Integra / AGOMIR (sintesi)
Elenco di alto livello (campi di dettaglio nel documento "Richiesta dati a Integra"). Le entità in **lettura** sono richieste come **viste Postgres**. ★ = indispensabile, ○ = richiesto in via cautelativa.

- **Catalogo**: ★ Famiglie · ★ Linee (→ Articolo) · ★ Prodotti/Varianti (codice articolo, colore, dimensioni strutturate, multiplo/confezione, UM, stato, IVA) · ○ attributi generici, EAN, peso/volume, materiale, fornitore, conversioni UM, riferimenti media.
- **Prezzi e condizioni**: ★ Listini · ★ Righe listino (prezzo per variante, IVA esclusa, validità) · ★ Sconti (cliente / articolo / famiglia, con regola di combinazione) · ○ prezzi a scaglioni, promozioni a tempo, aliquote IVA.
- **Clienti**: ★ Anagrafiche (listino assegnato, stato attivo/bloccato) · ★ Indirizzi (spedizioni multiple) · ○ dati e‑fattura, pagamenti, fido, agente, min. ordine.
- **Magazzino**: ★ Giacenze per variante (quantità, UM, `updated_at`) · ○ magazzini multipli, impegnato/in arrivo con data prevista, lead time.
- **Ordini (ritorno Integra → portale)**: ★ Stato ordine (mappatura n° portale ↔ Integra, stato, date) · ★ Spedizioni/DDT (quantità, n° DDT, tracking) · ○ fatture e stato pagamento.
- **Lookup/decodifiche**: ★ Colori, UM, stati/causali, IVA · ○ paesi, valute, lingue, classi merceologiche, corrieri.

### 11.7 Strategia di allineamento (sincronizzazione)
1. **Sorgente di verità per campo.** Integra è master per i dati gestionali; il **portale è master** per ciò che è solo suo (Raccolte, immagini, descrizioni AI, prompt banner, credenziali). L'import **non sovrascrive** i dati di portale. Lo stato ordine è master in Integra e rientra nel portale.
2. **Chiavi + upsert idempotente.** Match sempre sui codici Integra (mai sulle descrizioni); ogni import fa insert/update per chiave, ripetibile senza duplicare.
3. **Niente cancellazioni fisiche.** Ciò che sparisce da Integra si **disattiva/nasconde** (gli ordini storici referenziano articoli e clienti). Le dismissioni si rilevano via flag stato o per assenza nello snapshot completo.
4. **Full snapshot vs delta.** Snapshot completo per i dati medio‑piccoli (catalogo, listini); **delta incrementale** (`updated_at` > ultimo allineamento) per i dati frequenti/voluminosi (giacenze); **riconciliazione completa periodica** (es. notturna) per correggere derive.
5. **Watermark per entità.** Memorizzare per ogni vista l'ultimo `updated_at` elaborato e richiedere al giro successivo solo le righe cambiate.
6. **Cadenze differenziate.** Giacenze: frequente (es. ogni 15–60 min); prezzi/clienti/catalogo: giornaliero o on‑change; stato ordini: frequente. **[DA DEFINIRE]** i valori esatti.
7. **Ordine di caricamento per dipendenze.** Lookup → Famiglie → Linee/Articoli → Varianti → Listini → Prezzi → Clienti → Giacenze → Stato ordini. Le righe "orfane" vanno in **quarantena** e si ritentano, senza bloccare il resto.
8. **Staging + validazione.** Caricamento in area di staging, validazione (chiavi, tipi, integrità referenziale, prezzo ≥ 0), **report errori**, promozione delle sole righe valide. Un articolo incompleto (es. senza prezzo) si marca **non ordinabile** finché non è completo.
9. **Freschezza visibile.** Usare `updated_at` (in particolare delle giacenze) per tracciare/mostrare "dato aggiornato al…" (§10).
10. **Gestione file di ritorno (Excel AGOMIR).** Cartella "processati", checksum anti‑rielaborazione, log conteggi (letti/aggiornati/scartati/errori), **alert** sui fallimenti; tracciati concordati con AGOMIR.
11. **Round‑trip ordini.** Portale crea l'ordine → file Excel verso Integra (automazione AGOMIR) con marcatura "esportato" (anti‑doppione) → Integra lavora → stato/spedizione rientrano via **vista**.

---

## 12. Funzionalità AI

Due funzionalità basate su intelligenza artificiale: una **ricerca semantica** a disposizione del cliente e dei **banner di articoli suggeriti** posizionati nella navigazione, alimentati da prompt configurabili dall'admin.

### 12.1 Ricerca semantica (lato cliente)
- Il cliente può cercare in **linguaggio naturale**, descrivendo ciò che cerca invece di usare solo filtri o codici (es. *"trovami un vaso alto 40 cm rosso"*).
- La ricerca interpreta il **significato** della richiesta e restituisce gli **Articoli** più pertinenti, anche senza corrispondenza esatta di parole chiave.
- **L'indice semantico deve comprendere l'Articolo *e tutte le sue Varianti***: i dati di testata dell'Articolo (colore, descrizione AI, Famiglie) **da soli non bastano**. Esempio: *"vaso alto 40 cm rosso"* combina il **colore** (proprietà dell'Articolo) con l'**altezza 40 cm** (dimensione che vive sulla **Variante**); senza indicizzare le dimensioni delle varianti questa ricerca fallirebbe.
- Quando la query contiene un vincolo dimensionale, il risultato dovrebbe puntare all'Articolo e, idealmente, **pre‑selezionare la variante** che soddisfa il vincolo (es. la variante da 40 cm).
- I risultati devono rispettare le regole del portale:
  - solo Articoli/varianti **pubblicati/attivi** (§3.2);
  - prezzi mostrati secondo il **listino e gli sconti del cliente** (§7);
  - eventuale considerazione della **giacenza** (§10).
- La qualità della ricerca dipende dalla **descrizione AI dell'Articolo** e dalla **completezza degli attributi delle varianti**: vedi §12.3.

### 12.2 Banner di articoli suggeriti (prompt lato admin)
- In **vari punti della navigazione** (es. home, schede Articolo/Famiglia, pagina prodotto, carrello) compaiono **banner** che propongono un insieme di **Articoli**.
- Gli Articoli mostrati nel banner sono **selezionati dall'AI** sulla base di un **prompt definito dall'admin** (es. *"novità in cotto da interno per la stagione natalizia"*, *"best seller per fioristi"*, *"prodotti abbinabili ai vasi di grande formato"*).
- Dal pannello admin si possono configurare almeno:
  - il **prompt** che guida la selezione;
  - il **punto di navigazione / posizione** in cui mostrare il banner;
  - il **titolo** e l'aspetto del banner;
  - il **numero di articoli** da proporre;
  - l'eventuale **periodo di validità** (es. banner stagionale).
- Anche nei banner i prezzi sono mostrati secondo **listino e sconti del cliente**, e si propongono preferibilmente articoli disponibili e attivi.
- **[DA DEFINIRE]** se i risultati del banner sono **ricalcolati periodicamente** (uguali per tutti, con caching) oppure **personalizzati per singolo cliente**.

### 12.3 Aspetti tecnici trasversali
- **Modello linguistico**: Google Gemini (`gemini-2.5-flash-pro` per testo, `gemini-2.5-flash-image` per visione e generazione immagini). Parametri (API key, modello, temperatura) configurabili via `.env`. L'inferenza AI avviene su un Mini PC nella LAN con LM Studio (Qwen 27B) come fallback/alternativa. **[DA DEFINIRE]** bilanciamento dei carichi tra cloud e locale.
- **Indicizzazione delle varianti**: l'indice vettoriale deve includere gli **attributi di tutte le varianti** (dimensioni, materiali, ecc.), non solo i dati di testata dell'Articolo; richiede attributi delle varianti **completi e normalizzati** (es. altezza in cm) per supportare ricerche con vincoli dimensionali.
- **Aggiornamento indice**: ricalcolato su ogni modifica della descrizione dettagliata o delle trascrizioni immagini, oppure su richiesta (pulsante "Re‑indicizza" in admin).
- **Fallback**: quando la ricerca semantica non ritorna risultati, il sistema cade sulla ricerca full‑text tradizionale (parole chiave su nome articolo, descrizione breve, famiglia, codice).
- Nei prompt e nelle richieste all'AI **non** vanno inseriti dati sensibili dei clienti.

### 12.4 Generazione descrizione AI dell'Articolo (due livelli)

Ogni Articolo ha **due descrizioni**, entrambe generabili dall'AI e modificate manualmente dall'admin:

| Campo | Visibilità | Scopo | Generazione AI |
|-------|-----------|-------|----------------|
| **Descrizione breve** (`descrizione`) | Pubblica — scheda prodotto, catalogo, ricerca | Testo marketing / vendita (1-3 frasi). Deve vendere il prodotto: materiali, stile, uso consigliato. | Gemini elabora: nome articolo, colore, dimensioni varianti, materiali, famiglia → produce descrizione breve. |
| **Descrizione dettagliata** (`descrizioneDettagliata`) | Solo motore interno — **mai esposta al cliente** | Alimenta embedding pgvector per ricerca semantica e RAG. Deve essere ricca di particolari tecnici, visivi, materici. | Gemini elabora: tutto ciò che usa la breve + **trascrizione immagini CARICATE** + eventuali note admin. |

#### Flusso di generazione

1. **Trascrizione immagini** — per ogni immagine CARICATA (sfondo bianco) dell'Articolo, l'AI (Gemini Vision) analizza l'immagine e produce un testo che descrive: forma, materiali percepiti, texture, stile, dettagli decorativi, proporzioni, elementi presenti. Ogni trascrizione è salvata associata all'immagine e visibile/emendabile in admin.
2. **Generazione descrizione breve** — prompt system che istruisce l'AI a produrre un testo breve, accattivante, adatto al catalogo, usando: nome, colore, materiali, dimensioni salienti, famiglia.
3. **Generazione descrizione dettagliata** — prompt system che istruisce l'AI a produrre un paragrafo esteso, tecnico e descrittivo, che includa: dati strutturati dell'Articolo + tutte le varianti + trascrizioni immagini CARICATE. Questo testo è quello che verrà indicizzato nel vettore.
4. **Embedding** — la descrizione dettagliata viene vettorizzata e salvata in pgvector per la ricerca semantica (§12.1). L'embedding viene rigenerato ogni volta che cambia la descrizione dettagliata o le trascrizioni.

```
┌─────────────────────────────────────────────────────┐
│               DATI ARTICOLO                          │
│  nome · colore · materiali · famiglia               │
│  varianti (dimensioni, prezzi)                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│         TRASCRIZIONE IMMAGINI (CARICATA)            │
│  AI analizza ogni foto sfondo bianco → testo:       │
│  forma, texture, stile, dettagli visivi             │
└──────────────────┬──────────────────────────────────┘
                   │
          ┌────────┴────────┐
          ▼                  ▼
┌─────────────────┐  ┌──────────────────────────┐
│ Descrizione     │  │ Descrizione dettagliata   │
│ breve (pubblica)│  │ (solo motore ricerca)     │
│ 1-3 frasi       │  │ paragrafo esteso +        │
│ stile marketing │  │ dati + trascrizioni       │
└─────────────────┘  └───────────┬──────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  embedding →     │
                        │  pgvector        │
                        │  (ricerca sem.)  │
                        └──────────────────┘
```

#### Interfaccia admin (sezione "Generazione Descrizione" nella modale Articolo)

- **Editor descrizione breve** — textarea, modificabile manualmente. Pulsante "Genera con AI" che la rigenera.
- **Editor descrizione dettagliata** — textarea, modificabile manualmente. Pulsante "Genera con AI" che la rigenera.
- **Pannello "Trascrizioni immagini"** — elenco di tutte le immagini CARICATE dell'Articolo, ciascuna con:
  - miniatura dell'immagine;
  - textarea con la trascrizione corrente (modificabile manualmente);
  - pulsante "Trascrivi con AI" che rigenera la singola trascrizione.
- **Pulsante "Genera tutto"** — esegue l'intero flusso: trascrivi tutte le immagini → genera descrizione breve → genera descrizione dettagliata → embedding.
- Tutti i campi sono salvati singolarmente e mai sovrascritti automaticamente senza conferma.

### 12.5 Ricerca per immagine (similarità visiva)

Il cliente può caricare una propria foto per trovare articoli visivamente simili, senza dover descrivere a parole ciò che cerca.

#### Flusso

1. Il cliente carica un'immagine (drag‑drop o file picker) in un'apposita zona nella pagina di ricerca.
2. L'immagine viene inviata all'AI (Gemini Vision) che la **trascrive** in testo: descrive forma, colore, stile, materiali percepiti, texture.
3. La trascrizione viene usata come query di ricerca semantica su pgvector (cosine similarity sul campo `descrizione_dettagliata` degli Articoli, che già include le trascrizioni delle immagini CARICATE).
4. I risultati sono mostrati in una griglia di Articoli ordinati per similarità (score), con prezzi secondo listino cliente e indicatori di disponibilità.

```
foto cliente ──→ AI (Gemini Vision) ──→ trascrizione
                                              │
                                              ▼
                                   ricerca vettoriale
                                   (pgvector cosine sim)
                                              │
                                              ▼
                                   articoli simili
                                   ordinati per score
```

#### Requisiti
- L'immagine caricata **non viene salvata** (solo analizzata dall'AI, poi scartata).
- Limite di peso upload: 10 MB. Formati: JPEG, PNG, WebP.
- Se la trascrizione non produce match utili (score sotto soglia configurabile), mostrare messaggio "Nessun articolo simile trovato" senza fallback su ricerca testuale per evitare risultati fuorvianti.
- Il risultato deve includere un indicatore di confidenza visiva (es. "Match al 78%").

---

## 13. Riepilogo requisiti → funzionalità

| # | Requisito | Sezione |
|---|-----------|---------|
| 1 | Modello catalogo da Integra: **Famiglia principale → Articolo → Variante** (codice articolo); **Raccolte** secondarie gestite sul portale | §3 |
| 2 | Scheda prodotto a **griglia d'ordine** (varianti in riga, quantità multipla, add in blocco); cascata come filtro se molte varianti | §4 |
| 3 | Confezioni / quantità multipla obbligatoria (per variante) | §5 |
| 4 | Galleria foto + **colore** + **descrizione AI sull'Articolo**; 1 immagine su Famiglia principale e su Raccolta | §6 |
| 5 | Listino per cliente (per variante) + sconto cliente/articolo/famiglia (max tra Famiglia principale e Raccolte) | §7 |
| 6 | Stati ordine: fatto, in lavorazione, spedito, storico | §8 |
| 7 | Clienti invitati; blocco senza cancellazione per mantenere lo storico | §9 |
| 8 | Giacenza da Integra; al cliente solo "disponibile/non disponibile" + controllo quantità a carrello | §10 |
| 9 | Integrazione Integra: **lettura via viste Postgres**, **ritorno via Excel (automazioni AGOMIR)**; strategia di sincronizzazione | §11 |
| 10 | Ricerca semantica AI su **Articolo + tutte le varianti** (anche dimensioni) + banner con prompt admin | §12 |
| 11 | **Descrizione AI a due livelli**: breve (pubblica) + dettagliata (solo motore, con trascrizioni immagini) | §12.4 |
| 12 | **Ricerca per immagine**: upload foto cliente → trascrizione AI → similarità vettoriale su pgvector | §12.5 |

---

## 14. Punti da definire (riepilogo decisioni aperte)

1. **Sconto "articolo"**: conferma che il vecchio "sconto linea" diventa uno sconto a livello di Articolo. (§7.2)
2. **Regola di combinazione sconti** cliente/articolo/famiglia: best‑wins (default proposto) o cascata? (§7.3)
3. **Quantità riferita** al pezzo o alla confezione, sia per prezzo sia per inserimento. (§5)
4. **Immagine specifica per variante**: prevista o solo galleria di Articolo? (§6)
5. **Stati ordine aggiuntivi** (annullato, in attesa conferma). (§8.1)
6. **Limiti immagini** per Articolo (numero, peso, formati). (§6)
7. **Switcher di colore** tra Articoli "stesso prodotto, colori diversi": previsto? come si riconoscono gli articoli correlati? (§4.4)
8. **Pagamenti/spedizioni**: in scope o gestiti offline? (§1)
9. **Tracciati Excel** import/export con Integra: struttura colonne, chiavi univoche, nomi dei campi "linea"/"famiglia", frequenza/automazione; quali campi (colore, descrizione) arrivano da Integra. (§11)
10. **Famiglia vs Raccolta — esempi**: quali tra "Cotto da Interno", "Capi" sono **Famiglie principali (Integra)** e quali "Novità"/"Natale 2026" sono **Raccolte di portale**? (§3.1)
11. **Sconto su Raccolte**: lo sconto famiglia si imposta solo sulla Famiglia principale o anche sulle Raccolte? (§7.2)
12. **Import e Raccolte**: confermare che le associazioni Articolo↔Raccolta non vengano toccate dall'import Integra. (§11.2)
13. **Direzione "master" dei dati** (es. stato ordine: aggiornato in Integra e re‑importato?). (§11.4)
14. **Descrizione AI dell'Articolo**: generata sul portale o importata? mostrata al cliente? (§12.3)
15. **AI – banner**: risultati uguali per tutti (ricalcolati periodicamente) o personalizzati per cliente? (§12.2)
16. **AI – modello/servizio** e costi/limiti; aggiornamento dell'indice (Articolo + varianti) al variare del catalogo. (§12.3)
17. **Trascrizione immagini**: la trascrizione generata dall'AI va salvata per singola immagine o per Articolo (aggregata)? Proposta: per singola immagine CARICATA, poi aggregata nella descrizione dettagliata. (§12.4)
18. **Ricerca per immagine**: soglia minima di cosine similarity sotto cui non mostrare risultati. Proposta: 0.65 come default configurabile. (§12.5)
19. **Ricerca per immagine**: l'immagine caricata dal cliente è analizzata e scartata, o va conservata per audit/log? Proposta: scartata, non salvata. (§12.5)
20. **Generazione descrizione**: il pulsante "Genera tutto" deve chiedere conferma prima di sovrascrivere modifiche manuali? Proposta: sì, con avviso "Questa operazione sovrascriverà le descrizioni e trascrizioni modificate manualmente. Continuare?". (§12.4)

---

## 15. Setup e avviamento in sviluppo

### 15.1 Prerequisiti
- **Node.js** 18+
- **PostgreSQL** 16+ in esecuzione (per il backend)
- **OpenSSL** (per generare certificati HTTPS)
  - Su Windows: installare da https://slproweb.com/products/Win32OpenSSL.html oppure usare **Git Bash** (contiene OpenSSL)
  - Su macOS/Linux: normalmente pre-installato

### 15.2 Avviamento del progetto

#### Step 1: Variabili d'ambiente
Creare/verificare i file `.env` per frontend e backend:
- **backend/.env** — include `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GEMINI_API_KEY`, ecc.
- **frontend/.env.local** — qualsiasi configurazione frontend necessaria

#### Step 2: Installazione dipendenze
```bash
# backend
cd backend
npm install
npm run prisma:generate  # genera Prisma Client

# frontend
cd ../frontend
npm install
```

#### Step 3: Database (backend)
```bash
cd backend
npm run prisma:migrate  # applica le migration
npm run seed            # popola admin, permission groups, clienti di test
```

#### Step 4: Avviamento in sviluppo (HTTP con secure context per microfono)

**SCELTA ADOTTATA: HTTP + flag Chrome per secure context**

Il sito è accessibile in **HTTP** sulla LAN, ma con un'eccezione Chrome che lo tratta come **secure context** (abilita microfono, Web Speech API, geolocalizzazione). Questa è la soluzione più semplice per dev senza complicazioni di certificati.

**Procedura:**

1. **Avvia il sito in HTTP** (default):
   ```bash
   npm run dev
   ```
   Il server risponde su `http://localhost:3000` e `http://192.168.0.164:3000` (accessibile dalla LAN).

2. **Sul PC/browser che testa da IP** — abilita Chrome per trattare l'origine come sicura:
   - Apri `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
   - Nella casella di testo, incolla: `http://192.168.0.164:3000`
   - Imposta il dropdown a **Enabled**
   - Clicca **Relaunch** (riavvia Chrome)
   - Adesso accedi a `http://192.168.0.164:3000` → **microfono abilitato**

3. **Verifica che il microfono funziona**:
   - Accedi al pannello admin
   - Modifica un articolo → scheda "Ambienta AI" o "Descrizione" → wizard con dettato vocale
   - Il pulsante microfono deve essere attivo (non disabilitato)

**Perché HTTP + flag instead di HTTPS?**
- I certificati self-signed per IP non sono accettati da Chrome (nemmeno con workaround)
- HTTPS richiederebbe **mkcert** per una CA locale fidata (vedi §15.3 sotto)
- L'eccezione Chrome è sufficiente per dev e non richiede installazioni aggiuntive

**Alternativa: HTTPS con mkcert fidato** (se serve vero HTTPS su IP):
- Vedi §15.3 sotto per la procedura completa

#### Step 5: Backend in sviluppo
```bash
cd backend
npm run start:dev
```
Il backend ascolta su `http://localhost:3001` e serve i dati al frontend via proxy.

#### Step 6: Test setup
Accedi con le credenziali di test:
- **Admin**: email=`${ADMIN_EMAIL}` / password=`${ADMIN_PASSWORD}` (da `.env`)
- **Cliente test**: `cliente1@fiorista.it` / `Cliente2026!` (creato dal seed)

### 15.3 HTTPS con certificati fidati su IP della LAN (mkcert) — FACOLTATIVO

**⚠️ Opzione avanzata — non richiesta per development normale.**

Se preferisci vero HTTPS invece di HTTP + flag Chrome (§15.4), puoi usare **mkcert** per generare certificati fidati localmente. Questa procedura è utile se vuoi evitare il flag Chrome oppure testare su dispositivi dove il flag non è configurabile (es. smartphone sulla LAN).

1. **Su Windows, installa mkcert**:
   ```powershell
   winget install FiloSottile.mkcert
   mkcert -install  # installa una CA locale nel trust store (richiede UAC)
   ```

2. **Genera certificati fidati**:
   ```bash
   cd frontend
   mkcert -key-file luis-dev-key.pem -cert-file luis-dev-cert.pem \
     localhost 127.0.0.1 192.168.0.164
   ```
   Adesso `luis-dev-cert.pem` è firmato dalla CA locale e **fidato** sul PC.

3. **Sull'altro PC (col microfono)**:
   - Estrai il root CA di mkcert: `mkcert -CAROOT` (mostra il percorso)
   - Importa il file `.pem` tra le "Autorità di certificazione radice attendibili" (su Windows: doppio-clic → Installa)
   - Adesso `https://192.168.0.164:3000` è fidato anche su quel PC → **microfono abilitato**

### 15.4 Dati e fixture di test
- **Clienti di test** nel seed: `cliente1@fiorista.it`, `verde.giardini@example.it` (password: `Cliente2026!`)
- **Admin**: configurato da `.env` (default in template: `admin@luissrl.it` / `LuisAdmin2026!`)
- **Articoli di test**: importare dal file Excel di test o creare manualmente nel pannello admin

### 15.5 Recap per agente successivo

**Setup minimo (5 minuti):**
1. Installa dipendenze: `npm install` (backend + frontend)
2. Configura `.env` (DATABASE_URL, ADMIN_EMAIL/PASSWORD, GEMINI_API_KEY)
3. Setup DB: `npm run prisma:migrate && npm run seed` (backend)
4. Avvia: `npm run dev` (frontend HTTP) + `npm run start:dev` (backend)
5. Accedi a `http://localhost:3000` con credenziali admin
6. **Per testare da IP sulla LAN**: accedi a `http://192.168.0.164:3000` dopo aver impostato il flag Chrome (vedi §15.4 step 2)

**Troubleshooting**:
- Microfono non funziona? Verifica il flag Chrome su `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
- Errore DB? Controlla `DATABASE_URL` in `.env`
- CORS? Backend e frontend devono trovarsi entrambi in ascolto (porta 3001 e 3000)
- HMR non funziona? Verifica che Next dev sia partito con `npm run dev` (non `next dev`)

---

*Documento di lavoro: le sezioni marcate **[DA DEFINIRE]/[DA CONFERMARE]** richiedono validazione con Luis S.r.l. prima dello sviluppo.*
