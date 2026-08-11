# Specifica — Admin Coupon e Campagne Sconto

## 1. Concetto

La pagina **Coupon e campagne** permette all'admin di creare, segmentare e inviare codici sconto ai clienti B2B. Il flusso si articola in 3 viste: elenco campagne con dashboard KPI, editor coupon con segmentazione clienti tramite filtri, e riepilogo con anteprima email prima dell'invio.

### 1.1 Flusso di lavoro

```
Admin apre → Vista 1: Elenco campagne + dashboard KPI
                │
                ├── Clicca "+ Nuova campagna" → Vista 2
                │
Vista 2: Editor coupon (sinistra) + Segmentazione (destra)
  │  Compila: codice, tipo sconto, ambito, validità
  │  Filtra clienti: regione, ultimo ordine, sconto medio, volume
  │  Vedi conteggio in tempo reale: "47 clienti selezionati"
  │
  └── Clicca "Continua → Riepilogo" → Vista 3

Vista 3: Riepilogo + anteprima email + [Invia campagna]
  │  Revisione di tutti i dati
  │  Anteprima email personalizzata
  └── [Invia campagna] → email ai clienti selezionati
```

### 1.2 Prototipo di riferimento

- File: `admin-coupon.html` (root del repo, ~22 KB, HTML standalone)
- Stack target: Next.js (`frontend/`) + NestJS (`backend/`)
- Stile: token da `frontend/app/globals.css`, pattern DataTable da `spese-spedizione.html`
- Pattern riusabili: `AdminTopBar`, `DataTable`, `Modal`

---

## 2. Struttura della pagina

### 2.1 Vista 1 — Elenco campagne

```
┌─────────────────────────────────────────────────────────────────┐
│  AdminTopBar: Coupon e campagne              │  🔍 Cerca...     │
├─────────────────────────────────────────────────────────────────┤
│  Tab: [Campagne]  Nuova campagna                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ COUPON   │  │ UTILIZZI │  │ VOLUME   │  │ TASSO    │      │
│  │ ATTIVI   │  │ TOTALI   │  │ SCONTATO │  │ RISCATTO │      │
│  │    5     │  │  1.247   │  │ 18.450 € │  │  23,8%   │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ CODICE   CAMPAGNA     AMBITO        UTILIZZI VALIDITÀ  ...  │ │
│  │ ESTATE25 Promo Estate Tutto catalogo  892   01/06→31/08    │ │
│  │ B2B10    Sconto B2B   Tutto catalogo  234   01/01→Sempre   │ │
│  │ VASI20   Vasi promo   Vasi terracotta  89   01/07→30/09    │ │
│  │ FREESHIP Sped.gratis  Tutto catalogo    0   01/09→31/10    │ │
│  │ XMAS50   Natale 2025  Coll.Natale       32   15/11→31/12    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  5 campagne                           [+ Nuova campagna]        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Vista 2 — Editor + Segmentazione

```
┌─────────────────────────────────────────────────────────────────┐
│  Tab: Campagne  [Nuova campagna]                                │
├────────────────────────────┬────────────────────────────────────┤
│  Dati coupon               │  Destinatari                       │
│  ┌──────────────────────┐  │  ┌──────────────────────────────┐  │
│  │ Codice    [ESTATE25] │  │  │ Regione  [Lombardia     ▾]  │  │
│  │ Campagna  [Promo...] │  │  │ Ult.ordine [>90 giorni  ▾]  │  │
│  │ Tipo      [% ▾]      │  │  │ Sconto    [Medio 10-25% ▾]  │  │
│  │ Valore    [10]       │  │  │ Volume    [>20.000€    ▾]  │  │
│  │ Ambito    [Tutto ▾]  │  │  │                              │  │
│  │ Soglia    [—]        │  │  │ Clienti selezionati     47   │  │
│  │ Utilizzo  [Illim. ▾] │  │  │ [Vedi elenco ▼]             │  │
│  │ Dal       [01/06]    │  │  │ ☑ Verdepiù di Bianchi  LO   │  │
│  │ Al        [31/08]    │  │  │ ☑ Terra e Colore Sas   LO   │  │
│  └──────────────────────┘  │  │ ...                          │  │
│                            │  └──────────────────────────────┘  │
├────────────────────────────┴────────────────────────────────────┤
│                         [Annulla]      [Continua → Riepilogo]    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Vista 3 — Riepilogo e invio

