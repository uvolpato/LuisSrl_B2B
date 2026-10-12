# Specifica — Admin "Richieste accesso" (prototipo per Open Design)

**Obiettivo:** prototipo HTML standalone `admin-richieste-accesso.html` della sezione admin che elenca le
richieste di accesso B2B arrivate dal sito vetrina, mostra l'esito dell'indagine AI e permette di
**approvare, mettere in verifica o scartare** senza dipendere dai link della mail (che scadono in 7 giorni).

Contesto funzionale: `specifica-qualifica-lead.md` (fasi 1–4 già in produzione).

---

## 1. Concetto

L'admin (ufficio commerciale / shop@) apre la sezione e vede subito **cosa c'è da decidere**: richieste nuove
e in verifica in testa, con il verdetto AI ben visibile. Apre il dettaglio, legge il report con le fonti,
decide. La decisione è sempre umana: l'AI propone, non decide.

### 1.1 Flusso

```
Admin apre "Richieste accesso" → filtro predefinito: Da decidere (Nuove + In verifica)
   │
   ├── Filtra per stato / verdetto, cerca (ragione sociale, P.IVA, email)
   ├── Clicca una riga → pannello di dettaglio (drawer a destra)
   │      ├── Dati richiesta, sede legale, consenso privacy
   │      ├── Report AI: segnali con badge + fonti, sintesi, verdetto, checklist
   │      ├── Storico eventi (timeline)
   │      └── Azioni: Approva · Metti in verifica · Scarta  → modale di conferma
   └── Dopo l'azione: riga aggiornata, toast di esito
```

### 1.2 Collocazione

- Area admin del portale B2B, **sidebar → gruppo "Vendite"**, nuova voce **"Richieste accesso"** sotto
  "Clienti", con **badge numerico** delle richieste da decidere (Nuove + In verifica).
- Prototipi admin di riferimento per stile e componenti: `admin-ordini.html`, `spese-spedizione.html`,
  `06-admin.html`. Token: `brand-spec.md`.

---

## 2. Struttura della pagina

```
┌──────────────┬──────────────────────────────────────────────────────────────────────┐
│ Sidebar admin│ AdminTopBar (sticky, blur)                                           │
│ …            │ H1: Richieste accesso          🔍 Cerca ragione sociale, P.IVA, email │
│ Vendite      ├──────────────────────────────────────────────────────────────────────┤
│  Clienti     │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│ ▸ Richieste ③│  │ DA       │ │ IN       │ │ APPROVATE│ │ SCARTATE │                 │
│  Listini     │  │ DECIDERE │ │ VERIFICA │ │ (30 gg)  │ │ (30 gg)  │                 │
│  Ordini      │  │    3     │ │    1     │ │    7     │ │    4     │                 │
│              │  │ 1 > 6 gg │ │          │ │          │ │          │                 │
│              │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │
│              │                                                                       │
│              │  Stato: [Da decidere▾]  Verdetto: [Tutti▾]                            │
│              │  ┌──────────────────────────────────────────────────────────────────┐ │
│              │  │ #  RICHIEDENTE            P.IVA        RICEVUTA   VERDETTO STATO │ │
│              │  │ 12 Fioreria del Centro    01234567890  09/10 14:35 ● BUONO  NUOVA│ │
│              │  │    Milano (MI) · Fiorista                                      👁 │ │
│              │  │ 11 Verde Casa snc         …           02/10 09:12 ● VERIF. IN VER│ │
│              │  │    ⚠ in attesa da 7 giorni                                       │ │
│              │  │ 1–10 di 14                                       ◀ 1 / 2 ▶      │ │
│              │  └──────────────────────────────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────────────────┘
```

### 2.1 Pannello di dettaglio (drawer destro, larghezza ~560px; a tutto schermo sotto 720px)

