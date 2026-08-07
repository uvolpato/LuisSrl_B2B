# Specifica — Riepilogo ordine (recap prima della conferma)

## 1. Concetto

Il **Riepilogo ordine** è la schermata di revisione finale prima dell'invio. Dopo aver compilato il checkout (modalità consegna, indirizzo, note, coupon), il cliente arriva a questa pagina che mostra tutti i dati in sola lettura, organizzati in sezioni, con il riepilogo economico completo. Da qui può tornare indietro per modificare oppure confermare definitivamente l'ordine.

### 1.1 Flusso utente

```
Carrello → Checkout (compilazione) → Riepilogo (revisione) → Conferma (ordine inviato)
                                              ↑                       ↓
                                              └── Modifica ──────────┘
```

### 1.2 Prototipo di riferimento

- File: `recap-ordine.html` (root del repo, ~10 KB, HTML standalone)
- Stile: stesso design system del checkout (`checkout.html`), stessi token CSS
- Stack target: Next.js (`frontend/`) + NestJS (`backend/`)

---

## 2. Modello dati (dal checkout)

Il recap eredita tutti i dati compilati nel checkout. Non introduce nuove entità.

```ts
interface RecapData {
  items: CartItem[];                    // come da specifica-checkout §2.1
  modalita: "RITIRO" | "SPEDIZIONE";
  indirizzo: Address | null;            // come da specifica-checkout §2.2
  payment: { codice: string; descrizione: string };
  coupon: CouponState | null;           // come da specifica-checkout §2.3
  notaSpedizione: string;
  notaOrdine: string;
  shipping: ShippingResult;             // come da specifica-checkout §2.4
  subtotal: number;
  subtotalListino: number;
  totale: number;
}
```

In produzione i dati arrivano dal backend (stesso endpoint del checkout o endpoint dedicato `GET /api/checkout/recap`).

---

## 3. Struttura della pagina

Layout: singola colonna centrata, max-width 860px.

```
┌──────────────────────────────────────────────────────┐
│  AreaHeader (layout condiviso)                       │
├──────────────────────────────────────────────────────┤
│  [1] Carrello → [2] Checkout → [3] Riepilogo → [4]  │  ← stepper
│  Conferma                                            │
│                                                      │
│  H1: Riepilogo ordine                                │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🛒 Articoli (6 prodotti)          sconto medio │  │
│  │ ────────────────────────────────────────────── │  │
│  │ CAPI0101 Vaso Torchio Terracotta Ø30 H35      │  │
│  │                ~~16,53 €~~ −25% 12×12,40 € 148,80 € │
│  │ CAPI0203 Vaso Amphora Cotto H50               │  │
│  │                ~~32,18 €~~ −20% 6×25,74 € 154,44 € │
│  │ ...                                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🚚 Consegna                                    │  │
│  │ Modalità        Spedizione corriere             │  │
│  │ Indirizzo                                       │  │
│  │ ┌──────────────────────────────────────────┐   │  │
│  │ │ Magazzino                                │   │  │
│  │ │ Via delle Gardenie, 15                   │   │  │
│  │ │ 24121 Bergamo (BG)                       │   │  │
│  │ └──────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 💳 Condizioni di pagamento                     │  │
│  │ Metodo      BB30 — Bonifico 30 gg d.f.        │  │
│  │ Coordinate LUIS                                │  │
│  │ ┌──────────────────────────────────────┐ 📋    │  │
│  │ │ LUIS S.r.l.                          │ Copia │  │
│  │ │ IT 60 X 05428... — Intesa Sanpaolo   │ IBAN  │  │
│  │ └──────────────────────────────────────┘       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 📝 Note (solo se compilate)                    │  │
│  │ Nota spedizione  Consegna al piano terra...    │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ ⓘ Riepilogo economico                         │  │
│  │ Totale articoli a listino          1.056,60 €  │  │
│  │ Sconto codice B2B10                 −105,66 €  │  │
│  │ ────────────────────────────────────────────── │  │
│  │ Subtotale scontato                   835,26 €  │  │
│  │ Spedizione                            11,34 €  │  │
│  │ ────────────────────────────────────────────── │  │
│  │ Totale (IVA esclusa)                 846,60 €  │  │
│  │ Confermando, l'ordine sarà trasmesso a Integra │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Verifica i dati prima [...]  [← Modifica] [✓ Invia] │
└──────────────────────────────────────────────────────┘
```

### 3.1 Sezioni (in ordine)

1. **Articoli** — lista completa con badge codice, nome, listino barrato, sconto%, qty×prezzo, totale. Footer con sconto medio ordine.
2. **Consegna** — modalità + indirizzo in box grigio. Nascosto per Ritiro.
3. **Condizioni di pagamento** — metodo + coordinate LUIS (solo per bonifici: BB30, BB60, ANT). Pulsante Copia IBAN.
4. **Note** — visibile solo se almeno una nota è stata compilata. Riga per nota spedizione, riga per nota ordine.
5. **Riepilogo economico** — total-table identica al checkout: listino → coupon → divider → subtotale scontato (bold) → spedizione (bold) → divider → totale IVA esclusa (bold, 18px). Nota su trasmissione a Integra.
6. **Azioni** — "← Modifica" (torna al checkout) + "Conferma e invia ordine" (btn-primary, large, con icona ✓)

### 3.2 Stepper

Progress indicator a 4 passi:
1. Carrello ✓ (done)
2. Checkout ✓ (done)
3. Riepilogo ● (active)
4. Conferma ○ (pending)

Stesse classi CSS del checkout (`.stepper`, `.step`, `.step-line`).

---

## 4. Comportamenti interattivi

