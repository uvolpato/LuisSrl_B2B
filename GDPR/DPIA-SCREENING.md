# DPIA — Screening preliminare (art. 35 GDPR)

> **BOZZA operativa.** Lo screening serve a decidere, con motivazione scritta, se serve una DPIA completa.
> Criteri: linee guida EDPB WP248 rev.01 (nove criteri; due o più → DPIA). Non è un parere legale.

## Criteri EDPB

| # | Criterio | Presente? | Note |
|---|---|---|---|
| 1 | Valutazione o scoring | **Sì** | Profilo commerciale con stime (dimensione, fatturato, interessi, stagionalità) |
| 2 | Decisione automatizzata con effetti giuridici o significativi | No | Prezzi, fido e condizioni restano umani; nessun art. 22 |
| 3 | Monitoraggio sistematico | **Sì** | Eventi comportamentali continui su tutti gli utenti autenticati |
| 4 | Dati particolari (art. 9) o dati di condanne | No | Nessun dato sanitario, biometrico, politico, religioso |
| 5 | Trattamento su larga scala | **Parziale** | Base clienti B2B, non consumatori; da quantificare [DA COMPILARE] |
| 6 | Incrocio o combinazione di dataset | **Sì** | Dati del gestionale + uso del portale + fonti pubbliche + provider dati impresa |
| 7 | Interessati vulnerabili | No | Professionisti in contesto B2B; verificare assenza di micro-imprese in difficoltà [DA COMPILARE] |
| 8 | Uso innovativo di tecnologia | **Sì** | Modelli generativi, ricerca semantica, ricerca per immagine, ricerca web automatica |
| 9 | Impedisce l'esercizio di un diritto o l'accesso a un servizio | No | L'opposizione è prevista contrattualmente; oggi non ancora implementata (P1.3) |

**Criteri soddisfatti: 5 su 9** (1, 3, 5, 6, 8). Soglia "due o più" superata.

## Conclusione

**DPIA completa raccomandata.** Il trattamento combina monitoraggio sistematico e tecnologia
generativa su dati incrociati, con una base clienti professionale ma numerosa.

Se il Titolare decide di non eseguirla, deve **motivare per scritto** la scelta e conservarla
(accountability). La motivazione deve spiegare perché i criteri 1, 3, 6 e 8 non producono un rischio
elevato nel caso concreto.

## Perimetro minimo della DPIA, se eseguita

1. Descrizione sistematica dei trattamenti e delle finalità (riuso del registro art. 30).
2. Valutazione di necessità e proporzionalità per: tracking, profilazione, ricerca per immagine,
   indagine web sui lead.
3. Analisi dei rischi per i diritti: uso improprio del profilo, errore di attribuzione dei referenti,
   fuga di log con token, uso del modulo lead per profilare terzi.
4. Misure: minimizzazione nei prompt, fonte obbligatoria per i referenti, retention, opposizione,
   MFA admin, cifratura backup, redazione dei log.
5. Parere del consulente privacy [DA COMPILARE] e decisione del Titolare [DA COMPILARE].

## Riesame

Da rifare quando: cambia modello AI, si aggiunge un fornitore, la base clienti cresce di ordine di
grandezza, o arriva un reclamo sul trattamento.

Data dello screening: **[DA COMPILARE]** — a cura di: **[DA COMPILARE]**.
