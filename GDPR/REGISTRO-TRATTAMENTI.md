# Registro delle attività di trattamento (art. 30 GDPR)

> **BOZZA operativa** — redatta sul codice e sui trattamenti reali. Da validare dal Titolare,
> preferibilmente con un consulente privacy. I campi marcati **[DA DECIDERE]** richiedono una scelta
> aziendale, non tecnica. Ultimo aggiornamento: novembre 2026.

## Titolare del trattamento

**Luis S.r.l.** — Via F. Bellafino 28/30, 24126 Bergamo (BG) — C.F. e P. IVA 04253020160.
Contatto privacy: **contatti@luisbg.it** [DA CONFERMARE: indirizzo unico presidiato].
DPO: non nominato; obbligatorietà valutata e motivata in `PROCEDURE-INTERNE.md` §4.

## Perché il registro è tenuto

L'esenzione per le imprese sotto i 250 dipendenti (art. 30.5) **non si applica**: i trattamenti non sono
occasionali, comprendono profilazione e uso di sistemi di intelligenza artificiale.

## Registro

| # | Finalità | Interessati | Categorie di dati | Base giuridica | Destinatari | Trasferimenti extra-UE | Conservazione | Misure di sicurezza |
|---|---|---|---|---|---|---|---|---|
| 1 | Accesso al portale riservato e gestione dell'account | Referenti delle aziende clienti | Nome, email, password (hash argon2id), lingua, stato account, log di sessione | Esecuzione del contratto (art. 6.1.b) | Personale autorizzato; hosting | No (server locale) | Durata del rapporto; sessione 8 ore | Argon2id, cookie HttpOnly/Secure/SameSite, CSRF, rate limit login, sessioni su DB |
| 2 | Anagrafica commerciale, listini personalizzati, condizioni | Referenti e aziende clienti | Ragione sociale, P.IVA, C.F., indirizzi, telefoni, email, condizioni, fido | Contratto (6.1.b); legittimo interesse per l'aggiornamento dal gestionale (6.1.f) | Personale autorizzato; AGOMIR/Integra | No noto [DA VERIFICARE contratto AGOMIR] | Durata del rapporto + 10 anni per i dati collegati a documenti | Accesso per ruoli/permessi; audit delle azioni; query parametrizzate |
| 3 | Ordini, spedizioni, fatturazione e adempimenti fiscali | Referenti, destinatari di spedizione | Ordini, righe, importi, indirizzi, note, riferimenti documenti | Contratto (6.1.b); obbligo di legge (6.1.c) | Personale; AGOMIR; corrieri/vettori [DA NOMINARE]; Sistema di Interscambio | No | 10 anni (obblighi civilistici e fiscali) | Accesso per ruoli; export tracciato; audit |
| 4 | Analisi dell'utilizzo del portale (pagine, tempo, scroll, articoli, ricerche, carrello, IP) | Utenti autenticati del portale | Eventi di utilizzo, IP, path, testo delle ricerche, esiti | Legittimo interesse (6.1.f) — LIA in `LIA-LEGITTIMO-INTERESSE.md` | Personale commerciale e amministrazione | No | 18 mesi (job `EventsService.purgeOld`) | Solo utenti autenticati; nessuna terza parte; opposizione prevista (P1.3, da implementare) |
| 5 | Profilo commerciale del cliente con AI e suggerimenti di prodotto | Aziende clienti; referenti (nome/ruolo da fonti pubbliche) | Ragione sociale, P.IVA, ATECO, fatturato/addetti, sedi, ordini aggregati, segnali di interesse, referenti con fonte | Legittimo interesse (6.1.f) — LIA | Google (Gemini API, piano a pagamento); provider dati impresa [DA NOMINARE]; personale | Sì, USA — DPF e/o SCC da DPA Google [DA VERIFICARE] | Profilo aggiornato settimanalmente; conservato finché il cliente è attivo **[DA DECIDERE: cancellazione alla cessazione]** | Nessun recapito nei prompt; referenti solo con fonte; log `ai_usage` senza contenuti; accesso admin |
| 6 | Ricerca semantica e ricerca per immagine | Utenti autenticati | Testo della ricerca; foto caricata (non persistita) | Contratto (6.1.b) — funzione richiesta dall'utente | Google (Gemini) | Sì, USA — DPF/SCC | Testo indicizzato negli eventi (18 mesi); foto non salvata | Nessuna persistenza della foto; avviso "evita persone"; guardrail Vision |
| 7 | Richiesta di accesso dal sito vetrina e qualifica automatica | Referenti che inviano il modulo | Ragione sociale, P.IVA, C.F., referente, email, telefono, città, messaggio, consenso, IP, browser | Misure precontrattuali (6.1.b); legittimo interesse per la verifica (6.1.f) | Personale; Google (Gemini con ricerca web); VIES (Commissione UE); provider dati impresa | Sì, USA per Gemini | 12 mesi, poi anonimizzazione automatica (job `ConservazioneLeadService`) | Solo dati aziendali nel prompt; IP/user-agent solo per prova e sicurezza; rate limit |
| 8 | Invio cataloghi e comunicazioni commerciali | Clienti e contatti con base valida | Email, nome, link tracciato, eventi di apertura/download | Consenso (6.1.a) o soft opt-in per clienti esistenti (art. 130 c.4 Codice Privacy) **[DA DECIDERE la regola]** | Brevo (Sendinblue) | No (UE) [DA VERIFICARE contratto] | Fino a revoca + 24 mesi di prova dell'invio **[DA DECIDERE]** | Unsubscribe in ogni messaggio; esclusione applicata prima dell'invio (P1.6, da implementare) |
| 9 | Sicurezza, prevenzione abusi e registro delle operazioni | Utenti, visitatori, staff | IP, data/ora, endpoint, esito, attore, durata, email dei login falliti | Legittimo interesse (6.1.f) | Personale IT autorizzato | No | **[DA DECIDERE: 90 gg accessi / 180 errori / 730 azioni]** | Accesso admin; retention da implementare (P1.5); token e querystring da rimuovere dai log |
| 10 | Copie di sicurezza | Tutte le categorie sopra | Snapshot del database e file caricati | Legittimo interesse e obblighi (6.1.f/c) | Personale IT | No, se su disco locale **[DA CONFERMARE copia fuori sede]** | **[DA DECIDERE: es. 30 giorni + mensili]** | Cifratura **[DA IMPLEMENTARE]**; restore testato **[DA FARE]** |
| 11 | Progetti cliente condivisi via link | Clienti; destinatari del link | Elenco prodotti, token di condivisione, IP hashato, browser | Contratto (6.1.b) | Personale; destinatari del link | No | Durata del progetto | Token non indovinabile; IP memorizzato in hash |

## Trattamenti esclusi dal registro

- **Navigazione del sito vetrina**: log tecnici del server, nessun analytics, nessuna terza parte; rientra nel n. 9.
- **Candidati e dipendenti**: fuori ambito di questo documento.
- **Videosorveglianza, controllo accessi fisici**: non presenti nel portale.

## Fornitori e trasferimenti

Elenco e stato delle nomine: `NOMINE-RESPONSABILI.md`.
Valutazione DPIA: `DPIA-SCREENING.md`.
Bilanciamento del legittimo interesse: `LIA-LEGITTIMO-INTERESSE.md`.
Procedure operative (diritti, violazioni, retention): `PROCEDURE-INTERNE.md`.
