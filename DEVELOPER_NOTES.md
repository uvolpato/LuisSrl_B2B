# Developer Notes – Portale B2B Luis

Suggerimenti e gotcha trovati durante lo sviluppo. Leggi prima di iniziare.

## 🚨 Avviamento: Server in background NON rimangono vivi

**PROBLEMA:** Se lanci `npm run dev` e `npm run start:dev` da un unico Terminal (o in background con PowerShell), i processi muoiono quando chiudi il Terminal o dopo pochi minuti.

**SOLUZIONE:** Usa **due Terminal separati** (permanenti, non background):
```bash
# Terminal 1 — aperto e visibile
cd backend && npm run start:dev

# Terminal 2 — aperto e visibile  
cd frontend && npm run dev
```

Lasciali in esecuzione mentre sviluppi. Se uno muore, riavvialo manualmente.

---

## ⚠️ Package.json: linter può revertire le modifiche

**PROBLEMA:** Se modifichi `package.json` (es. il `dev` script), un linter o pre-commit hook potrebbe ripristinare i valori originali.

**SOLUZIONE:**
1. Verifica che il file sia committato DOPO la modifica
2. Se vedi che il file è stato rivertito, rifai l'edit e committa immediatamente
3. Se continua a revertire, controlla `.prettierrc` o `eslint.config.js` (potrebbe avere regole su JSON)

