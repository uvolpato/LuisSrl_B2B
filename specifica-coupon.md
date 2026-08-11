# Specifica — Admin Coupon e Campagne Sconto

## 1. Concetto

La pagina **Coupon e campagne** permette all'admin di creare, segmentare e inviare codici sconto ai clienti B2B. Il flusso si articola in una vista principale con dashboard KPI ed elenco campagne, e due modali: editor (coupon + segmentazione) e riepilogo con anteprima email prima dell'invio.

### 1.1 Flusso di lavoro

```
Admin apre → Vista principale: Dashboard KPI + elenco campagne
                │
                ├── Clicca "+ Nuova campagna" (top bar) → Modale editor
                │
Modale editor (2 sezioni: Dati coupon | Destinatari)
  │  Sezione 1: codice, tipo sconto, ambito, validità, QR code
  │  Sezione 2: filtri segmentazione + ricerca manuale + AI suggestions
  │  Vedi conteggio in tempo reale
  │
  └── Clicca "Continua → Riepilogo" → Modale riepilogo

Modale riepilogo: recap + anteprima email personalizzata + [Invia campagna]
  │  Revisione di tutti i dati
  │  Anteprima email con segnaposto cliente
  └── [Invia campagna] → email + QR code ai clienti selezionati
```

### 1.2 Prototipo di riferimento

- File: `admin-coupon.html` (root del repo, ~38 KB, HTML standalone, ~612 righe)
- Stack target: Next.js (`frontend/`) + NestJS (`backend/`)
- Stile: token da `frontend/app/globals.css`, pattern DataTable da `spese-spedizione.html`
- Pattern riusabili: `AdminTopBar`, `DataTable`, `Modal` (da admin-ordini.html / catalogo.css)

---

## 2. Struttura della pagina

### 2.1 Vista principale (elenco)

