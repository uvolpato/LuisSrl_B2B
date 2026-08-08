# Specifica — Admin Ordini (dashboard + elenco + dettaglio)

## 1. Concetto

La pagina **Admin Ordini** è la vista amministrativa giornaliera degli ordini. Offre un mini-dashboard con 4 KPI del giorno, un elenco tabellare paginato e ricercabile, navigazione tra giorni con date picker, e un modale di dettaglio per ogni ordine. È pensata per un uso operativo: l'admin apre la pagina, vede subito i numeri del giorno, cerca un cliente o un ordine, e consulta i dettagli.

### 1.1 Flusso

```
Admin apre pagina → dashboard del giorno corrente
                      │
                      ├── Cambia giorno (◀ picker Oggi ▶) → dashboard + tabella aggiornati
                      ├── Cerca cliente/ordine → tabella filtrata, dashboard aggiornata
                      ├── Pagina la tabella (10/pagina) → pager ◀ ▶
                      └── Clicca icona occhio → modale dettaglio ordine
```

### 1.2 Prototipo di riferimento

- File: `admin-ordini.html` (root del repo, ~35 KB, HTML standalone)
- Stack target: Next.js (`frontend/`) + NestJS (`backend/`)
- Stile: token da `frontend/app/globals.css`, pattern DataTable da `spese-spedizione.html`
- Pattern riusabili: `AdminTopBar`, `DataTable`, `Modal`, `Notice`, `Tooltip`

---

## 2. Struttura della pagina

```
┌─────────────────────────────────────────────────────────────────┐
│  AdminTopBar (sticky, blur)                                      │
│  H1: Ordini    │  [◀] [2026-08-10] [Oggi] [▶]  │  🔍 Cerca...  │
├─────────────────────────────────────────────────────────────────┤
│  .admin-content                                                  │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │ ORDINI DEL │  │ TOTALE    │  │ SCONTO    │  │ SPEDIZIONE│   │
│  │ GIORNO     │  │ VENDUTO   │  │ MEDIO     │  │ MEDIA     │   │
│  │    14      │  │ 8.452 €   │  │  18,4%    │  │  9,87 €   │   │
│  │ 3 in attesa│  │ IVA escl. │  │ su listino│  │ per ordine │   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
│                                                                  │
│  ┌ Ordini: 14  Pezzi: 156  Clienti: 11  Totale: 8.452,30 € ─┐ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ N. ORDINE   CLIENTE            DATA       PEZZI TOTALE ...  │ │
│  │ ORD-08142   Verdepiù di Bian.. 10/08 9:14   56   844,20 €  │ │
│  │ ORD-08143   Floricoltura Lom.. 10/08 9:32   42  1523,60€  │ │
│  │ ...                                                         │ │
│  │ 1–10 di 14                           ◀ 1 / 2 ▶             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Componenti

| # | Componente | Descrizione |
|---|-----------|-------------|
| 1 | **AdminTopBar** | Sticky, titolo "Ordini", date nav + search input |
| 2 | **Dashboard cards** | Grid 4 colonne (collassa a 2→1), bordo sinistro accent |
| 3 | **Totals bar** | Riga riepilogativa con conteggi e totale, sfondo surface |
| 4 | **DataTable** | 8 colonne, header sticky, 10 righe/pagina, pager con bottoni stile spese-spedizione |
| 5 | **Modal dettaglio** | Grid 2-col info, sezione spedizione, lista articoli con codice pill verde, totale |

---

## 3. Modello dati

### 3.1 Ordine (`Order`)

```ts
interface Order {
  id: number;
  num: string;              // es. "ORD-2026-08142"
  clienteId: number;        // FK → CLIENTI
  data: string;             // "YYYY-MM-DD"
  ora: string;              // "HH:MM"
  stato: OrderStatus;
  pagamento: string;        // codice pagamento (BB30, BB60, ANT, RB30, RB60)
  totale: number;           // importo totale IVA esclusa (€)
  pezzi: number;            // numero totale di pezzi
  spedizione: number;       // importo spedizione (€), 0 = gratuita o ritiro
  indirizzo: ShippingAddress | null;
  notaSped?: string;
  items: OrderItem[];
}
```

### 3.2 Articolo ordine (`OrderItem`)

```ts
interface OrderItem {
  codice: string;           // es. "CAPI0101"
  nome: string;             // descrizione articolo
  qty: number;              // quantità
  prezzo: number;           // prezzo netto unitario (€)
  listino: number;          // prezzo listino pieno (€)
}
```

### 3.3 Indirizzo spedizione (`ShippingAddress`)

```ts
interface ShippingAddress {
  nome: string;             // intestatario
  via: string;
  cap: string;
  citta: string;
  prov: string;             // sigla 2 lettere
}
```

### 3.4 Dati di lookup

```ts
const CLIENTI: Record<number, string>;  // id → ragione sociale

