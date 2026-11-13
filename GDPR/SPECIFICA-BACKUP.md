# Specifica backup — Portale B2B Luis

> Documento operativo per il sistemista. Da approvare dal Titolare. Include i vincoli GDPR
> (cifratura, retention, ripristino, richieste di cancellazione).

## 1. Obiettivo

Perdita massima di dati accettabile (**RPO**): **24 ore**.
Tempo massimo di ripristino (**RTO**): **4 ore** in caso di guasto del server.

## 2. Cosa salvare

| Oggetto | Percorso / comando | Note |
|---|---|---|
| Database | `pg_dump -U <utente> -d "LuisSrlDb" -F c -f <file>` | formato custom, ripristinabile con `pg_restore` |
| Immagini articoli | cartella `ASSETS_BASE_DIR` (default `frontend/public/images`) | solo file, non build |
| PDF cataloghi | `backend/storage/cataloghi` | serviti solo a token valido |
| Configurazione | `.env` (backend, frontend) e `Caddyfile` | **segreti: archivio separato e cifrato** |

Non salvare: `node_modules`, `dist`, `.next`, log applicativi.

## 3. Frequenza e retention

| Copia | Quando | Dove | Retention |
|---|---|---|---|
| Giornaliera | ogni notte 02:00 | disco secondario del server | 30 giorni |
| Settimanale | domenica 02:30 | supporto esterno (NAS o cloud UE) | 6 mesi |
| Mensile | primo del mese | supporto esterno | 12 mesi **[DA CONFERMARE]** |

## 4. Cifratura e chiavi

- Ogni archivio si **cifra prima** di uscire dal server: `age` (consigliato) o 7-Zip con password lunga.
- La chiave/password **non** sta accanto al backup, non nel repository, non nella stessa cartella.
- Custodia: password manager aziendale o busta sigillata in cassaforte; accesso a due persone.
- Senza chiave il backup è inutilizzabile: la chiave va testata insieme al ripristino.

Esempio con `age`:

```powershell
pg_dump -U postgres -d "LuisSrlDb" -F c -f "$env:TEMP\luis.dump"
age -r <chiave-pubblica> -o "D:\backup\luis_$(Get-Date -f yyyyMMdd).dump.age" "$env:TEMP\luis.dump"
Remove-Item "$env:TEMP\luis.dump"
```

## 5. Ripristino (da provare ogni 6 mesi)

1. Macchina di prova con PostgreSQL della stessa versione.
2. Decifrare l'archivio.
3. `pg_restore -U postgres -d "LuisSrlDb_restore" --clean --if-exists <file>`
4. Avvio del backend sulla copia e verifica: login admin, conteggio clienti, un ordine, un'immagine.
5. Annotare data, durata, esito, problemi. Conservare il verbale.

## 6. Monitoraggio

- Il job di backup scrive un esito in un log dedicato.
- Alert se il backup notturno non viene creato o se la dimensione è anomala (0 byte, -50%).
- Verifica mensile manuale: esistenza del file, data, dimensione, presenza della copia esterna.

## 7. Richieste di cancellazione e backup

Una richiesta di cancellazione si applica anche ai backup: i dati restano nelle copie fino alla
rotazione (max 30 giorni) e non vanno ripristinati in produzione. Il Titolare annota le richieste
ricevute; in caso di ripristino, prima di rimettere online si verificano le cancellazioni registrate.

## 8. Cosa consegnare al Titolare

- [ ] Procedura scritta e versionata (questo documento aggiornato).
- [ ] Elenco dei supporti e del luogo di custodia.
- [ ] Copia del primo verbale di ripristino.
- [ ] Contatto del responsabile tecnico e della persona che custodisce la chiave.
- [ ] Se il backup esterno è su cloud: fornitore, paese, contratto e nomina a responsabile.

## 9. Criteri di accettazione

1. Esiste almeno una copia esterna cifrata verificata.
2. Il ripristino è stato eseguito con successo almeno una volta, con verbale.
3. La chiave è custodita separatamente e testata.
4. L'alert di backup mancante è attivo.
5. La retention corrisponde alla tabella del §3.
