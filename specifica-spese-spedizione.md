# Specifica · Spese di spedizione (tariffe B2B)

**Destinatari:** sviluppatori frontend/backend del portale B2B.
**Riferimento prototipo:** `spese-spedizione.html` (comportamento di riferimento implementato e verificato).
**Stato attuale:** la logica di calcolo nel checkout (`checkout.service.ts`) è **"da confermare"**: questa specifica definisce il contratto per renderla operativa.

Il modulo gestisce le **spese di spedizione** applicate all'importo della fattura (senza IVA) per ciascuna destinazione di consegna, con tariffa **gerarchica a 4 livelli** e configurazione di scaglioni e soglia gratuita.

---

## 1. Concetto: tariffa gerarchica a 4 livelli

La tariffa per una consegna si risolve cercando la **più specifica disponibile e attiva**:

```
Regione (Italia)  →  Nazione  →  Area (Europa)  →  Default (Resto del mondo)
```

| Livello | Valido per | Chiave |
|---------|-----------|--------|
| **Regione** | una regione italiana (eccezione sopra la tariffa nazionale) | `nazione = 'IT'`, `regione = <nome regione>` |
| **Nazione** | tutti gli indirizzi di un paese, salvo eccezioni regionali | `nazione = <ISO>` |
| **Europa** | i paesi dell'area europea senza tariffa di nazione/regione | `nazione = 'EUROPA'` |
| **Resto del mondo** | default globale, sempre presente | `nazione = 'ROW'` |

- Esiste **una sola tariffa "Resto del mondo"**: non deve poter essere eliminata (solo modificata o messa in pausa).
- I paesi sono classificati in due aree: **Europa** (27 paesi) o **resto del mondo**.
- Solo le tariffe in stato **`ok` (Configurata)** partecipano alla risoluzione: `pausa` e `configura` vengono saltate.
- **Unicità delle destinazioni attive** (requisito esplicito): non possono esistere **due tariffe attive** per la stessa destinazione `(nazione, regione)`. Il vincolo è garantito a database con un **indice unico su `(nazione, regione)`** (una sola riga per destinazione, in qualunque stato) e a livello applicativo prima di creare/attivare una tariffa (dettagli e implementazione al **§11.7**).

---

## 2. Modello dati

### 2.1 Entità tariffa

| Campo | Tipo | Note |
|-------|------|------|
| `id` | number | identificativo |
| `nazione` | string | ISO 3166-1 alpha-2 oppure `'EUROPA'` / `'ROW'` per i livelli area |
| `regione` | string \| null | solo per il livello regione (nazione obbligatoria `'IT'`); `null` = tariffa di nazione/area |
| `base` | number | percentuale di default sull'importo fattura senza IVA |
| `stato` | enum | `ok` = Configurata, `pausa` = In pausa, `configura` = Da configurare |
| `soglia` | number \| null | soglia di spedizione gratuita in €; `null` = nessuna soglia |
| `ranges` | array | scaglioni per sconto medio: `[min, max, pct]`, `max = null` = "oltre" |
| `updated` | string | data ultimo aggiornamento (demo); nel reale `updatedAt` |

Vincoli:
- **Unicità (destinazioni)**: una sola tariffa per coppia `(nazione, regione)` — la destinazione identifica la tariffa. Indice unico a database su `(nazione, regione)`; **due tariffe attive per la stessa destinazione non possono esistere** (requisito esplicito, vedi §11.7).
- **Livello regione**: `nazione` deve essere `'IT'`.
- **Livello area**: `nazione ∈ {'EUROPA','ROW'}`, `regione = null`.

### 2.2 Riferimenti

- **`NAZIONI`**: ~210 paesi con `{ n: nome italiano, z: 'EU' | 'ROW' }`. Alimenta i selettori nazione e il conteggio dei paesi europei (27).
- **`REGIONI_IT`**: 20 regioni italiane (ordinamento alfabetico).
- Nel backend reale le due tabelle di riferimento possono essere sostituite da una tabella `Paese` con colonna `area` (`EU`/`ROW`); il conteggio "27 paesi" deve essere **calcolato**, non hardcoded.

