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

Porte da rendere raggiungibili in base allo scenario HTTPS (vedi §7): **80+443**
con dominio pubblico, oppure la **porta alta** (es. 8443) in modalità LAN.
Comandi utili: `nssm restart LuisBackend`, `nssm status LuisFrontend`,
`nssm restart LuisCaddy`. Log in `backend\service-*.log`,
`frontend\service-*.log`, `caddy-*.log`.

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

Dalla root, come Administrator:

```cmd
deploy-prod.cmd
```

Fa: backup DB (opzionale) → stop servizi → git pull (stash se servono) →
npm ci → prisma generate/migrate → build BE+FE → restart servizi (o finestre se
i servizi non esistono).

## Script del repo

| File | Scopo |
|------|-------|
| `setup-prod.cmd` | Provisioning da zero (Node + dipendenze + migrate + seed + build + viste) |
| `setup-services.cmd` | Crea i servizi Windows `LuisBackend` / `LuisFrontend` / `LuisCaddy` (nssm) |
| `deploy-prod.cmd` | Aggiornamento sicuro (backup + stop servizi + pull + ci + migrate + build + restart) |
| `backend/prisma/restore-b2b-views.sql` | Ricrea le viste `b2b_*` / `vista_integra_*` (dblink Integra) |

## Versioni bloccate

- **Node**: `24.15.0` (`.nvmrc`, `engines.node`, `.npmrc engine-strict`)
- **Prisma**: `7.8.0` esatto (no `^`) su `prisma`, `@prisma/client`, `@prisma/adapter-pg`
- Tutte le altre dipendenze: dal `package-lock.json` via `npm ci`

## 7. Reverse proxy + HTTPS (Caddy)

L'esposizione avviene tramite **Caddy** (servizio `LuisCaddy` creato da
`setup-services.cmd`): termina il TLS e inoltra al frontend su `localhost:3000`.
Le porte 3000/3001/5432 restano raggiungibili **solo da localhost**.

> **Perché serve HTTPS:** il cookie di sessione è `Secure` in produzione
> ([backend/src/main.ts](backend/src/main.ts) `secure: isProd`). Su HTTP il
> browser lo scarta e **il login non aggancia** (torni sempre alla schermata di
> login anche con credenziali corrette). Va quindi usato **sempre HTTPS**.

Il frontend chiama l'API tramite il **proxy interno di Next** (`/api` → backend),
quindi è tutto **same-origin**: Caddy deve proxare solo il frontend (3000).

### Come funziona il certificato

Per un certificato **valido** (Let's Encrypt), l'emissione richiede la
validazione del dominio, che avviene **solo su**:

- **porta 80** (challenge HTTP-01), oppure
- **porta 443** (challenge TLS-ALPN-01).

Una **porta alta** (es. 8443) **non** è sufficiente per un certificato valido:
Let's Encrypt valida esclusivamente su 80/443.

### Scenari

**A) Dominio pubblico con 80/443 aperte (consigliata)**
Dominio (es. `b2b.luisbg.it`) che risolve all'IP pubblico del server, con 80 e
443 raggiungibili da internet.

```
b2b.luisbg.it {
    reverse_proxy localhost:3000
}
```
Caddy fa tutto: certificato valido, rinnovo automatico, la 80 reindirizza alla 443.
Firewall: aprire **solo** 80 e 443 in ingresso.

**B) Dominio senza 80/443 aperte → challenge DNS-01**
Il certificato viene emesso creando un record TXT via le API del DNS (nessuna
porta pubblica), e si può servire anche su porta alta:

```
b2b.luisbg.it:8443 {
    reverse_proxy localhost:3000
    tls {
        dns <provider> <token_api>
    }
}
```
Richiede un `caddy.exe` **compilato con il plugin DNS** del provider (Cloudflare,
Aruba, ecc.) tramite `xcaddy` — il caddy standard non include i plugin DNS.
È l'unica via per un certificato **valido** dietro tunnel/senza porte pubbliche.

**C) LAN, HTTPS self-signed su porta alta (nessuna porta pubblica)**
È la modalità che `setup-services.cmd` propone premendo invio al dominio:
chiede la porta (default **8443**) e genera:

```
:8443 {
    tls internal
    reverse_proxy localhost:3000
}
```
Accesso: `https://IP-DEL-SERVER:8443`. Funziona subito senza 80/443, ma il
certificato è **self-signed** → il browser mostra l'avviso "non sicuro".
Ok per uso interno, **non** ideale per i clienti B2B.

### In sintesi

| Vuoi… | Serve |
|-------|-------|
| Lucchetto verde, dominio pubblico | **80 + 443 aperte** (scenario A) |
| Lucchetto verde, senza aprire porte | **DNS-01** + caddy con plugin DNS (scenario B) |
| Subito, solo LAN, avviso accettabile | **porta alta + `tls internal`** (scenario C) |

Dettagli aggiuntivi (avvio Caddy come servizio, backup, alternativa IIS+ARR) in
[`DEPLOY.md`](DEPLOY.md) §7-9.
