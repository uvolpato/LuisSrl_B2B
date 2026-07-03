# Quick Start – Portale B2B Luis

Avviamento rapido per agenti/sviluppatori che riprendono il progetto.

## 1. Setup iniziale (prima volta, ~5 min)

```bash
# Backend
cd backend
npm install
npm run prisma:generate

# Database
npm run prisma:migrate
npm run seed

# Frontend
cd ../frontend
npm install
```

## 2. Variabili d'ambiente

Verifica/crea questi file:

**backend/.env**
```
DATABASE_URL="postgresql://user:pass@localhost:5432/luis_db"
ADMIN_EMAIL=admin@luissrl.it
ADMIN_PASSWORD=LuisAdmin2026!
GEMINI_API_KEY=<tua-chiave-google>
GEMINI_MODEL=gemini-2.5-flash-image
```

## 3. Avviamento (ogni sessione)

```bash
# Terminal 1: Backend (porta 3001)
cd backend
npm run start:dev

# Terminal 2: Frontend (porta 3000)
cd frontend
npm run dev
```

Accedi a **http://localhost:3000** con le credenziali admin.

## 4. Microfono / Dettato vocale (accesso da IP della LAN)

Per testare il dettato da un altro PC sulla LAN (es. `http://192.168.0.164:3000`):

1. Apri Chrome sul PC-test
2. Vai a **`chrome://flags/#unsafely-treat-insecure-origin-as-secure`**
3. Incolla nella casella: **`http://192.168.0.164:3000`**
4. Setta a **Enabled** → **Relaunch**
5. Accedi a **`http://192.168.0.164:3000`** → microfono funziona ✓

## 5. Test credenziali

- **Admin**: `admin@luissrl.it` / `LuisAdmin2026!`
- **Cliente 1**: `cliente1@fiorista.it` / `Cliente2026!`
- **Cliente 2**: `verde.giardini@example.it` / `Cliente2026!`

## 6. Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| DB connection error | Verifica `DATABASE_URL` in `.env`, PostgreSQL running |
| Microfono disabilitato | Controlla flag Chrome (step 4 sopra) |
| HMR non funziona | Assicura `npm run dev` (non `next dev`) e che Next stia rebuilding |
| CORS errori | Backend (3001) e frontend (3000) devono essere entrambi up |
| Immagini non caricate | Controlla `frontend/public/images/` (created at runtime) |

## 7. Architettura

```
Backend (NestJS, porta 3001)
  ├─ /api/auth        — autenticazione
  ├─ /api/integrazione — articoli, raccolte, immagini
  ├─ /api/admin       — panel gestione
  └─ PostgreSQL (Prisma)

Frontend (Next.js, porta 3000)
  ├─ /                — landing (login)
  ├─ /catalogo        — browsing articoli
  ├─ /admin           — admin panel
  └─ Proxy /api/* → Backend
```

## 8. Documentazione completa

Vedi **specifiche-b2b-luis.md** per:
- Sezione 15: setup dettagliato, HTTPS (opzionale), mkcert
- Tutte le specifiche funzionali
- Punti da definire con stakeholder

---

**Dubbi?** Leggi la sezione 15 nelle specifiche oppure controlla il git log dei ultimi commit.
