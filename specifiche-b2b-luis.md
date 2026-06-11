# Specifiche funzionali – Piattaforma B2B Luis S.r.l.

**Cliente:** Luis S.r.l. – Via F. Bellafino 28/30 (Centro Galassia), 24126 Bergamo
**Settore:** commercio all'ingrosso di articoli per fioristi e garden (vasi in ceramica, cotto portoghese, materiale per allestimenti)
**Tipo progetto:** portale e‑commerce B2B riservato ai clienti rivenditori
**Versione documento:** bozza 1.9
**Data:** 5 giugno 2026

> Aggiornamento v1.9: definita la **scheda prodotto a griglia d'ordine** (§4.4): testata = Articolo (foto, colore, descrizione AI), corpo = tutte le Varianti in tabella con prezzo, disponibilità binaria e quantità a multiplo, con **"Aggiungi al carrello" in blocco**; la cascata (§4.2) fa da filtro quando le varianti sono molte. Incluso esempio.
> Aggiornamento v1.8: gestione **giacenza** — al cliente solo "disponibile/non disponibile"; controllo quantità sufficiente all'inserimento nel carrello.
> Aggiornamento v1.7: gerarchia da Integra **Famiglia principale → Articolo → Variante** (read‑only) + **Raccolte** di portale.

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
| **Variante (codice Integra)** | **Unità ordinabile.** Ogni **codice Integra corrisponde a una variante**. Appartiene a **un solo Articolo**. Ha dimensioni/attributi, eventuale confezione/multiplo d'ordine, una **giacenza**, prende il prezzo dal listino del cliente e porta tutti i dati provenienti dal gestionale. |
| **Famiglia (principale)** | Raggruppamento **gerarchico** che arriva da **Integra**: ogni Articolo ha **una sola** Famiglia principale. È **non modificabile** lato portale B2B (read‑only). Ha **una sola immagine**. |
| **Raccolta (collezione di portale)** | Raggruppamento **secondario** di tipo raccolta/etichetta (es. "Novità", "Natale 2026"), **gestito e modificabile sul portale**. Un Articolo può stare in **più Raccolte** (o in nessuna). Ha **una sola immagine**. *(Il cliente/utente può chiamarle anch'esse "famiglie".)* |
| **Dimensione (attributo)** | Caratteristica della Variante (es. altezza, diametro) usata per selezionare la variante dentro l'Articolo. Filtri a cascata. (Il **colore** è invece una proprietà dell'Articolo.) |
| **Giacenza** | Quantità disponibile a magazzino **per variante (codice Integra)**, mostrata al cliente. Aggiornata via import da Integra. |
| **Listino** | Insieme di prezzi **per variante (codice Integra)**. Ogni cliente è associato a un listino di riferimento. |
| **Cliente** | Rivenditore invitato. Ha un listino assegnato e sconti (cliente / articolo / famiglia). Può essere **bloccato ma mai cancellato**. |
| **Ordine** | Documento d'acquisto del cliente, con un proprio stato di avanzamento. |
| **Integra** | Gestionale aziendale, **fonte primaria dei dati**. Scambio con il portale tramite file **Excel**. Fornisce la gerarchia di aggregazione **Famiglia → Linea → Codice**, che sul portale diventa **Famiglia principale → Articolo → Variante**. |

---

## 3. Catalogo: famiglie, articoli, varianti e raccolte

### 3.1 Struttura di raggruppamento
Il catalogo riflette la gerarchia di aggregazione di Integra, più le raccolte gestite sul portale:

- **Famiglia principale = raggruppamento gerarchico (da Integra).** Ogni Articolo ha **una sola** Famiglia principale. È **non modificabile** lato portale.
- **Articolo = entità "prodotto".** Porta **immagini, colore e descrizione AI**. È ciò che il cliente vede a catalogo e ciò che la ricerca semantica indicizza. Ha **1..N Varianti**.
- **Variante (codice Integra) = unità ordinabile.** Ogni codice Integra è una variante con proprie dimensioni, prezzo (da listino), multiplo, giacenza e tutti i dati provenienti dal gestionale.
- **Raccolta = raggruppamento secondario (di portale).** Collezioni/etichette (es. `Novità`, `Natale 2026`) **gestite e modificabili sul portale**: un Articolo può appartenere a **più Raccolte** (o a nessuna).

Relazioni:

