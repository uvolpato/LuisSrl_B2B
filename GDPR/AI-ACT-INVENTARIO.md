# AI Act — Inventario e obblighi (Reg. UE 2024/1689)

> **BOZZA operativa.** Documento di supporto, non parere legale. Da aggiornare quando cambia un modello
> o si aggiunge una funzione AI.

## Inventario dei sistemi AI in uso

| # | Funzione | Modello | Dove | Chi la usa | Dati personali? |
|---|---|---|---|---|---|
| 1 | Descrizione prodotto e testi catalogo | Gemini (testo) | `integrazione.service.ts` | Admin | No (dati prodotto) |
| 2 | Generazione immagini ambientate | Gemini (immagine) | `integrazione.service.ts` | Admin | No (oggetti) |
| 3 | Ricerca semantica del catalogo | Gemini (embedding) | `embedding.service.ts` | Cliente | Testo libero (possibile) |
| 4 | Ricerca per immagine | Gemini (vision) | `catalogo.controller.ts` | Cliente | Foto caricata (possibile) |
| 5 | Profilo commerciale del cliente | Gemini (testo + ricerca web) | `customer-profile.service.ts` | Admin (batch settimanale) | Dati aziendali + referenti pubblici |
| 6 | Sintesi comportamentale del cliente | Gemini (testo) | `insight.service.ts` | Admin | Ordini e utilizzo |
| 7 | Suggerimenti di segmentazione coupon | Gemini (testo) | `coupon.service.ts` | Admin | No (aggregati) |
| 8 | Qualifica automatica dei lead | Gemini (testo + ricerca web) | `leads/indagine.service.ts` | Automatico | Solo dati aziendali |
| 9 | Embedding locale | LM Studio (modello locale) | mini PC in LAN | Sistema | No (nessun trasferimento) |

## Classificazione del rischio

**Rischio minimo/limitato.** Nessuna pratica vietata (art. 5): niente manipolazione, sfruttamento di
vulnerabilità, social scoring, biometria, categorizzazione di persone.
Nessuna applicazione ad alto rischio (Allegato III): non si decide su credito, occupazione, istruzione,
servizi essenziali, giustizia o migrazioni.

## Ruoli

- **Google** è fornitore del modello (GPAI) e assume gli obblighi sui modelli.
- **Luis S.r.l.** è deployer: risponde di trasparenza, uso conforme e supervisione umana.
- **LM Studio** gira in locale: nessun fornitore esterno coinvolto.

## Obblighi che riguardano Luis

### Trasparenza (art. 50)

| Obbligo | Stato |
|---|---|
| Chi interagisce con un sistema AI deve saperlo | Da confermare in UI: la ricerca AI è etichettata |
| Contenuti generati o manipolati vanno dichiarati | Coperto: badge "AI" su sito e cataloghi; verificare le descrizioni generate |
| Marcatura leggibile da macchina per i contenuti sintetici | Coperto dal watermark del fornitore (SynthID) |

### Alfabetizzazione AI (art. 4, in vigore dal 2 febbraio 2025)

Va garantito che chi usa questi strumenti abbia conoscenze adeguate. Serve:
- una sessione formativa documentata per admin e commerciali;
- un promemoria scritto: cosa non mettere nei prompt, come riconoscere un output inaffidabile,
  a chi segnalare un comportamento strano;
- registro delle partecipazioni.

Stato: **da fare**.

### Supervisione umana

Le decisioni con effetti sul cliente (prezzi, fido, condizioni, accesso) restano umane. Le proposte
dell'AI sono indicazioni, non decisioni. Va mantenuto questo confine anche nelle evoluzioni future.

## Registro delle esecuzioni

`ai_usage` registra attore, tipo, modello, token e costo stimato, senza contenuti dei prompt.
È sufficiente come traccia di accountability e va mantenuto con retention definita.

## Cosa aggiornare e quando

- nuovo modello o nuovo fornitore → aggiornare inventario e DPA;
- nuova funzione che tocca persone (es. valutazione automatica di un cliente) → rivalutare la classe di rischio;
- ogni anno → rivedere formazione e inventario.

Data: **[DA COMPILARE]** — a cura di: **[DA COMPILARE]**.