### 2.3 Mapping verso il backend reale

```
TariffaSpedizione {
  id            Int          @id
  livello       String       // 'regione' | 'nazione' | 'EUROPA' | 'ROW'
  nazione       String?      // null per livello area
  regione       String?      // null per livello nazione/area
  basePercent   Decimal
  stato         String       // 'ok' | 'pausa' | 'configura'
  sogliaImporto Decimal?
  ranges        Json         // [[min, max, pct], ...]
  updatedAt     DateTime
  @@unique([nazione, regione])
}
```

I campi demo `prov` e `addr` (presenti nel prototipo per le regioni IT) **non** fanno parte del dominio: nel reale i dati delle sedi di spedizione arrivano live da `IndirizzoCliente`.

---

## 3. Risoluzione della tariffa

Algoritmo `resolveTariffa(nazione, regione)` (la tariffa "vince" solo se `stato === 'ok'`):

```
1. se regione ≠ null e nazione non è una zona:
     reg = tariffa(nazione, regione)
     se reg.ok  → usa (sorgente: regione)
2. naz = tariffa(nazione, null)
   se naz.ok → usa (sorgente: nazione)
3. se nazione è una zona (EUROPA/ROW) → nessuna tariffa
4. zona = area del paese (EU → 'EUROPA', altrimenti 'ROW')
   zon = tariffa(zona, null)
   se zon.ok → usa (sorgente: europa/row)
5. se zona == 'EUROPA': row = tariffa('ROW', null)
   se row.ok → usa (sorgente: row)
6. altrimenti → nessuna tariffa → "da confermare"
```

