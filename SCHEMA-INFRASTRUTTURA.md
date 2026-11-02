# Schema infrastruttura — Portale B2B + Sito vetrina

Documento di consegna per il sistemista. Fotografia di **cosa gira sul server**, come è
esposto e dove stanno i file. I comandi passo-passo restano in
[`SETUP-PRODUZIONE.md`](SETUP-PRODUZIONE.md); qui c'è solo la mappa.

Verificato il 02/11/2026: `https://shop.luisbg.it` e `https://www.luisbg.it` rispondono
200 dietro Caddy; `/api/health` restituisce `{"status":"ok","db":"ok"}`.

---

## 1. Schema logico

```
                            INTERNET
                                │
                     TCP 80 / 443 (solo queste)
                                │
                    ┌───────────▼───────────┐
                    │   Caddy (LuisCaddy)   │  TLS + reverse proxy
                    │   Caddyfile           │  serve anche /images dal disco
                    └───┬───────────────┬───┘
        shop.luisbg.it  │               │  www.luisbg.it
                        ▼               ▼
              ┌──────────────┐   ┌──────────────────┐
              │ LuisFrontend │   │  LuisVetrina     │
              │ Next :3000   │   │  Next 127.0.0.1  │
              │ (B2B)        │   │  :3012           │
              └──────┬───────┘   └────────┬─────────┘
                     │ /api/*, /ws        │ solo server-side
                     └────────┬───────────┘  (/api/catalogo/pubblico,
                              ▼                 /api/leads, /api/img)
                    ┌──────────────────┐
                    │ LuisBackend      │
                    │ NestJS :3001     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐        ┌─────────────────────┐
                    │ PostgreSQL :5432 │───────►│ Integra (gestionale)│
                    │ DB LuisSrlDb     │  FDW   │ sola lettura        │
                    └──────────────────┘        └─────────────────────┘
                             ▲
        file su disco:       │
        frontend/public/images (foto caricate, cache miniature .cache)
```

Punti chiave:

- Il browser parla **solo** con Caddy (443). Non esistono chiamate cross-origin:
  Next inoltra `/api/*` e `/ws` al backend, quindi cookie di sessione e CSRF sono
  same-origin.
- B2B e vetrina sono **due processi Next separati** ma condividono **un solo backend**
  e **un solo database**.
- La vetrina non espone l'API del portale: chiama il backend solo lato server e il
  browser vede al massimo `/api/img` (proxy configurato in
  `frontend-vetrina/next.config.mjs`). Niente login, carrello o prezzi.
- Le immagini caricate sono servite da Caddy (`handle_path /images/*`), non da Next:
  `next start` servirebbe solo i file presenti al momento del build.

---

## 2. Servizi Windows (NSSM, avvio automatico al boot)

| Servizio | Processo | Bind | Log |
|---|---|---|---|
| `LuisBackend` | `node dist\src\main.js` in `<ROOT>\backend` | `0.0.0.0:3001` (raggiungibile solo in LAN/localhost per firewall) | `backend\service-out.log`, `backend\service-err.log` |
| `LuisFrontend` | `next start` in `<ROOT>\frontend` | `0.0.0.0:3000` | `frontend\service-*.log` |
| `LuisVetrina` | `next start -p 3012 -H 127.0.0.1` in `<ROOT>\frontend-vetrina` | `127.0.0.1:3012` | `frontend-vetrina\service-*.log` |
| `LuisCaddy` | `caddy run --config Caddyfile` in `<ROOT>` | `0.0.0.0:80`, `0.0.0.0:443` | `caddy-out.log`, `caddy-err.log` |

`<ROOT>` = `C:\Progetti\Luis Srl - B2B`.

Comandi: `nssm status|start|stop|restart <servizio>`. Non usare PM2: la sezione PM2 di
`DEPLOY.md` è superata da `setup-services.cmd`.

---

## 3. Stack e versioni

