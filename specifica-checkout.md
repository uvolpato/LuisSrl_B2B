# Specifica — Checkout (prototipo B2B Luis)

## 1. Concetto

La pagina checkout è il punto di raccolta dell'ordine: il cliente conferma la modalità di consegna, seleziona l'indirizzo di spedizione, visualizza il riepilogo economico con codici sconto e spese di spedizione calcolate dinamicamente, e invia l'ordine. La logica di calcolo delle spese è delegata al backend; il frontend passa solo la provincia e la chiave ordine.

### 1.1 Prototipo di riferimento

- File: `checkout.html` (root del repo, ~58 KB, HTML standalone)
- Stack target: Next.js (`frontend/`) + NestJS (`backend/`)
- Stile: token CSS da `frontend/app/globals.css`, classi da `frontend/app/area/catalogo.css` sezione checkout (§ ~1464–1668)
- Pattern componenti esistenti: `AreaHeader`, `Modal`, `DataTable`, `Tooltip`, `Hint`, `Notice`, `ComboboxField`, `FocusTrap`, `Icons`

---

## 2. Modello dati

### 2.1 Articoli in carrello (`ITEMS`)

```ts
interface CartItem {
  codice: string;        // es. "CAPI0101"
  nome: string;          // descrizione articolo
  qty: number;           // quantità
  prezzo: number;        // prezzo netto unitario (€)
  listino: number;       // prezzo di listino pieno (€)
}
```

### 2.2 Indirizzi (`ADDRESSES`)

```ts
interface Address {
  id: number;
  nome: string;
  indirizzo: string;
  cap: string;
  citta: string;
  prov: string;          // sigla provincia (2 lettere)
  tipo: string;          // "SEDE" | "SPEDIZIONE" | ...
  abituale: boolean;     // true = indirizzo predefinito
  daIntegra: boolean;    // true = proviene da ERP, NON modificabile
}
```

Regole:
- `daIntegra: true` → indirizzo sincronizzato da Integra, sola lettura nel portale
- `daIntegra: false` → aggiunto manualmente dal cliente, modificabile inline (icona matita ✎)
- Un solo indirizzo può avere `abituale: true` alla volta
- Backend deve rifiutare (403/409) modifiche a indirizzi con `daIntegra: true`

### 2.3 Codice sconto (`_couponActive`)

```ts
interface CouponState {
  active: boolean;
  value: number;         // se isPct: 0.10 = 10%, altrimenti importo fisso in €
  isPct: boolean;        // true = percentuale, false = importo fisso
}
```

Demo: `B2B10` (−10%), `B2B20` (−20%), `SPRING50` (−50 € fissi).  
In produzione la validazione avviene lato server via API.

### 2.4 Spedizione

```ts
interface ShippingResult {
  importo: number;       // €
  descrizione: string;   // es. "Lombardia (1.2%)"
  gratuita: boolean;     // true se sopra soglia
}
```

### 2.5 Condizioni di pagamento

