# Roadmap di costruzione — Piattaforma B2B Luis S.r.l.

Versione: bozza 3.0 — 5 giugno 2026
Approccio: sviluppo AI-assisted (Claude), mini PC temporaneo, poi cloud.

---

## Blocco 1 — Infrastruttura e accessi (1-2 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Setup mini PC + Docker | Next.js, FastAPI, PostgreSQL, Redis |
| Database | Modello dati iniziale (utenti, ruoli) |
| Auth backend | JWT / sessioni, hash password |
| Auth frontend | Login, logout, protezione rotte |
| Utenti admin | Creazione primo admin via seed |
| Accesso remoto | Tailscale / Cloudflare tunnel per lavorare ovunque |
| Git + backup | Repository con backup automatico DB |

**Cosa si vede:** admin fa login, vede dashboard vuota.

---

## Blocco 2 — Import Integra (cruscotto, articoli, linee, famiglie) (2-3 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Definizione tracciato Excel | Accordi con referente Integra su colonne attese |
| Importatore Excel | Lettura file, validazione, import articoli/linee/famiglie su DB |
| Report import | Riepilogo: righe lette, importate, errori |
| Dashboard admin | Elenco articoli importati, filtri per linea/famiglia |
| Linee | CRUD base (quelle da Integra sono read-only, eventuali extra sito-only) |
| Famiglie | CRUD base (stessa logica: da Integra read-only + extra sito) |

**Cosa si vede:** admin carica Excel e vede articoli, linee e famiglie popolati.

---

## Blocco 3 — Listini e prezzi (1-2 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Import listini da Integra (Excel) | Caricamento listini con prezzi per articolo (sola lettura, niente CRUD) |
| Associazione cliente-listino | Admin assegna un listino a ogni cliente (es. "Listino Rivenditori", "Listino Grossisti") |
| Import sconti personalizzati da Integra | Sconti aggiuntivi clienti specifici (opzionale) |
| Calcolo prezzo finale | Prezzo = listino del cliente − eventuali sconti, visibile in scheda articolo |

**Cosa si vede:** admin carica listini da Excel, cliente vede il prezzo corretto in scheda articolo.

---

## Blocco 4 — Gestione articoli + AI (3-4 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Selezione articoli da configurare | Checkbox/flag "configurato" nell'elenco, modale per cercare articoli non ancora configurati |
| Scheda configurazione articolo | Nome, descrizione breve, attributi extra (non in Integra) |
| Upload immagini sfondo bianco | Drag & drop, anteprima, salvataggio su storage locale / S3 |
| Generazione immagini ambientate (AI) | Integrazione DALL·E / SD: click → genera → salva |
| Descrizione AI | Input testo o vocale → LLM genera descrizione discorsiva + punti chiave + metadati |
| Embedding descrizione | Vettore su pgvector per futura ricerca semantica |
| Anteprima scheda articolo finita | Visto cliente: immagini, descrizione, prezzo, dimensioni |
| Filtri elenco | Configurati / Da configurare / Tutti |

**Cosa si vede:** admin seleziona articolo, carica foto, genera descrizione e immagini ambientate con AI, visualizza risultato finale.

---

## Blocco 5 — Catalogo lato cliente (2 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Griglia articoli | Card con immagine, nome, codice, prezzo, badge disponibilità |
| Filtri e ricerca | Per linea, famiglia, testo libero |
| Scheda articolo cliente | Galleria immagini, zoom, varianti/confezioni, prezzo |
| Prezzi personalizzati | Listino cliente applicato in base a profilo |
| Design responsive | Mobile-first (i rivenditori usano tablet in negozio) |

**Cosa si vede:** cliente loggato naviga catalogo con prezzi personalizzati.

---

## Blocco 6 — Clienti e inviti (1-2 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Invito cliente | Admin inserisce email → link di registrazione |
| Registrazione | Nome, ragione sociale, partita IVA, telefono, sede |
| Profilo cliente | Modifica dati, cambio password |
| Blocco/sblocco | Flag che impedisce ordini ma mantiene storico |
| Listini cliente | Admin assegna listino a cliente |
| Login cliente | Email + password o magic link |

