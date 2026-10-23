# Specifica — Articoli "composizione" (componenti)

**Destinatari:** sviluppo portale B2B Luis.
**Oggetto:** come modellare gli articoli composti da più pezzi (composizioni/set), gestiti in Integra con un codice articolo padre e codici figlio (`padre_001`, `padre_002`, …).

---

## 1. Il problema

Esistono articoli formati da **più oggetti in composizione** (es. un set di 3 vasi). In Integra saranno gestiti così:

- **Articolo padre** → `codice_articolo_padre`, con descrizione e prezzo.
- **Articoli figlio** → `codice_articolo_padre_001`, `_002`, `_003`, ecc. (i singoli pezzi della composizione).

Obiettivo: restare **coerenti con la struttura dati** esistente (Famiglia → Articolo → Variante) ma rappresentare la composizione come **tabella nella descrizione articolo**, non come varianti.

---

## 2. Regola d'oro

- **Padre** (`codice_articolo_padre`) = l'**Articolo**: vendibile, con prezzo da listino, immagini, descrizione.
- **Figli** (`padre_001`, `_002`, `_003`) = **componenti della composizione**, non unità ordinabili.

## 3. Perché NON nelle varianti

Le `Varianti` sono per definizione le unità **ordinabili** (hanno `multiplo`, `giacenza`, prezzo listino). Metterci i pezzi di un set significherebbe lasciare che il cliente ordini "il singolo vaso" della composizione, con prezzo e giacenza propri che in Integra non esistono.

- Varianti = **ciò che compri**.
- Componenti = **ciò che c'è dentro**.

## 4. Struttura dati (migration additiva)

Tabella dedicata, coerente con il pattern `Variante` / `Immagine` / `ArticoloRaccolta`:

```prisma
model ArticoloComponente {
  id          Int      @id @default(autoincrement())
  articoloId  Int      @map("articolo_id")
  articolo    Articolo @relation(fields: [articoloId], references: [id], onDelete: Cascade)
  codice      String              // figlio: padre_001
  descrizione String
  quantita    Int      @default(1)
  dimensioni  Json?
  ordinamento Int      @default(0)

  @@index([articoloId, ordinamento])
  @@map("articoli_componenti")
}
```

Su `Articolo` va aggiunta solo la relazione: `componenti ArticoloComponente[]`.

## 5. Import da Integra (regola di riconoscimento)

Nell'`importArticoli`:

1. Un codice che corrisponde al pattern `^(.+)_(\d{3})$` il cui prefisso (`codice_padre`) esiste già come articolo → è un **figlio**.
2. Il figlio viene **saltato** come articolo/variante autonoma e aggiunto come riga in `articoli_componenti` del padre.
3. Il padre resta un Articolo normale con le sue varianti reali (se il set esiste in più misure, quelle SÌ sono varianti).

La logica va isolata in un helper idempotente (come le altre regole di import).

## 6. Rendering

- **Scheda articolo** (e lightbox della vetrina): tabella `codice | descrizione | quantità | dimensioni` nella zona descrizione, letta da `articoli_componenti`.
- **Card catalogo**: la composizione NON si mostra (al più un badge "set di N pezzi").
- Nessun ordine sui figli: restano puramente informativi.

## 7. Alternativa più leggera

Se la composizione è solo "testo da mostrare" e mai da filtrare, un campo `composizione: Json?` su `Articolo` basta. Ma poiché il progetto già modella i correlati come tabelle e potrebbe servire cercare/filtrare i componenti, si consiglia la **tabella**.

## 8. Punto aperto

**Coesistenza con varianti reali:** il padre può avere anche varianti reali (es. composizione disponibile in 2 misure, ogni misura = variante ordinabile)?

- Se sì, il modello regge: padre → varianti (misure) + componenti (pezzi), senza conflitti.
- Da confermare prima dell'implementazione.

---

*Stato: analisi, da validare con i dati reali dell'export Integra prima di implementare.*
