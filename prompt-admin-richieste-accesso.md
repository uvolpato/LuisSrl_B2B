# Prompt — Prototipo admin "Richieste accesso"

Copia tutto il testo sotto la riga e passalo a Claude (nel repo `Luis Srl - B2B`).

---

Sei uno sviluppatore senior che costruisce prototipi HTML fedeli a una specifica. Lavore dentro il repo `Luis Srl - B2B`.

## Deliverable
Un **singolo file** `admin-richieste-accesso.html` nella root del progetto. Deve essere **standalone**: un solo file HTML con `<style>` e `<script>` **inline**, **nessuna risorsa esterna** (font di sistema, icone SVG inline). Tutto il testo visibile all'utente in **italiano**. Codifica **UTF-8**.

## Lettura obbligatoria prima di scrivere
1. `specifica-admin-richieste-accesso.md` — è la **fonte di verità**: concetto, flusso, struttura, modello dati, regole di business, tabella, KPI, ricerca, specifiche visuali, checklist interattiva e dati demo. Implementala fedelmente, punto per punto.
2. `brand-spec.md` — i token di design (OKLch) e i font.
3. `admin-ordini.html` — riferimento per shell, topbar, `data-table`, `data-table-footer`, `pager`, `modal-overlay`/`modal`, `status-pill`, `cell-entity`, `row-action`, `dash-grid`, `dash-card`.
4. `06-admin.html` — riferimento per la **sidebar admin** (`.sidebar`, `.sidebar-nav`, `.sidebar-link`, voce attiva) e per la **barra disclaimer prototipo** in fondo.
5. `lead-segnalazione.html` — riferimento per il `.verdict-box` e i badge dei segnali.

## Design system (da `brand-spec.md`)
- Token: `--bg oklch(97% 0.005 80)`, `--surface oklch(100% 0 0)`, `--fg oklch(22% 0.02 60)`, `--muted oklch(52% 0.015 60)`, `--border oklch(88% 0.01 70)`, `--accent oklch(55% 0.14 45)` (terracotta), più i semantici `--green`/`--amber`/`--red`/`--blue` e le varianti `-soft` con `color-mix(in oklch, … 14–16%, transparent)`.
- Font: `--font-display` serif (Iowan Old Style / Charter / Georgia) per H1/H2; sans per il body; `--font-mono` per dati numerici e label. `--radius 12px`, `--sidebar-w 260px`.
- **Riusa gli stessi nomi di classe** dei prototipi admin (`.admin-top`, `.admin-search`, `.dash-grid`, `.dash-card`, `.data-table`, `.data-table-footer`, `.pager`, `.status-pill` con `.st-ok/.st-amber/.st-blue/.st-red`, `.cell-entity`, `.row-action`, `.modal-overlay/.modal`, `.btn .btn-primary/.btn-secondary/.btn-ghost/.btn-sm`).

## Requisiti funzionali (dettaglio nella spec)
- **Sidebar**: gruppo "Vendite" → voce "Clienti", poi **"Richieste accesso" attiva** con **badge numerico** = conteggio "Da decidere" (Nuove + In verifica).
- **AdminTopBar** sticky con blur: H1 "Richieste accesso" + campo di ricerca con lente, **debounce 250 ms** su ragione sociale, P.IVA, email, referente (azzera la pagina a 1).
- **4 KPI card cliccabili** (Da decidere, In verifica, Approvate 30 gg, Scartate 30 gg) **calcolate sull'intero archivio**, con sub-testo ambra "N ferma da oltre 6 giorni"; il click applica il filtro corrispondente.
- **Filtri**: Stato (default **Da decidere**, poi Nuove, In verifica, Approvate, Scartate, Tutte) e Verdetto (Tutti, Buono, Verificare, Scartare).
- **Tabella**: colonne `#` (mono, accent), Richiedente (`cell-entity`: titolo 600 + sub "Città (PR) · Tipo attività"), P.IVA (mono), Ricevuta (`GG/MM/AAAA OO:MM`), Verdetto (pill con pallino: BUONO verde, VERIFICARE ambra, SCARTARE rosso, "—" grigio), Stato (pill: Nuova blu, In verifica ambra, Approvata verde, Scartata grigio), Attesa (solo pending, "N gg", **ambra con icona ⚠ se > 6 giorni**), Azioni (icona occhio, tooltip "Dettaglio").
- **Ordinamento default**: filtro "Da decidere" per **attesa decrescente**, altrimenti per data ricezione decrescente. **Paginazione 10/pagina**, pager come `admin-ordini.html`. Empty state coerente con lo stile (senza emoji se lo stile non ne prevede).
- **Drawer dettaglio** a destra (~560px, full-screen sotto 720px, slide-in 200 ms, `prefers-reduced-motion` → nessuna animazione): dati richiesta, sede legale (fonte VIES/WEB), messaggio in corsivo, **report AI** con `signal-row` (etichetta | nota + fonti `[n]` cliccabili in nuova scheda con `rel="noopener noreferrer"` | badge), sintesi, `verdict-box`, checklist (solo se verdetto VERIFICARE), storico eventi in `timeline` con le etichette della spec §3.3, consenso privacy, pulsanti azione.
- **Modale di conferma** per ogni azione, con **avviso rosso** se si approva una richiesta con verdetto SCARTARE ("L'indagine AI suggerisce di scartare: approvare solo dopo una verifica diretta"). Per "Scarta" ricorda che **non viene inviata alcuna comunicazione** al richiedente.
- **Toast** di esito. Dopo Approva: "Approvata · lead-<id>.xlsx pronto per Integra"; se `sede` mancante, avviso "Completare indirizzo in Integra".
- **Regole azioni** (spec §4.1): `NUOVO` → Approva · Metti in verifica · Scarta; `IN_VALUTAZIONE` → Approva · Scarta; `APPROVATO`/`SCARTATO` → sola consultazione; **anonimizzata** → sola consultazione, dati personali mostrati come "anonimizzato".
- Dopo la conferma aggiorna riga, KPI e badge sidebar.
- **Accessibilità**: focus visibile (`:focus-visible`), focus trap su drawer e modale, chiusura con ✕ / Esc / click sull'overlay, `aria-label` sulle icone.
- **Responsive**: KPI 4 → 2 → 1 colonne; sotto 720px la tabella mostra solo Richiedente, Verdetto, Stato, Azioni; drawer a tutto schermo.
- **Barra disclaimer prototipo** in fondo (come `06-admin.html`).

## Dati demo
Usa i 10 record della **spec §8** (`#12` → `#3`), tutti **fittizi**, con URL delle fonti su domini `example.com`. Imposta `NOW = 2026-10-13T12:00:00` così che la richiesta `#11` abbia attesa **11 giorni** come da tabella.

## Convenzioni di output
- Aggiungi `data-od-id` sui blocchi principali (sidebar, topbar, KPI, filtri, tabella, drawer, modale, toast).
- Al termine **verifica** i tag e l'encoding:
  `node C:\Users\uvolp\AppData\Local\Temp\opencode\check-tags.js "admin-richieste-accesso.html"`
  e ottieni `UTF8-OK TAGS-OK` (se il file di check non esiste, salta questo passo).
- Consegna **solo** il file `admin-richieste-accesso.html`, senza dipendenze e senza spiegazioni oltre il necessario.