**Cosa si vede:** cliente riceve invito, si registra, vede i suoi prezzi.

---

## Blocco 7 — Giacenza (1 giorno)

| Attività | Dettaglio |
|----------|-----------|
| Import giacenza da Integra (Excel) | Caricamento quantità per articolo/variante |
| Badge disponibilità | "Disponibile", "Esaurito", "< 10 pezzi" in griglia e scheda |
| Filtro disponibilità | Mostra solo articoli disponibili |

**Cosa si vede:** badge colorati in catalogo, filtro funzionante.

---

## Blocco 8 — Ordini (2-3 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Carrello | Aggiungi/rimuovi articoli, quantità, varianti |
| Barra acquisto | In scheda articolo: seleziona variante → quantità → aggiungi |
| Checkout | Riepilogo, note ordine, conferma |
| Stati ordine | Bozza → Confermato → In lavorazione → Spedito |
| Storico ordini cliente | Elenco ordini con stato e data |
| Dettaglio ordine | Righe, quantità, prezzi, stato |
| Admin: gestione ordini | Elenco, cambio stato, note interne |
| Notifica email | Conferma ordine, aggiornamento stato |

**Cosa si vede:** cliente ordina, admin evasa, email di notifica.

---

## Blocco 9 — Export ordini verso Integra (1-2 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Tracciato export ordini | Colonne attese da Integra |
| Generazione Excel ordini | Download file con ordini da evadere |
| Storico export | Log operazioni con esito |

**Cosa si vede:** admin scarica Excel ordini da caricare in Integra.

---

## Blocco 10 — AI lato cliente (2-3 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Ricerca semantica | Input linguaggio naturale → embedding → pgvector → risultati |
| Ricerca per immagini | Upload foto → AI descrive → articoli simili |
| Banner homepage | "Articoli interessanti" basati su cronologia cliente |
| Cronologia visite | "Ripresi da dove hai lasciato" |
| Cache embedding | Redis per query frequenti |

**Cosa si vede:** cliente cerca "vasi rettangolari grandi per esterno" e trova risultati; carica foto e trova articoli simili.

---

## Blocco 11 — Migrazione a cloud e go-live (2-3 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Provisioning cloud | Vercel/Railway per app, Supabase/Railway per DB + pgvector |
| Migrazione dati | Export da mini PC → import su cloud |
| Configurazione DNS | Puntamento dominio a cloud |
| Test clienti pilota | 3-5 clienti provano e danno feedback |
| Formazione admin | 1 sessione su gestione articoli + ordini + AI |
| Documentazione | Guida rapida admin e cliente |

---

## Riepilogo tempi

| Blocco | Cosa | Con Claude |
|--------|------|-----------|
| **1** | Infrastruttura e accessi | **1-2 giorni** |
| **2** | Import Integra (articoli, linee, famiglie) | **2-3 giorni** |
| **3** | Listini e prezzi | **1-2 giorni** |
| **4** | Gestione articoli + AI | **3-4 giorni** |
| 5 | Catalogo lato cliente | 2 giorni |
| 6 | Clienti e inviti | 1-2 giorni |
| 7 | Giacenza | 1 giorno |
| 8 | Ordini | 2-3 giorni |
| 9 | Export ordini verso Integra | 1-2 giorni |
| 10 | AI lato cliente | 2-3 giorni |
| 11 | Migrazione cloud + go-live | 2-3 giorni |
| **Totale** | | **~19-26 giorni lavorativi** |

**Con Claude e lavoro full-time: 5-7 settimane.** Il cliente vede listini e prezzi corretti già dal Blocco 3.

---

*Nota: i tembi presuppongono che tu abbia già dimestichezza con Next.js, FastAPI, Docker e Claude. Ogni blocco include setup, review, debug e deploy.*