**Caso specifico:** Il script `dev` deve essere HTTP puro:
```json
"dev": "next dev -H 0.0.0.0"
```
Non aggiungere flag HTTPS qui (c'è `dev:https` per quello).

---

## 🔌 Backend porta 3001 già occupata

**PROBLEMA:** Se riavvii il backend troppo velocemente, vecchi processi Node rimangono attaccati alla porta 3001. Errore: `EADDRINUSE: address already in use 0.0.0.0:3001`

**SOLUZIONE:**
```powershell
# Uccidi TUTTI i processi Node
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Attendi 2-3 secondi
Start-Sleep 3

# Riavvia il backend
npm run start:dev
```

Oppure usa il Task Manager (Windows) e uccidi i processi `node.exe` manualmente.

---

## 🔒 HTTPS self-signed: Chrome blocca su IP

**PROBLEMA:** Quando accedi da IP (`https://192.168.0.164:3000`), Chrome mostra:
```
net::ERR_CERT_AUTHORITY_INVALID
```
E il certificato self-signed (anche con SAN per l'IP) non è accettato.

**SOLUZIONE ADOTTATA:** Usa **HTTP + flag Chrome** anziché HTTPS:
1. Dev script in HTTP: `npm run dev` → `http://localhost:3000`
2. Su un altro PC sulla LAN, abilita il flag Chrome:
   - Apri `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
   - Incolla: `http://192.168.0.164:3000`
   - Setta a **Enabled** → **Relaunch**
3. Adesso il dettato vocale (Web Speech API) funziona in HTTP (è un secure context per questa origine)

**ALTERNATIVA:** Se vuoi vero HTTPS su IP, segui la sezione 15.3 (mkcert) nelle specifiche. Richiede:
```bash
winget install FiloSottile.mkcert
mkcert -install
mkcert -key-file luis-dev-key.pem -cert-file luis-dev-cert.pem localhost 127.0.0.1 192.168.0.164
npm run dev:https
```
Poi importa il root CA di mkcert sul PC-test.

---

## 📡 Firewall: porta 3000 bloccata dalla LAN

**PROBLEMA:** Dall'altro PC sulla LAN non raggiungi `http://192.168.0.164:3000` (timeout).

**SOLUZIONE:** Apri la porta 3000 in ingresso (Windows Defender Firewall):
```powershell
# Admin (tasto destro PowerShell → Esegui come amministratore)
New-NetFirewallRule -DisplayName "Luis dev 3000" `
  -Direction Inbound -LocalPort 3000 -Protocol TCP `
  -Action Allow -Profile Private
```

---

## 🔐 Credenziali di test

Cambiale subito prima di mettere in produzione:

```
Admin:
  Email: admin@luissrl.it
  Password: LuisAdmin2026!

Cliente 1:
  Email: cliente1@fiorista.it
  Password: Cliente2026!

Cliente 2:
  Email: verde.giardini@example.it
  Password: Cliente2026!
```

Usa il pannello admin (/admin) per cambiare le password.

---

## 📁 File ignorati che potrebbero mancare

Questi file sono nel `.gitignore` (non versionati). Se non li trovi, generali:

- `backend/.env` — Copia da `backend/.env.example`
- `frontend/.env.local` — Generalmente vuoto, crea se necessario
- `frontend/luis-dev-key.pem` e `frontend/luis-dev-cert.pem` — Per HTTPS dev (opzionale)

---

## 🧹 Pulizia se le cose si rompono

Se tutto è bloccato:

```powershell
# 1. Uccidi tutti i Node
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# 2. Pulisci le cache Next
Remove-Item -Recurse -Force "frontend/.next"

# 3. Reinstalla dipendenze se serve
cd backend && npm install
cd ../frontend && npm install

# 4. Riavvia da zero (due Terminal)
# Terminal 1: cd backend && npm run start:dev
# Terminal 2: cd frontend && npm run dev
```

---

## 📝 Comandi utili

```bash
# Backend
npm run prisma:generate    # Rigenera Prisma Client
npm run prisma:migrate     # Applica migration
npm run seed              # Popola dati di test
npm run start:dev         # Avvia dev server

# Frontend
npm run dev               # HTTP (default)
npm run dev:https         # HTTPS (self-signed, optionale)
npm run build             # Build di produzione
npm run lint              # Controlla errori

# Entrambi
npm run type-check        # TypeScript check (backend + frontend)
```

---

## 📚 Quando leggere cosa

| Cosa fare | Leggi |
|-----------|-------|
| **Primo avvio** | CLAUDE.md (Setup iniziale) + SETUP.md |
| **Problemi di avviamento** | Questa pagina (DEVELOPER_NOTES.md) |
| **Specifiche funzionali** | specifiche-b2b-luis.md |
| **Design system** | brand-spec.md |
| **Dati Integra** | richiesta-dati-integra.md |

---

## 🐛 Reporte di bug

Se trovi un bug:
1. Descrivi il passo che lo causa
2. Controlla il log (`npm run start:dev` / `npm run dev` outputs)
3. Se è un errore di rete/CORS, apri DevTools (F12) → Network tab
4. Se è un errore DB, controlla che PostgreSQL sia in esecuzione
5. Aggiungi una nota a questo file per i prossimi

---

## 🔗 Condivisione scheda articolo (`/p/<codiceLinea>`)

Il pulsante **Condividi** sulla scheda cliente (`.gallery-share`) genera un link
pubblico di anteprima: chi non è loggato vede descrizioni + varianti ma **senza
prezzi, disponibilità e azioni**; un cliente già loggato viene rimandato alla
scheda completa.

- **Endpoint pubblico**: `GET /api/catalogo/pubblico/:codiceLinea`
  (`catalogo-public.controller.ts`, senza guard). Ritorna sempre 404 se il
  flag è spento. Non espone mai `prezzo`, `giacenza`, `sconto` raccolte,
  `promptAi`, `wizardStepTesti` né i metadati AI delle immagini.
- **Blocco in un colpo**: `PUBLIC_ARTICLE_SHARING=false` in `backend/.env`
  (default `true`). Endpoint → 404, pagina `/p/...` mostra "Anteprima non
  disponibile" + link Accedi. Il link resta così solo per chi può loggarsi.
- **Rotta frontend**: `frontend/app/p/[codiceLinea]/page.tsx` + `app/p/p.css`
  (riusa le classi di `catalogo.css`, caricato globalmente). Non mostra
  lightbox, correlati, quantità né carrello.
- **Web Share**: `navigator.share` se disponibile (secure context), altrimenti
  copia link negli appunti con feedback "Link copiato".
- **Modale condivisione stile Amazon** (`ShareModal.tsx`): click su Condividi apre
  un modale con 6 opzioni — Email (mailto), Facebook, X/Twitter, LinkedIn,
  WhatsApp, Copia link. Ogni opzione usa l'URL diretto del servizio
  (es. `facebook.com/sharer/sharer.php?u=...`). Su mobile griglia 2 colonne,
  ESC/click fuori chiude. La copia link usa `navigator.clipboard.writeText`
  con feedback visivo "Link copiato".
- Test: da anonimo aprire `http://localhost:3000/p/<codiceLinea>` → anteprima
  senza prezzi; da cliente loggato → redirect alla scheda completa.

---

## 🐛 Bug segnalati — stato risolto

### Carrello: duplicazione righe invece di incrementare quantità ✅ RISOLTO
**Sintomo**: Aggiungendo 2 pezzi dello stesso articolo (variante) al carrello,
venivano create **due righe separate** invece di una sola con quantità sommata.

**Fix verificato**: `CarrelloService.addItem()` usa `upsert` sulla chiave unica
`carrelloId_varianteCodice` (`@@unique([carrelloId, varianteCodice])` nel modello
`CartItem`) con `quantita: { increment: qty }` (carrello.service.ts:99-103).

### Carrello: rimozione non segnala quanti articoli rimossi ✅ RISOLTO
**Sintomo**: La risposta non indicava quanti pezzi venivano tolti.

**Fix**: `CarrelloService.removeItem()` elimina l'intera riga e restituisce
`{ removed: item.quantita }` (carrello.service.ts:131). La UI rimuove la riga dal
carrello (la riga sparisce, quindi il feedback è visivo). Nessun toast system: si
è deciso di non introdurne uno solo per questo.

### Catalogo: disponibilità articolo non considera tutte le varianti ✅ RISOLTO
**Sintomo**: La card mostrava sempre "Disponibile" anche se tutte le varianti
erano esaurite.

**Fix**:
- Backend: `getDisponibilitaArticoli(artIds)` aggrega `giacenza` di tutte le
  varianti attive (`stato != 'NASCOSTO'`): `esaurito` se nessuna in giacenza,
  `scorte_limitate` se almeno una sotto soglia (`STOCK_LOW_THRESHOLD`, default 10),
  altrimenti `disponibile`. Esposto come `disponibilita` in `mapArticoloCard` per
  catalogo, risultati AI e ricerca esatta.
- Frontend: card `.product-stock` usa `stock-ok`/`stock-low`/`stock-out` in base
  a `a.disponibilita` (classi CSS già esistenti in catalogo.css).

### Ricerca: match esatto codici/famiglie ✅ RISOLTO
**Obiettivo raggiunto**:
1. **AI search** (`searchSemantica`):
   - Codice articolo (`LU3161`) → lookup diretto + arricchimento prezzo (provider `exact-code`)
   - "linea/famiglia ROGERS" → articoli della famiglia (provider `exact-family`)
   - Prima del rewrite/embedding Gemini.
2. **Ricerca normale**: `getCatalogoPaginato` — il match esatto codice viene
   portato in testa ai risultati (`prioritizeExactCode`).
3. **Placeholder** aggiornato: "Cerca per nome, codice (LU3161), linea (ROGERS)…".

Nota: la funzione `enrichWithPrezzi` mancava (chiamata da `searchSemantica` e
rompeva il type-check): aggiunta come helper che mappa le card con prezzo minimo
+ disponibilità.

### Articolo: embedding automatico su aggiunta/modifica varianti ✅ RISOLTO
**Decisione**: descrizione AI **resta manuale** (via wizard); l'**embedding è
automatico** quando cambiano le varianti.

**Stato finale**:
- `buildEmbeddingBlob` ora include le **varianti attive** (descrizione + dimensioni
  leggibili es. "Ø30 cm H40 cm") → l'hash (`fonte_hash`) cambia quando cambiano.
- `reembedArticolo` carica le varianti attive (`stato != 'NASCOSTO'`).
- `importaVarianti` richiama `reembedArticolo` (fire-and-forget) per tutti gli
  articoli coinvolti: idempotente, salta i non configurati/attivi e i blob invariati.
- `updateArticolo` (riga ~1419) già richiama `reembedArticolo` a ogni salvataggio:
  ora attivando/disattivando una variante l'embedding si aggiorna.
- Limite noto: le **immagini** non entrano nel blob (nessun re-embed al cambio
  immagini) — accettato per ora.

## ⏳ Aperti — in attesa di chiarimento

### Multiplo d'ordine da Integra (posizione individuata, DA CONFERMARE dai gestori DB)
Secondo indicazione dei gestori, il multiplo di vendita sta in **`prosoggetti.psg_liberon1`**
(es. = 6 per LU3210 / fornitore 00002). Chiave: `azi_cdazi='001'` + `psg_proid` + `psg_clatipo='F'`
+ `psg_clacod`. Da chiarire: quale riga F scegliere se ce ne sono più di una. L'utente
read-only `integrams` NON vede `prosoggetti`/`prodotti`: per importarlo servirebbe estendere
la vista `b2b_prodotti` (dblink, utente privilegiato) e mapparlo in sync (ora `multiplo_qta`=null).
Dettagli in `richiesta-dati-integra.md` §4.1.

## 🗂️ Unificazione log (agosto 2026)

Da tre sistemi a uno solo, `audit_log` (`backend/src/audit/audit.service.ts`):

- `event_log` **eliminata** (aveva solo accessi HTTP + errori; i metodi
  mutation/business/sync non erano mai chiamati). Dati migrati in audit_log
  come `azione='http.access'` / `'http.error'` (migration
  `20260830180946_merge_event_log_into_audit_log`).
- `anomalia_log` **eliminata** (duplicava gli errori HTTP del filtro globale;
  workflow "Risolvi" rimosso su decisione del committente). Il filtro errori è
  ora `common/http-error.filter.ts` (APP_FILTER in app.module) e scrive
  `http.error` con `gravita`/`contesto` nel JSON `dettagli`.
- **Endpoint**: `GET /api/admin/audit` (filtri `categoria`=access|error|audit,
  dateFrom/dateTo, search), `/stats`, `/entity/:entita/:entitaId` (timeline),
  `/:id`. Controller in `audit/audit.controller.ts`, permesso
  `admin.anomalie.view` (nome storico, NON rinominare: è nei dati).
- **UI**: sezione "Log eventi" = **tab del Pannello di Amministrazione**
  (`AdminPanel.tsx`), non più voce di sidebar. Le vecchie rotte
  `/api/admin/event-log` e `/api/admin/anomalie` non esistono più.
- Schema `AuditLog`: aggiunte colonne `request_id`, `duration_ms`.
- `auditLog.id` è **BigInt**: nei controller va serializzato come stringa
  (`String(row.id)`) o Nest fallisce il JSON.

## 🧠 Box dashboard — selezione LLM (Fase 2) e rollback

`dashboard.service.ts` ora supporta la **Fase 2** dei box: l'LLM sceglie/ordina N
articoli tra i candidati (ricerca semantica + ranking pesato sui segnali) e scrive
il rationale. Flusso: `poolVincoli` (SQL) → `intentoSemantico` (tutti i coseni > 0,
niente taglio duro) → ranking per pesi (cliente = ordini del cliente, generale =
best-seller globali) → `selezioneLlm` (JSON `{articoli, rationale}`, validato) →
fallback top-N deterministico su errore/JSON invalido.

- **Flag di rollback**: `DASHBOARD_LLM_SELECTION` (`.env`). `off` (default) =
  comportamento precedente deterministico; `on` = selezione LLM. Si attiva senza
  toccare codice.
- `generaBox`/`generaBoxGenerale` ora restituiscono `{ articoli, rationale }` (il
  rationale non è più una seconda chiamata separata quando la selezione LLM è attiva).
- Costo tracciato in `ai_usage` con `tipo='box'` (`IntegrazioneService.generaSelezioneBox`).
- `BOX_SEMANTIC_FLOOR`/`BOX_SEMANTIC_MARGIN` non più usati (il filtro semantico non
  taglia più duramente).

## 💬 Tooltip nei DataTable (generalizzato)
I bottoni azione di `DataTable.tsx` (Clienti, Articoli, Listini, Log eventi,
ecc.) usano **`<DataTip tip={...}>`** → componente comune `Tooltip`
(`components/common/Tooltip.tsx`), stesso pattern di SpeseSpedizioneSection.

- Il tooltip è **portaled su `document.body`** (position fixed, z-index 9999,
  testo `textAlign: center`): **mai** usare `::after`/`data-tip` CSS dentro le
  tabelle — il tooltip finisce dentro `.data-table-scroll` (overflow) e genera
  scrollbar al passaggio del mouse.
- Tooltip nascosto su scroll/resize; `role="tooltip"`.
- Se aggiungi una tabella nuova con azioni icona: wrapper `DataTip` attorno al
  bottone, `aria-label` sul bottone. Il vecchio CSS `.row-action::after` è
  stato rimosso da `admin.css` di proposito.

---

**Ultima modifica:** 30 agosto 2026  
**Autore:** Claude (sviluppo iterativo)
