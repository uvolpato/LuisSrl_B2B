# Setup produzione da zero — Portale B2B Luis

Guida per installare il portale su una macchina Windows nuova, e per gli
aggiornamenti successivi.

## 0. Prerequisiti (una volta, come Administrator)

1. **Git** → https://git-scm.com/download/win
2. **PostgreSQL 16** → https://www.postgresql.org/download/windows/
   (installa anche `psql`; annota la password dell'utente `postgres`)
3. **Node.js** → lo installa lo script al passo 3 (versione esatta `24.15.0`)

## 1. Prendere il codice

```cmd
cd "C:\Progetti"
git clone https://github.com/uvolpato/LuisSrl_B2B.git "Luis Srl - B2B"
cd "Luis Srl - B2B"
```

## 2. Creare il database (se non esiste)

```cmd
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres LuisSrlDb
```

## 3. Provisioning (Node + dipendenze + build)

Dalla root `portale`, come Administrator:

```cmd
setup-prod.cmd
```

Se installa Node per la prima volta, **chiudi e riapri** il terminale e
rilancia `setup-prod.cmd` (serve per aggiornare il PATH).
Lo script fa: Node 24.15.0 → backend `npm ci` + prisma generate/migrate/build
→ frontend `npm ci` + build.

> Usa sempre `npm ci` (installa **esattamente** il `package-lock.json`), mai
> `npm install`: è quello che aveva causato il salto Prisma 6 → 7.

## 4. File `.env` (creare prima di avviare)

**`backend\.env`** (adatta password/dominio/SMTP):

```
DATABASE_URL=postgresql://postgres:PWD_POSTGRES@localhost:5432/LuisSrlDb?schema=public&statement_timeout=60000
SESSION_SECRET=<stringa-lunga-casuale>
NODE_ENV=production
PORT=3001
# SMTP per gli inviti…
```

**`frontend\.env`** (o `.env.production`): l'URL pubblico dell'API.

> Se il DB era vuoto, dopo aver messo il `.env`:
> `cd backend && npx prisma migrate deploy`

## 5. Viste Integra (una tantum)

```cmd
"C:\Program Files\PostgreSQL\16\bin\psql.exe" "postgresql://postgres:PWD_POSTGRES@localhost:5432/LuisSrlDb" ^
  -v conn="host=192.168.1.41 port=5432 dbname=integra user=postgres password=\*Lui.2099\*" ^
  -f backend\prisma\restore-b2b-views.sql
```

Richiede che la macchina raggiunga `192.168.1.41:5432`.
Le viste `vista_integra_*` usano anche le tabelle
`integrazioni_raw` / `integrazioni_linee_map` (seed Integra): se mancano,
vanno popolate a parte.

## 6. Avvio come servizi Windows (consigliato)

Dalla root, come Administrator:

```cmd
setup-services.cmd
```

Scarica `nssm`/`caddy` se mancano e crea tre servizi **auto-start al boot**:
`LuisBackend` (API), `LuisFrontend` (porta 3000) e `LuisCaddy` (reverse proxy
HTTP/HTTPS su 80/443). Lo script **chiede il dominio**:

- **dominio pubblico** → HTTPS automatico Let's Encrypt (la 80 reindirizza alla 443);
- **invio (vuoto)** → solo LAN: HTTP su 80 + HTTPS self-signed su 443.

Ricorda di aprire sul firewall le porte **80 e 443**. Comandi utili:
`nssm restart LuisBackend`, `nssm status LuisFrontend`, `nssm restart LuisCaddy`.
Log in `backend\service-*.log`, `frontend\service-*.log`, `caddy-*.log`.

### In alternativa: finestre manuali

```cmd
cd backend
npm run start:prod
```
```cmd
cd frontend
npm run start
```

---

## Aggiornamenti successivi (non da zero)

Chiudi la finestra del backend, poi dalla root:

```cmd
deploy-prod.cmd
```

Fa: git pull → npm ci → prisma generate/migrate → build → riavvia il backend
in una nuova finestra.

## Script del repo

| File | Scopo |
|------|-------|
| `setup-prod.cmd` | Provisioning da zero (Node + dipendenze + migrate + seed + build + viste) |
| `setup-services.cmd` | Crea i servizi Windows `LuisBackend` / `LuisFrontend` (nssm) |
| `deploy-prod.cmd` | Aggiornamento (stop servizi + pull + ci + migrate + build + restart) |
| `backend/prisma/restore-b2b-views.sql` | Ricrea le viste `b2b_*` / `vista_integra_*` (dblink Integra) |

## Versioni bloccate

- **Node**: `24.15.0` (`.nvmrc`, `engines.node`, `.npmrc engine-strict`)
- **Prisma**: `7.8.0` esatto (no `^`) su `prisma`, `@prisma/client`, `@prisma/adapter-pg`
- Tutte le altre dipendenze: dal `package-lock.json` via `npm ci`

## 7. Reverse proxy + HTTPS (Caddy)

L'esposizione verso l'esterno è affidata a **Caddy**: termina il TLS sulla 443
(certificato Let's Encrypt automatico) e inoltra al frontend su `localhost:3000`.

`Caddyfile`:

```
portale.tuodominio.it {
    reverse_proxy localhost:3000
}
```

- **DNS:** record A `portale.tuodominio.it` → IP pubblico del server.
- **Firewall (ingresso):** aprire **solo** TCP 80 e 443. Le porte 3000/3001/5432
  restano raggiungibili **solo da localhost**.
- Il backend è già predisposto dietro proxy (`trust proxy`, cookie `Secure`,
  Helmet): nessuna modifica al codice.

Dettagli completi (avvio Caddy come servizio, backup, alternativa IIS+ARR) in
[`DEPLOY.md`](DEPLOY.md) §7-9.