```
┌──────────────────────────────────────────────────────────────────┐
│  AdminTopBar: Coupon e campagne     │  🔍 Cerca...  │ + Nuova    │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ COUPON   │  │ UTILIZZI │  │ VOLUME   │  │ TASSO    │       │
│  │ ATTIVI 5 │  │ TOT.1247 │  │ 18.450€  │  │ 23,8%    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ CODICE   CAMPAGNA      AMBITO         UTILIZZI VALIDITÀ ... ││
│  │ ESTATE25 Promo Estate  Tutto catalogo   892   01/06→31/08  ││
│  │ ...                                                         ││
│  │ 5 campagne                                                   ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Modale editor (2 sezioni)

```
┌──────────────────────────────────────────────────────┐
│  Nuova campagna                                  [✕] │
│──────────────────────────────────────────────────────│
│  DATI COUPON                                         │
│  ┌─────────────────┬─────────────────┐              │
│  │ Codice  [Gen.]  │ Nome campagna   │              │
│  │ Tipo sconto     │ Valore          │              │
│  │ Ambito          │ Fam./Raccolta   │              │
│  │ Soglia min.     │ Utilizzo        │              │
│  │ Valido dal      │ Valido al       │              │
│  └─────────────────┴─────────────────┘              │
│  ┌──────┬──────────────────────────────────────┐    │
│  │  QR  │ Il QR sarà incluso nell'email...     │    │
│  └──────┴──────────────────────────────────────┘    │
│──────────────────────────────────────────────────────│
│  DESTINATARI                                         │
│  ┌──────────────────────────────────────────────┐   │
│  │ Ricerca: [________________] [Cerca]          │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────┬──────┬──────┬──────┐                     │
│  │ Reg. │ Ult. │ Sc.% │ Vol. │  (filtri)          │
│  └──────┴──────┴──────┴──────┘                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ 🤖 AI — Suggerimenti campagna                │   │
│  │  Clienti inattivi 90gg+           12 cl.     │   │
│  │  Top spender senza sconto           4 cl.     │   │
│  │  Nuovi clienti da fidelizzare       3 cl.     │   │
│  │  Lombardia — campagna regionale     5 cl.     │   │
│  └──────────────────────────────────────────────┘   │
│  Clienti selezionati: 47  [Vedi elenco ▼]          │
│──────────────────────────────────────────────────────│
│                         [Annulla] [Continua → Rep.]  │
└──────────────────────────────────────────────────────┘
```

### 2.3 Modale riepilogo

```
┌──────────────────────────────────────────────────────┐
│  Riepilogo campagna                             [✕] │
│──────────────────────────────────────────────────────│
│  DATI CAMPAGNA              ANTEPRIMA EMAIL          │
│  Campagna   Promo Estate    Oggetto: Codice sconto   │
│  Codice     ESTATE25        Gentile [Nome Cliente],  │
│  Tipo       −10%            ti riserviamo...         │
│  Ambito     Tutto catalogo  ┌──────────┐             │
│  Utilizzo   Illimitato      │ ESTATE25 │             │
│  Validità   01/06→31/08     └──────────┘             │
│  Dest.      47 clienti      −10% su tutto il cat.   │
│                                                      │
│  Verranno inviate 47 email.                          │
│──────────────────────────────────────────────────────│
│                      [← Modifica]  [✉ Invia campagna]│
└──────────────────────────────────────────────────────┘
```

---

## 3. Modello dati

### 3.1 Campagna/Coupon

```ts
interface Campaign {
  id: number;
  code: string;                 // es. "ESTATE25", uppercase, 4-12 caratteri
  name: string;                 // nome descrittivo campagna
  type: "pct" | "fixed" | "free-ship";
  value: number;                // 0 per free-ship, altrimenti % o €
  scope: "all" | "family" | "collection";
  scopeDetail?: string;         // nome famiglia/raccolta se scope != all
  minOrder?: number;            // soglia minima ordine in €
  usage: "unlimited" | "once" | "single";
  validFrom: string;            // "YYYY-MM-DD"
  validTo?: string;             // null = sempre valido
  status: "active" | "scheduled" | "expired" | "paused";
  targetCount: number;          // numero clienti target
  usedCount: number;            // utilizzi effettivi
  qrCode?: string;              // URL o base64 del QR code generato
  filters?: SegmentFilter[];    // filtri usati per la segmentazione
  customerIds?: number[];       // lista id clienti target
}
```

### 3.2 Cliente (per segmentazione)

```ts
interface Customer {
  id: number;
  nome: string;                 // ragione sociale
  cod: string;                  // codice cliente (es. "C001")
  piva: string;                 // partita IVA (es. "IT01234567890")
  regione: string;              // regione sede
  ultimoOrdine: number;         // giorni dall'ultimo ordine
  scontoMedio: number;          // % sconto medio praticato
  volume: number;               // volume ordini ultimi 12 mesi in €
}
```

### 3.3 Filtro segmentazione

```ts
interface SegmentFilter {
  field: "regione" | "ultimoOrdine" | "scontoMedio" | "volume";
  operator: "eq" | "gt" | "lt" | "between";
  value: string;
}
```

### 3.4 AI Suggestion

```ts
interface AISuggestion {
  title: string;                // es. "Clienti inattivi da oltre 90 giorni"
  description: string;          // spiegazione del suggerimento
  count: number;                // numero clienti nel segmento
  filters: Partial<Record<string, string>>;  // filtri pre-impostati
}
```

### 3.5 Dashboard KPI

```ts
interface CouponDashboard {
  activeCount: number;          // coupon attivi
  totalUsed: number;            // utilizzi totali
  totalVolume: number;          // € scontati
  redemptionRate: number;       // % riscatto
}
```

---

## 4. Regole di business

### 4.1 Tipi di sconto

| Tipo | Comportamento | Campo `value` |
|------|--------------|---------------|
| `pct` | −X% sul subtotale scontato | 10 = 10% |
| `fixed` | −X € sul totale | 50 = 50 € |
| `free-ship` | Azzera costo spedizione | 0 (ignorato) |

### 4.2 Ambito

| Ambito | Comportamento | UI |
|--------|--------------|-----|
| `all` | Valido su qualsiasi articolo | Nessun campo extra |
| `family` | Solo articoli di una famiglia | Select con famiglie |
| `collection` | Solo articoli di una raccolta | Select con raccolte |

Il campo famiglia/raccolta è sempre presente nel layout, disabilitato con opacità se non pertinente (non sposta il layout).

### 4.3 Utilizzo

| Modalità | Comportamento |
|----------|--------------|
| `unlimited` | Ogni cliente può usarlo infinite volte |
| `once` | Ogni cliente può usarlo una sola volta |
| `single` | Il primo che lo usa lo consuma per tutti |

### 4.4 Segmentazione clienti

Tre modalità di selezione, combinabili:

1. **Filtri** (AND): regione, ultimo ordine, sconto medio, volume 12 mesi. Conteggio in tempo reale.
2. **Ricerca manuale**: per codice cliente, ragione sociale o P. IVA. Checkbox per selezionare/deselezionare singoli clienti.
3. **AI Suggestions**: 4 suggerimenti pre-calcolati che impostano automaticamente i filtri. Cliccando uno, i filtri si popolano e il conteggio si aggiorna.

### 4.5 QR Code

- Generato dinamicamente dal codice coupon (Google Charts API in demo; in produzione usare libreria lato server).
- Aggiornato in tempo reale mentre si digita il codice.
- Pulsante "Genera" produce un codice alfanumerico univoco di 8 caratteri.
- Il QR sarà incluso nell'email per essere scansionato dal cliente.

### 4.6 Invio campagna

- Il backend invia email personalizzate a tutti i clienti target.
- Ogni email contiene: nome cliente, codice coupon in chiaro e QR code, descrizione sconto, data scadenza.
- Il pulsante mostra stato "Invio in corso..." → "Campagna inviata!" (verde, 3s) → reset.

---

## 5. Comportamenti interattivi (checklist)

### Vista principale
1. [x] AdminTopBar con titolo, ricerca + pulsante "+ Nuova campagna" in top bar
2. [x] 4 dashboard card: coupon attivi, utilizzi, volume scontato, tasso riscatto
3. [x] DataTable 8 colonne: codice, campagna, ambito, utilizzi, validità, target, stato (pill), azioni
4. [x] Footer tabella con conteggio campagne
5. [x] Status pill: attiva (verde), programmata (blu), scaduta (grigio)

### Modale editor
6. [x] Aperta con click su "+ Nuova campagna"
7. [x] Sezione "Dati coupon": form-grid 2-col con 9 campi
8. [x] Pulsante "Genera" affiancato al codice — produce 8 caratteri alfanumerici casuali
9. [x] QR code box: immagine QR + descrizione, si aggiorna mentre si digita
10. [x] Scope toggle: disabilita/abilita il campo famiglia/raccolta senza spostare il layout
11. [x] Sezione "Destinatari": ricerca clienti, filtri, AI suggestions, conteggio, elenco espandibile
12. [x] Ricerca per codice, ragione sociale, P. IVA con pulsante Cerca
13. [x] AI suggestions: 4 suggerimenti cliccabili che impostano i filtri automaticamente
14. [x] Filtri in AND con conteggio in tempo reale
15. [x] Elenco clienti espandibile con checkbox per deselezione singola
16. [x] Validazione: almeno 1 cliente prima di "Continua → Riepilogo"
17. [x] Chiusura: ✕, Annulla, backdrop click

### Modale riepilogo
18. [x] Riepilogo completo: campagna, codice, tipo, ambito, utilizzo, validità, destinatari
19. [x] Anteprima email con segnaposto `[Nome Cliente]` e badge coupon colorato
20. [x] Conteggio email da inviare
21. [x] Pulsante "← Modifica": chiude riepilogo e riapre editor
22. [x] Pulsante "Invia campagna": stato loading → feedback verde 3s → reset
23. [x] Chiusura: ✕, Modifica, backdrop click, Escape

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
Body: { code, name, type, value, scope, scopeDetail?, minOrder?, usage, validFrom, validTo?, filters?, customerIds? }
Response: Campaign
```

