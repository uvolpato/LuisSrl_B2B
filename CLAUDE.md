# CLAUDE.md — Portale B2B Luis S.r.l.

Istruzioni permanenti di progetto. Leggere questo file e i file di contesto
all'inizio di ogni sessione, prima di scrivere o modificare codice.

## Cos'è il progetto
Portale e-commerce **B2B** riservato ai rivenditori di Luis S.r.l. (grossista di
articoli per fioristi e garden: vasi in ceramica, cotto portoghese, materiali).
Prezzi sempre **IVA esclusa**. Lingua di UI e contenuti: **italiano**.

## Setup iniziale (primo avvio, ~10 minuti)

**Leggi PRIMA: `SETUP.md`** (guida rapida con comandi ready-to-copy).

**Questi passi vanno fatti UNA SOLA VOLTA all'inizio:**

1. **Backend — Installa dipendenze e genera Prisma Client**
   ```bash
   cd backend
   npm install
   npm run prisma:generate
   ```

2. **Database — Applica le migration e popola i dati di seed**
   ```bash
   # Assicurati che PostgreSQL 16 sia in esecuzione
   npm run prisma:migrate
   npm run seed
   ```
   Questo crea admin, permission groups, clienti di test.

3. **Frontend — Installa dipendenze**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Variabili d'ambiente — Crea i file `.env`**
   - **backend/.env** — Copia da `backend/.env.example` e compila:
     ```
     DATABASE_URL="postgresql://user:pass@localhost:5432/luis_db"
     ADMIN_EMAIL=admin@luissrl.it
     ADMIN_PASSWORD=LuisAdmin2026!
     GEMINI_API_KEY=<tua-chiave-google>
     GEMINI_MODEL=gemini-2.5-flash-image
     ```
   - **frontend/.env.local** — Se hai variabili (di solito vuoto)

## Avviamento (ogni sessione)

Se frontend (3000) e/o backend (3001) sono giù, esegui `avvia.bat` dalla
root del progetto — apre due finestre cmd con backend (NestJS) e frontend
(Next.js) in watch mode:

```bash
.\avvia.bat
```

In alternativa, avvia manualmente in due terminali separati:

**Terminal 1 — Backend (porta 3001)**
```bash
cd backend
npm run start:dev
```

**Terminal 2 — Frontend (porta 3000, HTTP)**
```bash
cd frontend
npm run dev
```

**Accedi**: http://localhost:3000
- Email: `admin@luissrl.it`
- Password: `LuisAdmin2026!`

**Per testare da un altro PC sulla LAN** (es. `http://192.168.0.164:3000`):
1. Apri Chrome → `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Incolla: `http://192.168.0.164:3000`
3. Setta a **Enabled** → **Relaunch**
4. Adesso il dettato vocale funziona (Web Speech API ha secure context)

## Come lavorare
- Procedi **un blocco della roadmap alla volta** (vedi `roadmap-b2b-luis.md`),
  in ordine. Alla fine di ogni blocco: fermati, mostra cosa hai fatto e come
  provarlo, attendi l'OK del committente prima del blocco successivo.
- Sui punti marcati `[DA DEFINIRE]`/`[DA CONFERMARE]` nelle specifiche: trattali
  come assunzioni, scegli un default ragionevole, segnalalo e non bloccarti.
- Prima di scrivere codice nuovo per un blocco, presenta un piano sintetico
  (struttura, librerie proposte, 5 passi) e attendi approvazione.
- Commit atomici con messaggi chiari in italiano; `.gitignore` adeguato.

## File di contesto (fonti di verità)
- `specifiche-b2b-luis.md` — specifiche funzionali. **FONTE DI VERITÀ** (usare la v1.12+).
- `roadmap-b2b-luis.md` — sequenza dei blocchi di costruzione.
- `brand-spec.md` — design system (colori OKLch terracotta, tipografia, layout).
- `richiesta-dati-integra.md` — entità/viste Integra e dati di ritorno.
- `*.html`, `*.png` — prototipo visuale di riferimento per la UI.
In caso di conflitto, vince `specifiche-b2b-luis.md`.

## Modello dati (autoritativo)
- Gerarchia da Integra: **Famiglia principale** (read-only) → **Articolo** → **Variante**.
- **Articolo** = entità "prodotto": porta galleria immagini, **colore** e **descrizione AI**;
  ha **1..N Varianti**. Gli "articoli senza linea" sono Articoli con una sola Variante.
- **Variante** ("codice articolo") = unità ordinabile: dimensioni, multiplo/confezione,
  giacenza, prezzo dal listino. Ogni codice articolo = una Variante.
