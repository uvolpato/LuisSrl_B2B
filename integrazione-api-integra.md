# Analisi scambio dati con Integra — verso le API

Versione: bozza 1.0 — 5 giugno 2026
Obiettivo: specificare le API che il gestionale Integra deve esporre per sincronizzare i dati con il portale B2B, sostituendo l'attuale scambio via file Excel.

---

## 1. Principi generali

- **Integra resta la fonte primaria (master)** per anagrafiche, catalogo, listini, sconti, giacenze.
- **Il portale è la fonte primaria** per ordini, immagini, descrizioni AI, metadati di ricerca.
- Le API sostituiscono i file Excel, ma i tracciati Excel restano utili come fallback/bootstrapping iniziale.
- La sincronizzazione è **periodica e asincrona**, non real-time.
- Ogni entità ha un **identificativo univoco condiviso** (il codice Integra) che fa da chiave di raccordo.

### 1.1 Direzione master dei dati

```
┌─────────────────────────────────────┐
│         Integra (MASTER)            │
│                                     │
│  - Articoli (codice, nome, prezzi)  │
│  - Linee e Famiglie                 │
│  - Listini                          │
│  - Sconti                           │
│  - Giacenza                         │
│  - Anagrafica clienti               │
└──────────────┬──────────────────────┘
               │ API (pull dal portale)
               ▼
┌─────────────────────────────────────┐
│        Portale B2B (SLAVE)          │
│                                     │
│  - Catalogo arricchito              │
│    (immagini, descrizioni AI,       │
│     metadati semantici)             │
│  - Ordini (testata + righe)         │
└──────────────┬──────────────────────┘
               │ API (pull da Integra)
               ▼
┌─────────────────────────────────────┐
│         Integra (MASTER)            │
│                                     │
│  - Ordini importati                 │
│  - Eventuali nuovi clienti          │
└─────────────────────────────────────┘
```

---

## 2. API che Integra deve esporre (Integra → Portale)

Il portale **chiama** queste API per importare i dati. Ogni endpoint fornisce dati **modificati dopo una certa data** per sincronizzazioni incrementali.

### 2.1 Articoli

#### `GET /api/v1/articoli`

Restituisce l'elenco articoli con varianti e configurazioni dimensionali.

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `codice_articolo` | string(50) | S | Chiave primaria. Usato anche per agganciare immagini e descrizioni sul portale |
| `nome` | string(200) | S | Nome breve / titolo articolo |
| `descrizione_breve` | string(500) | N | Descrizione sintetica |
| `codice_linea` | string(50) | S | FK → Linea |
| `codici_famiglie` | string[] | N | Array di FK → Famiglia (0 o più) |
| `unita_misura` | string(10) | N | Es. "pz", "kg", "m" |
| `multiplo_ordine` | int | N | Default 1 |
| `stato` | enum | N | "attivo" / "disabilitato" |
| `data_modifica` | datetime | S | Per sincronizzazione incrementale |

**Dimensioni e varianti** (array annidato):

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `codice_variante` | string(50) | S | Chiave |
| `dimensione_1` | string(50) | N | Es. altezza |
| `dimensione_2` | string(50) | N | Es. diametro |
| `dimensione_3` | string(50) | N | Es. colore |
| `note_dimensione` | string(200) | N | Es. "diametro misura massima esterna", "altezza con piedini" |
| `prezzo_base` | decimal(10,2) | N | Prezzo di listino base (poi personalizzato per cliente) |
| `codice_barre` | string(50) | N | EAN / barcode |

**Filtri:**
- `?data_modifica_da=YYYY-MM-DDTHH:mm:ss` — solo articoli modificati dopo quella data
- `?stato=attivo` — solo attivi
- `?pagina=1&limite=100` — paginazione

**Risposta:**
```json
{
  "pagina": 1,
  "totale_pagine": 5,
  "totale_elementi": 487,
  "data": [
    {
      "codice_articolo": "VASO-CER-001",
      "nome": "Vaso in ceramica bianca 30cm",
      "descrizione_breve": "Vaso in ceramica smaltata bianca, diametro 30cm",
      "codice_linea": "CERAMICA",
      "codici_famiglie": ["INTERNO", "NOVITA-2026"],
      "unita_misura": "pz",
      "multiplo_ordine": 1,
      "stato": "attivo",
      "data_modifica": "2026-06-01T14:30:00",
      "varianti": [
        {
          "codice_variante": "VASO-CER-001-30",
          "dimensione_1": "30",
          "dimensione_2": null,
          "dimensione_3": null,
          "note_dimensione": "diametro 30cm, altezza 28cm",
          "prezzo_base": 12.50,
          "codice_barre": "8001234567890"
        },
        {
          "codice_variante": "VASO-CER-001-40",
          "dimensione_1": "40",
          "dimensione_2": null,
          "dimensione_3": null,
          "note_dimensione": "diametro 40cm, altezza 35cm",
          "prezzo_base": 18.00,
          "codice_barre": "8001234567891"
        }
      ]
    }
  ]
}
```