```
┌ Richiesta #12 — FIORERIA DEL CENTRO S.R.L.                         ✕ ┐
│ [● BUONO] [NUOVA] · ricevuta 09/10/2026 14:35 · lingua IT             │
├────────────────────────────────────────────────────────────────────────┤
│ DATI RICHIESTA                         SEDE LEGALE (VIES)              │
│ P.IVA 01234567890                      Via Milano, 15                  │
│ Referente Mario Rossi                  20099 Sesto San Giovanni (MI)   │
│ Email · Telefono · Tipo attività       fonte: VIES ✓                   │
│ Messaggio (corsivo, box)                                                │
├────────────────────────────────────────────────────────────────────────┤
│ REPORT AI                                                              │
│ Partita IVA     Attiva su VIES — "FIORERIA…"  [1]      [CONFERMATO]   │
│ Sito web        fioreriadelcentro.it, coerente [1][2]  [CONFERMATO]   │
│ Presenza web    Google Business, 12 recensioni [1]     [CONFERMATO]   │
│ Email           dominio aziendale                      [CONFERMATO]   │
│ Coerenza        fiorista: coerente col settore         [NEUTRO]       │
│ Sintesi: 2-3 frasi…                                                    │
│ ┌ Verdetto AI: BUONO — dati essenziali confermati ┐                    │
│ (Checklist di verifica: solo se VERIFICARE)                            │
├────────────────────────────────────────────────────────────────────────┤
│ STORICO                                                                │
│ 09/10 14:35 Richiesta ricevuta · conferma inviata al cliente           │
│ 09/10 14:35 Indagine AI (14 s) · mail inviata a shop@                  │
│ 15/10 03:00 Promemoria inviato a shop@                                 │
├────────────────────────────────────────────────────────────────────────┤
│ CONSENSO PRIVACY  accettato 09/10/2026 14:35 · versione 2026-10 · IP …  │
├────────────────────────────────────────────────────────────────────────┤
│                 [Scarta]  [Metti in verifica]  [✓ Approva]            │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Componenti

| # | Componente | Descrizione |
|---|------------|-------------|
| 1 | **AdminTopBar** | Sticky, titolo "Richieste accesso", ricerca con lente (debounce 250 ms) |
| 2 | **KPI cards** | 4 card (Da decidere, In verifica, Approvate 30 gg, Scartate 30 gg), bordo sinistro accent; sub-text ambra "N > 6 gg" se ci sono richieste ferme |
| 3 | **Filtri** | Select Stato (Da decidere *default*, Nuove, In verifica, Approvate, Scartate, Tutte) e Verdetto (Tutti, Buono, Verificare, Scartare) |
| 4 | **DataTable** | Vedi §4.2; click riga o icona occhio → drawer |
| 5 | **Drawer dettaglio** | Vedi §2.1; chiusura ✕, Esc, click overlay |
| 6 | **Modale conferma azione** | Titolo "Approvare la richiesta?" ecc., riepilogo, conferma/annulla |
| 7 | **Toast** | Esito azione (es. "Approvata · lead-12.xlsx pronto per Integra") |
| 8 | **Badge sidebar** | Contatore "Da decidere" sulla voce menu |

---

## 3. Modello dati (mock nel prototipo, poi API)

### 3.1 Richiesta (`Lead`)

| Campo | Tipo | Note |
|-------|------|------|
| `id` | number | mostrato come `#12` |
| `createdAt` | ISO datetime | "Ricevuta" |
| `ragioneSociale` | string | maiuscolo in tabella |
| `partitaIva` | string(11) | mono |
| `codiceFiscale` | string \| null | |
| `referente` | string | "anonimizzato" se anonimizzata |
| `tipoAttivita` | `garden` \| `vivaio` \| `fiorista` \| `architetto` \| `altro` \| null | etichette IT |
| `email`, `telefono`, `citta`, `messaggio` | string \| null | |
| `lingua` | `it` \| `en` | |
| `stato` | `NUOVO` \| `IN_VALUTAZIONE` \| `APPROVATO` \| `SCARTATO` | |
| `verdetto` | `BUONO` \| `VERIFICARE` \| `SCARTARE` \| null | null = indagine non disponibile |
| `report` | `{ segnali[], motivazione, checklist[], sintesi, durataMs, errore? }` | vedi 3.2 |
| `sede` | `{ indirizzo, cap, citta, provincia, fonte: 'VIES' \| 'WEB' }` \| null | |
| `privacyAccettataIl`, `privacyVersione`, `ip` | | sezione consenso |
| `decisioneIl` | ISO \| null | |
| `esportatoFile` | string \| null | es. `lead-12.xlsx` |
| `anonimizzatoIl` | ISO \| null | se valorizzato: dati personali "anonimizzato", azioni disabilitate |
| `eventi` | `{ tipo, createdAt, dettagli }[]` | storico |

### 3.2 Segnale del report

`{ chiave, etichetta, stato: 'CONFERMATO' | 'NEUTRO' | 'NON_VERIFICATO' | 'NEGATIVO', nota, fonti: string[] }`
— fonti = URL, mostrati come `[1] [2]` cliccabili (nuova scheda, `rel="noopener noreferrer"`).

### 3.3 Tipi evento (etichette nello storico)

