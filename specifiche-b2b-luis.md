# Specifiche funzionali – Piattaforma B2B Luis S.r.l.

**Cliente:** Luis S.r.l. – Via F. Bellafino 28/30 (Centro Galassia), 24126 Bergamo
**Settore:** commercio all'ingrosso di articoli per fioristi e garden (vasi in ceramica, cotto portoghese, materiale per allestimenti)
**Tipo progetto:** portale e‑commerce B2B riservato ai clienti rivenditori
**Versione documento:** bozza 1.3
**Data:** 5 giugno 2026

> Aggiornamento v1.3: aggiunta sezione **Funzionalità AI** — ricerca semantica lato cliente e banner di articoli suggeriti guidati da prompt configurabili lato admin.
> Aggiornamento v1.2: chiarita la struttura di catalogo — la **Linea** è la **famiglia principale** (una sola, obbligatoria per articolo); le **Famiglie** sono i raggruppamenti **secondari** (N per articolo: es. "Cotto da Interno", "Capi", "Novità", "Natale 2026"). Entrambe collegate direttamente all'articolo.
> Aggiornamento v1.1: aggiunta gestione **giacenza** visibile ai clienti e definizione dei flussi **import/export Excel** con il gestionale **Integra**.

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
| **Linea** | **Famiglia principale** dell'articolo: classificazione obbligatoria, **una sola per articolo**. È il raggruppamento "ufficiale" a catalogo (collezione/serie di prodotti). Ha **una sola immagine**. |
| **Famiglia** | Raggruppamento **secondario** di tipo raccolta/etichetta (es. "Cotto da Interno", "Capi", "Novità", "Natale 2026"). Un articolo può appartenere a **più famiglie** (o a nessuna). Ha **una sola immagine**. |
| **Articolo** | Prodotto vendibile. Appartiene a **una Linea** e a **zero o più Famiglie**. Ha **molte immagini**, dimensioni (attributi), eventuale confezione/multiplo d'ordine, una **giacenza**, e prende il prezzo dal listino del cliente. |
| **Dimensione (attributo)** | Caratteristica selezionabile dell'articolo (es. altezza, diametro, colore). Filtri a cascata. |
| **Giacenza** | Quantità disponibile a magazzino per articolo/variante, mostrata al cliente. Aggiornata via import da Integra. |
| **Listino** | Insieme di prezzi per articolo. Ogni cliente è associato a un listino di riferimento. |
| **Cliente** | Rivenditore invitato. Ha un listino assegnato e sconti (cliente / linea / famiglia). Può essere **bloccato ma mai cancellato**. |
| **Ordine** | Documento d'acquisto del cliente, con un proprio stato di avanzamento. |
| **Integra** | Gestionale aziendale, **fonte primaria dei dati**. Scambio con il portale tramite file **Excel** (import verso il sito, export dal sito). |

---

## 3. Catalogo: linee, famiglie e articoli

### 3.1 Struttura di raggruppamento
La classificazione si appoggia su due raggruppamenti, entrambi collegati **direttamente all'articolo**:

- **Linea = famiglia principale.** Ogni articolo appartiene a **una sola Linea** (obbligatoria), che ne determina la collocazione "ufficiale" a catalogo.
- **Famiglia = raggruppamento secondario.** Ogni articolo può essere associato a **una o più Famiglie** (oppure a nessuna), di tipo "raccolta/etichetta" (es. `Cotto da Interno`, `Capi`, `Novità`, `Natale 2026`).

Relazioni:

```
Linea  (1) ──────< Articolo      (un articolo ha 1 sola Linea)
Famiglia (N) >────< Articolo      (un articolo può stare in più Famiglie)
```

- Le Famiglie servono per la navigazione e per le promozioni; **non** sostituiscono la Linea principale.
- Lo stesso articolo deve poter comparire in più sezioni del catalogo (la sua Linea + le sue Famiglie) **senza essere duplicato**.

> Nota terminologica: ciò che commercialmente è la "famiglia principale" coincide con la **Linea**; le "famiglie" sono i raggruppamenti **secondari**. La terminologia è scelta per allinearsi al linguaggio di Luis/Integra.