```
Famiglia principale (1) ──< Articolo (1) ──< Variante (codice Integra)   [da Integra, gerarchico]
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
4. La combinazione selezionata risolve in una **variante specifica (codice Integra)**. Solo le combinazioni esistenti (con una variante reale) sono selezionabili: le altre **non vengono mostrate** (o sono disabilitate).

### 4.3 Requisiti tecnici
- Il sistema deve conoscere, per ogni combinazione valida di dimensioni **all'interno di un Articolo**, la **variante (codice Integra)** corrispondente con prezzo, confezione/multiplo e disponibilità.
- Il numero di livelli di dimensione deve essere **configurabile** (almeno 1, tipicamente fino a 3). Prevedere flessibilità per Articoli con meno di 3 dimensioni o con una sola variante.

### 4.4 Scheda prodotto: griglia d'ordine delle varianti
Soluzione adottata per la presentazione delle varianti sulla scheda prodotto, pensata per il B2B (i rivenditori ordinano spesso più misure insieme):

- **Testata = Articolo.** In alto: galleria immagini, **colore** e **descrizione AI**. Poiché il colore è una proprietà dell'Articolo, una scheda mostra **un solo colore**; gli articoli di colore diverso sono Articoli distinti → prevedere uno **switcher di colore** che porta all'Articolo corrispondente. **[DA CONFERMARE]**
- **Corpo = griglia d'ordine.** Tutte le Varianti dell'Articolo sono elencate **in tabella**, una per riga, con:
  - **dimensioni** + codice Integra;
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
| **Variante (codice Integra)** | nessuna propria | le immagini sono ereditate dall'Articolo; eventuale immagine specifica per variante **[DA CONFERMARE]** |

Requisiti:
- Caricamento multiplo sull'**Articolo**, con possibilità di **ordinare** le immagini e impostare una **immagine di copertina**.
- Gestione di formati e ridimensionamenti automatici (thumbnail per listino/griglia, immagine grande per la scheda).
- **[DA DEFINIRE]** limiti di peso/dimensione e numero massimo di foto per Articolo.

---

## 7. Prezzi e sconti

### 7.1 Prezzo base
- Ogni cliente è associato a **un listino di riferimento**.
- Il prezzo di partenza è quello definito nel **listino del cliente** per la **variante (codice Integra)**.

### 7.2 Tipologie di sconto
1. **Sconto cliente** – impostato sull'anagrafica del cliente (vale su tutto il catalogo).
2. **Sconto articolo** – impostato a livello di Articolo. Poiché ogni variante appartiene a **un solo Articolo**, lo sconto articolo è univoco per la variante. *(Sostituisce il "sconto linea" del requisito originale, ora che la Linea non esiste più.)* **[DA CONFERMARE]**
3. **Sconto famiglia** – impostato a livello di **Famiglia principale** e/o di **Raccolta**.
   - Poiché l'Articolo ha una Famiglia principale e può appartenere a **più Raccolte**, quando esistono più gruppi con sconto **si applica lo sconto più alto** tra Famiglia principale e Raccolte cui appartiene l'Articolo. **[DA CONFERMARE]** se lo sconto possa essere impostato solo sulla Famiglia principale o anche sulle Raccolte.

### 7.3 Regola di calcolo
Per ogni **variante** nel carrello:

1. `prezzo_base` = prezzo dal listino del cliente per la variante (codice Integra).
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
- Ogni ordine mostra: numero, data, righe (**variante / codice Integra**, dimensioni, quantità, multiplo, prezzo netto), totale IVA esclusa, stato corrente.

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
- La giacenza è gestita a livello di **variante (codice Integra)**.
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

## 11. Integrazione dati con Integra (import/export Excel)

### 11.1 Principio generale
- **Integra è la fonte primaria** dei dati. Il portale è un canale di vendita allineato periodicamente.
- Lo scambio avviene tramite **file Excel**, non via API in tempo reale.
- **Verso il portale (import):** dati anagrafici e di catalogo.
- **Dal portale (export):** dati generati dall'uso, in primo luogo gli ordini.

### 11.2 Import (Integra → portale, Excel)

**Mappatura chiave (Integra → portale).** Integra fornisce una gerarchia di aggregazione su tre livelli — **Famiglia → Linea → Codice** — che sul portale diventa:

| Concetto Integra | Entità portale | Note |
|------------------|----------------|------|
| Campo **"famiglia"** | **Famiglia principale** | gerarchica, 1 per Articolo, **non modificabile** sul portale |
| Campo **"linea"** | **Articolo** | chiave di aggregazione delle varianti |
| **Codice Integra** | **Variante** | unità ordinabile |
| Più codici con la stessa "linea" | varianti **aggregate nello stesso Articolo** | |
| Più "linee" con la stessa "famiglia" | Articoli **nella stessa Famiglia principale** | |

> Sul portale **non esiste l'entità Linea**: "linea" è solo la **chiave per aggregare le varianti in Articoli**. La **Famiglia principale** arriva da Integra ed è read‑only; le **Raccolte** (Novità, Natale 2026…) sono invece **create e gestite sul portale**, non da Integra. Un codice con "linea" assente/unica genera un Articolo con una sola Variante.

Dati tipicamente importati:
- **Anagrafiche clienti** (con listino assegnato, sconti, stato attivo/bloccato).
- **Listini** (prezzi **per variante / codice Integra**).
- **Catalogo**: per ogni codice Integra (Variante) i campi **"linea"** (→ Articolo) e **"famiglia"** (→ Famiglia principale), con dimensioni e multipli d'ordine.
- **Giacenze** per variante / codice Integra (§9).

Requisiti dell'import:
- Tracciato Excel **definito e stabile** (un foglio/tracciato per tipologia di dato), con colonne e formati concordati. **[DA DEFINIRE]** i tracciati esatti, **inclusi i nomi/formati dei campi "linea" e "famiglia"** usati per costruire Articoli e Famiglia principale.
- **Chiavi**: il **codice Integra** identifica la Variante; il campo **"linea"** identifica l'**Articolo**; il campo **"famiglia"** identifica la **Famiglia principale**; servono inoltre chiavi per cliente e listino, per fare match in *upsert* senza duplicare.
- Gestione **errori e validazione**: righe non valide segnalate in un report, senza bloccare l'intero file.
- **Immagini, colore e descrizione AI**: il colore e (eventualmente) la descrizione possono arrivare da Integra, mentre **le immagini non passano dall'Excel**; sono associati all'**Articolo** e agganciati tramite "linea"/codice Articolo. **[DA CONFERMARE]** quali campi arrivano da Integra e quali si gestiscono sul portale (§6, §12).
- Le **Raccolte** non arrivano da Integra: l'associazione Articolo↔Raccolta è gestita sul portale e **non viene sovrascritta** dall'import. **[DA CONFERMARE]**
- **[DA DEFINIRE]** frequenza e modalità: caricamento manuale di un file vs. cartella monitorata/pianificazione automatica.

### 11.3 Export (portale → Integra/Luis, Excel)
Dati tipicamente esportati:
- **Ordini** ricevuti dal portale (testata + righe: cliente, **variante / codice Integra**, dimensioni, quantità, multiplo, prezzo netto applicato, sconti, totale IVA esclusa).
- Eventualmente: elenco clienti/anagrafiche aggiornate dal portale, se previsto.

Requisiti dell'export:
- Tracciato Excel **compatibile con l'import in Integra**. **[DA DEFINIRE]** il tracciato esatto.
- Export **su richiesta** dal back office e/o **pianificato**; evitare doppie esportazioni dello stesso ordine (marcatura "esportato").

### 11.4 Coerenza dei dati
- Definire chiaramente la **direzione "master"** di ogni dato per evitare conflitti (es. lo stato ordine può essere aggiornato in Integra e re‑importato? §8). **[DA DEFINIRE]**
- Mantenere i **codici di Integra** come identificativi anche sul portale, per garantire allineamento bidirezionale.

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

### 12.3 Aspetti tecnici e da definire
- **Descrizione AI dell'Articolo**: **[DA DEFINIRE]** come viene prodotta (generata dall'AI sul portale a partire dai dati di Articolo/varianti, oppure importata/redatta) e se è anche **mostrata al cliente** oltre che usata per la ricerca; prevedere modifica/approvazione lato admin.
- **Indicizzazione delle varianti**: l'indice deve includere gli **attributi di tutte le varianti** (dimensioni, ecc.), non solo i dati di testata dell'Articolo; richiede attributi delle varianti **completi e normalizzati** (es. altezza in cm) per supportare ricerche con vincoli dimensionali.
- **[DA DEFINIRE]** modello/servizio AI da utilizzare e relativi costi/limiti.
- **[DA DEFINIRE]** quando e come **aggiornare l'indice semantico** al variare del catalogo (tipicamente agganciato all'import Excel da Integra, §11).
- **[DA DEFINIRE]** gestione dei casi senza risultati pertinenti (fallback su ricerca tradizionale per parole chiave/filtri).
- Nei prompt e nelle richieste all'AI **non** vanno inseriti dati sensibili dei clienti.

---

## 13. Riepilogo requisiti → funzionalità

| # | Requisito | Sezione |
|---|-----------|---------|
| 1 | Modello catalogo da Integra: **Famiglia principale → Articolo → Variante** (codice Integra); **Raccolte** secondarie gestite sul portale | §3 |
| 2 | Scheda prodotto a **griglia d'ordine** (varianti in riga, quantità multipla, add in blocco); cascata come filtro se molte varianti | §4 |
| 3 | Confezioni / quantità multipla obbligatoria (per variante) | §5 |
| 4 | Galleria foto + **colore** + **descrizione AI sull'Articolo**; 1 immagine su Famiglia principale e su Raccolta | §6 |
| 5 | Listino per cliente (per variante) + sconto cliente/articolo/famiglia (max tra Famiglia principale e Raccolte) | §7 |
| 6 | Stati ordine: fatto, in lavorazione, spedito, storico | §8 |
| 7 | Clienti invitati; blocco senza cancellazione per mantenere lo storico | §9 |
| 8 | Giacenza da Integra; al cliente solo "disponibile/non disponibile" + controllo quantità a carrello | §10 |
| 9 | Import dati da Integra via Excel (riga = codice Integra); export ordini in Excel | §11 |
| 10 | Ricerca semantica AI su **Articolo + tutte le varianti** (anche dimensioni) + banner con prompt admin | §12 |

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

---

*Documento di lavoro: le sezioni marcate **[DA DEFINIRE]/[DA CONFERMARE]** richiedono validazione con Luis S.r.l. prima dello sviluppo.*
