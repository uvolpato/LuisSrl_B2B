# Processo — Riversamento ordini B2B → Integra

> **Stato:** specifica di processo. Approccio deciso: **export Excel** secondo il tracciato di import di Integra.
> **Oggetto:** trasferire gli ordini creati dal portale B2B nel gestionale Integra come ordini cliente reali (`movtest`/`movrig`, natura `ORD`), in modo **idempotente**, **tracciabile** e **riconciliabile**.
>
> **Nota sul nome del file:** la prima stesura ipotizzava la scrittura diretta via `postgres_fdw`; quell'approccio è stato **accantonato** (vedi §2.1). Il documento resta a questo percorso per continuità — rinominarlo in `ordini-export-integra.md` quando comodo.

---

## 1. Flusso end-to-end

```
1. Il cliente conferma l'ordine sul B2B          → ordini_clienti (stato BOZZA)
2. Il B2B invia la mail "ordine registrato"      → DA IMPLEMENTARE (§11)
3. Uno schedulatore genera un .xlsx per ordine   → cartella monitorata
4. Integra importa i file                        → nasce il documento ORD
5. L'ordine torna visibile nelle viste condivise → b2b_ordini_clienti / b2b_righe_ordini
6. Il B2B aggiorna l'ordine con le modifiche fatte su Integra
```

Dopo il passo 4 **Integra è il sistema autoritativo** dell'ordine: il B2B conserva il proprio record e lo allinea in lettura.

## 2. Principi

1. **Una sola fonte di verità** — dopo l'import, l'ordine appartiene a Integra.
2. **Idempotenza** — rieseguire l'export non produce duplicati (§7).
3. **Riconciliabilità** — ogni documento in Integra è ricollegabile all'ordine B2B che l'ha generato (§4).
4. **Non interferenza** — il processo non scrive nel gestionale: deposita file, l'import è a carico di Integra.
5. **Tracciabilità** — ogni ordine esportato (o scartato) registra esito, file prodotto e motivazione.

### 2.1 Approccio scelto e alternativa scartata

| Approccio | Esito |
|---|---|
| **Export Excel** su cartella monitorata, import a carico di Integra | **Scelto.** È il canale già concordato con AGOMIR in `specifica-scambio-dati-integra.md` §2; nessuna scrittura sul gestionale, superficie di rischio minima |
| Scrittura diretta su `movtest`/`movrig` via `postgres_fdw` | **Accantonato.** Richiede replicare decine di campi strutturali (causali, conti, magazzino, flag), allocare la numerazione al posto del gestionale e scrivere con un utente dedicato: molto più invasivo, e ogni evoluzione del gestionale ci si ritorce contro |

---

## 3. Il tracciato di import

Foglio unico, **27 colonne**, **una riga per riga d'ordine**: i campi di testata (`mvt_*`) si ripetono identici su ogni riga, quelli di riga (`mvr_*`) cambiano. Riferimento: `descrizione tracciato import ordini cliente integra.xlsx` (fornito da AGOMIR).