---

### 2.2 Linee

#### `GET /api/v1/linee`

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `codice_linea` | string(50) | S | Chiave |
| `nome` | string(200) | S | Nome linea |
| `descrizione` | string(500) | N | |
| `data_modifica` | datetime | S | |

**Filtri:** `?data_modifica_da=...`

---

### 2.3 Famiglie

#### `GET /api/v1/famiglie`

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `codice_famiglia` | string(50) | S | Chiave |
| `nome` | string(200) | S | |
| `data_modifica` | datetime | S | |

**Filtri:** `?data_modifica_da=...`

---

### 2.4 Listini

#### `GET /api/v1/listini`

Elenco listini testata.

| Campo | Tipo | Obbligatorio |
|-------|------|-------------|
| `codice_listino` | string(50) | S |
| `nome` | string(200) | S |
| `data_modifica` | datetime | S |

#### `GET /api/v1/listini/{codice_listino}/prezzi`

Prezzi del listino per articolo/variante.

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `codice_articolo` | string(50) | S | |
| `codice_variante` | string(50) | N | Se null, vale per l'articolo base |
| `prezzo` | decimal(10,2) | S | Prezzo IVA esclusa |
| `data_modifica` | datetime | S | |

**Filtri:** `?data_modifica_da=...` (su prezzo)
**Nota:** in alternativa, si possono appiattire i prezzi direttamente nell'endpoint `/articoli` se il listino è unico. Se ci sono più listini, l'endpoint separato è obbligatorio.

---

### 2.5 Sconti (opzionale)

#### `GET /api/v1/sconti`

Sconti applicati per cliente, linea o famiglia.

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `codice_cliente` | string(50) | N | Se specificato, sconto per singolo cliente |
| `codice_listino` | string(50) | N | Se specificato, sconto per listino |
| `codice_linea` | string(50) | N | Sconto su tutta la linea |
| `codice_famiglia` | string(50) | N | Sconto su tutta la famiglia |
| `codice_articolo` | string(50) | N | Sconto su singolo articolo |
| `percentuale` | decimal(5,2) | S | Es. 10.00 = 10% |
| `data_modifica` | datetime | S | |

**Filtri:** `?data_modifica_da=...`

---

### 2.6 Giacenza

#### `GET /api/v1/giacenze`

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `codice_articolo` | string(50) | S | |
| `codice_variante` | string(50) | N | Se null, vale per l'articolo base |
| `quantita` | decimal(10,2) | S | Quantità disponibile |
| `data_rilevazione` | datetime | S | Data/ora del dato |
| `data_modifica` | datetime | S | |

**Filtri:** `?data_modifica_da=...`

---

### 2.7 Clienti

#### `GET /api/v1/clienti`

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `codice_cliente` | string(50) | S | Chiave |
| `ragione_sociale` | string(200) | S | |
| `partita_iva` | string(20) | S | |
| `codice_destinatario` | string(7) | N | SDI per fatturazione elettronica |
| `pec` | string(100) | N | |
| `indirizzo` | string(200) | S | Via, numero civico |
| `cap` | string(10) | S | |
| `citta` | string(100) | S | |
| `provincia` | string(10) | S | |
| `nazione` | string(50) | N | Default "Italia" |
| `email` | string(100) | S | Per login e notifiche |
| `telefono` | string(30) | N | |
| `codice_listino` | string(50) | S | FK → Listino |
| `bloccato` | bool | N | Se true, non può ordinare |
| `stato` | enum | N | "attivo" / "disabilitato" |
| `data_modifica` | datetime | S | |

**Filtri:** `?data_modifica_da=...`

---

## 3. API che il portale espone (Portale → Integra)

Integra chiama queste API per prelevare i dati prodotti dal portale.

### 3.1 Ordini

#### `GET /api/v1/ordini`

Restituisce gli ordini nuovi o modificati dopo una certa data.

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `numero_ordine` | string(50) | S | Identificativo univoco portale |
| `codice_cliente` | string(50) | S | FK → Cliente Integra |
| `data_ordine` | datetime | S | |
| `stato` | enum | S | "confermato" / "in_lavorazione" / "spedito" |
| `note` | string(1000) | N | |
| `totale_imponibile` | decimal(10,2) | S | IVA esclusa |
| `esportato` | bool | N | Flag per evitare doppia esportazione |

