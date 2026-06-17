# Specifica di scambio dati con Integra

**Destinatari:** tecnici AGOMIR S.p.A.
**Oggetto:** dati che il sistema **legge** da Integra e dati che il sistema **restituisce** a Integra.

Il flusso ha due direzioni con canali distinti:

- **Lettura (Integra → sistema):** tutte le entità sono esposte come **viste Postgres in sola lettura**.
- **Scrittura (sistema → Integra):** i dati prodotti dal sistema rientrano in Integra tramite **automazioni di import Excel** (a carico di AGOMIR).

> Per ogni voce è indicato **a cosa serve**: è l'intento d'uso, non un tracciato rigido. Se un campo manca, ha un altro nome o in Integra è gestito diversamente, serve a capire come mapparlo o cosa proporre in alternativa, senza doversi fermare.

---

## 1. Viste lette dal sistema (sola lettura)

| Vista | A cosa serve |
|-------|--------------|
| **Famiglie** | Classificazione di primo livello dei prodotti: raggruppa e fa navigare il catalogo per categoria. |
| **Linee** | Raggruppano più codici articolo in un unico "prodotto" presentabile: ogni linea diventa una scheda con le sue varianti. |
| **Prodotti / Varianti** | L'unità ordinabile (un codice articolo = una variante): compone il catalogo, espone dimensioni, confezione/multiplo e unità di misura, e abilita l'ordine. |
| **Listini** | Insieme di prezzi applicabile: permette di assegnare a ciascun cliente il giusto set di prezzi. |
| **Righe listino (prezzi)** | Prezzo del singolo articolo dentro un listino (IVA esclusa): è il prezzo mostrato al cliente. |
| **Sconti** | Condizioni commerciali per cliente, articolo o famiglia: servono a calcolare il prezzo finale e la regola di combinazione. |
| **Clienti** | Chi può accedere e ordinare, con listino assegnato e stato attivo/bloccato: abilita l'accesso e i prezzi personalizzati. |
| **Indirizzi clienti** | Sedi di spedizione e fatturazione (anche più d'una per cliente): usati in fase d'ordine. |
| **Giacenze / disponibilità** | Quantità a magazzino con data di aggiornamento: indica se l'articolo è disponibile ed evita ordini oltre la giacenza. |
| **Stato ordini** | Avanzamento dell'ordine (ricevuto, in lavorazione, spedito) con le date: fa seguire al cliente lo stato fino alla consegna. |
| **Spedizioni / DDT** | Quantità spedite, numero DDT ed eventuale tracking: chiude il ciclo dell'ordine e ne traccia l'evasione. |
| **Tabelle di decodifica** | Lookup di colori, unità di misura, stati/causali ordine, aliquote IVA: interpretano in modo coerente i codici usati nelle altre viste. |

---

## 2. Excel generati dal sistema (importati in Integra)

| Excel | A cosa serve |
|-------|--------------|
| **Ordini** | Gli ordini composti nel sistema (testata: cliente, data, riferimento, totale; righe: codice articolo, quantità, prezzo netto, sconti applicati): vengono importati in Integra per l'evasione. |
| **Anagrafica articoli arricchita** | Associazione articolo ↔ immagine (ed eventuale descrizione) prodotta fuori dal gestionale: riporta in Integra l'arricchimento fatto dal sistema. I file immagine non viaggiano nel foglio (solo riferimento/URL o nome file); le modalità di trasferimento dei file sono da concordare. |
| **Articolo ↔ Raccolta/collezione** *(opzionale)* | Collezioni/etichette create nel sistema (es. Novità, stagionali): utili solo se Integra vuole conoscerle. |

---

## 3. Note operative

- Le viste in lettura dovrebbero esporre, dove possibile, una colonna **`updated_at`** per consentire letture incrementali (in particolare le giacenze).
- I tracciati Excel di ritorno sono **da concordare** sui nomi/ordine colonna; il sistema marca i record già esportati per evitare doppioni.
- Per ogni entità deve esistere **una sola fonte di verità**: i dati anagrafici/commerciali nascono in Integra, i dati di arricchimento e gli ordini nascono nel sistema.