Note:
- Un paese **EU senza tariffa di nazione** ricade su Europa e, se anche Europa non è attiva, **fallback su Resto del mondo**.
- Un paese **extra-EU** ricade direttamente su Resto del mondo (l'Europa non lo copre mai).
- Una tariffa `configura` o `pausa` a un livello NON blocca la risoluzione ai livelli inferiori.

### Esempi (con dati di riferimento del prototipo)

| Consegna | Risultato | Sorgente |
|----------|-----------|----------|
| Italia – Lombardia | tariffa Lombardia (2,5%) | regione |
| Italia – Piemonte (Lombardia in pausa) | tariffa Italia (3,0%) | nazione |
| Germania | tariffa Germania (3,6%) | nazione |
| Paesi Bassi (nessuna tariffa) | tariffa Europa (4,0%) | europa |
| Brasile | tariffa Resto del mondo (6,0%) | row |
| (paese senza alcuna tariffa attiva) | — | "da confermare" |

---

## 4. Calcolo delle spese

Dato `amount` = importo fattura senza IVA e `discount` = sconto medio praticato sul listino:

1. **Percentuale**: se `discount` cade in uno scaglione → percentuale dello scaglione; altrimenti `base`.
   - Intervallo scaglione: `min ≤ discount < max`; `max = null` = "oltre".
2. **Soglia gratuita**: se `soglia ≠ null` e `amount ≥ soglia` → **spedizione gratuita** (0 €).
3. **Costo**: `fee = amount × pct / 100`.

Esempio: importo 10.000 €, sconto medio 8%, tariffa Italia (scaglione 5–10% → 3,6%, soglia 2.500 €) → `10.000 × 3,6% = 360,00 €`.

### 4.1 Precedenza scaglioni (prototipo)

Gli scaglioni formano una **catena** di intervalli adiacenti da `0%` a "oltre": si configura **solo il limite superiore** di ciascuno (`max`), perché il primo parte da 0 e gli scaglioni intermedi partono dal limite del precedente; l'ultimo ha `max = null` ("oltre"). L'inserimento di un nuovo scaglione chiude quello finale "oltre" (default: limite superiore = limite inferiore + 5, modificabile). Se due scaglioni si sovrappongono vince il primo che contiene `discount` (ordinamento dell'array).

**Esempio** — configurando i limiti `5`, `10` e "oltre" con percentuali `4,5% / 3,6% / 3,0%` il modello interno diventa:
`[[0, 5, 4.5], [5, 10, 3.6], [10, null, 3.0]]` → sconto 8% → 3,6%; sconto 3% → 4,5%; sconto 15% → 3,0%.

La derivazione dei limiti inferiori avviene in `currentRanges()`: partendo da `from = 0`, ogni riga produce `[from, max, pct]` e aggiorna `from = max` per la successiva; una riga "oltre" chiude la catena.

---

## 5. Struttura della pagina admin

### 5.1 Header
- Titolo sezione + meta conteggi: `"27 tariffe · 2 zone · 5 nazioni · 20 eccezioni regionali · 21 configurate · 4 da configurare · 2 in pausa"` (sempre ricalcolati).
- Ricerca testuale (`destName` in minuscolo) + filtro per stato (`tutti`/`ok`/`pausa`/`configura`).
- Bottoni: **Simulatore di costo** (apre modale) e **Crea nuovo** (apre editor in modalità creazione).

### 5.2 Tabella elenco
Colonne: **Destinazione** · **% base** · **Scaglioni sconto medio** · **Soglia gratuita** · **Azioni**.

- **Header fisso (sticky)**: tutte le colonne restano visibili durante lo scroll, compresa "Scaglioni sconto medio" (la cella ridimensionabile **non deve** sovrascrivere `position: sticky` con `position: relative`, altrimenti l'header sale con lo scroll).
- **Colonna "Scaglioni sconto medio" ridimensionabile**: trascinando il bordo destro dell'header; larghezza **persistita** in `localStorage('spese-scaglioni-w')` (default 220px, min 140px).
- Lo **stato non è una colonna**: è un **pallino colorato** nella cella Destinazione (`ok` verde, `pausa` ambra, `configura` rosso) con tooltip col nome dello stato; il toggle pausa/riprendi resta tra le azioni di riga.

- Ordinamento: zone prima (Europa → Resto del mondo), poi nazioni in ordine alfabetico italiano, poi regioni della stessa nazione (la tariffa nazione precede le sue regioni).
- Scaglioni: chip `0–5% → 4,5%` (max primi 3, poi `+N`); senza scaglioni mostra `—`.
- Soglia: `€ 2.500,00` o `—` se assente.
- Azioni per riga: **Modifica** (apre editor) e **toggle pausa/riprendi** (scambia `ok ↔ pausa`, non tocca `configura`).
- Paginazione: **15 righe/pagina**; testo `"1–15 di 27"` e contatore `"1 / 2"`; ricerca/filtro resettano a pagina 1; empty state a tutta larghezza (`colspan="5"`).

### 5.3 Editor destinazione (modale)

**Due modalità di visualizzazione del blocco "Destinazione":**

- **Creazione** (`isNew = true`, da "Crea nuovo"): mostra il **picker**:
  - label "La tariffa vale per" + segmented a 4 voci: `Regione | Nazione | Europa | Resto del mondo`.
  - Livello **Regione**: campo regione con **ricerca e autocomplete** (20 regioni italiane, nazione forzata a `'IT'`); input di ricerca sopra la select che filtra le opzioni in tempo reale; l'opzione "Usa tariffa automatica" resta sempre visibile.
  - Livello **Nazione**: campo nazione con **ricerca e autocomplete** (elenco mondiale ~210 paesi); input di ricerca sopra la select che filtra le opzioni in tempo reale; l'opzione "Usa tariffa automatica" resta sempre visibile e selezionabile.
  - Livello **Europa/Resto del mondo**: pannello statico con titolo e descrizione (Europa: "Per i 27 paesi dell'area europea senza una tariffa di nazione o regione."; ROW: "Default globale…").
  - Il cambio di livello aggiorna in tempo reale il titolo della modale e la descrizione.
  - Il cambio di nazione (non-IT) nasconde il campo regione e resetta la sua ricerca.
- **Modifica** (tariffa esistente): il picker è nascosto e resta solo la **scheda descrittiva** di copertura (titolo + testo) e la **striscia di gerarchia**:
  - `Regione → Nazione → Area → Default`, con il livello corrente evidenziato (es. una tariffa Lombardia evidenzia "Regione").
  - Il selettore di destinazione **non** è disponibile in modifica: la destinazione identifica la tariffa e non deve poter essere cambiata accidentalmente (la modifica agisce solo su percentuale, scaglioni, soglia, stato).

**Campi tariffa** (entrambe le modalità):
- **Percentuale sull'importo fattura (senza IVA)**: `base`, step 0,1.
- **Stato**: Configurata / In pausa / Da configurare.
- **Soglia spedizione gratuita** (€): vuoto = nessuna.
- **Scaglioni per sconto medio**: righe `Sconto da X% → fino a [input]% → percentuale [input]%`; il limite inferiore è derivato (0 per il primo, il limite superiore del precedente per gli altri) e mostrato come testo non modificabile; l'ultima riga mostra "oltre" al posto del limite superiore. Aggiungi/rimuovi; se non configurati mostra "Nessuno scaglione configurato: vale la percentuale di base."
- **Anteprima calcolo**: pulsante che apre la **modale di calcolo in modalità "anteprima"** (vedi §5.4): destinazione **bloccata** sulla tariffa in modifica (nome + "In pausa" se in pausa), calcolo sui valori **non ancora salvati** (base, soglia e scaglioni del form), risultato con etichetta "(in modifica)".

**Azioni**: Salva modifiche · Annulla · Elimina. In creazione la tariffa nasce come bozza `{nazione:'IT', stato:'configura', base:3.0, soglia:null, ranges:[], isNew:true}`; al salvataggio `isNew` viene rimosso.

**Regole di salvataggio**:
- `base` non valido → 0; soglia vuota → `null`; valori scaglione non validi → `min 0`, `pct 0`.
- Se esiste già una tariffa con la stessa `(nazione, regione)` → la tariffa precedente viene sostituita (nel reale: **conferma prima di sovrascrivere**).
- Chiusura: tasto ×, clic sullo sfondo, `Escape` (chiude la modale più in alto).

**Nota per il reale**: aggiungere **conferma di eliminazione** (nel prototipo elimina senza chiedere) e **bloccare l'eliminazione del default ROW**.

### 5.4 Calcolatore (modale unica: simulatore + anteprima)

Un'unica modale riutilizzabile con **due modalità**, scelte all'apertura:

- **Simulatore** (pulsante della toolbar): mostra il selettore **Nazione di consegna** (ricerca inclusa con autocomplete) e **Regione** (ricerca inclusa; visibile solo se la nazione è Italia, con opzione "Usa tariffa automatica" sempre raggiungibile); all'apertura resetta a **Italia / automatica**. Risolve con `resolveTariffa` sulle tariffe **salvate**.
- **Anteprima** (pulsante dell'editor): nasconde il selettore e mostra una riga bloccata con la destinazione in modifica; calcola sui valori **correnti del form** (non ancora salvati), etichettata "(in modifica)". Il titolo della modale diventa "Anteprima calcolo".

Input comuni: **Importo fattura senza IVA** (default 10.000 €, step 50) · **Sconto medio su listino** (default 8%, campo 0–30, step 0,5).

Output:
- **Tariffa applicata**: riga con sorgente e qualificatore:
  - `Regione <nome>` "(eccezione sopra la tariffa nazione)"
  - `Nazione <nome>` "(fallback)"
  - `Europa` "(tariffa d'area)" · `Resto del mondo` "(default globale)"
  - nessuna tariffa attiva → **"Tariffa da confermare"** con nota esplicativa.
- **Risultato grande** (0 € → classe "gratuita") + nota testuale su scaglione/base/soglia.
- **Riepilogo a passi**: importo netto · sconto medio · tariffa applicata · soglia gratuita · percentuale applicata · spese di spedizione.
- **Grafico a barre**: percentuale applicata per sconto 0/5/10/15/20%, barra dello sconto simulato evidenziata.

Il calcolatore riusa la **stessa** `resolveTariffa` e `pctOf` di elenco/checkout (unica fonte di verità).

---

## 6. Formattazione e regole display

- Valuta: `€ 1.234,56` (`it-IT`, 2 decimali).
- Percentuali: virgola come separatore decimale, sempre una cifra decimale (`4,5%`, `6,0%`).
- Chip scaglioni: `min–max% → pct` ("oltre" per estremo aperto).
- Testi: la tariffa regionale si mostra come `Lombardia (IT)`; le zone come `Europa` / `Resto del mondo`.

---

## 7. API backend (proposta REST)

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/tariffe-spedizione` | elenco ordinato + conteggi meta |
| GET | `/api/tariffe-spedizione/:id` | dettaglio |
| POST | `/api/tariffe-spedizione` | crea (stato iniziale suggerito: `configura`) |
| PUT | `/api/tariffe-spedizione/:id` | aggiorna (nazione/regione immutabili in modifica) |
| PATCH | `/api/tariffe-spedizione/:id/stato` | toggle pausa/riprendi |
| DELETE | `/api/tariffe-spedizione/:id` | elimina (vietato per il default `ROW`) |
| GET | `/api/tariffe-spedizione/risolvi?nazione=&regione=&importo=&sconto=` | tariffa risolta + calcolo (usato da checkout e simulatore) |

Il POST/PUT devono validare i vincoli del §2.1 (unicità `(nazione, regione)`, regione solo con nazione `'IT'`, zona senza regione). La risoluzione e il calcolo devono risiedere in un servizio condiviso (unica fonte di verità), non duplicati nel frontend.

---

## 8. Integrazione checkout

Nel flusso d'ordine il costo trasporto va calcolato così:
1. **Nazione e regione** dalla sede di spedizione dell'ordine (`IndirizzoCliente`, `flagSpedizione`); la regione italiana si deriva da un mapping stabile **provincia → regione**.
2. **Importo** = totale merce netto (senza IVA).
3. **Sconto medio** = sconto medio applicato al cliente sul listino per quell'ordine.
4. Applicare `resolveTariffa` + calcolo del §4; se nessuna tariffa attiva → spedizione **"da confermare"** (da non fatturare automaticamente: va risolta prima dell'evasione).

---

## 9. Criteri di accettazione (test)

1. Risoluzione corretta per i casi del §3 (regione → nazione → area → default → da confermare).
2. Una tariffa `pausa`/`configura` non compare mai come "Tariffa applicata".
3. Fallback EU → Resto del mondo quando Europa non è attiva.
4. Soglia: `amount == soglia` → gratuita; `amount < soglia` → tariffa piena.
5. Scaglione: sconto esattamente su `max` → cade nello scaglione successivo (`min ≤ x < max`).
6. Catena scaglioni: i limiti inferiori derivati corrispondono (0 per il primo, limite superiore del precedente); modificando un limite superiore la riga successiva si aggiorna; l'ultima riga è "oltre".
7. Aggiunta scaglione su catena "oltre": il default chiude l'ultimo limite a `min + 5` e resta modificabile senza buchi/sovrapposizioni (es. `[0,null]` → `[0,5] + [5,null]`).
8. Unicità: salvare una tariffa esistente la sostituisce (con conferma nel reale); **non si possono mai creare due tariffe attive per la stessa destinazione** (indice unico su `(nazione, regione)` + verifica applicativa).
9. Il default `ROW` non è eliminabile.
10. Ordinamento elenco: zone → nazioni (alfabetico it) → regioni; paginazione **15 righe**.
11. Simulatore ed elenco producono lo **stesso** risultato a parità di input; la modale di **anteprima** con la stessa destinazione e gli stessi valori del simulatore produce lo stesso risultato (parità delle due modalità).
12. Il conteggio dei paesi dell'area europea è calcolato (27) e mostrato nei testi di Europa.
13. **Header sticky**: a scorrimento verticale tutte le colonne (inclusa "Scaglioni sconto medio") restano fisse in alto.
14. **Colonna ridimensionabile**: trascinando l'handle la larghezza cambia e sopravvive al reload (`localStorage('spese-scaglioni-w')`).
15. **Nessuna colonna "Stato"**: lo stato è visibile solo tramite il pallino con tooltip nella cella Destinazione.

---

## 10. Note implementative

- Il prototipo (`spese-spedizione.html`) è il riferimento di comportamento: copie fedeli di `resolveTariffa`, `pctOf`, `destName`, `destTitle`, `describeTariffa` e del componente combobox (vedi §11.4 punto 7).
- Nell'editor, il blocco Destinazione: **picker solo in creazione**, **descrizione + striscia di gerarchia in modifica** — requisito esplicito, da rispettare.
- Tooltip "?": comportamento hover/focus con riposizionamento su scroll/resize.
- Accessibilità: modali con `role="dialog"` e `aria-modal`, pulsanti icona con `aria-label`/`title`.
- **Autocomplete/ricerca (combobox)**: Nazione e Regione usano lo stesso componente (`createCombobox` nel prototipo): campo di ricerca sopra il dropdown che filtra le opzioni in tempo reale; l'opzione "Usa tariffa automatica" (valore vuoto) resta **sempre visibile** e **non viene mai auto-selezionata**; a query vuota non avviene alcuna auto-selezione; all'apertura delle modali e al cambio nazione (non-IT) i campi vengono resettati.

---

## 11. Replica fisica nell'applicazione — guida all'agente implementatore

> **Obiettivo**: la replica deve essere **identica** al prototipo `spese-spedizione.html` nel comportamento e nell'aspetto, integrata nel **routing dell'applicazione** (Next.js + NestJS). Il prototipo resta la fonte di verità comportamentale: in caso di dubbio, aprire il prototipo e riprodurre esattamente ciò che fa.

### 11.1 Posizionamento nel routing (integrazione)

**Frontend (Next.js, `"use client"`):**
- Nuovo componente sezione: `frontend/components/admin/sections/SpeseSpedizioneSection.tsx` (punto di ingresso di tutta la UI: toolbar, tabella, editor, calcolatore).
- Registrazione della sezione in `frontend/app/admin/page.tsx`:
  - `import SpeseSpedizioneSection from "../../components/admin/sections/SpeseSpedizioneSection";`
  - `{section === "spese-spedizione" && <SpeseSpedizioneSection />}`
  - titolo in `SECTION_TITLES` (`spese-spedizione: "Spese di spedizione"`).
- Voce di menu in `frontend/components/admin/AdminSidebar.tsx` (es. gruppo "Vendite": `{ id: "spese-spedizione", label: "Spese di spedizione", icon: "truck" }` + icona in `ICONS`).
- Traduzioni: nuove chiavi in `frontend/messages/it.json` ed `en.json` (il prototipo è solo in italiano; le stringhe tecniche dei calcoli restano in italiano).
- Stili: la sezione importa già `admin.css` (via `page.tsx`). Portare le regole del prototipo in `frontend/app/admin/admin.css` seguendo il mapping del **§11.5** — non introdurre framework CSS esterni per tabella/modali di questa sezione.

**Backend (NestJS):**
- Nuovo modulo `backend/src/spese-spedizione/` con `spese-spedizione.module.ts`, `spese-spedizione.controller.ts`, `spese-spedizione.service.ts`, `dto/*.ts`; registrato in `app.module.ts`.
- Modello Prisma `TariffaSpedizione` (mapping del §2.3) + migrazione con **indice unico su `(nazione, regione)`**.
- Endpoint REST del §7 protetti con `AuthenticatedGuard` + `PermissionsGuard` e permission di tipo `spese-spedizione.view` / `spese-spedizione.edit`.

### 11.2 Inventory componenti (mapping prototipo → React)

| Blocco prototipo | Componente React | Note |
|---|---|---|
| header/toolbar (titolo + meta + ricerca + filtro + bottoni "Simulatore di costo" / "Crea nuovo") | `<SpeseSpedizioneToolbar />` | contenuto della sezione, non dell'AdminTopBar globale |
| tabella `#reg-tbody` + `#reg-meta` + footer pager | `<TariffeTable />` | righe generate dalla funzione `renderRows` del prototipo (vedi §11.4) |
| editor `#edit-modal` | `<TariffaEditor />` | picker (creazione) **vs** scheda descrittiva + striscia di gerarchia (modifica) |
| combobox ricerca Nazione/Regione | `<Combobox />` riutilizzabile | comportamento del §11.4 / §10 |
| calcolatore `#calc-modal` | `<TariffaCalcModal />` | **unica modale**, due modalità: `sim` (picker libero) e `prev` (destinazione bloccata) |
| handle resize colonna `#th-resize` | hook `useResizableColumn` | persistenza `localStorage('spese-scaglioni-w')` |

### 11.3 Logica condivisa (unica fonte di verità)

Portare in una libreria pura senza dipendenze DOM (`frontend/lib/spese-spedizione.ts`, testabile con vitest/jest) e riutilizzare nel checkout:

- `resolveTariffa(nazione, regione)` — §3 (attenzione: solo `stato === 'ok'` vince).
- `pctOf(tariffa, discount)` — §4.
- `destName`, `destTitle`, `describeTariffa`, `destLevel` — etichette.
- `currentRanges()` — derivazione limiti inferiori dagli scaglioni (§4.1).
- `sortedDest()` + `filtered()` — ordinamento e filtri elenco.
- `euCount()` — conteggio paesi EU **calcolato**.
- `fmtEur` / `fmtPct` — formattazione italiana (§6).
- Il **calcolatore** (`calcCompute`) accetta il contesto: tariffa risolta dal server (`sim`) **oppure** una tariffa costruita dai valori non salvati del form (`prev`). Stesso rendering per entrambe.

### 11.4 Comportamenti da replicare identici (checklist comportamentale)

1. **Header sticky**: `position: sticky; top: 0` su TUTTE le `th`, inclusa "Scaglioni sconto medio". **Non** applicare `position: relative` alla th ridimensionabile (rompe lo sticky). L'handle di resize resta assoluto dentro la th sticky.
2. **Colonna ridimensionabile**: pointer events su `#th-resize`, larghezza minima 140px, persistita in `localStorage('spese-scaglioni-w')`.
3. **Pallino stato, nessuna colonna Stato**: `cell-dot` con classe `ok`/`pausa`/`configura` + tooltip `data-tip` → stato `Configurata`/`In pausa`/`Da configurare`. Toggle pausa/riprendi nelle azioni di riga (scambia `ok ↔ pausa`, ignora `configura`).
4. **Modale calcolatore unica**: all'apertura `sim` → reset a Italia/automatica; all'apertura `prev` → picker nascosto, riga bloccata con destinazione + stato "In pausa", titolo "Anteprima calcolo", etichetta tariffa "(in modifica)". Entrambe condividono lo stesso output (risultato grande, nota, riepilogo a passi, barre).
5. **"Tariffa da confermare"** quando `resolveTariffa` non trova alcuna tariffa attiva nella catena (result `—`, nota con destinazione e suggerimento).
6. **Editor**: picker solo in creazione (`isNew`), scheda + gerarchia in modifica; il cambio di livello aggiorna titolo/descrizione in tempo reale; nazione non-IT nasconde e resetta la regione.
7. **Combobox**: "Usa tariffa automatica" (`value:''`) sempre visibile (anche a query non vuota) e mai auto-selezionata; a query vuota nessuna auto-selezione; reset delle ricerche all'apertura modali e al cambio nazione (non-IT).
8. **Chiusura modali**: ×, click su backdrop, `Escape` con catena di priorità (editor → calcolatore). `role="dialog"` + `aria-modal`, `aria-label`/`title` sui pulsanti icona.
9. **Paginazione 15**, reset a pagina 1 su ricerca/filtro, empty state `colspan="5"`, meta conteggi ricalcolati ad ogni render.
10. **Chip scaglioni**: `0–5% → 4,5%` con `+N` oltre i primi 3; `—` senza scaglioni.

### 11.5 Mapping CSS (token e classi del prototipo)

- Token del prototipo (`:root`) da allineare a quelli di `admin.css`/`globals.css`: `--bg`, `--surface`, `--fg`, `--muted`, `--border`, `--accent`, `--accent-soft`, `--ok`/`--ok-soft`, `--amber`/`--amber-soft`, `--danger`/`--danger-soft`, `--green`/`--red`/`--blue`, `--table-head-bg`, `--fg-soft`, `--font-display`, `--font-body`, `--font-mono`, raggi. Se il tema dell'app non espone lo stesso token, definirli a livello di sezione senza toccare il resto dell'app.
- Classi da portare in `admin.css` (con lo stesso nome e le stesse regole): `.data-table*` (thead sticky, `.col-resizable`, `.th-resize`), `.cell-entity`/`.cell-dot`/`.cell-empty`, `.chip-set`/`.chip`, `.btn*`, `.admin-search`, `.filter-select`, `.pager`, `.modal-*`, `.field`/`.field-row`/`.edit-cols`/`.col`, `.seg`/`.seg-btn`, `.combobox*`/`.auto-option`, `.zona-panel`, `.dest-desc`, `.hier`/`.lvl`/`.arrow`, `.range-table`/`.range-row`/`.range-del`, `.sim-*` (source/result/note/steps/bars/bar/bv), `.hint`/`.tip`/`.hint-tip`/`.hint-tip-global`, `.row-action`, `.data-table-empty`.
- Tooltip: implementare il tooltip globale del prototipo (contenitore unico, `data-tip`/`::after` o riposizionamento su scroll/resize).

### 11.6 Dati di riferimento e seed

- Seed dei **27 record `DESTINAZIONI`** del prototipo (vedi `spese-spedizione.html`, variabile `DESTINAZIONI`) per garantire parità di test e demo (stessi id, percentuali, scaglioni, soglie, stati).
- Tabelle di riferimento: `NAZIONI` (~210 paesi con area EU/ROW) e `REGIONI_IT` (20). Nel reale una tabella `Paese(iso, nomeIt, area)`; il conteggio "27 paesi" è **calcolato** (§2.2).
- L'eliminazione della tariffa `ROW` è vietata a database (row-level protection nel service) e a UI (nessuna conferma di eliminazione per ROW).

### 11.7 Regola di business: unicità delle destinazioni attive (requisito esplicito)

**Regola**: per una stessa destinazione `(nazione, regione)` **non può esistere più di una tariffa attiva (`stato === 'ok'`)** contemporaneamente.

Implementazione su tre livelli:
1. **Dati (vincolo forte)**: indice unico su `(nazione, regione)` nel modello `TariffaSpedizione` → la destinazione identifica la tariffa e una riga può esistere **una sola volta** in qualunque stato (attiva, in pausa o da configurare). Questo rende strutturalmente impossibile la duplicazione.
2. **Applicativo (servizio)**: in `create`/`update`, prima di salvare, risolvere la destinazione: se esiste già una riga con la stessa `(nazione, regione)` diversa da quella in modifica → **restituire un conflitto** (`409`) oppure, se la logica lo prevede, aggiornare quella riga. Nel reale la UI mostra una **conferma di sovrascrittura** (il prototipo sostituisce direttamente la precedente).
3. **Regola "attiva"**: una tariffa in `pausa` o `configura` **occupa comunque la destinazione**: per riattivare una destinazione si modifica lo stato della riga esistente (toggle `ok ↔ pausa`), non si crea una seconda riga. In `resolveTariffa` vince solo la riga unica se è `ok`; se non lo è, la risoluzione prosegue ai livelli inferiori (§3).

### 11.8 Checklist di parità pre-consegna

- [ ] I 15 criteri di accettazione del §9 passano sul porting.
- [ ] A parità di input, elenco, simulatore e anteprima danno lo **stesso** risultato.
- [ ] Nessuna colonna "Stato": lo stato è solo il pallino con tooltip.
- [ ] Header sticky per tutte le colonne (anche "Scaglioni") e colonna ridimensionabile che sopravvive al reload.
- [ ] Modali editor/calcolatore: apertura, chiusura (×, backdrop, Escape) e priorità corrette.
- [ ] "Tariffa da confermare" mostrata quando manca una tariffa attiva.
- [ ] Impossibile creare due tariffe attive per la stessa destinazione (indice unico + 409/conferma).
- [ ] Default `ROW` non eliminabile.
- [ ] Meta conteggi, formato € e % (virgola) corretti.
- [ ] I 27 record di seed producono la stessa tabella e gli stessi calcoli del prototipo.
