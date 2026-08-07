Piano definitivo spese spedizione (pending):
1. Verifica connessione pre-sync (SELECT 1 di test, abort se fallisce)
2. Swap table con cleanup iniziale (DROP IF EXISTS _new, CREATE _new, INSERT, poi RENAME)
3. Filtro data validità record
