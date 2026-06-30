# Design brief — Descrizione sensoriale guidata (voce + AI)

## Obiettivo
Disegnare un **wizard a passi** che guidi l'operatore admin nella creazione della descrizione dettagliata di un Articolo, usando **voce** (dettatura) + **rielaborazione LLM** + **dimensioni sensoriali strutturate**.

## Filosofia
Non una semplice textarea, ma un **percorso guidato** che aiuti l'operatore a osservare il prodotto sotto tutte le dimensioni sensoriali, parlare liberamente, e ottenere una descrizione ricca e strutturata pronta per l'embedding.

## Flusso complessivo

```
┌──────────────────────────────────────────────────────────┐
│          WIZARD DESCRIZIONE SENSORIALE                    │
│                                                          │
│  Step 1 ──→ Step 2 ──→ Step 3 ──→ Step 4 ──→ Step 5    │
│  Forma     Superficie  Contesto   Emozione   Libera      │
│  e peso    e tatto    d'uso                 dittatura    │
│                                                     │    │
│                                                     ▼    │
│                                        ┌─────────────────┐│
│                                        │  Rielabora con  ││
│                                        │  ✨ LLM         ││
│                                        │  → descrizione  ││
│                                        │    dettagliata  ││
│                                        │  → embedding    ││
│                                        └─────────────────┘│
└──────────────────────────────────────────────────────────┘
```

## Step del wizard

Ogni step presenta:
- **Un'immagine** del prodotto (quella CARICATA, sfondo bianco)
- **Un prompt visivo** testuale + icona che guida l'osservazione
- **Un microfono** / pulsante "Parla" per la dettatura
- **Una textarea** in cui compare il trascritto (modificabile manualmente)
- **Un pulsante "Avanti"** (salva il contributo dello step)

### Step 1 — Forma e struttura
> "Osserva la forma del prodotto. Descrivi cosa vedi: è slanciato o tozzo? ha curve morbide o linee nette? che dimensioni ha? sembra massiccio o leggero?"

Icona: profilo di vaso / silhouette

### Step 2 — Superficie e materia
> "Osserva la superficie. È liscia o ruvida? opaca o lucida? calda o fredda al tatto? sembra lavorata a mano o industriale? che materiale sembra? noti venature, screpolature, imperfezioni volute?"

Icona: mano che tocca / texture

### Step 3 — Contesto d'uso
> "Immagina questo prodotto in un ambiente. Dove lo metteresti? in una veranda, in un giardino, su un tavolo, in un negozio? Che luce riceve? Che altri oggetti gli stanno accanto? È formale o informale?"

Icona: stanza / ambiente

### Step 4 — Emozione e carattere
> "Che emozione ti trasmette? È elegante o rustico? moderno o classico? sobrio o decorato? rigoroso o giocoso? trasmette calma, energia, prestigio, naturalezza?"

Icona: cuore / emozione

### Step 5 — Dittatura libera
> "Ora parlane liberamente. Racconta tutto ciò che ti viene in mente su questo prodotto. Non preoccuparti di essere ordinato: l'AI metterà ordine dopo."

Icona: microfono grande / onda sonora

## Rielaborazione LLM (schermata finale)

Dopo lo step 5, l'operatore clicca **"Rielabora con AI ✨"** e il sistema:

1. Mostra uno **stato di caricamento** con messaggi progressivi ("Analizzo le tue parole…", "Strutturo la descrizione…", "Curo lo stile…")
2. Presenta il **risultato in due pannelli** affiancati o sovrapposti:
   - **Sinistra / sopra** — la descrizione dettagliata generata (testo esteso, paragrafo unico)
   - **Destra / sotto** — un **riquadro "Dimensioni sensoriali"** che mostra cosa l'AI ha estratto in ciascuna dimensione (per trasparenza)

### Riquadro dimensioni sensoriali (trasparenza AI)

```
┌───────────────────────────────────────────┐
│  Dimensioni sensoriali rilevate            │
│                                           │
│  Forma       ●●●●●○  slanciato, curvo     │
│  Superficie  ●●●●●●  liscio, opaco, caldo │
│  Contesto    ●●●●○○  interni, tavolo      │
│  Emozione    ●●●●●●  elegante, naturale   │
│  Peso visivo ●●●○○○  leggero              │
│  Stile       ●●●●●○  moderno, minimale    │
└───────────────────────────────────────────┘
```

I punti (●●●●○○) indicano quanto l'AI ha usato quella dimensione nella descrizione finale. L'operatore può **modificare manualmente** il testo finale prima di salvarlo.

