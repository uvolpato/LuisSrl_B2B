# Prompt di riproduzione fedele — Gestione AI (Panel Admin)

## Scopo

Questo documento è un **prompt standalone** che, passato integralmente a un assistente di
sviluppo, deve produrre una **ricostruzione fedele** del prototipo `admin-ai-config.html`
(pagina admin "Gestione AI" del portale Luis Srl B2B), riproducendo contenuti, stile,
layout e comportamento identici. Include anche il requisito di **configurabilità di tutti i
prompt di sistema** con **default di fabbrica come backup**.

> Copia tutto il contenuto tra `<<<< RIPRODUCI >>>` e `<<<< /RIPRODUCI >>>>` come unico
> input per l'assistente. Non aggiungere né omettere nulla.

---

<<<< RIPRODUCI >>>>

Riproduci fedelmente una pagina HTML autonoma (prototipo) di "Gestione AI" per il pannello
di amministrazione di un portale B2B di vasi, fioriere e articoli garden. Metti tutto in un singolo
file `admin-ai-config.html` (HTML5, `lang="it"`, CSS inline in `<style>`, JS inline in `<script>`),
senza dipendenze esterne (nessun CDN, nessuna libreria). Lingua UI: italiano.

## Requisiti visivi / CSS

- Palette CSS personalizzata via variabili in `:root`, nello stile Decobrands admin:
  `--bg: oklch(98% 0.004 80)`, `--surface: oklch(100% 0 0)`, `--fg: oklch(22% 0.02 60)`,
  `--muted: oklch(48% 0.012 60)`, `--border: oklch(90% 0.006 80)`,
  `--accent: oklch(55% 0.14 45)` (terracotta), con varianti `--green/--red/--blue/--amber`
  (+ `-soft`) e `--radius:10px`, `--radius-lg:16px`, `--head-bg`, `--shadow`, `--mono`.
- Font di sistema (SF/Segoe UI/system-ui), padding, bordi arrotondati, dropdown e tab come nel
  resto del pannello admin.
- Componenti: `.btn` (primary/secondary/ghost/danger + `btn-sm`/`btn-xs`), `.badge`
  (`badge-blue/green/amber/muted/red`), `.kpis`/`.kpi` (card con bordo sinistro accent e varianti
  `.blue/.green/.red`), `.table` (thead sticky, th mono uppercase, righe hover), `.badge`,
  `.form-grid` (2 colonne, `.span2`), `.field` + `.field .hint` + `.field .field-foot`,
  `.tabs`/`.tab`/`.panel`, `.modal-root`/`.modal`.
- Responsive: a ≤920px una colonna per form/grid, 2 colonne per KPI e usage-cards; a ≤560px
  tutto a 1 colonna.

## Struttura pagina

1. **AdminTopBar** sticky: titolo "Gestione AI" con punto blu, badge "Panel Admin",
   campo di ricerca `#search` (icone SVG inline), feedback "Salvato" `#saved` (hidden, si mostra
   con `.show`), bottone primario "Salva modifiche" `#btn-save-all`.
2. **4 KPI card** (`.kpis`): "Provider attivi 1" · "Prompt configurati 24" · "Token 30 giorni
   1,24 M" · "Costo stimato 30 gg € 4,82".
3. **Tabs** (`.tabs`, id `#tabs`), 4 voci:
   - Provider e modelli (attiva)
   - Prompt sistema — con contatore `.cnt` "8"
   - Template — con contatore `.cnt` "8"
   - Uso e costi
   Ogni tab porta un'icona SVG. Click: `.tab.on` sul cliccato, `.panel.on` sul relativo pannello
   (`data-panel` corrispondente al `data-tab`). Pannelli non attivi `display:none`.

### Pannello 1 · Provider e modelli
`form-grid` 2 colonne. Ambito **Immagini**: Provider select `[gemini|openai|anthropic|lm-studio]`,
Modello `gemini-2.5-flash-image`, Temperature `0.4`, Max Tokens `4096`, Endpoint span2
`https://generativelanguage.googleapis.com/v1beta/models/`. Ambito **Testi**: Provider select,
Modello `gemini-2.5-flash`, Temperature `0.7`, Max Tokens `8192`, Endpoint span2 (stesso URL).
Hint per endpoint: chiavi `AI_Immagini_*` / `AI_Testi_*`; cache TTL 60s (modifica attiva in ≤1 min).

