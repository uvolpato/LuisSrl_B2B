# Sincronizzazione Integra → Portale

## Meccanismo
Ogni sync può essere attivato da cron (vedi `sync_config`) o manualmente da Admin → Sync Panel.

## Strategie di sicurezza

### Swap table (articoli, clienti, ordini, giacenze, lookup)
1. Scrive i nuovi dati su tabelle `_new`
2. Se l'INSERT fallisce → le tabelle originali restano intatte
3. Se l'INSERT va a buon fine → swap atomico via `DO $$ ... RENAME`
4. Lo swap è istantaneo e atomico (nessuna perdita dati)

### Transazione (listini)
1. `BEGIN` → DELETE righe → INSERT nuove righe → `COMMIT`
2. Se l'INSERT fallisce o restituisce 0 righe (quando il listino ne aveva) → `ROLLBACK`
3. Controllo pre-sync: `SELECT 1 FROM b2b_listini_testata LIMIT 1` (se fallisce, aborto)
4. Timeout INSERT: 300 secondi

## Configurazione (`sync_config`)

| Tipo | Attivo | Cron | Note |
|------|--------|------|------|
| articoli | ✓ | ogni 15 min | Swap table |
| listini | ✓ | ogni 15 min | Transazione + check righe |
| giacenze | ✓ | ogni 10 min | Swap table |
| clienti | ✓ | ogni 30 min | Swap table + auto-import nuovi listini |
| ordini | ✗ | ogni 15 min | Disabilitato di default |

## Protezioni
- **Connessione Integra**: pre-check su `b2b_listini_testata` prima di toccare dati
- **Righe vuote**: se INSERT restituisce 0 righe ma il listino ne aveva → ROLLBACK
- **Nuovi listini**: sync clienti crea automaticamente la testata in `integra_listini` se assegna un `codiceListino` non ancora presente
- **Fallback listino**: `checkout_default_listino` in `site_config` (default: `LIS1`)