### 3.2 Stato di pubblicazione
- Linee, famiglie e articoli devono poter essere **attivati/disattivati** (visibili o nascosti) senza essere cancellati, per gestire l'assortimento stagionale.

---

## 4. Dimensioni e selezione a cascata

### 4.1 Concetto
- Ogni linea può contenere articoli con **dimensioni diverse**.
- Le dimensioni sono modellate come **attributi** dell'articolo (es. 1ª dimensione = altezza, 2ª = diametro, 3ª = colore/finitura). Il numero e il significato delle dimensioni può variare per linea/famiglia.

### 4.2 Selezione filtrata (menu a tendina a cascata)
La selezione di un articolo avviene tramite menu a tendina dipendenti:
1. Il cliente seleziona la **1ª dimensione**.
2. Le opzioni della **2ª dimensione** vengono **filtrate** in base alla 1ª selezione (mostra solo i valori effettivamente disponibili per quella scelta).
3. Le opzioni della **3ª dimensione** vengono filtrate in base **alla 1ª e alla 2ª** selezione.
4. Solo le combinazioni esistenti a catalogo (con un articolo/variante reale) devono essere selezionabili: combinazioni non disponibili **non vengono mostrate** (o vengono mostrate disabilitate).

### 4.3 Requisiti tecnici
- Il sistema deve conoscere, per ogni combinazione valida di dimensioni, l'articolo/variante corrispondente (codice, prezzo, confezione, disponibilità).
- Il numero di livelli di dimensione deve essere **configurabile** (almeno 1, tipicamente fino a 3). Prevedere flessibilità per articoli con meno di 3 dimensioni.

---

## 5. Quantità e confezioni multiple

- Alcuni articoli sono venduti in **confezioni** (es. confezione da 6 pezzi).
- Ogni articolo ha un parametro **"multiplo d'ordine"** (default = 1).
- Quando il multiplo è > 1, il cliente deve poter ordinare **solo in multipli** di tale valore (es. 6, 12, 18…).
- L'interfaccia di inserimento quantità deve:
  - proporre incrementi/decrementi pari al multiplo;
  - bloccare/segnalare l'inserimento di quantità non valide (es. 7 quando il multiplo è 6), arrotondando o avvisando l'utente;
  - mostrare chiaramente l'unità (es. "1 confezione = 6 pz") e indicare se prezzo e quantità sono riferiti al pezzo o alla confezione **[DA CONFERMARE]**.

---

## 6. Immagini

| Entità | Numero immagini | Note |
|--------|-----------------|------|
| **Linea** | 1 | immagine rappresentativa della linea |
| **Famiglia** | 1 | immagine rappresentativa della famiglia |
| **Articolo** | molte (galleria) | gestione di una galleria multipla; definire immagine principale e ordinamento |

Requisiti:
- Caricamento multiplo per gli articoli, con possibilità di **ordinare** le immagini e impostare una **immagine di copertina**.
- Gestione di formati e ridimensionamenti automatici (thumbnail per listino/griglia, immagine grande per la scheda).
- **[DA DEFINIRE]** limiti di peso/dimensione e numero massimo di foto per articolo.

---

## 6.1 Scheda articolo — layout pagina prodotto

La pagina di dettaglio dell'articolo si compone di quattro aree, disposte orizzontalmente:

### 6.1.1 Galleria miniature (estrema sinistra)
- Elenco verticale di **miniatura** delle foto dell'articolo.
- **[DA DECIDERE]** se mostrare solo le **immagini ambientate** (§11.5.2) o includere anche le **foto su sfondo bianco** (§11.5.2). Possibile opzione: separatore visivo tra i due gruppi, o filtro "sfondo bianco / ambientata".
- La miniatura selezionata appare nell'area centrale (§6.1.2).

### 6.1.2 Immagine principale (centro sinistra)
- **Immagine grande** corrispondente alla miniatura selezionata.
- Funzionalità di **ingrandimento/zoom** (es. lente o lightbox a schermo intero) per vedere i dettagli del prodotto.