### Pannello 2 · Prompt di sistema (8 voci, TUTTE modificabili + reset)
`form-grid`, 8 campi `span2`. Ogni campo: `<label>`, `<textarea id="s-…">` **editabile di default**
(NON readonly, NON `class="ro"`), e `.field-foot` con hint a sinistra + bottone
`class="btn btn-secondary btn-xs" data-reset-sys="<id>"` con icona "↺" e testo **"Ripristina default"**.
Le 8 voci (id, etichetta, chiave/hint, testo di fabbrica — vedi §Dati):

1. `s-desc` "Descrizione articolo" — chiave `Prompt_AI_Descrizione_Articolo` —
   "Sei un tecnico-specialista di vasellame e articoli garden per il canale B2B (grossista → rivenditore/fiorista)."
2. `s-colore` "Estrazione colore (JSON)" — hardcoded `integrazione.service` —
   "Sei un esperto di colori per articoli di vasellame e garden. Analizza nome e descrizione e restituisci SOLO un JSON valido SENZA markdown:\n{ \"colore\": \"nome colore in italiano (es. Nocciola, Terracotta, Salvia, Antracite, Crema, Tortora)\" oppure null, \"coloreRgb\": \"#RRGGBB\" oppure null }\nREGOLE: NO colori primari saturi, NO fluo; SÌ colori naturali, terrosi, pastello smorzati; leggibile su sfondo bianco."
3. `s-rewrite` "Ricerca semantica nel catalogo (rewrite)" — "Sei un assistente di ricerca per un catalogo B2B di vasi, fioriere, cache-pot e complementi d'arredo (materiali tipici: cotto, terracotta, fiberstone, ceramica, metallo; uso interno/esterno). Trasforma la richiesta del cliente per una ricerca semantica nel catalogo."
4. `s-vision` "Analisi immagine (vision) — descrizione prodotto" — "Descrivi in 2-3 frasi questo prodotto per fioristi e garden, concentrandoti sugli attributi oggettivi: tipo di prodotto, materiale, forma, colore, finitura, dimensioni percepite e uso (interno/esterno). Sii concreto e preciso; non inventare ciò che non è visibile."
5. `s-garden` "Analisi multi-immagine (osservatore garden)" — "Sei un osservatore esperto di vasellame e articoli garden B2B. Analizza le immagini fornite e produci una descrizione tecnica del prodotto rivolta a un rivenditore professionale."
6. `s-insight` "Insight cliente (analista commerciale)" — "Sei un analista commerciale B2B per un'azienda di vasi e complementi. Partendo dai dati di vendita del cliente, produci una sintesi commerciale utile per l'agente di riferimento."
7. `s-profile` "Profiling cliente (assistente B2B)" — "Sei un assistente che profila i clienti B2B di un grossista di arredamento per fioristi e garden. Scrivi una breve descrizione professionale del cliente (2-3 paragrafi) combinando i dati anagrafici forniti e le note di corrispondenza. Non inventare fatti non presenti. Stile: neutro, utile per il commerciale."
8. `s-variant` "Genera variante colore" — "Arricchisce il prompt dell'utente col contesto prodotto per generare una variante di colore o accessorio coerente con l'articolo di partenza."

Footer pannello: nota "I prompt di sistema sono identificati dalle chiavi `Prompt_AI_*` in SiteConfig
o hardcoded nel service. Puoi modificare i campi e ripristinare il default di fabbrica con il relativo
bottone."

