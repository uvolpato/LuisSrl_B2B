# Roadmap di costruzione — Piattaforma B2B Luis S.r.l.

Versione: bozza 4.0 — 5 giugno 2026
Architettura: server locale (app + DB) + Mini PC 128GB GPU condivisa (LM Studio)
Approccio: sviluppo AI-assisted (Claude), tutto in LAN

---

## Blocco 1 — Infrastruttura e accessi (2-3 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Setup server locale | App + DB su macchina interna, accesso riservato |
| Autenticazione | Login email + password, ruoli admin/cliente |
| Gestione utenti | Admin crea, modifica, blocca clienti |
| Sicurezza | HTTPS, sessioni, rate limiting |

**Cosa si vede:** admin accede al pannello, crea il primo cliente, il cliente riceve le credenziali.

**Valore: €1.050 (3 giorni × €350)**

---

## Blocco 2 — Import Integra (articoli, linee, famiglie) (3-4 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Parser Excel Integra | Lettura tracciato Excel articoli, linee, famiglie |
| Import articoli | Codice, nome, dimensioni, multipli, colore, materiale |
| Import linee | Raggruppamento articoli per linea prodotto |
| Import famiglie | Suddivisione secondaria all'interno della linea |
| Log import | Storico operazioni con esito e data |

**Cosa si vede:** admin carica il file Excel, il sistema popola il catalogo con articoli, linee e famiglie.

**Valore: €1.400 (4 giorni × €350)**

---

## Blocco 3 — Listini e prezzi (1-2 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Import listini da Integra (Excel) | Caricamento listini con prezzi per articolo (sola lettura) |
| Associazione cliente-listino | Admin assegna un listino a ogni cliente |
| Import sconti personalizzati da Integra | Sconti aggiuntivi clienti specifici (opzionale) |
| Calcolo prezzo finale | Prezzo = listino del cliente − eventuali sconti |
| Esposizione prezzo in scheda articolo | Visibile solo a cliente loggato |

**Cosa si vede:** admin carica listini da Excel, cliente vede il prezzo corretto.

**Valore: €700 (2 giorni × €350)**

---

## Blocco 4 — Gestione articoli + AI (3-4 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Selezione articoli da configurare | Flag "configurato", modale ricerca articoli non ancora configurati |
| Scheda configurazione articolo | Nome, descrizione breve, attributi extra (non in Integra) |
| Upload immagini sfondo bianco | Drag & drop, anteprima, salvataggio su storage |
| Connessione Mini PC LM Studio | API locale chiama http://mini-pc:1234/v1 per inferenza |
| Generazione immagini ambientate (AI) | Integrazione DALL·E / SD: click → genera → salva |
| Descrizione AI via Mini PC | Input testo → Qwen 27B su Mini PC → descrizione discorsiva + punti + metadati |
| Image-to-text via Mini PC | Foto articolo → Qwen visione su Mini PC → descrizione testuale |
| Embedding descrizione | Generazione vettore su pgvector per ricerca semantica |
| Anteprima scheda articolo finita | Vista cliente: immagini, descrizione, prezzo, dimensioni |
| Filtri elenco | Configurati / Da configurare / Tutti |

**Cosa si vede:** admin seleziona articolo, carica foto, genera descrizione e immagini AI, vede risultato finale. L'inferenza va al Mini PC in LAN.

**Valore: €1.400 (4 giorni × €350)**

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

**Valore: €700 (2 giorni × €350)**

---

## Blocco 6 — Clienti e inviti (1-2 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Invito cliente | Admin inserisce email → link di registrazione |
| Registrazione | Nome, ragione sociale, partita IVA, telefono, sede |
| Profilo cliente | Modifica dati, cambio password |
| Blocco/sblocco | Flag che impedisce ordini ma mantiene storico |
| Assegnazione listino | Admin seleziona listino per cliente |
| Login cliente | Email + password o magic link |

**Cosa si vede:** cliente riceve invito, si registra, vede i suoi prezzi.

**Valore: €700 (2 giorni × €350)**

---

## Blocco 7 — Giacenza (1 giorno)