### 6.1.3 Descrizione e dettagli (centro, in colonna)
- **Descrizione testuale** dell'articolo (discorsiva e per punti, §11.5.3).
- **Immagini ambientate** abbinate, eventualmente intervallate nel testo o in una mini-galleria dedicata.
- **Prezzo**: prezzo di listino barrato, sconto applicato e prezzo netto (§7.4).
- **Dettaglio sconti** applicati (cliente/linea/famiglia) — **[DA CONFERMARE]** se mostrare il dettaglio o solo la percentuale finale.

### 6.1.4 Barra acquisto e selezione varianti (destra)
- **Menu a tendina a cascata** per la selezione delle dimensioni/varianti (§4).
- Indicazione del **multiplo d'ordine** e della confezione (§5).
- Campo **quantità** con incrementi vincolati al multiplo.
- **Giacenza** disponibile (§10).
- Bottone **"Aggiungi al carrello"** (abilitato solo quando tutte le dimensioni sono selezionate e la quantità è valida).

> **Opzione alternativa (da valutare):** sostituire i menu a tendina con una **mini-galleria delle varianti** in stile Amazon, dove per ogni variante (articolo della stessa Linea) si mostra una **miniatura**, le **misure** e il **prezzo**. Il cliente seleziona la variante cliccando direttamente sulla miniatura. Questo comporta che **ogni articolo/variante deve avere una propria immagine** associata (da gestire in fase di import/caricamento, §11.5.2).

### 7.1 Prezzo base
- Ogni cliente è associato a **un listino di riferimento**.
- Il prezzo di partenza di un articolo è quello definito nel **listino del cliente** per quell'articolo (a livello di articolo/variante).

### 7.2 Tipologie di sconto
1. **Sconto cliente** – impostato sull'anagrafica del cliente (vale su tutto il catalogo).
2. **Sconto linea** – impostato a livello di Linea (la famiglia principale). Poiché l'articolo ha **una sola Linea**, lo sconto linea è univoco.
3. **Sconto famiglia** – impostato a livello di Famiglia (raggruppamenti secondari).
   - Poiché un articolo può appartenere a **più Famiglie** con sconti diversi, **si applica lo sconto famiglia più alto** tra quelli delle Famiglie a cui l'articolo è associato.

### 7.3 Regola di calcolo
Per ogni articolo nel carrello:

1. `prezzo_base` = prezzo dal listino del cliente.
2. `sconto_famiglia` = **massimo** tra gli sconti delle **Famiglie** (raggruppamenti secondari) cui appartiene l'articolo.
3. `sconto_linea` = sconto della **Linea** dell'articolo (se presente).
4. `sconto_cliente` = sconto dell'anagrafica cliente (se presente).
5. `prezzo_netto` = `prezzo_base` ridotto secondo gli sconti applicabili.

> **[DA CONFERMARE – regola di combinazione]**
> Va deciso **come si combinano** sconto cliente, sconto linea e sconto famiglia. Due interpretazioni tipiche:
>
> - **A) "Il maggiore vince" (best‑wins):** si applica un solo sconto, il più alto tra cliente / linea / famiglia.
>   `prezzo_netto = prezzo_base × (1 − max(sconto_cliente, sconto_linea, sconto_famiglia))`
> - **B) Sconti a cascata (cumulativi):** gli sconti si applicano in sequenza l'uno sull'altro.
>   `prezzo_netto = prezzo_base × (1 − sconto_cliente) × (1 − sconto_linea) × (1 − sconto_famiglia)`
>
> La specifica del cliente è esplicita **solo** per le famiglie ("prende quello maggiore"). Si propone come **default** l'opzione **A (best‑wins)**, perché coerente con la logica "del maggiore" già richiesta, ma va confermato. La regola tra famiglie (massimo) resta valida in entrambi i casi.

### 7.4 Visualizzazione
- Il cliente vede **sempre il proprio prezzo netto** (già scontato), IVA esclusa.
- Si mostra inoltre il **prezzo di listino barrato** (prezzo base prima degli sconti) e lo **sconto applicato** (in percentuale), accanto al prezzo netto. Esempio: ~~€ 10,00~~ −20% → **€ 8,00**.
- Lo sconto mostrato è quello **effettivamente applicato** secondo la regola di calcolo (§7.3). **[DA CONFERMARE]** se, nel caso di più sconti combinati, esporre la singola percentuale risultante oppure il dettaglio dei singoli sconti (cliente/linea/famiglia).

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
- Ogni ordine mostra: numero, data, righe (articolo, dimensioni, quantità, multiplo, prezzo netto), totale IVA esclusa, stato corrente.