const STATI: Record<OrderStatus, string>;  // codice → label italiana
// "confermato" → "Confermato"
// "inoltrato"  → "Inoltrato a fornitore"
// "evaso"      → "Evaso"
// "annullato"  → "Annullato"
// "attesa"     → "In attesa"

const STATO_CLS: Record<OrderStatus, string>;  // codice → classe CSS
// "confermato" → "st-ok"       (verde)
// "inoltrato"  → "st-blue"     (blu)
// "evaso"      → "st-ok"       (verde)
// "annullato"  → "st-red"      (rosso)
// "attesa"     → "st-amber"    (ambra)
```

---

## 4. Regole di business

### 4.1 Filtro data

- La pagina mostra **solo gli ordini del giorno selezionato** nel date picker.
- All'avvio il date picker è impostato a `2026-08-10` (data demo; in produzione = oggi).
- Cambiando data (◀ picker Oggi ▶) la tabella e la dashboard si aggiornano; la pagina torna a 1.

### 4.2 Ricerca

- Campo testo con icona lente nella AdminTopBar.
- Cerca in: **ragione sociale cliente** e **numero ordine** (case-insensitive).
- Debounce 250ms prima di eseguire la ricerca.
- La ricerca azzera la pagina a 1.
- La dashboard si aggiorna con i soli ordini filtrati.

### 4.3 Dashboard

- I 4 KPI sono calcolati **sugli ordini filtrati** (data + ricerca).
- **Ordini del giorno**: conteggio + sub-text "X in attesa di conferma" (solo se > 0).
- **Totale venduto**: somma dei `totale` di tutti gli ordini.
- **Sconto medio**: `(1 − totaleVenduto / totaleListino) × 100`. Calcolato su tutti gli items di tutti gli ordini filtrati.
- **Spedizione media**: media di `spedizione` per gli ordini con `spedizione > 0`. Se nessuno, mostra "—".

### 4.4 Paginazione

- 10 ordini per pagina.
- Footer: "1–10 di 14" a sinistra, pager con bottoni ◀ / ▶ a destra.
- Bottoni pager: disabilitati agli estremi, hover su accent.

### 4.5 Stati

- Visualizzati come **status pill**: pallino colorato + label mono.
- Colori: verde (confermato/evaso), blu (inoltrato), ambra (attesa), rosso (annullato).

### 4.6 Dettaglio ordine

- Aperto con click sull'icona occhio nella colonna Azioni.
- Modale 720px max-width, scrollabile.
- Header con titolo e ✕ chiusura.
- Body diviso in: grid 2-col (cliente, data, stato, pagamento), sezione spedizione (destinatario, via, CAP/città, nota), divider, lista articoli, totale.
- Chiusura: ✕, pulsante "Chiudi", click sul backdrop, tasto Escape.
- Un solo modale aperto alla volta.

---

## 5. Specifiche visuali (CSS token e classi)

### 5.1 Token `:root` (condivisi con tutta l'app)

| Token | Valore | Uso |
|-------|--------|-----|
| `--bg` | `oklch(97% 0.005 80)` | Sfondo pagina |
| `--surface` | `oklch(100% 0 0)` | Sfondo card/tabella/modal |
| `--fg` | `oklch(22% 0.02 60)` | Testo principale |
| `--muted` | `oklch(52% 0.015 60)` | Testo secondario, label, placeholder |
| `--border` | `oklch(88% 0.01 70)` | Bordi |
| `--accent` | `oklch(55% 0.14 45)` | Colore primario (terracotta) |
| `--accent-soft` | `oklch(96% 0.004 80)` | Sfondo hover/selected |
| `--green` | `oklch(55% 0.15 145)` | Stato OK |
| `--amber` | `oklch(60% 0.13 65)` | Warning |
| `--blue` | `oklch(55% 0.15 250)` | Info |
| `--red` | `oklch(55% 0.18 25)` | Errore/Annullato |
| `--table-head-bg` | `oklch(92.5% 0.006 79)` | Header tabella |
| `--fg-soft` | `color-mix(in oklch, var(--fg) 6%, transparent)` | Hover righe |
| `--radius` / `--radius-lg` | `12px` / `16px` | Border radius |
| `--font-display` | `Iowan Old Style, Charter, Georgia, serif` | Titoli h1-h3 |
| `--font-body` | `-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif` | Corpo |
| `--font-mono` | `ui-monospace, JetBrains Mono, SF Mono, Menlo, monospace` | Dati, label, numeri |

### 5.2 Classi e sorgenti

| Classe | Sorgente | Descrizione |
|--------|----------|-------------|
| `.admin-top` | `spese-spedizione.html` / `AdminTopBar` | Barra superiore sticky con blur |
| `.admin-search` | `spese-spedizione.html` | Input ricerca con icona lente |
| `.btn`, `.btn-primary/secondary/ghost/sm` | `globals.css` | Sistema bottoni |
| `.date-nav`, `.date-input` | `admin-ordini.html` | Navigazione data (da creare) |
| `.dash-grid`, `.dash-card` | `admin-ordini.html` | Dashboard cards (da creare) |
| `.totals-bar` | `admin-ordini.html` | Barra riepilogativa (da creare) |
| `.data-table`, thead, tbody, `.data-table-scroll` | `spese-spedizione.html` / `DataTable.tsx` | Tabella dati |
| `.data-table-footer`, `.pager` | `spese-spedizione.html` | Footer + paginazione |
| `.status-pill`, `.st-ok/amber/blue/red` | `spese-spedizione.html` | Etichette stato |
| `.cell-entity`, `.cell-entity-text/title/sub` | `spese-spedizione.html` / `admin.css` | Cella cliente |
| `.row-action` | `spese-spedizione.html` | Icona azione con tooltip |
| `.modal-overlay`, `.modal`, `.modal-head/body/foot` | `Modal.tsx` / `catalogo.css` | Modale |
| `.detail-grid`, `.detail-section`, `.detail-row` | `admin-ordini.html` | Layout dettaglio (da creare) |
| `.detail-item`, `.detail-total`, `.detail-divider` | `admin-ordini.html` | Lista articoli dettaglio (da creare) |

---

## 6. Comportamenti interattivi (checklist)

1. [x] AdminTopBar sticky con backdrop blur
2. [x] Date picker `<input type="date">` con valore iniziale
3. [x] Pulsanti ◀ giorno precedente / ▶ giorno successivo
4. [x] Pulsante "Oggi" (btn-secondary sm, min-width 72px, font-body)
5. [x] Cambio data → azzera pagina a 1 → aggiorna dashboard + tabella
6. [x] Ricerca con debounce 250ms → filtra per cliente o numero ordine → azzera pagina a 1
7. [x] Dashboard: 4 card grid responsive (4→2→1 colonne), bordo sinistro accent 3px
8. [x] Dashboard KPI calcolati sugli ordini filtrati (data + ricerca), non sul totale DB
9. [x] Sconto medio: `(1 − totale/totaleListino)×100`, formattato 1 decimale
10. [x] Spedizione media: solo ordini con `spedizione > 0`, "—" se nessuno
11. [x] Sub-text "3 in attesa di conferma" nella card ordini (solo se > 0)
12. [x] Totals bar: conteggi (ordini, pezzi, clienti unici, totale) aggiornati sul filtrato
13. [x] DataTable: 8 colonne, header sticky mono uppercase
14. [x] Colonna "N. Ordine": font mono, accent color, bold
15. [x] Colonna "Cliente": `cell-entity` con titolo 600
16. [x] Colonna "Data": formato `GG/MM/AAAA OO:MM`
17. [x] Colonna "Pezzi" e "Totale": allineate a destra, mono
18. [x] Colonna "Stato": status pill con pallino + label colorata
19. [x] Colonna "Azioni": icona occhio con tooltip "Dettaglio" al hover
20. [x] Paginazione: 10/pagina, footer con range e pager ◀ N / M ▶
21. [x] Pager bottoni: stile spese-spedizione (bordo, sfondo, hover accent, disabled opacità)
22. [x] Empty state: messaggio "Nessun ordine trovato per questa data."
23. [x] Modale dettaglio: max-width 720px, max-height 90vh, animazione fadeIn
24. [x] Modale header: titolo "Ordine ORD-XXXXX" + ✕ chiusura
25. [x] Modale body: grid 2-col (cliente, data, stato, pagamento), sezione spedizione, divider, lista articoli, totale
26. [x] Articoli in dettaglio: codice pill verde, nome con ellipsis, qty× a destra, prezzo bold
27. [x] Totale dettaglio: riga bold con bordo superiore, "Totale (N pz, IVA esclusa)"
28. [x] Chiusura modale: ✕, "Chiudi", click backdrop, Escape
29. [x] Hover righe tabella: `var(--fg-soft)`
30. [x] Ultima riga tabella: senza border-bottom

---

## 7. API (da implementare)

### 7.1 Dashboard del giorno
```
GET /api/admin/ordini/dashboard?data=2026-08-10&search=
Response: {
  count: number,
  totale: number,
  scontoMedio: number,      // percentuale (es. 18.4)
  spedizioneMedia: number,   // €, null se nessuna spedizione
  pezzi: number,
  clienti: number,           // clienti unici
  inAttesa: number
}
```

### 7.2 Elenco ordini
```
GET /api/admin/ordini?data=2026-08-10&page=1&search=&limit=10
Response: {
  items: OrderSummary[],     // campi essenziali: id, num, clienteId, data, ora, stato, pagamento, totale, pezzi
  total: number,             // totale ordini filtrati
  page: number,
  pages: number
}
```

### 7.3 Dettaglio ordine
```
GET /api/admin/ordini/:id
Response: Order               // completo: include items[], indirizzo, notaSped
```

### 7.4 Clienti (lookup)
```
GET /api/admin/clienti/lookup
Response: { id: number, ragioneSociale: string }[]
```
Il frontend può cachare questa lista (cambia raramente).

---

## 8. Dati di riferimento (seed demo)

### 8.1 Clienti (11)
```
1:  Verdepiù di Bianchi & C.
3:  Floricoltura Lombardi S.n.c.
5:  Green Garden Center Srl
7:  Piante e Dintorni di Rossi M.
9:  Vivai Riuniti del Veneto
10: Terra e Colore Sas
12: GardenShop Bergamo
14: Il Giardino Segreto Srl
18: Agriverde Cooperativa
21: Fiori e Foglie di Esposito
24: Ortoflor Commerciale
```

### 8.2 Ordini demo (14, data 2026-08-10)
```
ORD-08142  Verdepiù          09:14  evaso       BB30   56pz   844,20€
ORD-08143  Floricoltura      09:32  inoltrato   BB30   42pz  1523,60€
ORD-08144  Green Garden      10:05  confermato  ANT    18pz   672,80€
ORD-08145  Piante e Dintorni 10:21  attesa      BB60   87pz  2189,40€
ORD-08146  Vivai Riuniti     11:03  confermato  BB30   14pz   345,60€
ORD-08147  Terra e Colore    11:45  evaso       RB30   31pz   912,00€
ORD-08148  GardenShop BG     14:12  confermato  BB30   22pz   456,30€
ORD-08149  Giardino Segreto  14:38  annullato   BB30    0pz     0,00€
ORD-08150  Verdepiù          15:05  inoltrato   ANT    60pz  1890,00€
ORD-08151  Agriverde         15:42  confermato  BB60   48pz  1203,40€
ORD-08152  Fiori e Foglie    16:10  evaso       RB60   18pz   520,50€
ORD-08153  Floricoltura      16:35  attesa      BB30   12pz   345,00€
ORD-08154  Ortoflor          17:00  confermato  BB30   29pz   780,20€
ORD-08155  Terra e Colore    17:28  attesa      ANT    72pz  1890,50€
```

### 8.3 Dashboard demo (calcolata sui 14 ordini)
| KPI | Valore |
|-----|--------|
| Ordini del giorno | 14 (3 in attesa) |
| Totale venduto | ~8.452,30 € |
| Sconto medio | 18,4% |
| Spedizione media | 9,87 € |
| Pezzi totali | 156 |
| Clienti unici | 11 |

---

## 9. Checklist di parità pre-consegna

- [ ] AdminTopBar sticky con titolo, date nav (◀ picker Oggi ▶) e search input
- [ ] Date picker nativo HTML, pulsanti giorno precedente/successivo funzionanti
- [ ] Pulsante Oggi: btn-secondary btn-sm, min-width 72px, font-body
- [ ] Dashboard 4 card: grid 4-col con collasso responsive (900px→2, 500px→1)
- [ ] Dash card: bordo sinistro accent 3px, label mono uppercase, value grande 28px
- [ ] Sub-text "X in attesa" nella card Ordini (condizionale)
- [ ] Totals bar: sfondo surface, bordo, border-radius, padding 8px 18px
- [ ] DataTable: 8 colonne con colgroup width specifici
- [ ] Header tabella: sticky, mono, uppercase, letter-spacing 0.04em
- [ ] N.Ordine in accent color bold, Cliente con cell-entity, Data formato italiano
- [ ] Status pill con pallino e label colorata per ogni stato
- [ ] Azioni: icona occhio con tooltip data-tip "Dettaglio"
- [ ] Paginazione 10/pagina, footer con range e pager
- [ ] Pager bottoni: stile spese-spedizione (bordo, hover accent, disabled opacità)
- [ ] Ricerca: debounce 250ms, cerca in cliente e numero ordine
- [ ] Dashboard ricalcolata su cambio data e ricerca
- [ ] Pagina azzerata a 1 su cambio data o ricerca
- [ ] Modale dettaglio: max-width 720px, header con titolo e ✕, body scrollabile
- [ ] Modale body: grid 2-col info, sezione spedizione, divider hr, lista articoli, totale
- [ ] Articoli modale: codice pill verde, nome con ellipsis, qty×, prezzo bold
- [ ] Totale modale: riga bold con bordo superiore, "Totale (N pz, IVA esclusa)"
- [ ] Chiusura modale: ✕, Chiudi, backdrop, Escape
- [ ] Backend: 3 endpoint (dashboard, elenco paginato, dettaglio) + lookup clienti
- [ ] Guardie admin (`PermissionsGuard`, `@RequirePermission`)
- [ ] i18n: chiavi in `frontend/messages/it.json` ed `en.json`
- [ ] Typecheck, lint, build per frontend e backend

---

## 10. Note implementative

- La data nel prototipo è fissa (`2026-08-10`). In produzione, all'avvio si usa `new Date()`.
- La ricerca è lato client nel prototipo (filtra su dati già in memoria). In produzione va delegata al backend via query parameter `search`.
- La dashboard nel prototipo è calcolata lato client sui dati filtrati. In produzione usare l'endpoint dedicato `GET /api/admin/ordini/dashboard`.
- Il lookup clienti può essere cachato lato frontend in un `Map<number, string>`.
- Il formato data nella tabella è `GG/MM/AAAA OO:MM` (italiano), mentre il date picker usa `YYYY-MM-DD` (ISO).
- Per il dettaglio ordine, il backend deve restituire l'oggetto completo con `items[]` e `indirizzo`.
- La paginazione nel prototipo è 10/pagina. In produzione, rispettare il `PAGE_SIZE` configurato (o accettare `limit` come query param).
