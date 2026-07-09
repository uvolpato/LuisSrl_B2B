# Portale B2B Luis — Guida al deployment (per il sistemista)

Documento di consegna per l'installazione in produzione su **server Windows** con
**PostgreSQL già presente**, esposizione su **internet con dominio** e **HTTPS via
reverse proxy sul server**.

---

## 1. Architettura

Tre componenti sullo stesso server:

```
Internet ──HTTPS(443)──► Reverse proxy (Caddy)
                              │
                              ▼
                        Frontend Next.js  (localhost:3000)
                              │  proxa /api/* e /ws
                              ▼
                        Backend NestJS    (localhost:3001)
                              │
                              ▼
                        PostgreSQL        (localhost:5432)
```

- Il browser parla **solo** con il frontend (porta 443 via proxy). Il frontend
  inoltra internamente le chiamate `/api/*` al backend. Cookie di sessione e CSRF
  restano quindi *same-origin*.
- **Backend, frontend e Postgres NON vanno esposti su internet.** Solo le porte
  **80 e 443** sono aperte verso l'esterno.

---

## 2. Prerequisiti sul server

| Software | Versione | Note |
|----------|----------|------|
| Windows Server | 2019/2022 | — |
| Node.js | LTS 20 o 22 | `node -v` per verificare |
| PostgreSQL | 14+ | già installato |
| Caddy | 2.x | reverse proxy + TLS automatico ([caddyserver.com](https://caddyserver.com/download)) |
| Git *(opzionale)* | — | per il clone; in alternativa copia della cartella |

Sono necessari inoltre:
- Un **dominio** con record DNS **A** verso l'IP pubblico del server.
- Le porte **80** e **443** aperte in ingresso sul firewall (necessarie anche per
  l'emissione automatica del certificato Let's Encrypt).

---

## 3. Database

Nel PostgreSQL esistente, creare database e utente dedicato (con `psql` o pgAdmin):

```sql
CREATE DATABASE "LuisSrlDb";
CREATE USER luis_app WITH PASSWORD '<PASSWORD-DB-FORTE>';
GRANT ALL PRIVILEGES ON DATABASE "LuisSrlDb" TO luis_app;
-- Su PostgreSQL 15+ concedere anche i privilegi sullo schema public:
\c "LuisSrlDb"
GRANT ALL ON SCHEMA public TO luis_app;
```

> Le tabelle vengono create automaticamente dalle migration (passo 4). Non serve
> creare nulla a mano.

---

## 4. Backend (NestJS — porta 3001)

```powershell
cd backend
npm ci
npx prisma generate
```

Creare il file **`backend\.env`** (copiare da `.env.example`) e compilare:

```ini
# Connessione DB (usare l'utente dedicato del passo 3)
DATABASE_URL=postgresql://luis_app:<PASSWORD-DB-FORTE>@localhost:5432/LuisSrlDb?schema=public&statement_timeout=60000

PORT=3001
NODE_ENV=production

# Dominio pubblico del portale
FRONTEND_ORIGIN=https://portale.tuodominio.it

# Segreti — generare valori casuali lunghi e univoci.
# Esempio (PowerShell):  -join ((48..57)+(97..102) | Get-Random -Count 64 | % {[char]$_})
SESSION_SECRET=<64+ caratteri casuali>
CSRF_SECRET=<altri 64+ caratteri casuali>

# Primo amministratore (creato dal seed)
ADMIN_EMAIL=admin@luissrl.it
ADMIN_PASSWORD=<PASSWORD-ADMIN-VERA>
ADMIN_NOME=Amministratore

# SMTP per invio email (reset/password provvisorie)
SMTP_HOST=<host-smtp>
SMTP_PORT=587
SMTP_USER=<utente-smtp>
SMTP_PASS=<password-smtp>
SMTP_FROM="Luis S.r.l. <noreply@luissrl.it>"

# Cartella immagini caricate + descrizioni. IMPORTANTE per i backup (passo 9).
ASSETS_BASE_DIR=../frontend/public/images
ASSETS_PUBLIC_URL=/images

# Generazione immagini AI (opzionale) — chiave da Google AI Studio
GEMINI_API_KEY=
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

Applicare migration, seed e build:

```powershell
npm run db:migrate     # crea/aggiorna lo schema (prisma migrate deploy)
npm run db:seed        # crea admin + gruppi permessi + clienti di test
npm run build          # compila in dist/
```

> `.env` **non** deve essere versionato né condiviso in chiaro (già in `.gitignore`).

---

## 5. Frontend (Next.js — porta 3000)

```powershell
cd ..\frontend
npm ci
npm run build
```

Creare **`frontend\.env.production`**:

```ini
BACKEND_INTERNAL_URL=http://localhost:3001
```

---

## 6. Avvio e persistenza dei processi (PM2)

I due processi Node devono restare attivi e ripartire al riavvio del server.
**Non** vanno lanciati a mano da un terminale (si chiuderebbero al logoff).

```powershell
npm install -g pm2 pm2-windows-startup

# dalle rispettive cartelle:
pm2 start "node dist/main" --name luis-backend  --cwd "C:\percorso\backend"
pm2 start "npm run start"  --name luis-frontend --cwd "C:\percorso\frontend"

pm2 save                 # salva la lista processi
pm2-startup install      # ri-avvio automatico al boot del server
```

Comandi utili: `pm2 list`, `pm2 logs luis-backend`, `pm2 restart luis-frontend`.

---

## 7. Reverse proxy + HTTPS (Caddy)

Caddy termina il TLS sulla 443 e inoltra al frontend. Il certificato Let's Encrypt
è **automatico** (richiede porte 80/443 aperte e DNS già propagato).

File **`Caddyfile`**:

```
portale.tuodominio.it {
    reverse_proxy localhost:3000
}
```

Avvio come servizio Windows:

```powershell
caddy start                     # avvio immediato
# per installarlo come servizio permanente vedi: https://caddyserver.com/docs/running#windows
```

> **Alternativa Microsoft:** IIS + modulo *Application Request Routing (ARR)* +
> *URL Rewrite*, con certificato emesso da *win-acme*. Più passaggi manuali; Caddy
> è consigliato per semplicità.

Il backend è già predisposto per funzionare dietro proxy (`trust proxy` attivo,
cookie `Secure` + `SameSite=Lax`, header di sicurezza via Helmet): **non serve
alcuna modifica al codice.**

---

## 8. DNS e firewall

- **DNS:** record **A** `portale.tuodominio.it` → IP pubblico del server.
- **Firewall Windows (ingresso):** consentire **solo** TCP **80** e **443**.
- Le porte **3000, 3001, 5432** devono restare **non raggiungibili dall'esterno**
  (solo localhost).

---

## 9. Backup

Due elementi da includere nel backup schedulato:

1. **Database** — dump periodico:
   ```powershell
   pg_dump -U luis_app -d LuisSrlDb -F c -f "C:\backup\luis_%date%.dump"
   ```
2. **Immagini caricate** — l'intera cartella indicata da `ASSETS_BASE_DIR`
   (`frontend\public\images`): contiene le foto prodotto caricate dagli operatori,
   **non** ricreabili dal database.

---

## 10. Checklist go-live

- [ ] Database e utente `luis_app` creati; migration applicate senza errori
- [ ] `backend\.env`: credenziali DB dedicate, `NODE_ENV=production`,
      `SESSION_SECRET`/`CSRF_SECRET` casuali, `ADMIN_PASSWORD` reale, `FRONTEND_ORIGIN` = dominio
- [ ] SMTP configurato e testato (invio email funzionante)
- [ ] `frontend\.env.production` con `BACKEND_INTERNAL_URL`
- [ ] Build backend (`dist/`) e frontend (`.next/`) completate
- [ ] PM2: entrambi i processi `online`, `pm2 save` + startup installato
- [ ] Caddy attivo, certificato TLS emesso (verifica `https://portale.tuodominio.it`)
- [ ] Firewall: solo 80/443 aperte
- [ ] Login amministratore funzionante sul dominio pubblico
- [ ] Backup DB + cartella immagini schedulati e verificati
- [ ] `.env` non versionati e non condivisi in chiaro

---

## 11. Aggiornamenti futuri

Per rilasciare una nuova versione:

```powershell
git pull                        # o copia dei nuovi file
cd backend  && npm ci && npx prisma generate && npm run db:migrate && npm run build
cd ..\frontend && npm ci && npm run build
pm2 restart luis-backend luis-frontend
```

---

## 12. Diagnostica rapida

| Sintomo | Causa probabile | Verifica |
|---------|-----------------|----------|
| Login non funziona (torna alla pagina di accesso) | Backend spento o cookie non `Secure` | `pm2 list`; accesso deve essere **https** |
| Sito irraggiungibile | Caddy fermo / DNS non propagato / porte chiuse | `caddy` in esecuzione, `nslookup` del dominio, firewall |
| 500 sulle API | Backend giù o DB non raggiungibile | `pm2 logs luis-backend`, connessione a Postgres |
| Certificato TLS non emesso | Porte 80/443 chiuse o DNS non ancora attivo | Aprire firewall, attendere propagazione DNS, riavviare Caddy |
| Immagini non visibili | Cartella `ASSETS_BASE_DIR` mancante o permessi | Verificare esistenza e permessi di scrittura |

---

## 13. Riferimenti nel repository

- `backend/.env.example` — modello completo delle variabili d'ambiente
- `CLAUDE.md` — architettura e requisiti di sicurezza del progetto
- `SETUP.md` / `DEVELOPER_NOTES.md` — note per l'ambiente di sviluppo

**Contatto sviluppo:** Ugo Volpato — AI Consultant.
