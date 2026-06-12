# Roadmap di costruzione — Piattaforma B2B Luis S.r.l.

Versione: bozza 4.1 — 12 giugno 2026 (allineata al modello Articolo → Variante e ai canali viste Postgres + Excel AGOMIR, spec v1.12)
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

## Blocco 2 — Integrazione Integra: viste Postgres + ritorno Excel AGOMIR (3-4 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Lettura viste Postgres | Viste in sola lettura: catalogo, listini, clienti, giacenze, stato ordini |
| Import Varianti | Ogni codice articolo Integra = 1 Variante: dimensioni, multiplo/confezione, giacenza, prezzo da listino |
| Aggregazione in Articoli | Il campo "linea" di Integra è usato solo come chiave per raggruppare le Varianti in Articoli (i codici senza linea diventano Articoli con 1 sola Variante) |
| Famiglia principale | Da Integra, read-only: classificazione sopra l'Articolo |
| Ritorno verso Integra | Automazioni di import Excel sviluppate da AGOMIR S.p.A.: ordini, anagrafica articoli con immagine associata |
| Log import | Storico operazioni con esito e data |

**Cosa si vede:** il sistema legge le viste Postgres e popola il catalogo con Articoli e Varianti, raggruppati per Famiglia principale.

**Valore: €1.400 (4 giorni × €350)**

---

## Blocco 3 — Listini e prezzi (1-2 giorni)

| Attività | Dettaglio |
|----------|-----------|
| Lettura listini da viste Postgres | Listini con prezzi per Variante (codice articolo), sola lettura |
| Associazione cliente-listino | Admin assegna un listino a ogni cliente |
| Lettura sconti personalizzati da viste Postgres | Sconti aggiuntivi clienti specifici (opzionale) |
| Calcolo prezzo finale | Prezzo = listino del cliente − eventuali sconti |
| Esposizione prezzo in scheda articolo | Visibile solo a cliente loggato |

**Cosa si vede:** i listini arrivano dalle viste Postgres, il cliente vede il prezzo corretto.

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
| Filtri e ricerca | Per Famiglia principale, Raccolta, testo libero |
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
| Lettura giacenza da viste Postgres | Quantità per Variante (codice articolo) |
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
| Tracciato export ordini | Tracciato Excel concordato con AGOMIR S.p.A. |
| Generazione Excel ordini | File ordini per l'automazione di import AGOMIR verso Integra |
| Storico export | Log operazioni con esito |
| Marcatura "esportato" | Evita doppie esportazioni |

**Cosa si vede:** il portale genera l'Excel ordini che l'automazione AGOMIR importa in Integra.

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
| Caricamento dati reali | Lettura catalogo, clienti, listini dalle viste Postgres di Integra |
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
| 2 | Integrazione Integra (viste Postgres + Excel AGOMIR) | 4 | €350 | **€1.400** |
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