| `tipo` | Etichetta |
|--------|-----------|
| `creato` | Richiesta ricevuta dal sito |
| `conferma_inviata` / `conferma_saltata` | Conferma inviata al cliente / non inviata (già inviata nelle 24 h) |
| `indagine` / `indagine_errore` | Indagine AI completata (N s) / non riuscita |
| `mail_inviata` / `mail_errore` | Mail inviata a shop@ / errore invio |
| `promemoria_inviato` | Promemoria inviato a shop@ |
| `azione_verifica` / `azione_approva` / `azione_scarta` | Messa in verifica / Approvata / Scartata (da mail o da admin) |
| `export_integra` / `export_errore` | File per Integra generato / errore export |
| `anonimizzato` | Dati personali anonimizzati (conservazione 12 mesi) |

---

## 4. Regole di business

### 4.1 Stati e azioni

| Stato | Azioni disponibili |
|-------|--------------------|
| `NUOVO` | Approva · Metti in verifica · Scarta |
| `IN_VALUTAZIONE` | Approva · Scarta |
| `APPROVATO` / `SCARTATO` | nessuna (decisione finale) — solo consultazione |
| anonimizzata | nessuna; dati personali mostrati come "anonimizzato" |

- **Approva con verdetto SCARTARE**: la modale mostra un avviso rosso esplicito
  ("L'indagine AI suggerisce di scartare: approvare solo dopo una verifica diretta").
- Dopo **Approva**: toast con nome del file generato per Integra; se `sede` mancante, avviso
  "Completare indirizzo in Integra".
- **Scarta**: nessuna comunicazione al richiedente (dirlo nella modale).

### 4.2 Tabella

| Colonna | Contenuto |
|---------|-----------|
| `#` | id, mono, accent |
| Richiedente | `cell-entity`: titolo ragione sociale (600), sub "Città (PR) · Tipo attività" |
| P.IVA | mono |
| Ricevuta | `GG/MM/AAAA OO:MM` |
| Verdetto | pill con pallino: BUONO verde, VERIFICARE ambra, SCARTARE rosso, "—" grigio |
| Stato | pill: Nuova (blu), In verifica (ambra), Approvata (verde), Scartata (grigio) |
| Attesa | solo per Nuova/In verifica: "N gg"; **ambra se > 6 giorni** con icona ⚠ |
| Azioni | icona occhio (tooltip "Dettaglio") |

- Ordinamento predefinito: da decidere per **attesa decrescente** (le più vecchie in alto); altrimenti
  per data ricezione decrescente.
- Paginazione 10/pagina, pager come `admin-ordini.html`. Empty state: "Nessuna richiesta da decidere. 🎉"
  (senza emoji nel prototipo se lo stile non lo prevede).

### 4.3 Ricerca

Case-insensitive su ragione sociale, P.IVA, email, referente. Azzera la pagina a 1.

### 4.4 KPI

Calcolati sull'intero archivio (non sul filtro): Da decidere = Nuove + In verifica; Approvate/Scartate
negli ultimi 30 giorni (per `decisioneIl`). Click su una card = applica il filtro corrispondente.

---

## 5. Specifiche visuali

Token e font identici a `brand-spec.md` / `admin-ordini.html` §5.1 (`--bg`, `--surface`, `--fg`, `--muted`,
`--border`, `--accent` terracotta, `--green`, `--amber`, `--red`, `--blue`, `--radius` 12 px,
`--font-display` serif per H1/H2, `--font-mono` per dati e label).

Classi da riusare (stessi nomi dei prototipi admin): `.admin-top`, `.admin-search`, `.dash-grid`,
`.dash-card`, `.data-table`, `.data-table-footer`, `.pager`, `.status-pill .st-ok/.st-amber/.st-blue/.st-red`,
`.cell-entity`, `.row-action`, `.modal-overlay/.modal`, `.btn .btn-primary/.btn-secondary/.btn-ghost/.btn-sm`.

Nuovi: `.drawer` (pannello destro, ombra leggera, animazione slide-in 200 ms, `prefers-reduced-motion`
→ niente animazione), `.signal-row` (riga segnale: etichetta | nota + fonti | badge),
`.verdict-box` (box con bordo accent come nella mail `lead-segnalazione.html`), `.timeline`.

Badge segnali: stessi colori della mail (CONFERMATO verde, NEUTRO grigio, NON VERIFICATO ambra,
NEGATIVO rosso). Pulsanti drawer: Approva = primario terracotta; Metti in verifica = secondario;
Scarta = secondario con testo rosso.