### Pulsanti azione schermata finale
- **"Rigenera"** — ripete la rielaborazione (permette di affinare)
- **"Modifica prompt AI"** — espande un editor per modificare il prompt system che istruisce il LLM (solo per utenti esperti)
- **"Salva come descrizione dettagliata"** — salva e genera embedding
- **"Salva anche come descrizione breve"** — opzione extra: genera una sintesi (1-3 frasi) dalla descrizione dettagliata e la salva come descrizione breve pubblica
- **"Torna indietro"** — allo step precedente per correggere

## Guida sensoriale (documento di supporto)

Accanto al wizard, prevedere un **pulsante "?"** o **"Guida sensoriale"** che apre un pannello laterale con l'elenco delle dimensioni e dei suggerimenti:

| Dimensione | Domande guida | Esempi di parole |
|-----------|--------------|-----------------|
| **Forma** | È slanciato o tozzo? Curve o spigoli? Simmetrico? | arrotondato, affusolato, sinuoso, massiccio, slanciato, asimmetrico, organico, geometrico |
| **Superficie** | Liscio/ruvido? Opaco/lucido? Caldo/freddo? Lavorato? | vellutato, ruvido, poroso, levigato, satinato, brillante, martellato, grezzo, cerato |
| **Peso visivo** | Sembra pesante o leggero? Solido o fragile? Robusto o delicato? | massiccio, imponente, arioso, leggero, spesso, sottile, corposo, esile |
| **Colore** | Tinta dominante? Gradazione? Uniforme o screziato? | caldo, freddo, vibrante, tenue, monocromo, cangiante, variegato |
| **Materiale** | Che materiale sembra? Artigianale o industriale? | ceramica, cotto, gres, terracotta, vetro, metallo, legno, pietra |
| **Stile** | Moderno/classico? Elegante/rustico? Decorato/minimale? | contemporaneo, vintage, etnico, nordico, mediterraneo, industriale, provenzale |
| **Contesto** | Dove si usa? Interno/esterno? Formale/informale? | giardino, veranda, salotto, negozio, ufficio, terrazzo, ingresso, cucina |
| **Emozione** | Che sensazione dà? Calma/energia? Prestigio/naturalezza? | accogliente, imponente, sereno, vivace, raffinato, autentico, caldo, minimalista |

## Considerazioni UI/UX

### Stato iniziale (mai compilato prima)
- Il wizard parte dallo **Step 1** con pulsante "Avanti" disabilitato fino a quando non viene inserito testo (dettato o scritto)
- Un indicatore a step (tipo breadcrumb) mostra il progresso: ● ● ● ● ●

### Stato "già compilato" (modifica successiva)
- Il wizard si apre sullo **Step 5 (Rielabora)** con i dati già inseriti
- L'operatore può tornare indietro a modificare singoli step
- Breadcrumb mostra step completati in tinta unita, step corrente evidenziato

### Dettatura vocale
- Pulsante microfono in ogni step
- Durante la registrazione: icona animata (onda sonora), pulsante rosso "Stop"
- Il testo trascritto viene **aggiunto** alla textarea (non la sostituisce)
- Supporto alla **pausa** — l'operatore può parlare, fermarsi, riprendere
- Indicazione "Sto ascoltando…" / "Elaboro il parlato…"

### Mobile/responsive
- Il wizard deve funzionare anche su tablet (l'operatore potrebbe usare un iPad / Surface in magazzino mentre guarda il prodotto fisico)

### Accessibilità
- Tutti i comandi anche via tastiera
- Testo alternativo per icone
- Contrasto sufficiente per lettura su schermo anche in ambiente luminoso (magazzino)

## Dimensioni schermo di riferimento
- Desktop: 1280×720 (minimo)
- Tablet: 1024×768
- Il wizard occupa l'intera modale Articolo (non è un popup, ma una sezione a pieno schermo dentro la modale)

## Colori e stile
Riferirsi al brand-spec (OKLch terracotta, tipografia, ecc.). Il wizard deve apparire come parte integrante del pannello admin, non come un'interfaccia separata.

## Deliverable attesi dal designer
1. Wireframe / mockup di ogni step del wizard (5 step + schermata finale)
2. Design del pannello laterale "Guida sensoriale"
3. Design dello stato di caricamento "Rielaborazione in corso…"
4. Specifiche di interazione (animazioni microfono, transizioni step, drag‑drop se previsto)
5. Versione tablet del flusso

---

*Documento per Open Design — 29 giugno 2026*