### 8.2 Storico
- Lo **storico ordini** deve essere sempre disponibile al cliente e collegato in modo permanente all'anagrafica cliente (vedi §9 sul divieto di cancellazione).
- Funzione utile (da valutare): **"riordina"** a partire da un ordine storico.

---

## 9. Gestione clienti e accessi

### 9.0 Accesso riservato — nessuna navigazione pubblica
- Il portale B2B è **interamente riservato** agli utenti autenticati.
- Qualsiasi pagina del catalogo, scheda articolo, ricerca o funzionalità è accessibile **solo dopo login**.
- Tentativi di accesso diretto a URL protetti senza autenticazione devono essere reindirizzati alla pagina di login.
- La vetrina pubblica (sito istituzionale/e-commerce B2C) è un sito separato; questo portale non espone contenuti a utenti non loggati, nemmeno in forma parziale.

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

## 9.4 Homepage cliente — tracciamento e personalizzazione

Dopo il login, il cliente visualizza la homepage con tre sezioni basate sul tracciamento delle sue attività (ricerche e articoli visitati):

### 9.4.1 Riprendi da dove hai lasciato
- Mostra gli articoli risultati dall'**ultima ricerca** effettuata dal cliente (ricerca testuale o per immagini, §12.1), proponendoli in ordine di pertinenza.
- Se il cliente non ha ancora effettuato ricerche, la sezione non viene mostrata.

### 9.4.2 Articoli interessanti
- Collezione di articoli suggeriti dall'**AI** in base a:
  - profilo del cliente (Linee/Famiglie di interesse prevalenti);
  - storico ordini (categorie e tipologie già acquistate);
  - esclusione degli articoli **già acquistati** dal cliente.
- L'obiettivo è proporre novità e articoli affini mai comprati, favorendo scoperta e cross‑selling.
- **[DA DEFINIRE]** frequenza di ricalcolo dei suggerimenti (real‑time, giornaliero, settimanale) e se i risultati variano per singolo cliente o sono uguali per cluster.

### 9.4.3 Offerte
- Sezione dedicata alle **promozioni / offerte attive**, gestite dall'admin.
- **[DA DEFINIRE]** se le offerte sono articoli con sconto extra temporaneo (da configurare in admin) oppure semplicemente un raggruppamento di articoli marcati come "in offerta" tramite un flag o una Famiglia dedicata.

### 9.4.4 Tracciamento
Per alimentare le sezioni di cui sopra, il portale tiene traccia di:
- **ultima ricerca** del cliente (testo/immagine e risultati mostrati);
- **cronologia articoli visitati** (almeno data/ora e articolo);
- **storico ordini** (già disponibile, §8).
- I dati di tracciamento sono associati all'anagrafica cliente e non vengono condivisi.
- **[DA DEFINIRE]** durata della conservazione dei dati di navigazione (es. ultimi 30/90 giorni) e policy di privacy (informativa cookie/dati).

---

## 10. Giacenza e disponibilità

### 10.1 Obiettivo
Mostrare ai clienti **quanti pezzi sono disponibili** a magazzino per ciascun articolo, così da orientare l'ordine.

### 10.2 Dato di giacenza
- La giacenza è gestita a livello di **articolo/variante** (cioè per ogni combinazione di dimensioni esistente, §4).
- Il valore proviene da **Integra** ed è aggiornato tramite import Excel (§11); il portale **non ricalcola** la giacenza, la riceve.
- Per ogni articolo/variante si memorizza almeno: quantità disponibile e data/ora dell'ultimo aggiornamento.

### 10.3 Visualizzazione al cliente
- Mostrare la disponibilità sulla scheda articolo e, dove utile, nei risultati di catalogo.
- **[DA DEFINIRE]** modalità di visualizzazione:
  - quantità esatta (es. "120 pz disponibili"), oppure
  - a fasce/semaforo (es. "disponibile" / "scorte limitate" / "esaurito"), per non esporre i numeri esatti del magazzino ai rivenditori.
