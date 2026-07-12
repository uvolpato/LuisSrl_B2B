# Architettura della sincronizzazione (Integra → Portale B2B)

## Panoramica

Il portale B2B mantiene un proprio specchio dei dati del gestionale Integra
tramite un **layer di sincronizzazione** organizzato in tre livelli:

```
┌─────────────────────────────────────────────────────┐
│                  Gestionale Integra                  │
│  (PostgreSQL 192.168.1.41:5432, dbname=integra)     │
└─────────────┬───────────────────────────────────────┘
              │
              ├── FDW (postgres_fdw) — solo b2b_prodotti
              └── dblink — tutte le altre viste b2b_*
              │
              ▼
┌─────────────────────────────────────────────────────┐
│           Viste sorgente portale (b2b_*)            │
│  Ogni vista mappa colonne Integra → nomi portale    │
│  CONTRATTO: se cambi gestionale riscrivi solo qui   │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│              sync.service.ts                         │
│  Legge da b2b_*, scrive su integra_*                │
│  Gestisce: full-swap, full-replace, progresso, cron │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│           Tabelle specchio portale (integra_*)      │
│  Usate da integrazione.service.ts per:              │
│  - import clienti/articoli nel portale              │
│  - ricerca e filtro catalogo                        │
│  - risoluzione prezzi per listino                   │
└─────────────────────────────────────────────────────┘
```

## Viste sorgente (b2b_*)

Sono le uniche interfacce verso i dati Integra. Raggiungibili via:
- **FDW** (`postgres_fdw`): `integra.b2b_prodotti`
- **dblink**: tutte le altre (`b2b_clienti`, `b2b_listini_*`, ecc.)

| Vista | Colonne chiave | Note |
|-------|---------------|------|
| `b2b_clienti` | `id_cliente`, `codice_cliente`, `ragione_sociale`, `email`, `codice_listino`, `codice_conto`, `cli_obsoleto`, `data_modifica` | `codice_conto` presente = cliente attivo; `codice_listino` = '--' o null = default (LIS1) |
| `b2b_indirizzi_clienti` | `id_destinazione`, `id_cliente`, `codice_cliente`, `indirizzo`, `cap`, `citta`, `provincia`, `flag_spedizione` | |
| `b2b_pagamenti_clienti` | `id_cliente`, `codice_cliente`, `codice_pagamento`, `fido_totale`, `fido_concessione`, `obsoleto` | |
| `b2b_ordini_clienti` | `id_ordine`, `numero_ordine`, `anno_ordine`, `codice_cliente`, `importo_imponibile`, `flag_obsoleto`, `data_modifica` | |
| `b2b_righe_ordini` | `id_ordine`, `id_riga`, `codice_prodotto`, `quantita`, `prezzo_netto` | |
| `b2b_prodotti` | `pro_cod`, `pro_descr`, `cod_famiglia`, `descr_famiglia`, `cod_linea`, `descr_linea`, `dimensione_*`, `prodotto_obsoleto` | Unica via FDW |
| `b2b_listini_testata` | `codice_listino`, `descrizione_listino`, `tipo_listino`, `listino_con_iva`, `listino_obsoleto`, `data_modifica` | LIS1 = default |
| `b2b_listini_righe` | `id_riga_listino`, `codice_listino`, `codice_prodotto`, `id_variante`, `prezzo_listino`, `sconto_1/2/3/4`, `listino_obsoleto`, `data_modifica` | Grande volume, serve query per singolo codice_listino |

## Tabelle specchio portale (integra_*)

| Tabella | Strategia sync | Popolamento |
|---------|---------------|-------------|
| `integra_articoli` | Full-swap | `sync()` (sync.service.ts) |
| `integra_famiglie` | Full-swap | `sync()` |
| `integra_linee` | Full-swap | `sync()` |
| `integra_clienti` | Full-swap | `syncClienti()` |
| `integra_indirizzi` | Full-swap | `syncClienti()` |
| `integra_pagamenti` | Full-swap | `syncClienti()` |
| `integra_ordini` | Full-swap | `syncOrdini()` |
| `integra_righe_ordini` | Full-swap | `syncOrdini()` |
| `integra_listini` | Full-replace per listino | `syncListini()` (solo listini attivi) |
| `integra_listini_righe` | Full-replace per listino | `syncListini()` |

## Strategie di sync

### Full-swap (articoli, clienti, ordini)

1. Crea tabelle `_new` ex-novo.
2. Inserisce tutti i dati filtrando dalla vista sorgente.
3. Swap atomico: RENAME tabelle attuali → `_old`, RENAME `_new` → attuali, DROP `_old`.
4. Vantaggio: garanzia di integrità (se fallisce, dati vecchi intatti).
5. Svantaggio: riscrive tutto anche se nulla è cambiato.

### Full-replace per listino (listini)

1. Per ogni listino attivo (usato da almeno un cliente importato nel portale).
2. `DELETE FROM integra_listini_righe WHERE codice_listino = 'LIS1'`.
3. `INSERT INTO integra_listini_righe SELECT ... FROM b2b_listini_righe WHERE codice_listino = 'LIS1' AND listino_obsoleto = 0`.
4. Gestisce automaticamente: nuovi prodotti, prezzi modificati, righe cancellate fisicamente.

### Guardia salt (ottimizzazione opzionale)

Prima di un full-swap, controlla:
```
SELECT MAX(data_modifica) FROM b2b_clienti > last_cursor IN sync_state
```
Se nessun record è stato modificato, salta l'esecuzione.