| Col | Campo | Significato | Valore che scriviamo |
|-----|-------|-------------|----------------------|
| A | `mvt_mdtcod` | Tipo documento | **`OC0000`** (obbl.) |
| B | `mvt_dtmov` | Data movimento | data ordine, `gg/mm/aaaa` (obbl.) |
| C | `mvt_mvnserie` | Tipo movimento | **`OC`** (obbl.) |
| D | `mvt_num` | Numero documento | **`999999`** → vedi §4 |
| E | `mvt_clatipo` | Tipo soggetto | **`C`** (obbl.) |
| F | `mvt_clacodstr` | Codice soggetto | `customers.codice_cliente` (obbl.) |
| G | `mvt_valcod` | Valuta | **`EUR`** (obbl.) |
| H | `mvt_pagcod` | Codice pagamento | *vuoto* — Integra lo recupera dall'anagrafica cliente |
| I | `mvt_specod` | Cod. spedizione | `ordini_clienti.codice_spedizione` |
| J | `mvt_porcod` | Cod. porto | `ordini_clienti.codice_porto` |
| K | `mvt_dtconr` | Data consegna richiesta | *vuoto* (non gestita sul B2B) |
| L | `mvt_ivacod` | Cod. esenzione IVA | *vuoto* |
| M | `mvt_tlscod` | Cod. listino | `customers.codice_listino` |
| N | `mvt_vsrif` | **Vostro riferimento** | **`ordini_clienti.numero_ordine`** (`B2B-…`) → §4 |
| O | `mvt dtvsrif` | Data vostro riferimento | data ordine |
| P | `mvt_iban` | IBAN | *vuoto* |
| Q | `mvr_ordinamento` | Ordinamento riga | **5, 10, 15, …** (base 5, obbl.) |
| R | `mvr_procod` | Cod. prodotto | `righe_ordini.codice_prodotto` (obbl.) |
| S | `mvr_descr` | Descrizione riga | `righe_ordini.descrizione` |
| T | `mvr_umicod` | Unità di misura | *vuoto* — recuperata dall'anagrafica prodotto |
| U | `mvr_qta` | Quantità | `righe_ordini.quantita` (obbl.) |
| V | `mvr_przval` | Prezzo | prezzo netto di riga → §5 |
| W | `mvr_dtconr` | Data cons. richiesta riga | *vuoto* |
| X | `mvr_ivacod` | Cod. IVA prodotto | *vuoto* |
| Y | `mvr_mvgcod` | Tipo riga | **`OC0000`** (obbl.) |
| Z | `mvr_magcod` | Cod. magazzino | **`001`** (obbl.) |
| AA | `mvr_comcod` | Cod. commessa | *vuoto* |

**Obbligatorie (11):** A, B, C, E, F, G, Q, R, U, Y, Z.

> Nota del fornitore: `mvt_pagcod` viene dall'anagrafica cliente; `mvr_umicod` e `mvr_przval` dall'anagrafica prodotto.

---

## 4. Riconciliazione: `mvt_vsrif`, non `mvt_num`

**Decisione: la chiave di collegamento è `mvt_vsrif`**, valorizzato con il numero ordine B2B (`B2B-<timestamp>`).

Perché non `mvt_num`: la nota del tracciato dice che, se valorizzato, viene creato il documento con quel numero — sarebbe una chiave comoda, ma imporrebbe di concordare con AGOMIR un intervallo di numerazione riservato per non collidere con chi inserisce ordini direttamente in Integra. Con `vsrif` il problema non si pone.

**Conseguenza vincolante:** `mvt_num` resta fisso a `999999`, e il tracciato impone che *tutte le righe con lo stesso numero documento finiscano nello stesso documento*. Quindi **un file per ordine** — due ordini nello stesso file verrebbero fusi in un unico documento.

### 4.1 Il ritorno (passi 5-6 del flusso)

La vista sorgente è **nostra**, non del fornitore: [`restore-b2b-views.sql:171`](restore-b2b-views.sql:171) crea `public.b2b_ordini_clienti` leggendo `integra.movtest`. Oggi espone `t.mvt_numordpa AS riferimento_ordine_cliente` ma **non** `mvt_vsrif`.

Servono quindi tre interventi, tutti dalla nostra parte:

1. **Vista:** esporre `t.mvt_vsrif AS riferimento_b2b`.
   *Verifica preliminare:* `mvt_vsrif` (tracciato di import) e `mvt_numordpa` (esposto oggi) potrebbero essere **due colonne distinte** di `movtest`. Esporle entrambe e vedere quale si popola dopo il primo import di prova è il modo più rapido di chiuderla.
2. **Sync:** [`sync.service.ts:625`](../src/integrazione/sync.service.ts:625) copia 9 colonne in `integra_ordini` — aggiungere la nuova.
3. **Match:** [`integrazione.service.ts:2900`](../src/integrazione/integrazione.service.ts:2900) oggi deduplica su `numero_ordine` e fa **solo `create`**. Va cambiato in: se il riferimento corrisponde a un ordine B2B esistente → **`update`** (numero documento Integra, stato, righe), altrimenti `create` come oggi.

Senza il punto 3 il cliente vedrebbe **due ordini** (il suo `B2B-…` e quello tornato da Integra), e le modifiche fatte sul gestionale a un ordine già importato non arriverebbero mai sul portale.

**Bonus:** `b2b_righe_ordini` espone già `prezzo_listino`, `prezzo_netto`, `sconto_1..4`, `valore_sconto` — la scomposizione della riga torna indietro completa e permette la riconciliazione economica riga per riga.