- Per gli articoli con confezione/multiplo (§5), indicare se la giacenza è espressa in **pezzi** o in **confezioni** (coerente con la scelta fatta al §5). **[DA CONFERMARE]**

### 10.4 Giacenza e ordini
- **[DA DEFINIRE]** comportamento quando la quantità ordinata supera la giacenza:
  - bloccare l'ordine alla quantità disponibile,
  - consentire l'ordine in **back‑order** (evadibile successivamente),
  - solo avviso non bloccante.
- Poiché l'allineamento avviene via Excel (non in tempo reale), la giacenza mostrata è **indicativa al momento dell'ultimo import**; valutare se mostrare la data di aggiornamento per trasparenza.

---

## 11. Integrazione dati con Integra (import/export Excel)

### 11.1 Principio generale
- **Integra è la fonte primaria** dei dati. Il portale è un canale di vendita allineato periodicamente.
- Lo scambio avviene tramite **file Excel**, non via API in tempo reale.
- **Verso il portale (import):** dati anagrafici e di catalogo.
- **Dal portale (export):** dati generati dall'uso, in primo luogo gli ordini.

### 11.2 Import (Integra → portale, Excel)
Dati tipicamente importati:
- **Anagrafiche clienti** (con listino assegnato, sconti, stato attivo/bloccato).
- **Listini** (prezzi per articolo/variante).
- **Catalogo**: linee, famiglie (principale + secondarie), articoli e relative dimensioni/varianti, multipli d'ordine.
- **Giacenze** per articolo/variante (§9).

Requisiti dell'import:
- Tracciato Excel **definito e stabile** (un foglio/tracciato per tipologia di dato), con colonne e formati concordati. **[DA DEFINIRE]** i tracciati esatti.
- **Chiave univoca** per ogni entità (es. codice articolo/variante, codice cliente, codice listino) per fare match in *upsert* (inserimento/aggiornamento) senza duplicare.
- Gestione **errori e validazione**: righe non valide segnalate in un report, senza bloccare l'intero file.
- Le **immagini** non passano dall'Excel: vengono caricate/gestite separatamente sul portale (§6); l'aggancio immagine→articolo avviene tramite il codice articolo. **[DA CONFERMARE]**
- **[DA DEFINIRE]** frequenza e modalità: caricamento manuale di un file vs. cartella monitorata/pianificazione automatica.

### 11.3 Export (portale → Integra/Luis, Excel)
Dati tipicamente esportati:
- **Ordini** ricevuti dal portale (testata + righe: cliente, articolo/variante, dimensioni, quantità, multiplo, prezzo netto applicato, sconti, totale IVA esclusa).
- Eventualmente: elenco clienti/anagrafiche aggiornate dal portale, se previsto.

Requisiti dell'export:
- Tracciato Excel **compatibile con l'import in Integra**. **[DA DEFINIRE]** il tracciato esatto.
- Export **su richiesta** dal back office e/o **pianificato**; evitare doppie esportazioni dello stesso ordine (marcatura "esportato").

### 11.4 Coerenza dei dati
- Definire chiaramente la **direzione "master"** di ogni dato per evitare conflitti (es. lo stato ordine può essere aggiornato in Integra e re‑importato? §8). **[DA DEFINIRE]**
- Mantenere i **codici di Integra** come identificativi anche sul portale, per garantire allineamento bidirezionale.

---

## 11.5 Inserimento articoli e manutenzione (admin)

