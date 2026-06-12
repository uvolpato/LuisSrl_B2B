# CLAUDE.md — Portale B2B Luis S.r.l.

Istruzioni permanenti di progetto. Leggere questo file e i file di contesto
all'inizio di ogni sessione, prima di scrivere o modificare codice.

## Cos'è il progetto
Portale e-commerce **B2B** riservato ai rivenditori di Luis S.r.l. (grossista di
articoli per fioristi e garden: vasi in ceramica, cotto portoghese, materiali).
Prezzi sempre **IVA esclusa**. Lingua di UI e contenuti: **italiano**.

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
- **Database: PostgreSQL** (già attivo in locale). Credenziali standard lette ESCLUSIVAMENTE
  da `.env` (non versionato; mantenere `.env.example`).
  - Setup: se non esiste, creare il DB `"LuisSrlDb"` (`CREATE DATABASE "LuisSrlDb";` con
    virgolette per mantenere le maiuscole). Abilitare `pgvector` per la ricerca semantica.
- **Backend: NestJS** (Node + TypeScript), API REST.
- **Front-end: Next.js** (React, SPA) che consuma le API di NestJS.
- **Esecuzione: Docker** (`docker-compose` con app + Postgres) per girare in locale e poi su
  server pubblico dietro reverse proxy con HTTPS.
- ORM e librerie di dettaglio (es. Prisma/TypeORM, auth, validazione): proporle nel piano
  del blocco per approvazione, non sceglierle d'autorità.

## Sicurezza (priorità assoluta)
Il sito gira in locale ora ma sarà **esposto su server pubblico**: progettare security-first.
- Segreti solo da variabili d'ambiente.
- Accesso **solo su invito** (niente auto-registrazione); ruoli admin/cliente; **un solo
  account per azienda**; clienti **bloccabili ma mai cancellabili**.
- Sessione via cookie **HttpOnly + Secure + SameSite** (non token in localStorage);
  protezione **CSRF** sulle richieste che modificano stato.
- Security headers (Helmet), CORS ristretto all'origine del front-end, HSTS in produzione.
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
