# AGENTS.md — Portale B2B Luis

Regole complete caricate da `opencode.json`: `CLAUDE.md` (progetto, vince in conflitto),
`CLAUDE-GENERICO.md` (metodo), `SKILLS.md` (tecniche). Qui: comandi e barra di qualità.

## Comandi
```bash
# Backend (porta 3001)
cd backend && npm run start:dev        # dev server
npx tsc --noEmit -p tsconfig.json      # type-check
npm run db:migrate                     # prisma migrate deploy
npm run db:seed                        # admin + clienti test

# Frontend (porta 3000)
cd frontend && npm run dev             # dev server (HTTP)
npx tsc --noEmit                       # type-check
npx eslint components/ app/            # lint

# Avvio completo: avvia.bat | avvia-http.bat | avvia-https.bat (radice)
```
Credenziali test: admin `admin@luissrl.it`/`LuisAdmin2026!` · cliente `uvolpato+cliente1@gmail.com`/`Cliente2026!` (idDB 1)

## Sync Manager (dinamico via DB)
Le schedulazioni sono in `sync_config` (avviate da `SyncManagerService.onModuleInit`).
Tipi: articoli (15min), listini (15min), giacenze (10min), ordini (disabilitato default).
**Admin UI**: tab "Sync" nel pannello admin → attiva/disattiva, modifica cron, esegui manuale, log storici.

- Nuovo sync richiede: aggiungere riga in `sync_config` + case in `SyncManagerService.runSync()`.
- `cron-parser` installato con `--legacy-peer-deps`.
- `syncOrdini()` (FDW→integra_ordini) NON ha cron automatico di default (attivo=false). Va attivato dalla UI o via trigger manuale. Dopo sync ordini, `SyncManagerService` propaga in `ordini_clienti` per tutti i clienti con `codice_cliente` valorizzato.
- All'import di un cliente (`importaClienti()`), gli ordini vengono importati in `ordini_clienti` da `integra_ordini` (se popolata).

## Barra di qualità (non negoziabile)
- **Type-check pulito** su backend e frontend prima di dichiarare finito.
- **Verifica reale**: API con sessione vera (login+chiamata), UI nel browser con screenshot — anche a viewport mobile 375px. Un dev server, non `next start` (serve la build vecchia).
- **Fedeltà al prototipo** (`0X-*.html`): è il riferimento visivo 1:1; scostamenti solo su richiesta.
- **Frontend**: zero sforo orizzontale mobile; immagini via `PositionedImage` (unico componente); stati loading/vuoto/errore sempre gestiti; `r.ok` prima di `r.json()`; target CWV: LCP ≤2,5s, INP ≤200ms, CLS <0,1.
- **Backend**: DTO con decoratori (whitelist scarta i campi nudi); endpoint cliente filtrati per visibilità, mai campi admin; query parametrizzate; `updated_at` valorizzato negli INSERT raw.
- **Database**: mai operazioni distruttive senza consenso; migration additive; dati creati a mano = script idempotente versionato.
- **Processi**: mai `taskkill` globale su node (uccide i server degli altri agenti) — solo per PID/porta.
- **Commit**: atomici, conventional commits in italiano, diff letto per intero, niente file temp/cookie/log.