---

## 5. Prezzi, sconti, coupon

Sono i tre punti aperti col fornitore, in ordine di impatto.

1. **Il prezzo potrebbe non viaggiare.** Il tracciato ha solo `mvr_przval`, che secondo la nota "viene recuperato dall'anagrafica prodotto": Integra riprezzerebbe l'ordine col proprio listino. Ma il cliente ha confermato un totale con i suoi sconti. **Da chiedere ad AGOMIR:** valorizzando la colonna V, vince il file o l'anagrafica? Nel dubbio **la valorizziamo** col netto: se viene ignorata non peggioriamo nulla, e il confronto col ritorno (§4.1) lo dimostra.
2. **Nessuna colonna sconto.** Il tracciato non porta né sconto% né prezzo di listino: la composizione della riga come mostrata sul B2B non è rappresentabile. **Da chiedere:** possono esporre le colonne sconto riga (`mvr_sconto1/2` o equivalenti), che nel gestionale esistono già (si vedono in `b2b_righe_ordini`).
3. **La riga coupon non è esportabile così com'è.** In [`checkout.service.ts:444`](../src/checkout/checkout.service.ts:444) lo sconto diventa una riga con `codiceProdotto = campaign.code` (es. `Q8A3WG1C`) e prezzo negativo. Quel codice in Integra non esiste → `mvr_procod` obbligatorio farebbe fallire l'import.
   **Comportamento attuale:** la riga coupon viene **esclusa** dall'export; l'esito dell'ordine riporta `righeEscluse` e la cosa finisce in `audit_log` (`ordine.export`), così lo scostamento è visibile e non silenzioso. **Da concordare:** un codice articolo "sconto" dedicato, oppure lo sconto in testata.

### 5.1 Storicizzazione della riga (prerequisito indipendente)

Oggi [`checkout.service.ts:351`](../src/checkout/checkout.service.ts:351) salva **solo il netto**:

```ts
righe.push({ codiceProdotto, descrizione, quantita, prezzo: netto });
```

Listino e sconto% sono calcolati al volo da `getPrezzo()` e scartati: **irrecuperabili a posteriori**, perché listini e promozioni cambiano nel tempo. Serve una migration additiva su `righe_ordini` (`prezzo_listino`, `sconto_pct`, `prezzo_netto`) e i campi valorizzati in checkout — il dato è già in mano, va solo scritto. Vale a prescindere dall'esito dei punti 1-3: è ciò che rende dimostrabile l'ordine confermato dal cliente.

---

## 6. Macchina a stati

```
BOZZA ──export ok──▶ ESPORTATO ──ritorno da Integra──▶ stato del gestionale
  │
  ├── cliente senza codice ────▶ ERRORE_NO_CLIENTE
  ├── nessuna riga valida ─────▶ ERRORE_PRODOTTO
  ├── dati obbligatori assenti ▶ ERRORE_DATI
  └── scrittura file fallita ──▶ ERRORE_SCRITTURA   (ritentabile)
```

Criterio di selezione: `stato = 'BOZZA' AND esportato_il IS NULL AND numero_ordine LIKE 'B2B-%'`.

Gli stati `ERRORE_*` permettono il retry mirato dopo la correzione. Verificato che `'BOZZA'` compare **solo** in `checkout.service.ts:470` e nessuna logica di frontend ci si dirama: introdurre i nuovi stati non rompe nulla.

## 7. Tracciamento e idempotenza

Migration additiva su `ordini_clienti`:

- `esportato_il TIMESTAMPTZ` — chiave di idempotenza: valorizzata ⇒ mai riesportato.
- `esportato_file TEXT` — nome del file prodotto (per audit e riconciliazione manuale).
- `numero_integra TEXT` — numero documento assegnato dal gestionale, valorizzato al ritorno (§4.1).

Regola: si esporta **solo** ciò che ha `esportato_il IS NULL`. Il file viene scritto **prima** su nome temporaneo e poi rinominato: così l'import di Integra non legge mai un file a metà.

## 8. Esecuzione

Tre modalità, stessa identica logica:

1. **Schedulata** — job periodico che svuota la coda (frequenza da configurazione).
2. **On-demand** — pulsante in area amministrativa, con **dry-run** che mostra cosa verrebbe esportato senza scrivere.
3. **Event-driven** *(opzionale)* — alla conferma dell'ordine, best-effort.

Configurazione via ambiente: cartella di destinazione e frequenza. **Se la cartella non è configurata il processo è disattivo** (stesso criterio già usato da `DatiImpresaService`): nessun job che scrive file in percorsi non voluti.

Concorrenza: un solo run per volta, con **guardia in-process** (stesso pattern del batch notturno dei box in `dashboard.service`), così job schedulato e pulsante manuale non si pestano i piedi.

> **Attenzione, verificato sul campo:** l'advisory lock *di sessione* (`pg_try_advisory_lock`) **non** è utilizzabile con Prisma. Il client usa un pool: `lock` e `unlock` possono finire su connessioni diverse, il lock resta appeso e ogni run successivo viene saltato. Se un giorno il backend girerà replicato e servirà un lock reale, usare `pg_advisory_xact_lock` **dentro una transazione** (rilascio automatico al commit).

## 9. Gestione eccezioni

| Caso | Comportamento |
|---|---|
| Cliente senza `codice_cliente` | scarto ordine + `ERRORE_NO_CLIENTE` (nessun file) |
| Riga senza codice prodotto | riga scartata + log; se non resta alcuna riga → `ERRORE_PRODOTTO` |
| Riga coupon (prezzo negativo) | esclusa dall'export + `righeEscluse` nell'esito e in `audit_log` (§5.3) |
| Campi opzionali mancanti | lasciati vuoti: Integra applica i default dell'anagrafica |
| Cartella non scrivibile | `ERRORE_SCRITTURA`, ordine ritentato al run successivo |

## 10. Sicurezza

- Il processo **non scrive nel gestionale**: produce file. Nessuna credenziale Integra in gioco.
- Percorso di destinazione solo da variabile d'ambiente, mai da input utente (niente path traversal).
- Il file contiene dati commerciali: la cartella deve avere accesso ristretto: è, di fatto, un estratto ordini.

## 11. Pezzi mancanti del flusso (verificati sul codice)

| Passo | Stato |
|---|---|
| 1. Ordine su B2B | ✅ esiste (`checkout.service.ts`) |
| 2. Mail "ordine registrato" | ✅ implementata: template `src/mail/templates/ordine-conferma.html` (logo + immagini prodotto), invio best-effort dal checkout |
| 3. Export .xlsx schedulato | ✅ implementato: `src/export-ordini/` (default `<progetto>/ordini`) |
| 4. Import Integra | a carico di AGOMIR |
| 5. Ordine nelle viste condivise | ✅ esiste (`b2b_ordini_clienti`, ora con `riferimento_b2b`) |
| 6. Aggiornamento dell'ordine sul B2B | ✅ implementato: match su `riferimento_b2b` → `update` testata + righe (`allineaOrdineB2b`) |

## 12. Monitoraggio

- Ogni esecuzione restituisce un report: processati, esportati, errori, e per ogni ordine l'esito con file e righe escluse.
- Ogni ordine esportato o scartato finisce in `audit_log` (azione `ordine.export`, `esito` OK/KO).
- *ponytail:* il report non è persistito su `sync_log` come fanno i sync — l'`audit_log` per ordine copre il caso d'uso. Se servirà lo storico per esecuzione, si aggiunge lì.

## 13. Collaudo

1. Ordine di prova con più righe **e un coupon**.
2. Dry-run: verifica delle 27 colonne e delle obbligatorie prima di scrivere.
3. File reale → import da parte di AGOMIR su ambiente di test.
4. Verifica nel gestionale: cliente, righe, quantità, **prezzi applicati** (è la risposta al §5.1).
5. Verifica del ritorno: il documento torna nelle viste e si riaggancia all'ordine B2B via `vsrif`.
6. Test di idempotenza: secondo run → nessun file, nessun duplicato.

## 14. Decisioni aperte