### 6.4 Anteprima segmentazione
```
POST /api/admin/coupon/preview-segment
Body: { filters: SegmentFilter[] }
Response: { count: number, customers: Customer[] }
```

### 6.5 Ricerca clienti
```
GET /api/admin/clienti/search?q=
Response: Customer[]
```

### 6.6 AI suggestions
```
GET /api/admin/coupon/ai-suggestions
Response: AISuggestion[]
```
In produzione, l'AI analizza i dati reali (inattività, volumi, marginalità, stagionalità, regione) per generare suggerimenti. In demo sono 4 segmenti predefiniti.

### 6.7 Genera QR code
```
POST /api/admin/coupon/qrcode
Body: { code: string }
Response: { qrCode: string }  // URL o base64 PNG
```

### 6.8 Invia campagna
```
POST /api/admin/coupon/:id/send
Response: { sent: number, status: "sent" }
```

---

## 7. Dati di riferimento (seed demo)

### 7.1 Campagne demo (5)
| Codice | Campagna | Tipo | Ambito | Stato | Utilizzi |
|--------|----------|------|--------|-------|----------|
| ESTATE25 | Promo Estate 2026 | −10% | Tutto | Attiva | 892 |
| B2B10 | Sconto B2B permanente | −10% | Tutto | Attiva | 234 |
| VASI20 | Vasi in promozione | −20% | Vasi terracotta | Attiva | 89 |
| FREESHIP | Spedizione gratis | Sped.gratis | Tutto | Programmata | 0 |
| XMAS50 | Natale 2025 | −50€ | Coll. Natale | Scaduta | 32 |

