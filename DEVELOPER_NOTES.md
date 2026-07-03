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

**Ultima modifica:** 3 luglio 2026  
**Autore:** Claude (sviluppo iterativo)