| Attività | Dettaglio |
|----------|-----------|
| Import giacenza da Integra (Excel) | Caricamento quantità per articolo/variante |
| Badge disponibilità | "Disponibile", "Esaurito", "< 10 pezzi" in griglia e scheda |
| Filtro disponibilità | Mostra solo articoli disponibili |
| Data ultimo aggiornamento | Trasparenza sul dato mostrato |

**Cosa si vede:** badge colorati in catalogo, filtro funzionante.

**Valore: €350 (1 giorno × €350)**

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

**Valore: €1.050 (3 giorni × €350)**

---

## Blocco 9 — Export ordini verso Integra (1-2 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Tracciato export ordini | Colonne attese da Integra |
| Generazione Excel ordini | Download file con ordini da evadere |
| Storico export | Log operazioni con esito |
| Marcatura "esportato" | Evita doppie esportazioni |

**Cosa si vede:** admin scarica Excel ordini da caricare in Integra.

**Valore: €700 (2 giorni × €350)**

---

## Blocco 10 — AI lato cliente (2-3 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Ricerca semantica | Input linguaggio naturale → embedding su Mini PC → pgvector → risultati |
| Ricerca per immagini | Upload foto → image-to-text su Mini PC → articoli simili |
| Banner homepage | "Articoli interessanti" basati su cronologia cliente |
| Cronologia visite | "Ripresi da dove hai lasciato" |
| Cache embedding | Redis per query frequenti |

**Cosa si vede:** cliente cerca "vasi rettangolari grandi per esterno" e trova risultati; carica foto e trova articoli simili.

**Valore: €1.050 (3 giorni × €350)**

---

## Blocco 11 — Collaudo, formazione e go-live (2-3 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Test completo flussi | Catalogo → ordine → export Integra |
| Test AI | Descrizioni, embedding, ricerca semantica e per immagini |
| Caricamento dati reali | Import catalogo, clienti, listini da Integra |
| Formazione admin | 1-2 sessioni su gestione articoli, ordini, AI |
| Guida rapida clienti | PDF / video breve su come ordinare |
| Giro pilota | 3-5 clienti provano, feedback |
| Messa in produzione | DNS, backup, monitoraggio |

**Cosa si vede:** tutto funzionante con dati reali e clienti operativi.

**Valore: €1.050 (3 giorni × €350)**

---

## Riepilogo economico

| # | Blocco | Giorni | €/giorno | **Valore** |
|---|--------|--------|----------|-----------|
| 1 | Infrastruttura e accessi | 3 | €350 | **€1.050** |
| 2 | Import Integra (articoli, linee, famiglie) | 4 | €350 | **€1.400** |
| 3 | Listini e prezzi | 2 | €350 | **€700** |
| 4 | Gestione articoli + AI | 4 | €350 | **€1.400** |
| 5 | Catalogo lato cliente | 2 | €350 | **€700** |
| 6 | Clienti e inviti | 2 | €350 | **€700** |
| 7 | Giacenza | 1 | €350 | **€350** |
| 8 | Ordini | 3 | €350 | **€1.050** |
| 9 | Export ordini verso Integra | 2 | €350 | **€700** |
| 10 | AI lato cliente | 3 | €350 | **€1.050** |
| 11 | Collaudo, formazione, go-live | 3 | €350 | **€1.050** |
| | **Totale** | **29 giorni** | | **€10.150** |

### Opzioni di fatturazione

| Opzione | Importo | Note |
|---------|---------|------|
| **Forfait unico** | **€9.450** | Prezzo fisso, pagato a milestone |
| **Giornaliera** | €350/giorno | Fatturato a fine mese su ore effettive |
| **Solo blocchi 1-4** (primo rilascio utile) | €3.850 | Cliente inizia subito a caricare articoli, poi si decide il resto |

### Costi operativi mensili (a carico del cliente)

| Voce | Costo/mese |
|------|-----------|
| Elettricità Mini PC (~100W × 24h) | ~€22 |
| Elettricità server locale (già esistente) | ~€5 |
| Dominio + DNS | ~€2 |
| API immagini DALL·E / SD (~25 foto/mese) | ~€9 |
| Backup esterno (opzionale) | ~€5 |
| **Totale/mese** | **~€38-43** |