```
┌─────────────────────────────────────────────────────────────────┐
│  Tab: Campagne  Nuova campagna  [Riepilogo]                     │
├────────────────────────────┬────────────────────────────────────┤
│  Riepilogo campagna        │  Invio campagna                    │
│  Campagna   Promo Estate   │  Verranno inviate 47 email.        │
│  Codice     ESTATE25       │                                    │
│  Tipo       −10%           │  [← Modifica]                      │
│  Ambito     Tutto catalogo │  [✉ Invia campagna]               │
│  Utilizzo   Illimitato     │                                    │
│  Validità   01/06→31/08    │                                    │
│  Dest.      47 clienti     │                                    │
│                            │                                    │
│  Anteprima email           │                                    │
│  Oggetto: Codice sconto    │                                    │
│  Gentile [Nome],           │                                    │
│  ... codice esclusivo ...  │                                    │
│  ┌──────────┐              │                                    │
│  │ ESTATE25 │              │                                    │
│  └──────────┘              │                                    │
│  −10% su tutto il catalogo │                                    │
└────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Modello dati

### 3.1 Campagna/Coupon

```ts
interface Campaign {
  id: number;
  code: string;                // es. "ESTATE25", uppercase
  name: string;                // nome descrittivo
  type: "pct" | "fixed" | "free-ship";
  value: number;               // 0 per free-ship, altrimenti % o €
  scope: "all" | "family" | "collection";
  scopeDetail?: string;        // nome famiglia/raccolta se scope != all
  minOrder?: number;           // soglia minima ordine (€)
  usage: "unlimited" | "once" | "single";
  validFrom: string;           // "YYYY-MM-DD"
  validTo?: string;            // null = sempre valido
  status: "active" | "scheduled" | "expired" | "paused";
  targetCount: number;         // numero clienti target
  usedCount: number;           // numero utilizzi effettivi
  filters?: SegmentFilter[];   // filtri di segmentazione usati
  customerIds?: number[];      // clienti target (se salvati)
}
```

### 3.2 Filtro segmentazione

```ts
interface SegmentFilter {
  field: "regione" | "ultimoOrdine" | "scontoMedio" | "volume";
  operator: "eq" | "gt" | "lt" | "between";
  value: string;
}
```

### 3.3 KPI dashboard

```ts
interface CouponDashboard {
  activeCount: number;
  totalUsed: number;
  totalVolume: number;      // € scontati
  redemptionRate: number;   // %
}
```

---

## 4. Regole di business

### 4.1 Tipi di sconto
- **Percentuale**: −X% sul subtotale scontato (es. −10%)
- **Importo fisso**: −X € sul totale (es. −50 €)
- **Spedizione gratuita**: azzera il costo di spedizione

### 4.2 Ambito
- **Tutto il catalogo**: valido su qualsiasi articolo
- **Famiglia specifica**: solo articoli di una famiglia (es. "Vasi in terracotta")
- **Raccolta**: solo articoli di una raccolta/gruppo (es. "Collezione Natale")

### 4.3 Utilizzo
- **Illimitato**: ogni cliente può usarlo più volte
- **Una volta per cliente**: ogni cliente può usarlo una sola volta
- **Mono-uso**: il primo cliente che lo usa lo consuma per tutti

### 4.4 Segmentazione
- Filtri combinabili in AND: regione, ultimo ordine, sconto medio, volume
- I filtri sono opzionali: se nessuno è selezionato, target = tutti i clienti
- Il conteggio si aggiorna in tempo reale al cambio di ogni filtro
- L'elenco clienti è espandibile con checkbox per deselezionare singoli

### 4.5 Invio
- Al click "Invia campagna", il backend invia email personalizzate a tutti i clienti target
- Ogni email contiene: nome cliente, codice coupon, descrizione sconto, data scadenza
- Il pulsante diventa "Campagna inviata!" con check verde dopo l'invio
- Le email sono personalizzate (`[Nome Cliente]` nell'anteprima)

---

## 5. Comportamenti interattivi

1. [x] Tab navigation: Campagne / Nuova campagna / Riepilogo
2. [x] Vista 1: 4 dashboard card con KPI + DataTable 5 campagne
3. [x] Vista 1: ricerca testuale nella top bar
4. [x] Vista 1: pulsante "+ Nuova campagna" nel footer
5. [x] Vista 2: layout a due colonne (form sinistra, segmentazione destra)
6. [x] Vista 2: select ambito mostra/nasconde il dettaglio famiglia/raccolta
7. [x] Vista 2: filtri segmentazione in cascata (AND)
8. [x] Vista 2: conteggio clienti in tempo reale
9. [x] Vista 2: elenco clienti espandibile con checkbox
10. [x] Vista 2: validazione "Seleziona almeno un cliente" prima di continuare
11. [x] Vista 3: riepilogo con tutti i dati della campagna
12. [x] Vista 3: anteprima email con segnaposto `[Nome Cliente]`
13. [x] Vista 3: pulsante "Invia campagna" con stato submit e feedback
14. [x] Vista 3: pulsante "← Modifica" per tornare all'editor
15. [x] Status pill nella lista: attiva (verde), programmata (blu), scaduta (grigio)

---

## 6. API (da implementare)

### 6.1 Dashboard KPI
```
GET /api/admin/coupon/dashboard
Response: CouponDashboard
```

### 6.2 Elenco campagne
```
GET /api/admin/coupon?search=&status=
Response: Campaign[]
```

### 6.3 Crea campagna
```
POST /api/admin/coupon
Body: { code, name, type, value, scope, scopeDetail?, minOrder?, usage, validFrom, validTo?, filters, customerIds? }
Response: Campaign
```

### 6.4 Anteprima segmentazione
```
POST /api/admin/coupon/preview-segment
Body: { filters: SegmentFilter[] }
Response: { count: number, customers: { id, nome, regione }[] }
```

### 6.5 Invia campagna
```
POST /api/admin/coupon/:id/send
Response: { sent: number, status: "sent" }
```

---

## 7. Checklist di parità

- [ ] 3 viste con tab navigabili
- [ ] Vista 1: 4 card dashboard + DataTable 8 colonne
- [ ] Vista 2: layout 2-colonne, form coupon + pannello segmentazione
- [ ] Filtri segmentazione: regione, ultimo ordine, sconto medio, volume
- [ ] Conteggio clienti in tempo reale al cambio filtri
- [ ] Elenco clienti espandibile con singola deselezione
- [ ] Scope toggle: famiglia/raccolta mostra dettaglio
- [ ] Validazione pre-riepilogo (almeno 1 cliente)
- [ ] Vista 3: riepilogo completo + anteprima email con badge coupon
- [ ] Bottone invia con stato di submit e feedback verde
- [ ] Status pill colorate nella lista
- [ ] Backend: 5 endpoint (dashboard, elenco, crea, preview, invia)
- [ ] Invio email con personalizzazione nome cliente
- [ ] Guardie admin e permessi