### Pannello 3 · Template di prompt
Header con badge `#tpl-count` "8 template" e bottone "＋ Nuovo template" `#btn-add-tpl`.
`.table` con colonne: # (mono, `01`…`08`) · Tipo (badge `AMBIENTA` blue / `DESCRIZIONE` green) ·
Titolo · Prompt · Tags · Azioni (icone Modifica/Elimina `.icon-btn` con `data-tip`).
Footer `.table-foot`: range `#tpl-range` "1–5 di 8" e pager `#tpl-pager` (◀ n/m ▶, 5 per pagina).
Modale `#tpl-modal`: tipo (select `AMBIENTA`/`DESCRIZIONE`), ordinamento, titolo, prompt, tags;
pulsanti "Elimina" (solo in modifica), "Annulla", "Salva template". Escape e click sul backdrop
chiudono. Dati seed (8):

| id | tipo | titolo | prompt | tags | ord |
|---|---|---|---|---|---|
| 1 | AMBIENTA | Ambienta su sfondo naturale terracotta | Ambienta l'articolo su uno sfondo naturale di terracotta e cotto, luce morbida, stile catalogo garden professionale. | esterno, natura, terracotta | 1 |
| 2 | AMBIENTA | Variale su sfondo verde salvia | Riproduci l'articolo su sfondo salvia, illuminazione morbida, enfasi sul colore naturale. | esterno, salvia, colore | 2 |
| 3 | AMBIENTA | Ambienta in veranda luminosa | Mostra il vaso in una veranda mediterranea con luce naturale, piante di contorno. | interno, veranda, luminoso | 3 |
| 4 | DESCRIZIONE | Descrizione breve prodotto | Scrivi una descrizione breve (2 frasi) per fioristi e garden: tipo, materiale, forma, uso. | testo, breve | 4 |
| 5 | DESCRIZIONE | Descrizione dettagliata | Descrivi dettagliatamente il prodotto B2B: materiale, finitura, dimensioni percepite, uso interno/esterno. | testo, dettagliata | 5 |
| 6 | AMBIENTA | Ambienta in esterno giardino | Colloca l'articolo in un giardino curato, luce del mattino, profondità di campo. | esterno, giardino, luce | 6 |
| 7 | DESCRIZIONE | Focus materiale | Concentrati sul materiale dell'articolo (cotto, fibra, ceramica…), caratteristiche e resistenza. | testo, materiale, tecnico | 7 |
| 8 | AMBIENTA | Variante colore salvia | Genera una variante dello stesso articolo in colore salvia pastello, stesso stile compositivo. | esterno, variante, salvia | 8 |

### Pannello 5 · Uso e costi AI (replica del pannello "Costi AI" esistente)
Header con descrizione "Stima da uso reale (token/immagini) × prezzo modello. Può differire dalla
fattura." e **daypicker** `#dp-prev ◀`, `#dp-days` (number, default 30, min 1 max 365, unità "gg"),
`#dp-next ▶`.
1. `.usage-cards` `#usage-cards`: **4 card** — Costo stimato `€ 4,82` (blu) · Chiamate AI `1.246` ·
   Token totali (somma tokenIn+tokenOut) · Immagini generate `18` (verde).
2. `.chart-block` con `h3 #uso-giorno-title` "Costo per giorno (30 giorni)" e `.costi-serie #usage-serie`
   (barre verticali altezza ∝ costo, tooltip via `data-tip` "gg/mm: €x · n chiamate").
3. `.usage-grid` con 3 `.usage-block` ognuna con `.table`:
   - **Per utente** `#uso-attori`: admin "Mario Rossi" 648 €2,51 · customer "Vivaio dei Fiori srl" 387 €1,15 ·
     agent "Luca Verdi" 149 €0,94 · system "sistema" 62 €0,22. Colonna utente con badge attoreTipo.
   - **Per tipo di richiesta** `#uso-tipi`: descrizione 512 €2,08 · immagine 18 €1,34 · embedding 343 €0,14 ·
     rewrite 206 €0,62 · vision 96 €0,48 · ricerca 58 €0,11.
   - **Per modello** `#uso-modelli`: gemini-2.5-flash 1210 €3,36 · gemini-2.5-flash-image 18 €1,34 ·
     text-embedding-004 18 €0,12.

## Dati JS richiesti