**Righe ordine** (array annidato):

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| `codice_articolo` | string(50) | S | |
| `codice_variante` | string(50) | N | |
| `quantita` | decimal(10,2) | S | |
| `multiplo_ordine` | int | N | |
| `prezzo_unitario_netto` | decimal(10,2) | S | Prezzo effettivamente applicato |
| `sconto_applicato` | decimal(5,2) | N | Percentuale sconto |
| `totale_riga` | decimal(10,2) | S | IVA esclusa |

**Filtri:** `?data_ordine_da=...&esportato=false`

---

### 3.2 Callback conferma import (opzionale)

Per gestire l'acknowledge: dopo che Integra ha importato un ordine, chiama:

#### `PATCH /api/v1/ordini/{numero_ordine}`

Segna l'ordine come esportato.

```json
{
  "esportato": true,
  "stato_integra": "importato"
}
```

---

## 4. Strategia di sincronizzazione

### 4.1 Sincronizzazione iniziale (bootstrapping)

- Alla prima attivazione del portale: **export Excel** da Integra (catalogo, clienti, listini) e import massivo nel portale.
- In parallelo, sviluppare e testare le API.

### 4.2 Sincronizzazione periodica

- Il portale esegue un **polling** delle API Integra a intervalli regolari (es. ogni 15-30 minuti).
- La finestra di polling usa `data_modifica_da` per prendere solo i delta.
- Se il polling fallisce, il portale riprova con backoff esponenziale (max 3 tentativi).
- Se il polling fallisce per più di N ore, notifica l'admin.

### 4.3 Gestione conflitti

| Dato | Master | Comportamento |
|------|--------|--------------|
| Articolo (codice, nome, dimensioni) | Integra | Portale sovrascrive sempre |
| Linea / Famiglia | Integra | Portale sovrascrive sempre |
| Prezzi / Listini | Integra | Portale sovrascrive sempre |
| Giacenza | Integra | Portale sovrascrive sempre |
| Cliente (anagrafica) | Integra | Portale sovrascrive sempre |
| Cliente (blocco) | Integra | Portale disabilita ordini |
| Ordine (stato) | **Portale** | Integra aggiorna il proprio stato |
| Immagini articolo | **Portale** | Non esportate in Integra |
| Descrizione AI | **Portale** | Non esportata in Integra |

### 4.4 Gestione errori

- Le API REST restituiscono codici HTTP standard (200 OK, 400 Bad Request, 422 Unprocessable, 500 Server Error).
- Il body di errore segue il formato:

```json
{
  "errore": "codice_errore",
  "messaggio": "Descrizione leggibile dell'errore",
  "dettagli": []
}
```

- Per le importazioni bulk (articoli, listini), il portale accetta **lotti** e segnala errori riga per riga.

---

## 5. Considerazioni tecniche per Integra

### 5.1 Autenticazione

- API Key (statica, passata in header `X-API-Key`) o Basic Auth su HTTPS.
- Una chiave per il portale per leggere dati; una chiave per Integra per leggere ordini.

### 5.2 Rate limiting

- Integra può imporre un rate limit (es. 30 richieste/minuto).
- Risposta HTTP 429 con header `Retry-After`.

### 5.3 Compatibilità tra Excel e API

- La struttura dei campi delle API **deve corrispondere** alla struttura dei file Excel attuali.
- In fase di transizione, entrambi i canali restano attivi: il portale può importare sia via Excel che via API.
- **Consiglio:** iniziare con le API per i soli articoli (è il flusso più critico), estendere poi alle altre entità.

### 5.4 Idempotenza

- Le API GET sono idempotenti per natura.
- Lato portale, l'import usa `codice_articolo` / `codice_cliente` / `codice_listino` come chiave per *upsert* (INSERT OR UPDATE), quindi riprocessare lo stesso payload non crea duplicati.

---

## 6. Roadmap di implementazione

| Fase | Cosa | Tempistica |
|------|------|-----------|
| **1** | Tracciati Excel definitivi (accordo con referente Integra) | Subito |
| **2** | Implementazione API lato Integra (almeno articoli e listini) | 2-3 settimane |
| **3** | Integrazione API lato portale (consumo API invece di Excel) | 2-3 giorni |
| **4** | API ordini lato portale | Quando il blocco ordini è sviluppato |
| **5** | Dismissione Excel (una volta verificate le API) | Dopo collaudo |

> **Raccomandazione:** iniziare subito con i tracciati Excel (Fase 1) per non bloccare lo sviluppo del portale, mentre in parallelo si sviluppano le API.

---

*Documento da condividere con il referente Integra per validazione tecnica.*