1. **Tutti i dati sono read-only** — nessun campo editabile. Il recap è una vista di revisione.
2. **Pulsante "← Modifica"** — torna alla pagina checkout (in produzione: `router.back()` o link a `/area/checkout`).
3. **Pulsante "Conferma e invia ordine"** — disabilita il bottone, mostra "Invio in corso…", dopo 1.2s di simulazione passa allo stato "Ordine inviato".
4. **Copia IBAN** — stesso comportamento del checkout: copia senza spazi, feedback "Copiato!" per 2s, fallback `execCommand`.
5. **Sezione Indirizzo** — nascosta se modalità = Ritiro.
6. **Sezione Note** — nascosta se entrambe le note sono vuote.
7. **Coordinate LUIS** — visibili solo per codici pagamento BB30, BB60, ANT.
8. **Coupon** — la riga "Sconto codice" appare solo se un coupon è stato applicato.
9. **Spedizione gratuita** — label "Gratuita" in verde se l'ordine supera la soglia.
10. **Stato confermato** — card `.checkout-confirm` con icona ✓, numero ordine, totale, link "Continua lo shopping" e "Area personale".

---

## 5. Differenze rispetto al checkout

| Aspetto | Checkout | Recap |
|---------|----------|-------|
| Scopo | Compilare dati | Revisionare prima dell'invio |
| Campi | Editabili (select, input, radio) | Solo lettura |
| Layout | 2 colonne (form + sidebar) | 1 colonna centrata (max 860px) |
| Stepper | 2 attivo (Checkout) | 3 attivo (Riepilogo) |
| Azioni | "Conferma ordine" | "← Modifica" + "Conferma e invia ordine" |
| Sezioni | Pagamento, Consegna, Indirizzo, Note | Articoli, Consegna, Pagamento, Note, Economico |

---

## 6. API (da implementare)

### 6.1 Dati recap
```
GET /api/checkout/recap
Response: RecapData (vedi §2)
```

In alternativa, riusare `GET /api/checkout/dati` con i dati già compilati in sessione.

### 6.2 Conferma definitiva
```
POST /api/checkout/conferma
Body: {
  modalitaConsegna: "RITIRO"|"SPEDIZIONE",
  indirizzoSpedizioneId?: number,
  codiceCoupon?: string,
  codicePagamento?: string,
  notaSpedizione?: string,
  notaOrdine?: string
}
Response: { id: number, numeroOrdine: string, importoTotale: number }
```

(Stesso endpoint del checkout — il recap non aggiunge nuovi parametri, solo una conferma esplicita.)

---

## 7. Mapping CSS

| Recap | Sorgente |
|-------|----------|
| `:root` tokens | `frontend/app/globals.css` |
| `.catalogo-page`, `.container` | catalogo.css |
| `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-lg` | globals.css |
| `.stepper`, `.step`, `.step-line` | checkout.html |
| `.page-title` | catalogo.css:1465–1470 |
| `.recap-section` | catalogo.css:1482–1488 (adattato) |
| `.recap-item-row1`, `.recap-item-row2` | checkout.html (summary-item-row*) |
| `.total-table`, `.total-divider` | checkout.html |
| `.addr-box` | catalogo.css:1623–1630 (summary-ship adattato) |
| `.iban-row`, `.iban-field` | checkout.html |
| `.checkout-confirm` | catalogo.css:1647–1667 |

---

## 8. Dati di riferimento (seed demo)

### 8.1 Recap demo
```js
var RECAP = {
  modalita: "SPEDIZIONE",
  indirizzo: { nome: "Magazzino", indirizzo: "Via delle Gardenie, 15", cap: "24121", citta: "Bergamo", prov: "BG" },
  payment: "BB30 — Bonifico 30 gg d.f.",
  paymentCode: "BB30",
  coupon: { active: true, code: "B2B10", label: "B2B10: −10%" },
  notaSpedizione: "Consegna al piano terra, orario 8–12",
  notaOrdine: "",
  spedizione: { importo: 11.34, descrizione: "Lombardia (1.2%)", gratuita: false }
};
```

### 8.2 Articoli
Vedi `specifica-checkout.md` §8.1 (6 prodotti, stesso dataset).

---

## 9. Checklist di parità pre-consegna

- [ ] Layout centrato singola colonna, max-width 860px
- [ ] Stepper a 4 passi con Riepilogo attivo
- [ ] 5 sezioni nell'ordine: Articoli → Consegna → Pagamento → Note → Riepilogo economico
- [ ] Lista articoli con badge codice + nome + riga 2 (listino barrato, sconto%, qty×prezzo, netto)
- [ ] Sconto medio ordine in fondo alla sezione articoli
- [ ] Box indirizzo in grigio chiaro, nascosto per Ritiro
- [ ] Sezione Note nascosta se entrambe vuote
- [ ] Coordinate LUIS solo per bonifici (BB30, BB60, ANT)
- [ ] Total-table: listino → coupon → divider → subtotale (bold) → spedizione (bold) → divider → totale (bold, 18px)
- [ ] Pulsanti: "← Modifica" (secondary) + "Conferma e invia ordine" (primary, large, icona ✓)
- [ ] Copia IBAN funzionante (senza spazi, feedback 2s)
- [ ] Submit: bottone disabilitato, "Invio in corso…", transizione a stato confermato
- [ ] Stato confermato: card con icona ✓, numero ordine, totale, link navigazione
- [ ] Tutti i dati sono read-only (nessun input editabile)
- [ ] Stessi token CSS del checkout (coerenza visiva)
- [ ] Backend: endpoint recap (GET) + conferma (POST)
- [ ] i18n: chiavi in `frontend/messages/it.json` ed `en.json`