## Log di sincronizzazione (sync_log)

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | SERIAL PK | |
| `entity` | TEXT | 'articoli', 'clienti', 'ordini', 'listini' |
| `status` | TEXT | 'running', 'ok', 'failed', 'stale' |
| `progress_pct` | INTEGER | 0-100 |
| `progress_phase` | TEXT | Fase corrente leggibile |
| `rows_total` | INTEGER | |
| `rows_ok` / `rows_error` | INTEGER | |
| `error_text` | TEXT | |
| `started_at` / `completed_at` | TIMESTAMPTZ | |

Il frontend polla `GET /api/integrazione/sync/progress` ogni 500ms.
L'ultima riga per `ORDER BY started_at DESC` rappresenta lo stato corrente.
Entity 'stale' = sovrascritta da una sync più recente.

## Stato del sync (sync_state)

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `entity` | TEXT PK | 'clienti', 'listini', 'ordini' |
| `last_cursor` | TIMESTAMPTZ | MAX(data_modifica) dell'ultima esecuzione |
| `last_run_at` | TIMESTAMPTZ | Data/ora dell'ultima esecuzione |
| `status` | TEXT | 'ok', 'failed', 'syncing' |

## Processi di sync

### Articoli
- **Metodo**: `sync()` in sync.service.ts
- **Sorgente**: `b2b_prodotti` (FDW)
- **Strategia**: full-swap
- **Cron**: ogni 15 min (`0 */15 * * * *`)
- **Endpoint**: `POST /api/integrazione/sync`

### Clienti
- **Metodo**: `syncClienti()` in sync.service.ts
- **Sorgenti**: `b2b_clienti`, `b2b_indirizzi_clienti`, `b2b_pagamenti_clienti`
- **Strategia**: full-swap
- **Resolve listino**: se `codice_listino = null` o `'--'` → `'LIS1'`
- **Cron**: ogni 15 min (da attivare)
- **Endpoint**: `POST /api/integrazione/sync/clienti`

### Ordini
- **Metodo**: `syncOrdini()` in sync.service.ts
- **Sorgenti**: `b2b_ordini_clienti`, `b2b_righe_ordini`
- **Strategia**: full-swap
- **Cron**: da attivare
- **Endpoint**: `POST /api/integrazione/sync/ordini`

### Listini
- **Metodo**: `syncListini()` in sync.service.ts
- **Sorgenti**: `b2b_listini_testata`, `b2b_listini_righe`
- **Strategia**: full-replace per listino attivo (es. LIS1, LIS2, LIS3)
- **Cron**: ogni 15 min
- **Endpoint**: `POST /api/integrazione/sync/listini`
- **Lazy import**: il primo cliente importato che usa un listino ne attiva la sync

## Progresso lato frontend

Il frontend (ClientiSection, ImportaClientiModal) usa:
```
POST /api/integrazione/sync/clienti   (ritorna 202, esegue in background)
GET  /api/integrazione/sync/progress  (polling ogni 500ms)
```

La risposta di progresso:
```json
{ "running": true,  "pct": 34, "phase": "Clienti (2400/8856)" }
{ "running": false, "pct": 100, "phase": "Completato" }
```

Il bottone "Sincronizza" nella schermata clienti mostra la percentuale
durante l'esecuzione e un flash "OK"/"Errore" al termine.

## File reference

| File | Ruolo |
|------|-------|
| `backend/src/integrazione/sync.service.ts` | Tutti i processi di sync (articoli, clienti, ordini, listini) + helper (progresso, log, retry) |
| `backend/src/integrazione/integrazione.controller.ts` | Endpoint REST per avviare sync e leggere progresso |
| `backend/src/integrazione/integrazione.service.ts` | Import di entità nel portale (clienti, articoli) + ricerca su dati già sincronizzati |
| `backend/prisma/setup-fdw.sql` | Configurazione FDW verso il server Integra |
| `frontend/components/admin/sections/ClientiSection.tsx` | Bottone Sincronizza + polling progresso |
| `frontend/components/admin/ImportaClientiModal.tsx` | Modale import clienti (usa endpoint search + importa) |

## Cambiare gestionale

Per adattare il portale a un gestionale diverso da Integra:

1. **Riscrivi le viste** `b2b_*` — mappa le nuove colonne ai nomi attesi (codice_listino, prezzo_listino, data_modifica, ecc.).
2. **Aggiorna** la connessione (dblink/FDW) in `setup-fdw.sql`.
3. **I file** `sync.service.ts`, `integrazione.service.ts`, `integrazione.controller.ts` **non cambiano**: parlano con le viste `b2b_*` che hanno la stessa interfaccia.

## Come aggiungere un nuovo sync (es. fornitori, agenti, cespiti...)

1. Aggiungi una vista `b2b_nuova_entita` (dblink o FDW).
2. Aggiungi la tabella specchio `integra_nuova_entita` nel migration di Prisma.
3. Crea un metodo `syncNuovaEntita()` in `sync.service.ts` che:
   - Chiama `startLog('nuova_entita')`
   - Legge da `b2b_nuova_entita`
   - Applica una strategia (full-swap o full-replace)
   - Chiama `completeLog()` / `failLog()`
4. Aggiungi `@Cron(...)` se serve scheduling periodico.
5. Aggiungi `POST /sync/nuova-entita` in `integrazione.controller.ts`.
6. Il progresso è automatico (getProgress legge l'ultima riga di sync_log).
7. Il frontend può chiamare l'endpoint e pollare `/sync/progress` (nessun nuovo componente necessario).

## Limitazioni note

- Le viste dblink su `b2b_listini_righe` sono lente (>2min per full scan).
  Le query per singolo `codice_listino` sono accettabili (indice su Integra).
- Il progresso % mostra solo l'ultima entità sincronizzata. Se due sync
  partono in parallelo, il progresso si alterna tra le due.
- `integra_*` tabelle non hanno vincoli FK (possono essere ricostruite
  indipendentemente in ordine qualsiasi).