### 11.5.1 Anagrafica articoli
- L'anagrafica base degli articoli (codice, descrizione, Linea, Famiglie, dimensioni, multipli, prezzi) arriva esclusivamente dall'import da Integra tramite Excel (§11.2). Il portale non crea né modifica questi dati.
- Tuttavia, alcuni attributi **devono/potranno essere impostati** dalla sezione admin del sito, tra cui:
  - stato di pubblicazione (attivo/nascosto, §3.2);
  - immagini (vedi §11.5.2);
  - descrizioni aggiuntive o testi marketing (es. descrizione lunga, note d'uso);
  - eventuali tag o metadati per la ricerca semantica (§12.1).

#### 11.5.1.1 Flusso di aggiunta articolo (admin)
- Quando l'admin clicca **"Nuovo articolo"** si apre un **modale di ricerca** che interroga gli articoli importati da Integra **non ancora configurati** sul portale (cioè privi di immagini, descrizioni, stato di pubblicazione, ecc.).
- L'admin seleziona uno o più articoli dalla ricerca e li aggiunge al portale.
- Al momento dell'aggiunta, l'articolo eredita automaticamente:
  - la **Linea** di appartenenza (proveniente da Integra, immutabile);
  - la **Famiglia/e primaria/e** assegnate in Integra (immutabili).
- Linee e Famiglie provenienti da Integra **non possono essere modificate** dal portale: sono dati master in sola lettura.
- L'admin può inoltre **associare l'articolo a Famiglie aggiuntive** create esclusivamente sul sito (es. "Novità 2026", "Promozione Estiva"), che non esistono in Integra. Queste Famiglie "sito-only" sono gestibili dal pannello admin (creazione, modifica, eliminazione).

### 11.5.2 Gestione immagini
Il caricamento delle immagini segue un flusso dedicato, separato dall'Excel:

1. **Foto prodotto su sfondo bianco** — caricate tramite una **piattaforma dedicata** dove si inseriscono le foto del prodotto ripreso da diverse angolazioni (frontale, laterale, dall'alto, dettagli) su sfondo bianco. Queste costituiscono la galleria principale dell'articolo (§6).
2. **Immagini ambientate** — sezione separata nella scheda articolo che mostra il prodotto in contesto d'uso (es. vaso in un ambiente arredato). Per generare queste immagini ambientate, l'admin può utilizzare **funzionalità AI** che, tramite API di servizi di generative AI (es. DALL·E, Midjourney, Stable Diffusion), producono immagini ambientate a partire dalla foto su sfondo bianco e da un prompt descrittivo. L'admin può:
   - scrivere un prompt per descrivere l'ambientazione desiderata;
   - scegliere il servizio AI tra quelli configurati;
   - generare, visionare e approvare/scartare le immagini proposte;
   - associare l'immagine ambientata approvata all'articolo.
- **[DA DEFINIRE]** numero massimo di immagini ambientate per articolo; gestione dei costi per le chiamate API AI (eventuale limite mensile); flusso di moderazione/approvazione prima della pubblicazione.

### 11.5.3 Creatore di descrizione (AI)

Nella sezione admin di gestione articolo è presente un **creatore di descrizione assistito da AI**:

- L'admin descrive il prodotto **in linguaggio naturale, anche parlato** (trascrizione vocale opzionale), includendo:
  - caratteristiche visive (forme, colori, materiali, finiture);
  - sensazioni ed emozioni che suscita (es. "dona un senso di calore e rusticità", "elegante e minimalista");
  - luoghi e contesti d'uso (es. "perfetto per un terrazzo moderno", "adatto a ristoranti di lusso");
  - qualsiasi altra informazione utile sull'articolo.
- L'AI elabora il testo generando automaticamente:
  1. **un testo discorsivo** (descrizione narrativa/marketing);
  2. **un testo per punti** (elenco strutturato delle caratteristiche chiave);
  3. **metadati/tag** per la ricerca semantica (§12.1).
- Il contenuto generato viene utilizzato per:
  - arricchire la scheda articolo lato cliente;
  - migliorare la **ricerca semantica** (§12.1);
  - alimentare il **prompt per la generazione dell'immagine ambientata** (§11.5.2), fornendo al servizio AI di image generation il contesto descrittivo prodotto.
- L'admin può modificare, rigenerare o approvare il testo prima della pubblicazione.
- **[DA DEFINIRE]** se mantenere uno storico delle versioni della descrizione e se abilitare la trascrizione vocale direttamente nel browser.

### 11.5.4 Relazione con Integra
- Immagini e attributi aggiuntivi impostati sul portale **non vengono riesportati in Integra**: restano dati proprietari del portale, agganciati al codice articolo (chiave univoca condivisa, §11.4).

---

## 12. Funzionalità AI

Due funzionalità basate su intelligenza artificiale: una **ricerca semantica** a disposizione del cliente e dei **banner di articoli suggeriti** posizionati nella navigazione, alimentati da prompt configurabili dall'admin.

### 12.1 Ricerca semantica e per immagini (lato cliente)

#### 12.1.1 Ricerca testuale in linguaggio naturale
- Il cliente può cercare articoli in **linguaggio naturale**, descrivendo ciò che cerca invece di usare solo filtri o codici (es. *"vaso alto in cotto per esterno, color terracotta, per piante grandi"*).
- La ricerca interpreta il **significato** della richiesta e restituisce gli articoli più pertinenti, anche quando non c'è corrispondenza esatta di parole chiave.
- I risultati devono rispettare le regole del portale:
  - solo articoli **pubblicati/attivi** (§3.2);
  - prezzi mostrati secondo il **listino e gli sconti del cliente** (§7);
  - eventuale considerazione della **giacenza** (§10).
- Funzionamento previsto (a livello concettuale): gli articoli vengono indicizzati a partire dai loro dati (descrizione, Linea, Famiglie, dimensioni, attributi); la richiesta del cliente viene confrontata semanticamente con l'indice per individuare gli articoli più simili.
- La qualità della ricerca dipende dalla **ricchezza delle descrizioni** degli articoli: vanno verificate le descrizioni provenienti da Integra (§11) ed eventualmente arricchite tramite il creatore di descrizione AI (§11.5.3).

#### 12.1.2 Ricerca per immagini
- Il cliente può **caricare un'immagine** (es. foto di un ambiente, di un vaso esistente, di un concept) come input di ricerca.
- L'AI analizza l'immagine e la **traduce in una descrizione testuale** dell'oggetto visualizzato, della location/contesto e dello stile (es. "vaso in ceramica smaltata color verde salvia, appoggiato su un tavolo in legno chiaro in una veranda luminosa in stile moderno").
- Sulla base di questa descrizione, il sistema **suggerisce gli articoli del catalogo** più coerenti, combinando la comprensione dell'immagine con la ricerca semantica (§12.1.1).
- Il cliente può inoltre **affinare** la ricerca per immagini aggiungendo testo (es. carica una foto e digita "ma in terracotta").
- Requisiti:
  - formati immagine supportati: JPEG, PNG, WebP;
  - **[DA DEFINIRE]** limite di dimensione del file; workflow di rimozione dati sensibili dalle immagini caricate (EXIF, volti);
  - l'immagine caricata **non viene memorizzata** (uso solo per la ricerca) oppure viene conservata per eventuale miglioramento del modello? **[DA CONFERMARE]**
- **[DA DEFINIRE]** se la ricerca per immagini usa lo stesso motore/servizio AI della ricerca semantica o un modello specializzato separato (es. CLIP, multimodal LLM).

### 12.2 Banner di articoli suggeriti (prompt lato admin)
- In **vari punti della navigazione** (es. home, schede Linea/Famiglia, pagina articolo, carrello) compaiono **banner** che propongono un insieme di articoli.
- Gli articoli mostrati nel banner sono **selezionati dall'AI** sulla base di un **prompt definito dall'admin** (es. *"novità in cotto da interno per la stagione natalizia"*, *"articoli best seller per fioristi"*, *"prodotti abbinabili ai vasi di grande formato"*).
- Dal pannello admin si possono configurare almeno:
  - il **prompt** che guida la selezione;
  - il **punto di navigazione / posizione** in cui mostrare il banner;
  - il **titolo** e l'aspetto del banner;
  - il **numero di articoli** da proporre;
  - l'eventuale **periodo di validità** (es. banner stagionale).
- Anche nei banner i prezzi sono mostrati secondo **listino e sconti del cliente**, e si propongono preferibilmente articoli disponibili e attivi.
- **[DA DEFINIRE]** se i risultati del banner sono **ricalcolati periodicamente** (uguali per tutti, con caching) oppure **personalizzati per singolo cliente**.

### 12.3 Aspetti tecnici e da definire
- **[DA DEFINIRE]** modello/servizio AI da utilizzare e relativi costi/limiti.
- **[DA DEFINIRE]** quando e come **aggiornare l'indice semantico** al variare del catalogo (tipicamente agganciato all'import Excel da Integra, §11).
- **[DA DEFINIRE]** gestione dei casi senza risultati pertinenti (fallback su ricerca tradizionale per parole chiave/filtri).
- Nei prompt e nelle richieste all'AI **non** vanno inseriti dati sensibili dei clienti.

---

## 13. Riepilogo requisiti → funzionalità

| # | Requisito | Sezione |
|---|-----------|---------|
| 1 | Linea (famiglia principale, 1 per articolo) + Famiglie secondarie (N: es. Cotto da Interno, Capi, Novità, Natale 2026) | §3 |
| 2 | Dimensioni con menu a tendina filtrati a cascata (3 livelli) | §4 |
| 3 | Confezioni / quantità multipla obbligatoria | §5 |
| 4 | Molte foto su articolo, una su famiglia, una su linea; layout scheda articolo | §6 / §6.1 |
| 5 | Listino per cliente + sconto cliente/linea/famiglia (max tra famiglie) | §7 |
| 6 | Stati ordine: fatto, in lavorazione, spedito, storico | §8 |
| 7 | Clienti invitati; blocco senza cancellazione per mantenere lo storico | §9 |
| 8 | Homepage cliente personalizzata: ultima ricerca, suggerimenti AI, offerte | §9.4 |
| 9 | Giacenza visibile ai clienti | §10 |
| 10 | Import dati da Integra via Excel; export dal sito via Excel | §11 |
| 11 | Inserimento articoli e manutenzione (admin): immagini, creatore descrizione AI, attributi extra | §11.5 |
| 12 | Ricerca semantica AI + ricerca per immagini + banner con articoli da prompt admin | §12 |

---

## 14. Punti da definire (riepilogo decisioni aperte)

1. **Regola di combinazione sconti** cliente/linea/famiglia: best‑wins (default proposto) o cascata? (§7.3)
2. **Quantità riferita** al pezzo o alla confezione, sia per prezzo sia per inserimento. (§5)
3. **Stati ordine aggiuntivi** (annullato, in attesa conferma). (§8.1)
4. **Limiti immagini** per articolo (numero, peso, formati). (§6)
5. **Pagamenti/spedizioni**: in scope o gestiti offline? (§1)
6. **Visualizzazione giacenza**: quantità esatta o a fasce/semaforo? (§10.3)
7. **Giacenza vs ordine**: blocco, back‑order o solo avviso al superamento dello stock? (§10.4)
8. **Tracciati Excel** import/export con Integra: struttura colonne, chiavi univoche, frequenza/automazione. (§11)
9. **Direzione "master" dei dati** (es. stato ordine: aggiornato in Integra e re‑importato?). (§11.4)
10. **AI – banner**: risultati uguali per tutti (ricalcolati periodicamente) o personalizzati per cliente? (§12.2)
11. **AI – modello/servizio** e relativi costi/limiti; aggiornamento dell'indice semantico al variare del catalogo. (§12.3)
12. **Immagini ambientate AI**: numero massimo per articolo, gestione costi API, flusso moderazione/approvazione. (§11.5.2)
13. **Creatore descrizione**: storico versioni e trascrizione vocale nel browser. (§11.5.3)
14. **Ricerca per immagini**: limite dimensione file, rimozione EXIF/dati sensibili, memorizzazione o meno dell'immagine caricata. (§12.1.2)
15. **Ricerca per immagini**: stesso motore AI della ricerca semantica o modello specializzato separato (CLIP, multimodal LLM)? (§12.1.2)
16. **Articoli interessanti**: frequenza ricalcolo suggerimenti AI (real‑time, giornaliero, settimanale) e modalità (per singolo cliente o per cluster). (§9.4.2)
17. **Offerte**: gestite come sconto extra temporaneo o come flag/famiglia dedicata. (§9.4.3)
18. **Tracciamento**: durata conservazione dati di navigazione e policy privacy. (§9.4.4)
19. **Galleria miniature scheda articolo**: mostrare solo foto ambientate o anche su sfondo bianco? (§6.1.1)
20. **Varianti articolo**: menu a tendina a cascata oppure mini-galleria stile Amazon (che richiede un'immagine per ogni variante)? (§6.1.4)

---

*Documento di lavoro: le sezioni marcate **[DA DEFINIRE]/[DA CONFERMARE]** richiedono validazione con Luis S.r.l. prima dello sviluppo.*