| # | Domanda | A chi | Blocca? |
|---|---|---|---|
| 1 | Valorizzando `mvr_przval`, vince il file o l'anagrafica prodotto? | AGOMIR | no (esportiamo comunque il netto) |
| 2 | Possono esporre le colonne sconto di riga nel tracciato? | AGOMIR | no |
| 3 | Codice articolo dedicato per lo sconto coupon, o sconto in testata? | AGOMIR | no (oggi escluso + anomalia) |
| 4 | Cartella di destinazione, pattern del nome file, cadenza, gestione degli scarti | AGOMIR | **sì** per andare in produzione |
| 5 | ~~`mvt_vsrif` e `mvt_numordpa` sono la stessa colonna?~~ | **RISOLTA** | — |

> **#5 risolta** (verificata su `information_schema` via FDW): `integra.movtest` ha **entrambe** le colonne, `mvt_vsrif` e `mvt_numordpa`, e sono **distinte** (come pure `mvt_dtvsrif` e `mvt_dtordpa`). La vista esponeva solo la seconda: ora espone anche `mvt_vsrif AS riferimento_b2b`, che è quella valorizzata dall'import Excel.

---

## 15. Stato dell'implementazione

**Fatto e verificato sul DB di sviluppo:**

| Cosa | Dove |
|---|---|
| Colonne `esportato_il`, `esportato_file`, `numero_integra` | migration `20260831000000_export_ordini` |
| Composizione di riga storicizzata (`prezzo_listino`, `sconto_pct`, `prezzo_netto`) | migration `20260831010000_riga_ordine_composizione` + `checkout.service` |
| Generazione .xlsx + coda + marcatura + cron + endpoint admin | `src/export-ordini/` |
| `riferimento_b2b` nella vista | `restore-b2b-views.sql` |
| Colonna propagata nella copia locale + composizione di riga | `sync.service.ts` (`integra_ordini`, `integra_righe_ordini`) |
| Riaggancio e allineamento dell'ordine | `integrazione.service.ts` → `allineaOrdineB2b` |
| Mail di conferma con logo e immagini prodotto | `src/mail/templates/ordine-conferma.html` + `MailService.sendConfermaOrdine` |

Script di verifica (non inviano nulla e non lasciano dati):
`scripts/verifica-export-ordini.ts` (dry-run dell'export), `scripts/verifica-match-vsrif.ts`
(simula il ritorno da Integra e controlla che non nascano doppioni),
`scripts/anteprima-mail-ordine.ts` (rende la mail su file).

**Da fare prima della produzione:**

1. Rieseguire la definizione della vista `b2b_ordini_clienti` sul DB di produzione (aggiunge `riferimento_b2b`), poi un `sync ordini` completo perché la colonna arrivi nella copia locale.
2. Impostare `EXPORT_ORDINI_DIR` sulla cartella concordata con AGOMIR (decisione aperta #4). Finché non è impostata i file finiscono in `<progetto>/ordini`.
3. Primo import di prova su ambiente di test e verifica che `mvt_vsrif` torni valorizzato nella vista: è l'unico punto che non si può provare senza Integra.
4. Verificare la resa della mail sui client reali: il logo è PNG (`logo-email.png`, generato da `logo.webp`) perché webp e svg non sono affidabili in posta; **le immagini prodotto restano quelle del catalogo**, e se sono `.webp` alcuni client non le mostreranno — il codice preferisce un formato non-webp quando l'articolo ne ha uno.

---

## Riferimenti

- `specifica-scambio-dati-integra.md` — canali concordati (§2: Excel in scrittura).
- `descrizione tracciato import ordini cliente integra.xlsx`, `tracciato_ordcli.xlsx` — tracciato e modello vuoto (AGOMIR).
- [`restore-b2b-views.sql`](restore-b2b-views.sql) — viste `b2b_*` in lettura (§4.1).
- [`setup-fdw.sql`](setup-fdw.sql) — setup `postgres_fdw` (sola lettura).
- [`schema.prisma`](schema.prisma) — `OrdineCliente` / `RigaOrdine` (righe 205-237).
- [`checkout.service.ts`](../src/checkout/checkout.service.ts) — creazione ordine (`:464`), righe (`:351`), coupon (`:444`).
- [`sync.service.ts`](../src/integrazione/sync.service.ts) — sync in ingresso (`:625`).
- [`integrazione.service.ts`](../src/integrazione/integrazione.service.ts) — import ordini per cliente (`:2881`).