| Livello | Tecnologia | Versione |
|---|---|---|
| OS | Windows Server | 2019/2022 (da confermare sul server) |
| Runtime | Node.js | **24.15.0** (bloccata: `engines` + `.npmrc engine-strict`) |
| Package manager | npm | 11+ — sempre `npm ci`, mai `npm install` |
| Backend | NestJS | 11 |
| ORM | Prisma + `@prisma/adapter-pg` | **7.8.0 esatto** |
| Database | PostgreSQL | 16 (14+ minimo) |
| Sessioni | `express-session` + `connect-pg-simple` (tabella `session`) | — |
| WebSocket | Socket.IO su `/ws` (stesso processo backend) | 4.x |
| Frontend B2B | Next.js / React | 16.2.9 / 19.2.4 |
| Sito vetrina | Next.js / React / next-intl | 16.2.9 / 19.2.4 / 4.13.0 |
| Immagini | `sharp` (miniature WebP on-demand) | 0.35.3 |
| Reverse proxy | Caddy | 2.x |
| Gestione servizi | NSSM | 2.24 |
| Ricerca semantica | embedding in `double precision[]` + similarità in Node | **niente pgvector** |
| Cache/job queue | nessuna: cron in-process (`@nestjs/schedule` + `cron-parser`) | **niente Redis** |

---

## 4. Rete e firewall

| Porta | Chi ascolta | Esposizione |
|---|---|---|
| 80, 443 | Caddy | **Internet** (ingresso consentito solo a queste) |
| 3000 | Next B2B | solo localhost / LAN |
| 3001 | NestJS API | solo localhost / LAN |
| 3012 | Next vetrina | solo 127.0.0.1 |
| 5432 | PostgreSQL | solo localhost (o rete interna per Integra) |
| 3002 | vecchio accesso intranet vetrina | regola firewall `Luis Vetrina 3002`, ormai superflua |

DNS: `shop.luisbg.it` → IP server (B2B), `www.luisbg.it` → IP server (vetrina).
Il dominio nudo `luisbg.it` non risponde: se serve, va aggiunto un redirect in Caddy.

---

## 5. File di configurazione

| File | Contenuto |
|---|---|
| `<ROOT>\backend\.env` | `DATABASE_URL`, `PORT`, `NODE_ENV`, `FRONTEND_ORIGIN`, `SESSION_SECRET`, `CSRF_SECRET`, admin seed, SMTP, `APP_DOMAIN`, `ASSETS_BASE_DIR`, `EXPORT_ORDINI_DIR`, chiavi Gemini/Brevo, secret webhook lead/cataloghi |
| `<ROOT>\frontend\.env.production` (o `.env`) | `BACKEND_INTERNAL_URL=http://localhost:3001` |
| `<ROOT>\frontend-vetrina` (env del servizio) | `NODE_ENV=production`, `BACKEND_INTERNAL_URL=http://localhost:3001` |
| `<ROOT>\Caddyfile` | sito B2B, `/images/*` da disco, pagina di cortesia, `import Caddyfile.vetrina` |
| `<ROOT>\Caddyfile.vetrina` | sito vetrina (`www.luisbg.it`) + cortesia |
| `<ROOT>\maintenance\` | `maintenance.flag`, `index.html` (B2B), `vetrina.html` (vetrina) |
| `<ROOT>\nssm.exe`, `caddy.exe` | binari non versionati (`.gitignore`) |

I `.env` contengono segreti: **mai** nel repo, nei log o nelle email. Backup separato e
cifrato. `Caddyfile*` e binari sono esclusi da git, quindi non arrivano con `git pull`:
vanno backuppati a parte.

Variabili che cambiano il comportamento in modo non ovvio:

- `NODE_ENV=production` → cookie `Secure` + HSTS. **Su HTTP il login non funziona**: serve HTTPS.
- `FRONTEND_ORIGIN` → CORS con match esatto dell'origine (oltre a 192.168.x/10.x:3000 in LAN).
- `PUBLIC_ARTICLE_SHARING` → abilita/disabilita la scheda articolo pubblica `/p/<linea>`.
- `EXPORT_ORDINI_DIR` → cartella degli `.xlsx` ordini letta da Integra.
- `ASSETS_BASE_DIR` → `../frontend/public/images` (backup obbligatorio).

---

## 6. Dati e flussi

**Database `LuisSrlDb`** — unico DB del portale: catalogo, clienti, ordini, carrelli,
sessioni, log eventi, lead, coupon, configurazione (`sync_config`, `site_config`).

**Integra (gestionale)** — letto in sola lettura via `postgres_fdw`: schema locale
`integra` con le foreign table, viste `b2b_*`, tabelle specchio `integra_*`.
Due varianti di installazione:

- `backend/prisma/setup-fdw.sql` → Integra su `192.168.1.41:5432`;
- `backend/prisma/setup-fdw-prod.sql` → Integra sullo **stesso** PostgreSQL (`localhost`).

Da confermare quale sia attiva in produzione. In entrambi i casi il DB Integra non va
mai scritto dal portale.

**Job schedulati** (dentro `LuisBackend`, nessun scheduler esterno):

| Job | Frequenza | Configurazione |
|---|---|---|
| Sync articoli / listini / giacenze / ordini | 10–15 min | tabella `sync_config` (admin → tab Sync) |
| Export ordini → `.xlsx` per Integra | 10 min | `EXPORT_ORDINI_CRON` |
| Aggancio lead → clienti | 15 min | `LEAD_AGGANCIO_CRON` |
| Promemoria lead fermi | 08:00 | `LEAD_PROMEMORIA_CRON` |
| Anonimizzazione lead (GDPR) | 03:30 | `LEAD_RETENTION_CRON` |
| Ricalcolo dashboard / eventi | 03:00 | codice |

**Chiamate uscenti dal server:** SMTP aziendale (inviti, reset, notifiche),
API Brevo (mail marketing cataloghi), API Google Gemini (testo, immagini, embedding),
DB Integra, (`DATI_IMPRESA_API_URL` se attiva). LM Studio sul mini PC è previsto ma
**non attivo** di default (`EMBEDDINGS_PROVIDER=gemini`).

**File su disco non ricreabili dal DB:** `frontend\public\images` (foto prodotto
caricate, descrizioni `.md`, cache `.cache\*.webp` rigenerabile).

---

## 7. Backup

| Cosa | Come | Dove |
|---|---|---|
| DB | `pg_dump -U postgres -d LuisSrlDb -F c` | `C:\backup\LuisSrlDb_<data>.dump` (default di `deploy-prod.cmd`) |
| Immagini | copia cartella | `frontend\public\images` |
| Config | copia file | `backend\.env`, `frontend\.env*`, `Caddyfile`, `Caddyfile.vetrina` |
| Codice | già su git | repo `uvolpato/LuisSrl_B2B` |

`node_modules`, `dist`, `.next` e i log non si backuppano: si ricreano.

---

## 8. Operatività quotidiana

- **Stato**: `nssm status LuisBackend` (e gli altri tre), `https://<dominio>/api/health`.
- **Aggiornamento**: `deploy-prod.cmd` come Administrator. Attiva la pagina di cortesia,
  ferma i servizi, `git pull`, `npm ci`, migrate, build, riavvia, verifica `/api/health`
  e rimuove il flag. Se qualcosa fallisce la cortesia resta attiva.
