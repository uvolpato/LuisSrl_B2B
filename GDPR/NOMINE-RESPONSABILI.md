# Nomine a responsabile del trattamento (art. 28) e fornitori

> **BOZZA operativa.** Luis S.r.l. è Titolare. Ogni fornitore che tratta dati personali per conto di
> Luis va nominato con atto scritto. Il contratto standard del fornitore può bastare **solo se** copre
> tutti i punti dell'art. 28.3 elencati in fondo.

## Stato delle nomine

| Fornitore | Ruolo | Dati trattati | Nomina | Trasferimento extra-UE | Da verificare |
|---|---|---|---|---|---|
| **Google** (Gemini API, piano a pagamento) | Responsabile | Testi di ricerca, foto caricate (non persistite), dati aziendali per profilo e descrizioni | **Da accettare/firmare** — Cloud Data Processing Addendum | USA: DPF e/o SCC | Che il piano sia a pagamento (nessun training sui dati); data residency se si passa a Vertex |
| **Brevo (Sendinblue)** | Responsabile | Email, nome, link di tracciamento, eventi di apertura/download | **Da verificare** — DPA standard | UE (Francia) | Conservazione dei contatti dopo la revoca; gestione unsubscribe; sub-responsabili |
| **Microsoft 365 / posta** | Responsabile | Email in entrata e uscita, allegati, credenziali temporanee | **Da verificare** — Microsoft Products and Services DPA | DPF/SCC | Confermare che la posta reale sia su Microsoft o altro provider [DA CONFERMARE] |
| **AGOMIR / Integra** | Responsabile (o contitolarità da valutare) | Anagrafica clienti, ordini, listini, giacenze | **Da verificare** — contratto gestionale | Da verificare | Base giuridica del flusso di ritorno; tempi di cancellazione; accordo su richieste degli interessati |
| **Provider dati impresa** (`DATI_IMPRESA_API_URL`) | Responsabile | P.IVA, denominazione, ATECO, fatturato, addetti | **Da nominare se abilitato** | Da verificare | Identità del fornitore, DPA, fonte dei dati, licenza d'uso |
| **Cloudflare / Tailscale** (se usati per l'accesso remoto) | Responsabile | Metadati di connessione (IP, timestamp) | **Da verificare se attivi** | Da verificare | Se non usati, annotarlo e chiudere la voce |
| **Consulente IT / assistenza** | Responsabile | Accesso potenziale a database e file | **Da nominare se accede** | No, se opera in Italia | Elenco degli accessi, modalità, revoca a fine incarico |
| **Commercialista** | Titolare autonomo (di norma) | Documenti contabili | Non è una nomina art. 28 | No | Confermare la qualificazione |
| **Corrieri / vettori** | Responsabile o titolare autonomo | Nome, indirizzo, telefono per la consegna | **Da nominare** | Da verificare | Elenco vettori dal gestionale; clausola privacy nel contratto di trasporto |
| **LM Studio (modello locale, mini PC)** | Nessun trasferimento | Nessun dato esce dalla LAN | Non applicabile | No | Documentare che il modello è locale e senza telemetria |
| **VIES (Commissione UE)** | Fonte pubblica | P.IVA | Non è nomina | UE | Nessuna |

## Contenuto minimo dell'accordo (art. 28.3)

Ogni nomina deve prevedere, per iscritto:

1. oggetto, durata, natura e finalità del trattamento, tipo di dati e categorie di interessati;
2. trattamento solo su istruzione documentata del Titolare;
3. obbligo di riservatezza per chi tratta i dati;
4. misure di sicurezza adeguate (art. 32);
5. autorizzazione dei sub-responsabili solo con consenso specifico o listino noto, con gli stessi obblighi;
6. assistenza al Titolare per le richieste degli interessati (artt. 12-22);
7. assistenza per violazioni, DPIA e consultazioni preventive;
8. cancellazione o restituzione dei dati a fine incarico;
9. messa a disposizione delle informazioni necessarie per dimostrare la conformità e consentire verifiche;
10. obbligo di informare il Titolare di istruzioni che violino il GDPR.

## Trasferimenti fuori dall'UE

Per ogni trasferimento serve una base (art. 45 decisione di adeguatezza, art. 46 SCC, art. 49 eccezioni)
e una valutazione del contesto. Conservare: decisione DPF o SCC firmate, transfer impact assessment
sintetica, e l'indicazione del luogo di trattamento.

Stato: **[DA COMPILARE]** per Google e Microsoft. Brevo è in UE. AGOMIR e provider dati impresa da verificare.

## Cosa conservare

- copia firmata o accettata di ogni DPA, con data;
- elenco dei sub-responsabili e relative modifiche;
- registro delle verifiche (chi ha controllato, quando, esito).

Cartella consigliata: `documenti/fornitori/<fornitore>/` fuori dal repository.

## Fac-simile da firmare

- `NOMINA-RESPONSABILE-TEMPLATE.md` — atto di nomina art. 28 con allegati A (trattamento) e B (misure).
- `ISTRUZIONI-AUTORIZZATI-TEMPLATE.md` — istruzioni art. 29 per il personale interno.
- `SPECIFICA-BACKUP.md` — da consegnare al sistemista.