### 7.2 Clienti demo (12, con codici e P.IVA)
| Cod | Nome | P.IVA | Regione | Ult.ord | Sc.% | Vol. |
|-----|------|-------|---------|---------|------|------|
| C001 | Verdepiù di Bianchi & C. | IT01234567890 | Lombardia | 12gg | 18% | 14.500€ |
| C002 | Floricoltura Lombardi | IT02345678901 | Lombardia | 45gg | 22% | 8.900€ |
| C003 | Green Garden Center | IT03456789012 | Toscana | 8gg | 12% | 3.200€ |
| C004 | Piante e Dintorni | IT04567890123 | Veneto | 3gg | 25% | 21.500€ |
| C005 | Vivai Riuniti Veneto | IT05678901234 | Veneto | 120gg | 8% | 9.800€ |
| C006 | Terra e Colore Sas | IT06789012345 | Lombardia | 60gg | 15% | 34.000€ |
| C007 | GardenShop Bergamo | IT07890123456 | Lombardia | 15gg | 20% | 7.200€ |
| C008 | Il Giardino Segreto | IT08901234567 | Lazio | 90gg | 30% | 5.200€ |
| C009 | Agriverde Cooperativa | IT09012345678 | Emilia-R. | 2gg | 10% | 18.500€ |
| C010 | Fiori e Foglie | IT00123456789 | Campania | 200gg | 5% | 4.200€ |
| C011 | Ortoflor Commerciale | IT11234567890 | Piemonte | 30gg | 18% | 26.000€ |
| C012 | Verde Casa Martinelli | IT12234567890 | Sicilia | 180gg | 28% | 3.100€ |

### 7.3 AI Suggestions demo (4)
| Titolo | Clienti | Filtri |
|--------|---------|--------|
| Clienti inattivi da oltre 90 giorni | 12 | ultimoOrdine = over90 |
| Top spender senza sconto recente | 4 | volume = xlarge AND sconto = low |
| Nuovi clienti da fidelizzare | 3 | volume = small |
| Lombardia — campagna regionale | 5 | regione = Lombardia |

### 7.4 Dashboard KPI demo
| KPI | Valore |
|-----|--------|
| Coupon attivi | 5 (3 in scadenza entro 30gg) |
| Utilizzi totali | 1.247 |
| Volume scontato | 18.450 € |
| Tasso riscatto | 23,8% |

---

## 8. Mapping CSS

| Prototipo (classi) | App (sorgente) |
|---|---|
| `:root` tokens | `frontend/app/globals.css` |
| `.admin-top` | `AdminTopBar` / `admin.css` |
| `.dash-grid`, `.dash-card` | admin.css (bordo accent 3px) |
| `.data-table`, thead, tbody, `.data-table-footer` | `DataTable.tsx` / admin.css |
| `.status-pill`, `.st-ok/blue/amber` | spese-spedizione.html |
| `.modal-overlay`, `.modal`, `.modal-head/body/foot` | `Modal.tsx` / catalogo.css |
| `.edit-section`, `.edit-section h3` | admin-coupon.html (sezioni con h3 mono uppercase + bordo) |
| `.form-grid`, `.field` | admin-coupon.html |
| `.scope-extra.disabled` | admin-coupon.html (opacità 0.4) |
| `.seg-result`, `.seg-count`, `.client-list` | admin-coupon.html |
| `.email-preview`, `.coupon-code` | admin-coupon.html |
| `.btn`, `.btn-primary/secondary/ghost/sm` | globals.css |
| `.admin-search` | spese-spedizione.html |

---

## 9. Checklist di parità pre-consegna

- [ ] AdminTopBar con titolo, ricerca e "+ Nuova campagna" in top bar
- [ ] 4 dashboard card responsive (4→2→1 colonne), bordo accent 3px
- [ ] DataTable 8 colonne con status pill colorate
- [ ] Modale editor: header con titolo + ✕, body scrollabile, footer con azioni
- [ ] Sezione "Dati coupon" con form-grid 2-col e sezione "Destinatari" distinte (h3)
- [ ] Pulsante "Genera" codice univoco (8 caratteri alfanumerici)
- [ ] QR code dinamico che si aggiorna al cambio codice
- [ ] Scope toggle: campo famiglia/raccolta disabilitato con opacità senza spostare layout
- [ ] Ricerca clienti per codice, ragione sociale, P.IVA
- [ ] 4 filtri segmentazione in AND con conteggio in tempo reale
- [ ] AI suggestions box blu con 4 suggerimenti cliccabili
- [ ] Click su AI suggestion → filtri impostati automaticamente → conteggio aggiornato
- [ ] Elenco clienti espandibile con checkbox per deselezione singola
- [ ] Validazione pre-riepilogo (almeno 1 cliente)
- [ ] Modale riepilogo: recap completo + anteprima email con badge coupon
- [ ] Pulsante invia con stato loading → feedback verde → reset
- [ ] Navigazione tra modali: editor → riepilogo → editor (Modifica)
- [ ] Chiusura modali: ✕, pulsanti, backdrop click, Escape
- [ ] Backend: 8 endpoint (dashboard, elenco, crea, preview, search, AI, QR, invia)
- [ ] Guardie admin e permessi
- [ ] i18n: chiavi in `frontend/messages/it.json` ed `en.json`
- [ ] Typecheck, lint, build frontend + backend