Responsive: KPI 4 → 2 → 1 colonne; sotto 720 px la tabella mostra solo Richiedente, Verdetto, Stato,
Azioni; il drawer diventa a tutto schermo.

---

## 6. Comportamenti interattivi (checklist prototipo)

1. [ ] Sidebar con voce "Richieste accesso" attiva e badge "Da decidere"
2. [ ] AdminTopBar sticky con blur e ricerca (debounce 250 ms)
3. [ ] 4 KPI cliccabili che impostano il filtro stato
4. [ ] Filtri Stato (default Da decidere) e Verdetto
5. [ ] Tabella con pill verdetto/stato, colonna Attesa ambra oltre 6 giorni
6. [ ] Paginazione 10/pagina, empty state
7. [ ] Click riga/occhio → drawer; chiusura ✕ / Esc / overlay
8. [ ] Drawer: dati, sede con fonte, report segnali con fonti [n] cliccabili, sintesi, verdetto, checklist (solo VERIFICARE)
9. [ ] Storico eventi in timeline con etichette §3.3
10. [ ] Pulsanti azione coerenti con lo stato (§4.1); nascosti/disabilitati se finale o anonimizzata
11. [ ] Modale di conferma; avviso rosso se si approva un verdetto SCARTARE
12. [ ] Dopo conferma: aggiorna riga, KPI, badge sidebar; toast di esito (mock export `lead-<id>.xlsx`)
13. [ ] Richiesta anonimizzata: campi personali "anonimizzato", nessuna azione
14. [ ] Accessibilità: focus visibile, drawer/modale con focus trap, `aria-label` sulle icone
15. [ ] Nessuna risorsa esterna (font di sistema, icone SVG inline)

---

## 7. API (da implementare dopo il prototipo)

Tutte sotto sessione admin (`AuthenticatedGuard` + ruolo admin), autorizzazione verificata server-side.

| Metodo | Endpoint | Note |
|--------|----------|------|
| GET | `/api/admin/leads?stato=&verdetto=&q=&page=` | elenco paginato + KPI |
| GET | `/api/admin/leads/:id` | dettaglio con report ed eventi |
| POST | `/api/admin/leads/:id/azione` `{ azione }` | stesse transizioni atomiche dei link mail (`AzioniLeadService`), CSRF di sessione, evento con id admin |

---

## 8. Dati demo per il prototipo (10 richieste)

| # | Ragione sociale | P.IVA | Città | Tipo | Ricevuta | Verdetto | Stato | Note |
|---|-----------------|-------|-------|------|----------|----------|-------|------|
| 12 | FIORERIA DEL CENTRO S.R.L. | 01234567890 | Sesto San Giovanni (MI) | Fiorista | 09/10/2026 14:35 | BUONO | Nuova | sede VIES |
| 11 | VERDE CASA SNC | 02345678901 | Lecco (LC) | Garden center | 02/10/2026 09:12 | VERIFICARE | In verifica | attesa 11 gg, checklist |
| 10 | VIVAI COLLI BERGAMASCHI | 03456789012 | Almè (BG) | Vivaio | 08/10/2026 17:40 | BUONO | Nuova | |
| 9 | GARDEN DEMO S.R.L. | 09012345678 | Merate (LC) | Garden center | 01/10/2026 10:05 | BUONO | Approvata | `lead-9.xlsx` |
| 8 | STUDIO PAESAGGIO ROSSI | 04567890123 | Bergamo (BG) | Architetto | 30/09/2026 12:20 | VERIFICARE | Approvata | sede da WEB |
| 7 | VASI LOW COST SRL | 12345678901 | — | Altro | 29/09/2026 22:51 | SCARTARE | Scartata | checksum errato, email usa-e-getta |
| 6 | FIORI E FOGLIE DI BIANCHI ANNA | 05678901234 | Como (CO) | Fiorista | 07/10/2026 08:30 | VERIFICARE | Nuova | email gmail, sito non trovato |
| 5 | GREEN DESIGN STUDIO | 06789012345 | Milano (MI) | Architetto | 05/10/2026 16:10 | — | Nuova | indagine non riuscita |
| 4 | AGRI SERVICE SRL | 07890123456 | Brescia (BS) | Altro | 20/09/2026 11:00 | SCARTARE | Scartata | P.IVA non attiva (VIES) |
| 3 | (anonimizzata) | 08901234567 | — | — | 10/09/2025 09:00 | SCARTARE | Scartata | anonimizzata 10/09/2026 |

Usare dati **fittizi** come sopra (nessun dato reale di persone); URL fonti di esempio su domini `example.com`.
