# Specifica — Admin Ordini (dashboard + elenco + dettaglio)

## 1. Concetto

La pagina **Admin Ordini** è la vista amministrativa per monitorare gli ordini giornalieri. Offre un mini-dashboard con KPI del giorno, una tabella ordinabile con tutti gli ordini, ricerca per cliente/numero, navigazione tra giorni, e un modale di dettaglio per ogni ordine.

### 1.1 Prototipo di riferimento

- File: `admin-ordini.html` (root del repo, ~20 KB, HTML standalone)
- Stack target: Next.js (`frontend/`) + NestJS (`backend/`)
- Stile: token CSS da `frontend/app/globals.css` + pattern DataTable da `spese-spedizione.html`

---

## 2. Struttura della pagina

```
┌──────────────────────────────────────────────────────────────┐
│  AdminTopBar (sticky)                                         │
│  H1: Ordini  │ [◀] [2026-08-10] [Oggi] [▶] │  🔍 Cerca...   │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ ORDINI    │  │ TOTALE    │  │ SCONTO    │  │ SPEDIZIONE│   │
│  │ DEL GIORNO│  │ VENDUTO   │  │ MEDIO     │  │ MEDIA     │   │
│  │   14      │  │ 8.452 €  │  │  18,4%    │  │  9,87 €   │   │
│  │ 3 attesa  │  │ IVA escl. │  │ su listino│  │ per ordine│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  Ordini: 14  Pezzi: 156  Clienti: 11       Totale: 8.452 €  │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ N.Ordine  │ Cliente  │ Data     │ Pezzi │ Totale │ Stato ││
│  │ ORD-08142 │ Verdepiù │ 10/08  9:14│ 56  │ 844€ │ ● Evaso││
│  │ ORD-08143 │ Floricol │ 10/08  9:32│ 42  │1523€ │ ● Inol ││
│  │ ...                                                     ││
│  │ 1–10 di 14                        ◀ 1 / 2 ▶             ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Sezioni

1. **AdminTopBar**: titolo "Ordini", date navigator (◀ picker Oggi ▶), search input con lente
2. **Dashboard cards**: 4 card (grid 4-col, collassa a 2/1): ordini del giorno, totale venduto, sconto medio, spedizione media
3. **Totals bar**: riga mono con conteggi (ordini, pezzi, clienti, totale)
4. **DataTable**: colonne N.Ordine, Cliente, Data, Pezzi, Totale, Stato (status-pill colorata), Pagamento, Azioni (icona occhio per dettaglio)
5. **Footer**: range "1–10 di 14" + pager "1 / 2"

### 2.2 Modale dettaglio

Grid 2-col con: cliente, data, stato, pagamento; sezione spedizione (destinatario, indirizzo, nota); lista articoli con codice, nome, qty×prezzo; totale finale.

---

## 3. Dati (modello)

### 3.1 Ordine
```ts
interface Order {
  id: number;
  num: string;            // es. "ORD-2026-08142"
  clienteId: number;
  data: string;           // "YYYY-MM-DD"
  ora: string;            // "HH:MM"
  stato: "confermato"|"inoltrato"|"evaso"|"annullato"|"attesa";
  pagamento: string;      // "BB30", "BB60", "ANT", "RB30", "RB60"
  totale: number;
  pezzi: number;
  spedizione: number;
  indirizzo: Address | null;
  notaSped?: string;
  items: OrderItem[];
}
```

### 3.2 Articolo ordine
```ts
interface OrderItem {
  codice: string;
  nome: string;
  qty: number;
  prezzo: number;
  listino: number;
}
```

### 3.3 Stati
| Codice | Label | Colore |
|--------|-------|--------|
| confermato | Confermato | verde |
| inoltrato | Inoltrato a fornitore | blu |
| evaso | Evaso | verde |
| annullato | Annullato | rosso |
| attesa | In attesa | ambra |

---

## 4. Comportamenti

1. **Date navigator**: ◀ giorno prima, picker data, bottone "Oggi", ▶ giorno dopo. Al cambio si azzera pagina a 1.
2. **Ricerca**: input con debounce 250ms, cerca in ragione sociale cliente e numero ordine. Azzera pagina a 1.
3. **Dashboard**: le 4 card si aggiornano al cambio data/ricerca. Sconto medio calcolato: (1 − totaleVenduto/totaleListino)×100.
4. **DataTable**: 10 righe per pagina, pager ◀/▶, header sticky, hover row.
5. **Stato**: status-pill con pallino colorato e testo mono.
6. **Dettaglio**: click sull'icona occhio apre modale. Chiusura con X, Chiudi, click backdrop, Escape.
7. **Ordini senza data**: il picker data mostra solo gli ordini del giorno. Selezionando un giorno senza ordini, dashboard mostra 0 e tabella vuota.

---

## 5. API (da implementare)

### 5.1 Dashboard del giorno
```
GET /api/admin/ordini/dashboard?data=2026-08-10
Response: { count, totale, scontoMedio, spedizioneMedia, pezzi, clienti, inAttesa }
```

### 5.2 Elenco ordini
```
GET /api/admin/ordini?data=2026-08-10&page=1&search=
Response: { items: Order[], total: number, page: number, pages: number }
```

### 5.3 Dettaglio ordine
```
GET /api/admin/ordini/:id
Response: Order (completo con items)
```

---

## 6. Mapping CSS

| Prototipo | App |
|-----------|-----|
| `:root` tokens | `frontend/app/globals.css` |
| `.admin-top` | `AdminTopBar` / `admin.css` |
| `.dash-grid`, `.dash-card` | admin.css (da creare) |
| `.data-table`, thead, tbody | `DataTable.tsx` / `admin.css` |
| `.status-pill`, `.st-ok/amber/blue/red` | `spese-spedizione.html` |
| `.modal-overlay`, `.modal`, `.modal-head/body/foot` | `Modal.tsx` / catalogo.css |
| `.btn`, `.btn-primary/secondary/ghost/sm` | `globals.css` |

---

## 7. Checklist di parità

- [ ] AdminTopBar sticky con titolo, date nav e search
- [ ] 4 dashboard card responsive (4→2→1 colonne)
- [ ] Date picker + ◀ ▶ navigazione + bottone Oggi
- [ ] Ricerca con debounce 250ms
- [ ] DataTable con header sticky, 10 righe/pagina, pager
- [ ] Status pill con colori per stato
- [ ] Icona occhio per aprire dettaglio
- [ ] Modale dettaglio con grid 2-col, sezione spedizione, lista articoli, totale
- [ ] Chiusura modale: X, Chiudi, backdrop, Escape
- [ ] Dashboard ricalcolata su cambio data/ricerca
- [ ] Pagina a 1 su cambio data/ricerca
- [ ] Backend: 3 endpoint (dashboard, elenco, dettaglio)