La modalità di pagamento arriva da Integra (`codicePagamento` nell'anagrafica cliente). Per i metodi che prevedono bonifico (BB30, BB60, ANT) vengono mostrate le coordinate bancarie della LUIS S.r.l., lette da configurazione backend.

```env
# .env / tabella Impostazioni
LUIS_BANK_INTESTATARIO=Luis S.r.l.
LUIS_BANK_NOME=Intesa Sanpaolo
LUIS_BANK_IBAN=IT60X0542811101000000123456
LUIS_BANK_SWIFT=BCITITMM
```

Il frontend recupera questi dati via `GET /api/config/banca-luis`.  
Le coordinate bancarie del CLIENTE non vengono mai esposte.

---

## 3. Struttura della pagina

Layout: grid a due colonne (`1fr 380px`, gap 40px, collassa a 1 colonna sotto 920px).

```
┌──────────────────────────────────────────────────────────────┐
│  AreaHeader (layout condiviso, fuori dal componente)         │
├──────────────────────────────────────────────────────────────┤
│  main#content > .container                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  .page-title > h1 "Checkout"                            │ │
│  ├───────────────────────┬─────────────────────────────────┤ │
│  │  .checkout-form        │  .order-summary.checkout-summary│ │
│  │                        │                                 │ │
│  │  1. Condizioni di      │  Riepilogo ordine               │ │
│  │     pagamento          │  ┌───────────────────────────┐  │ │
│  │     (in testa)         │  │ Spedizione a: ...         │  │ │
│  │                        │  ├───────────────────────────┤  │ │
│  │  2. Modalità di        │  │ Articoli (lista)          │  │ │
│  │     consegna            │  │  CAPI0101 Vaso Torchio... │  │ │
│  │     (radio cards)      │  │  ─ 12 × 12,40 €  148,80 €│  │ │
│  │                        │  │  ...                      │  │ │
│  │  3. Indirizzo di       │  ├───────────────────────────┤  │ │
│  │     spedizione         │  │ Totale articoli a listino │  │ │
│  │     (address cards)    │  │ [Codice sconto] [Applica] │  │ │
│  │                        │  │ ───────────────────────── │  │ │
│  │  4. Note                │  │ Subtotale scontato        │  │ │
│  │     (textarea ×2)      │  │ Spedizione                │  │ │
│  │                        │  │ ───────────────────────── │  │ │
│  │                        │  │ Totale (IVA esclusa)       │  │ │
│  │                        │  │ [Conferma ordine]          │  │ │
│  └────────────────────────┴───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 3.1 Sezioni del form (in ordine)

1. **Condizioni di pagamento** — select con metodi da Integra + coordinate LUIS condizionali
2. **Modalità di consegna** — radio cards (Ritiro in sede / Spedizione corriere)
3. **Indirizzo di spedizione** — griglia di address cards + "Nuovo indirizzo" + toggle default
4. **Note** — textarea per nota di spedizione e nota d'ordine

### 3.2 Sidebar (riepilogo)

1. Box "Spedizione a" (condizionale: nascosto per Ritiro, rimosso dal DOM)
2. Lista articoli: ogni riga ha
   - Riga 1: `[codice]` (badge verde pill) + nome (ellipsis se troppo lungo)
   - Riga 2 (allineata a destra): ~~listino~~ barrato · sconto% · qty × prezzo · **totale**
3. Tabella economica (total-table):
   - Totale articoli a listino
   - Riga codice sconto (visibile solo dopo applicazione)
   - Divider
   - **Subtotale scontato** (bold)
   - **Spedizione** (bold, 0 per Ritiro/soglia gratuita)
   - Divider
   - **Totale (IVA esclusa)** (bold, 18px)
4. Pulsante "Conferma ordine" (btn-primary, full width)
5. Link "Torna al carrello"

---

## 4. Regole di business

### 4.1 Modalità di consegna

| Modalità | Spedizione | Indirizzo | Sezione indirizzi |
|----------|-----------|-----------|-------------------|
| Ritiro in sede | 0 € | Nascosto | Nascosta |
| Spedizione corriere | Calcolato | Visibile | Visibile |

### 4.2 Calcolo spese di spedizione

**Il frontend NON calcola** — chiama il backend passando solo:
- `ordineKey` (chiave dell'ordine)
- `provincia` (sigla, 2 lettere)

Il backend:
1. Risolve provincia → regione (per l'Italia)
2. Cerca tariffa nella cascata: regione → nazione → zona EU → resto del mondo → "da confermare"
3. Applica lo scaglione in base allo sconto medio dell'ordine
4. Se l'imponibile scontato supera la soglia di gratuità → 0 €

API contract:
```
POST /api/checkout/spedizione
Body: { ordineKey: string, provincia: string }
Response: { importo: number, descrizione: string, gratuita: boolean }
```

Nel prototipo la logica è simulata con `calcolaSpedizione(provincia, imponibile)` e dati demo (`PROV_REGIONE`, tariffe fisse per regione).

### 4.3 Codici sconto

- Non cumulabili: un solo codice attivo alla volta
- Dopo l'applicazione: input e pulsante "Applica" spariscono, resta la `×` per rimuovere
- Tipi supportati: percentuale (es. 10%) o importo fisso (es. 50 €)
- Backend: `POST /api/checkout/coupon` con validazione server-side

### 4.4 Indirizzi

- All'avvio: selezionato il primo indirizzo con `abituale: true`
- Passando a "Spedizione corriere": auto-selezione dell'indirizzo predefinito
- "Imposta come predefinito" su ogni card — rimuove il flag dalle altre
- Nuovo indirizzo: form con validazione (indirizzo, CAP, città obbligatori), checkbox "Imposta come predefinito", pulsante "Salva indirizzo"
- Provincia: combobox con autocomplete (107 province italiane, filtro per codice o nome)
- Modifica: solo indirizzi con `daIntegra: false` hanno l'icona matita ✎

### 4.5 Coordinate bancarie

- Visibili solo per metodi di pagamento con bonifico: `BB30`, `BB60`, `ANT`
- Lette da config backend, MAI le coordinate del cliente
- Pulsante "Copia IBAN" copia senza spazi (`IT60X05428...`) pronto per home banking
- Fallback `document.execCommand('copy')` per browser senza Clipboard API

---

## 5. Comportamenti interattivi (checklist)

1. [x] Toggle modalità consegna: Ritiro nasconde/rimuove sezione indirizzi e box "Spedizione a"
2. [x] Selezione indirizzo: aggiorna il box "Spedizione a" nel sidebar e ricalcola la spedizione
3. [x] Auto-selezione indirizzo predefinito al passaggio a "Spedizione corriere"
4. [x] "Imposta come predefinito" su card indirizzo esistente
5. [x] Nuovo indirizzo: form con validazione, checkbox default, salva e aggiunge alla griglia
6. [x] Modifica inline indirizzi non-Integra (icona matita, contenteditable)
7. [x] Provincia: combobox con autocomplete (frecce ↑↓, invio, click)
8. [x] Codice sconto: applica (input+pulsante spariscono, mostra ×), rimuovi (ripristina)
9. [x] Calcolo spedizione: provincia → regione → tariffa demo; aggiorna sidebar in tempo reale
10. [x] Spedizione gratuita: sopra soglia (500 € demo), label verde "Gratuita"
11. [x] Riepilogo economico: subtotale listino, sconto codice, subtotale scontato, spedizione, totale
12. [x] Pulsante "Copia IBAN": copia senza spazi, feedback "Copiato!" per 2s, fallback legacy
13. [x] Payment method toggle: mostra/nasconde coordinate LUIS in base al tipo bonifico
14. [x] Sidebar sticky (top: 80px), scroll nella lista articoli (max-height: 280px)
15. [x] Conferma ordine: validazione, stato "Ordine inviato" con numero e totale

---

## 6. API contracts (da implementare)

### 6.1 Dati checkout
```
GET /api/checkout/dati
Response: {
  cliente: { id, ragioneSociale, indirizzo, cap, citta, provincia, codicePagamento, ... },
  indirizzi: Address[],
  allowNewAddress: boolean,
  pagamenti: { codice, descrizione }[],
  ...
}
```

### 6.2 Carrello attivo
```
GET /api/carrello
Response: { id: number, items: CartItem[] }
```

### 6.3 Calcolo spedizione
```
POST /api/checkout/spedizione
Body: { ordineKey: string, provincia: string }
Response: { importo: number, descrizione: string, gratuita: boolean }
```

### 6.4 Validazione coupon
```
POST /api/checkout/coupon
Body: { codice: string, ordineKey: string }
Response: { valido: boolean, tipo: "pct"|"fixed", valore: number, messaggio: string }
```

### 6.5 Configurazione banca LUIS
```
GET /api/config/banca-luis
Response: { intestatario: string, nome: string, iban: string, swift: string }
```

### 6.6 Conferma ordine
```
POST /api/checkout/conferma
Body: {
  modalitaConsegna: "RITIRO"|"SPEDIZIONE",
  indirizzoSpedizioneId?: number,
  nuovoIndirizzo?: { ragioneSociale?, indirizzo, cap, citta, provincia? },
  codiceCoupon?: string,
  codicePagamento?: string,
  notaSpedizione?: string,
  notaOrdine?: string
}
Response: { id: number, numeroOrdine: string, importoTotale: number }
```

---

## 7. Mapping CSS (dal prototipo all'app)

| Prototipo (classi) | App (sorgente) |
|---|---|
| `:root` tokens | `frontend/app/globals.css` |
| `.catalogo-page.cart-page.checkout-page` | `frontend/app/area/catalogo.css` §checkout |
| `.checkout-section`, `.checkout-section-title` | catalogo.css:1482–1492 |
| `.opt-list`, `.opt-card`, `.opt-main`, `.opt-name`, `.opt-desc` | catalogo.css:1590–1605 |
| `.addr-grid`, `.addr-card`, `.addr-card-h`, `.addr-l`, `.addr-badge` | catalogo.css:1543–1587 |
| `.addr-new`, `.checkout-grid`, `.form-field`, `.form-input`, `.form-select`, `.form-textarea` | catalogo.css:1496–1540, 1607–1619 |
| `.order-summary`, `.checkout-summary`, `.summary-ship`, `.summary-rows`, `.summary-item` | catalogo.css:1240–1268, 1622–1640 |
| `.total-table`, `.total-divider` | checkout.html (standalone, da replicare) |
| `.combobox`, `.combobox-input`, `.combobox-dropdown`, `.combobox-option` | `frontend/components/admin/ComboboxField.tsx` |
| `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm` | `frontend/app/globals.css` |
| `.checkout-confirm`, `.checkout-confirm-icon` | catalogo.css:1647–1667 |
| `.read-only-field`, `.iban-row`, `.coupon-row` | checkout.html (CSS standalone) |
| `.summary-item-row1`, `.summary-item-row2` | checkout.html (CSS standalone) |

---

## 8. Dati di riferimento (seed)

### 8.1 Articoli demo (6 prodotti)
| Codice | Nome | Qty | Prezzo | Listino |
|--------|------|-----|--------|---------|
| CAPI0101 | Vaso Torchio Terracotta Ø30 H35 | 12 | 12,40 € | 16,53 € |
| CAPI0203 | Vaso Amphora Cotto H50 | 6 | 25,74 € | 32,18 € |
| CAPI0301 | Vaso Oliva Terracotta Ø40 H50 | 8 | 18,90 € | 23,63 € |
| CAPI1804 | Ciotola Rustica Ø25 H18 | 12 | 9,60 € | 12,00 € |
| CAPI0710 | Orcio Decorato H65 | 4 | 32,50 € | 40,63 € |
| CAPI1105 | Piatto Portavaso Ø50 | 14 | 14,16 € | 18,88 € |

### 8.2 Indirizzi demo (2, entrambi da Integra)
| ID | Nome | Via | CAP | Città | Prov | Default |
|----|------|-----|-----|-------|------|---------|
| 1 | Magazzino | Via delle Gardenie, 15 | 24121 | Bergamo | BG | ✓ |
| 2 | Spedizione | Largo Augusto, 7 | 20122 | Milano | MI | |

### 8.3 Codici sconto demo (3)
| Codice | Tipo | Valore |
|--------|------|--------|
| B2B10 | % | −10% |
| B2B20 | % | −20% |
| SPRING50 | Fisso | −50,00 € |

### 8.4 Metodi pagamento demo (5)
| Codice | Descrizione | Mostra coordinate LUIS |
|--------|-------------|----------------------|
| BB30 | Bonifico 30 gg d.f. | ✓ |
| BB60 | Bonifico 60 gg d.f. | ✓ |
| ANT | Bonifico anticipato | ✓ |
| RB30 | Ri.Ba. 30 gg | |
| RB60 | Ri.Ba. 60 gg | |

### 8.5 Coordinate LUIS demo
```
Intestatario: Luis S.r.l.
Banca: Intesa Sanpaolo
IBAN: IT60X0542811101000000123456
SWIFT: BCITITMM
```

### 8.6 Provincia → Regione (demo, estratto)
Mappa completa in `checkout.html` (`PROV_REGIONE`), 107 province italiane.  
Usata dal prototipo per simulare la risoluzione provincia → regione prima della chiamata API.

---

## 9. Checklist di parità pre-consegna

- [ ] Layout: grid 1fr 380px, collasso a 1 colonna <920px
- [ ] Sidebar sticky a top:80px, scroll lista articoli
- [ ] 4 sezioni form nell'ordine: Pagamento → Consegna → Indirizzo → Note
- [ ] Condizioni pagamento in testa, coordinate LUIS solo per bonifici
- [ ] Radio cards per modalità consegna con radio button visibile
- [ ] Address cards con radio nascosto, selected via classe CSS
- [ ] "Imposta come predefinito" funzionante su ogni card
- [ ] Nuovo indirizzo: form + checkbox default + salva + aggiunta dinamica alla griglia
- [ ] Provincia: combobox autocomplete, non select nativo
- [ ] Modifica inline indirizzi non-Integra (icona matita)
- [ ] Articoli sidebar: badge codice pill verde + nome ellipsis + riga 2 destra con listino barrato/sconto/qty×prezzo/netto
- [ ] Tabella economica: listino → coupon → divider → subtotale scontato (bold) → spedizione (bold) → divider → totale IVA esclusa (bold, 18px)
- [ ] Codice sconto: input+applica visibili, dopo applicazione spariscono e resta ×
- [ ] Spedizione calcolata dinamicamente al cambio indirizzo/modalità
- [ ] Spedizione = 0 per Ritiro, "Gratuita" verde se sopra soglia
- [ ] Pulsante Copia IBAN: copia senza spazi, feedback "Copiato!", fallback legacy
- [ ] Conferma ordine: validazione, stato confermato con numero ordine e totale
- [ ] Backend: modulo NestJS dedicato, guardie, permessi, migration Prisma
- [ ] Frontend: componente riusa `Modal`, `DataTable`, `ComboboxField`, `Tooltip` esistenti
- [ ] i18n: chiavi in `frontend/messages/it.json` ed `en.json`
- [ ] Typecheck, lint, build passano per frontend e backend
- [ ] `daIntegra` flag rispettato: backend rifiuta modifiche a indirizzi Integra
- [ ] `navigator.clipboard.writeText()` con fallback `execCommand('copy')`

---

## 10. Note implementative

- Il prototipo `checkout.html` è una demo standalone con dati fittizi. La versione production deve sostituire ogni dato hardcoded con chiamate API reali.
- La logica di calcolo spedizione nel prototipo è simulata (`calcolaSpedizione`). In produzione va sostituita con `POST /api/checkout/spedizione`.
- Il combobox provincia riusa il pattern `createCombobox` già presente in `_new_combobox.js` e `frontend/components/admin/ComboboxField.tsx`.
- Per la modifica inline degli indirizzi, usare `contentEditable` con salvataggio via `PATCH /api/indirizzi/:id`.
- Le coordinate bancarie LUIS devono essere configurate lato server (`.env` o tabella `Impostazioni`) e MAI esposte in chiaro nel frontend se non necessarie.
- La sidebar deve essere sticky e la lista articoli deve avere scroll interno se troppo lunga.
- Il selettore modalità pagamento è un `<select>` nel prototipo per demo; in produzione arriva da Integra ed è read-only (o con override admin).