- **Raccolte** = collezioni di portale modificabili (es. Novità, Natale 2026), molte per
  Articolo. La Famiglia principale è invece read-only (da Integra).
- "linea" = solo campo Integra usato per aggregare i codici in Articoli: **non** è un'entità
  di portale.

## Integrazione Integra (autoritativo)
- **Lettura (Integra → portale): viste Postgres in sola lettura** per tutte le entità
  (catalogo, listini, clienti, giacenze, stato ordini).
- **Ritorno (portale → Integra): automazioni di import Excel sviluppate da AGOMIR S.p.A.**
  (ordini, anagrafica articoli con immagine associata).
- Nessuna API in tempo reale.
- Connessione a Integra **separata e in sola lettura**, con utente DB dedicato a privilegi
  minimi, distinta dal DB del portale.

## Realtà nota dagli export Integra (nomi campo reali)
- Prodotti: `pro_cod`, `pro_descr`, `pro_umicod`, `pro_stato`.
- Varianti: `var_cod` + `dim1`/`dim2`/`dim3`.
- Listini: `lst_procod`, `lst_varcod`, `lst_prezzo`, `lst_sconto1`.
- Ordini: testata `mvt_*` + righe `mvr_*` (`mvr_procod`, `mvr_varcod`, `mvr_dimN`,
  `mvr_qta`, `mvr_prezzo`, `mvr_prznetto`, `mvr_scontoapp1..4` = sconti a cascata).
- **Mancano ancora** negli export: linea/famiglia, colore, dimensioni valorizzate,
  confezione strutturata, e campi cliente (email, listino, stato). Costruire il layer di
  import **adattabile e isolato**, senza assumere che tutti i campi siano già disponibili.

## Stack e setup
- **Database: PostgreSQL** (sul server locale). Credenziali standard lette ESCLUSIVAMENTE
  da `.env` (non versionato; mantenere `.env.example`).
  - Setup: se non esiste, creare il DB `"LuisSrlDb"` (`CREATE DATABASE "LuisSrlDb";` con
    virgolette per mantenere le maiuscole). Abilitare `pgvector` per la ricerca semantica.
- **Backend: NestJS** (Node + TypeScript), API REST.
- **Front-end: Next.js** (React, SPA) che consuma le API di NestJS.
- **Esecuzione: Docker** (`docker-compose` con app + Postgres) sul server locale.
- **Mini PC (LAN)** con 128 GB RAM condivisa per LM Studio (GPU AI locale).
- ORM e librerie di dettaglio (es. Prisma/TypeORM, auth, validazione): proporle nel piano
  del blocco per approvazione, non sceglierle d'autorità.

## Architettura di deployment
- **Server locale** — ospita il portale (Next.js + NestJS + PostgreSQL + Redis).
- **Mini PC** sulla stessa LAN — ospita LM Studio con Qwen 27B per inferenza AI.
- **Accesso remoto** — tramite Tailscale/Cloudflare Tunnel, niente esposizione pubblica diretta.
- n8n opzionale sul server locale per automazioni.

## Sicurezza (priorità assoluta)
Il portale resta in **rete locale** con accesso remoto via tunnel crittografato.
- Segreti solo da variabili d'ambiente.
- Accesso **solo su invito** (niente auto-registrazione); ruoli admin/cliente; **un solo
  account per azienda**; clienti **bloccabili ma mai cancellabili**.
- Sessione via cookie **HttpOnly + Secure + SameSite** (non token in localStorage);
  protezione **CSRF** sulle richieste che modificano stato.
- Security headers (Helmet), CORS ristretto all'origine del front-end.
- Validazione input con DTO (class-validator); query parametrizzate via ORM.
- Rate limiting sul login; hashing password forte (argon2/bcrypt).
- Upload immagini validati per tipo/peso; log delle azioni admin e degli import.
- Nessun dato sensibile dei clienti nei prompt AI.

## Regole funzionali da rispettare sempre
- Prezzi **IVA esclusa**.
- Giacenza al cliente solo come **"disponibile / non disponibile"**; controllo sufficienza
  quantità all'inserimento nel carrello.
- Scheda prodotto a **griglia d'ordine** (varianti in riga, quantità a multiplo, aggiunta in
  blocco), coerente con prototipo e brand-spec.

## Checklist pre-pubblicazione (prima di esporre il server)
- Sostituire le credenziali DB standard con credenziali dedicate a privilegi minimi.
- Verificare HTTPS/HSTS, header di sicurezza, CORS e cookie in modalità produzione.
- Verificare che `.env` reali non siano versionati.
