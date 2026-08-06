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
- **Unicità**: una sola tariffa per coppia `(nazione, regione)`.
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
- Titolo sezione + meta conteggi: `"27 tariffe · 2 zone · 5 nazioni · 20 eccezioni regionali · 23 configurate · 2 da configurare · 2 in pausa"` (sempre ricalcolati).
- Ricerca testuale (`destName` in minuscolo) + filtro per stato (`tutti`/`ok`/`pausa`/`configura`).
- Bottoni: **Simulatore di costo** (apre modale) e **Crea nuovo** (apre editor in modalità creazione).

### 5.2 Tabella elenco
Colonne: **Destinazione** · **% base** · **Scaglioni sconto medio** · **Impatto medio** · **Soglia gratuita** · **Stato** · **Azioni**.

- Ordinamento: zone prima (Europa → Resto del mondo), poi nazioni in ordine alfabetico italiano, poi regioni della stessa nazione (la tariffa nazione precede le sue regioni). Righe zona evidenziate (`row-zona`).
- Scaglioni: chip `0–5% → 4,5%` (max primi 3, poi `+N`); senza scaglioni mostra `—`.
- **Impatto medio**: `pctOf(tariffa, 8%) × 10.000 €`, arrotondato (esempio dimostrativo; il reale può calcolare a sconto 0 o mostrare la pct).
- Soglia: `€ 2.500,00` o `—` se assente.
- Stato: etichetta con pallino colorato (`ok` verde, `pausa` ambra, `configura` rosso).
- Azioni per riga: **Modifica** (apre editor) e **toggle pausa/riprendi** (scambia `ok ↔ pausa`, non tocca `configura`).
- Paginazione: 10 righe/pagina; testo `"1–10 di 27"` e contatore `"1 / 3"`; ricerca/filtro resettano a pagina 1.

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
- **Anteprima calcolo**: input importo (default 10.000, step 50) e sconto medio (default 8, step 0,5) → mostra risultato e spiegazione testuale del criterio applicato (scaglione/base/soglia).

**Azioni**: Salva modifiche · Annulla · Elimina. In creazione la tariffa nasce come bozza `{nazione:'IT', stato:'configura', base:3.0, soglia:null, ranges:[], isNew:true}`; al salvataggio `isNew` viene rimosso.

**Regole di salvataggio**:
- `base` non valido → 0; soglia vuota → `null`; valori scaglione non validi → `min 0`, `pct 0`.
- Se esiste già una tariffa con la stessa `(nazione, regione)` → la tariffa precedente viene sostituita (nel reale: **conferma prima di sovrascrivere**).
- Chiusura: tasto ×, clic sullo sfondo, `Escape` (chiude la modale più in alto).

**Nota per il reale**: aggiungere **conferma di eliminazione** (nel prototipo elimina senza chiedere) e **bloccare l'eliminazione del default ROW**.

### 5.4 Simulatore di costo (modale)

### 5.4 Simulatore di costo (modale)

Input:
- **Nazione di consegna** (ricerca inclusa con autocomplete) · **Regione** (ricerca inclusa; visibile solo se la nazione è Italia, con opzione "Usa tariffa automatica" sempre raggiungibile) · **Importo fattura senza IVA** (default 10.000 €) · **Sconto medio su listino** (default 8%, campo 0–30, step 0,5).

Output:
- **Tariffa applicata**: riga con sorgente e qualificatore:
  - `Regione <nome>` "(eccezione sopra la tariffa nazione)"
  - `Nazione <nome>` "(fallback)"
  - `Europa` "(tariffa d'area)" · `Resto del mondo` "(default globale)"
  - nessuna tariffa attiva → **"Tariffa da confermare"** con nota esplicativa.
- **Risultato grande** (0 € → classe "gratuita") + nota testuale su scaglione/base/soglia.
- **Riepilogo a passi**: importo netto · sconto medio · tariffa applicata · soglia gratuita · percentuale applicata · spese di spedizione.
- **Grafico a barre**: percentuale applicata per sconto 0/5/10/15/20%, barra dello sconto simulato evidenziata.

Il simulatore riusa la **stessa** `resolveTariffa` e `pctOf` dell'elenco (unica fonte di verità).

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
8. Unicità: salvare una tariffa esistente la sostituisce (con conferma nel reale).
9. Il default `ROW` non è eliminabile.
10. Ordinamento elenco: zone → nazioni (alfabetico it) → regioni; paginazione 10 righe.
11. Simulatore ed elenco producono lo **stesso** risultato a parità di input.
12. Il conteggio dei paesi dell'area europea è calcolato (27) e mostrato nei testi di Europa.

---

## 10. Note implementative

- Il prototipo (`spese-spedizione.html`) è il riferimento di comportamento: copie fedeli di `resolveTariffa`, `pctOf`, `destName`, `destTitle`, `describeTariffa`, `bindNationSearch`/`resetNationSearch` (ricerca per **regione** e **nazione**; l'opzione "Usa tariffa automatica" resta sempre visibile e non viene mai auto-selezionata; a query vuota non si seleziona nulla).
- Nell'editor, il blocco Destinazione: **picker solo in creazione**, **descrizione + striscia di gerarchia in modifica** — requisito esplicito, da rispettare.
- Tooltip "?": comportamento hover/focus con riposizionamento su scroll/resize.
- Accessibilità: modali con `role="dialog"` e `aria-modal`, pulsanti icona con `aria-label`/`title`.
- **Autocomplete/ricerca**: sia la Nazione sia la Regione usano lo stesso pattern `bindNationSearch`/`resetNationSearch` (campo di ricerca sopra la select che filtra le option in tempo reale); l'opzione "Usa tariffa automatica" (valore vuoto) resta **sempre visibile** e **non viene mai auto-selezionata**; a query vuota non avviene alcuna auto-selezione; all'apertura delle modali (`openEditor` / `openSim`) e al cambio nazione (non-IT) le ricerche vengono resettate.
