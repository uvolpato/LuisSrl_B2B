# Specifica — Varianti "composizione" (kit)

**Destinatari:** sviluppo portale B2B Luis.
**Oggetto:** varianti vendute insieme a più pezzi, codificate in Integra con un codice padre e codici figlio.
**Stato:** implementata (16/11/2026).

---

## 1. Il problema

Alcune varianti (codici articolo) sono **set di più pezzi** (es. `s/4 cubi fiberstone TEXAS`). In Integra ogni pezzo ha un proprio codice:

| Codice | Descrizione |
|---|---|
| `MC108886` | s4 cubo fiberstone TEXAS corten h38 44X44 (padre) |
| `MC108886-08611` | cubo fiberstone TEXAS corten h23 23x23 |
| `MC108886-08612` | cubo fiberstone TEXAS corten h28 28x28 |
| `MC108886-08613` | cubo fiberstone TEXAS corten h30 34x34 |
| `MC108886-08614` | cubo fiberstone TEXAS corten h38 44X44 |

Solo il **padre** è vendibile: ha prezzo e giacenza. I figli si mostrano come tabella ordinata nella descrizione.

## 2. Regola di riconoscimento

Un codice è figlio se rispetta `<padre>-<5 cifre>` **e il padre esiste** in `integra_articoli`.

Il trattino da solo non basta: i codici normali lo usano per colori e varianti
(`AL21-19004`, `PTD100440-61` → non sono figli). Un suffisso a 5 cifre senza padre
esistente resta un articolo normale (`OA31-04030`).

Helper: `backend/src/integrazione/componenti.ts` (con `componenti.spec.ts`).

## 3. Struttura dati (migration additiva)

Tabella `varianti_componenti`, legata al **codice variante** (non all'articolo: un
articolo può avere sia varianti normali sia un kit).

```prisma
model VarianteComponente {
  id          Int      @id @default(autoincrement())
  padreCodice String   @map("padre_codice")   // varianti.codice
  codice      String                          // MC108886-08611
  descrizione String
  dimensioni  String?
  quantita    Int      @default(1)            // manuale in admin, non arriva da Integra
  ordinamento Int      @default(0)            // dal suffisso numerico
}
```

La descrizione breve della composizione sta sulla **variante** padre:
`varianti.descrizione_composizione` (max 120 caratteri, compilata in admin nel tab
Composizione). Non arriva da Integra.

## 4. Import (`importaVarianti`)

1. I figli riconosciuti **non diventano varianti**; finiscono in `varianti_componenti`.
2. Il padre viene importato anche se non è tra i codici selezionati (senza padre il kit non ha prezzo).
3. L'upsert aggiorna descrizione/dimensioni/ordinamento ma **mai la quantità** (è manuale).
4. Un figlio già importato in passato come variante viene rimosso.
5. Ordine d'import irrilevante: la regola guarda `integra_articoli`, non le varianti già presenti.

## 5. Rendering

- **Scheda B2B**: blocco "Composizione" tra Descrizione e Caratteristiche, tabella `Codice | Descrizione | Dimensioni | Q.tà`, ordinata per suffisso. Si mostra solo per le varianti con componenti.
- **Vetrina pubblica**: stessa tabella nella card del catalogo e nel lightbox (`Composizione.tsx`).
- **Admin** (modale articolo, tab **Composizione**): DataTable con `Composizione | Codice componente | Descrizione | Dimensioni | Q.tà`. La prima colonna è un campo testo (max 120 caratteri) con la descrizione del kit; la quantità è modificabile. Il tab compare solo se l'articolo ha componenti.
- **Catalogo/griglia d'ordine**: invariati. Il padre è una riga come le altre; i figli non sono ordinabili.

## 6. Ordini

Integra invia **una sola riga** (il padre) per un kit: l'import ordini non va toccato.
Prezzi, sconti e giacenza dei figli sono ignorati.

## 7. Prompt AI

Il wizard che genera la descrizione articolo (`wizardDescrizione`) aggiunge al prompt il
blocco `promptComposizione`: per ogni kit con componenti, descrizione del kit + elenco
pezzi con misure e quantità (es. `2× cubo medio (28x28 x 28)`). Senza componenti il blocco
non compare e il prompt resta identico a prima.

## 8. Punti aperti

- I figli non hanno immagini né proprie raccolte: restano pezzi informativi.
- Rimozione automatica dei componenti orfani: oggi li pulisce la FK `ON DELETE CASCADE` solo se sparisce la variante padre; i figli non più presenti in Integra restano finché non si ri-importa quel padre.