```js
const TEMPLATES = [ /* gli 8 righe della §Pannello 3 */ ];
const USAGE = {
  periodoGiorni: 30,
  totale: { chiamate: 1246, costo: 4.82, tokenIn: 148302, tokenOut: 92515, immagini: 18 },
  perTipo: [...], perModello: [...], perAttore: [...] /* come sopra */,
  serie: [ /* 30 voci { giorno:"01/08", costo, chiamate } — dati sample che sommano a ~0.2/giorno */ ]
};
const SYS_DEFAULTS = {
  's-desc': '...', 's-colore': '...', 's-rewrite': '...', 's-vision': '...',
  's-garden': '...', 's-insight': '...', 's-profile': '...', 's-variant': '...'
  /* identici ai testi di fabbrica dei textarea §Pannello 2 */
};
```

## Comportamenti richiesti (JS)

1. **Tabs**: `document.querySelectorAll('#tabs .tab')` → al click rimuove `.on` da tutti i tab e
   pannelli, aggiunge `.on` al tab cliccato e al pannello `[data-panel="<tab>"]`.
2. **Search** `#search` input: filtra il pannello attivo `.panel.on` — se non c'è testo mostra il
   pannello, altrimenti nasconde (`display:none`) se il testo del pannello NON include la query
   (case-insensitive).
3. **Prompt sistema — reset default**: `function resetSys(id){ document.getElementById(id).value =
   SYS_DEFAULTS[id]; flashSaved(); }` con binding `document.querySelectorAll('[data-reset-sys]')
   .forEach(b=> b.addEventListener('click', ()=> resetSys(b.dataset.resetSys)))`.
4. **Template**: paginazione 5/pagina (`TPL_PER_PAGE=5`, `renderTemplates()`, `renderPager(pages)`),
   `openTpl(id)`, `closeTpl()`, `editTpl(id)`, `delTpl(id)`, `saveTpl()`. Mostra "n template" nel
   badge, range "x–y di N", pager `◀ n/m ▶` con prev/next. Modale con backdrop-click ed Escape.
5. **Uso e costi**: `renderUsage()` popola `#usage-cards`, `#usage-serie`, `#uso-attori`,
   `#uso-tipi`, `#uso-modelli`, aggiorna `#uso-giorno-title` col giorno corrente del daypicker.
   Daypicker prev/next/change → `renderUsage()`. Helper: `fmtEur(n)` = "€ " + n.toLocaleString('it-IT',{min:2,max:2}),
   `fmtN(n)` = n.toLocaleString('it-IT'). Barre serie: height = costo/maxSerie*100%.
6. **Salva modifiche** `#btn-save-all`: `flashSaved()` (show "Salvato" 2.2s). Commento in produzione:
   PUT per ogni ambito.
7. In init (fine script): `renderTemplates(); renderUsage();`. (Nessun bindSystemToggles, nessun
   modal sistema: rimossi).

## Vincoli

- **NON includere** alcuna sezione "Suggerimenti AI dashboard": rimossa dal prototipo.
- **NON includere** modal di modifica prompt di sistema né bottone "Modifica" collettivo: i textarea
  sono sempre editabili e ogni campo ha il suo "Ripristina default".
- Tutti i prompt di sistema devono essere **modificabili** (mai `readonly`) e con **default di
  fabbrica** contenuti in `SYS_DEFAULTS` (valore di backup ripristinabile). In produzione i default
  restano come backup e non vengono sovrascritti dalle modifiche dell'admin.
- Tag HTML bilanciati; lo `<script>` deve superare `node --check` (nessun errore di sintassi).

<<<< /RIPRODUCI >>>>

---

## Note per chi usa questo prompt

- **Fedeltà**: il punto critico è la sezione Prompt di sistema (8 textarea editabili + reset) e la
  replica del pannello "Costi AI" nella tab "Uso e costi". Verifica che il JS passi `node --check`
  e che i tag siano bilanciati prima di considerare completa la riproduzione.
- **Produzione backend**: per far funzionare "Ripristina default" va previsto che ogni prompt sia
  configurabile (niente hardcoded) e che il default di fabbrica sia conservato come backup (§5 della
  specifica `specifica-ai-config.md`). Il prototipo contiene già ciò che serve per federlo nella UI.