- **Riavvio singolo**: `nssm restart LuisBackend` (pochi secondi di 502 sulle API).
- **Log**: `backend\service-err.log`, `frontend\service-err.log`,
  `frontend-vetrina\service-err.log`, `caddy-err.log`.
- **Diagnostica rapida**: login che non aggancia → backend giù o accesso in HTTP;
  500 API → `service-err.log` + connessione Postgres; immagini 404 → regola
  `/images/*` del Caddyfile o permessi cartella.

---

## 9. Da confermare con il sistemista

1. Hostname/IP del server, versione Windows, account di servizio dei quattro servizi.
2. Posizione reale di Integra: stesso server o `192.168.1.41`.
3. Modalità TLS di Caddy (Let's Encrypt su 80/443, DNS-01, self-signed).
4. Backup: schedulazione effettiva, retention, copia fuori sede, test di restore.
5. Accesso amministrativo remoto (RDP/Tailscale/Cloudflare Tunnel) e relative regole.
6. Regola firewall 3002 ancora presente? Con la vetrina su 443 non serve.
7. Dominio nudo `luisbg.it`: redirect da aggiungere o lasciare inattivo.

---

## 10. Discrepanze tra documenti e realtà

| Documento | Dice | Realtà |
|---|---|---|
| `DEPLOY.md` §6 | processi con PM2 | servizi Windows NSSM |
| `CLAUDE.md` | PostgreSQL + Redis, pgvector | niente Redis, embedding in array Postgres |
| `sync-architettura.md` | dblink per le viste | `restore-b2b-views.sql` usa `postgres_fdw` |
| `SETUP-PRODUZIONE.md` | vetrina solo intranet :3002 | vetrina pubblica su `https://www.luisbg.it` |

Fa fede questo documento per l'infrastruttura; `SETUP-PRODUZIONE.md` per i comandi.
