# Portale B2B Luis — Analisi dati inviati all'AI, GDPR e AI Act

> **Disclaimer**: documento tecnico-informativo, NON un parere legale. Da validare con DPO/consulente legale prima del go-live in produzione con un'AI esterna.

Data: 2026-07-16 · Provider AI: **Google Gemini** (`generativelanguage.googleapis.com`, chiave `GEMINI_API_KEY`) · Modelli: `gemini-2.5-flash` (testo/visione), `gemini-2.5-flash-image` (immagini), `gemini-embedding-001` (embedding).

---

## 1. Benchmark: cosa esce davvero verso l'AI

Le chiamate a Gemini avvengono in due contesti — **admin** (configurazione articoli) e **cliente** (ricerca). Ecco **tutto** ciò che viene inviato, dal codice (`integrazione.service.ts`, `embedding.service.ts`):

| # | Chiamata | Chi la scatena | Cosa contiene | Dato personale? |
|---|---|---|---|---|
| A | **Generazione descrizione** (`callGeminiText`) | Admin | Nome articolo, colore, famiglia, dimensioni varianti, contributi vocali dell'operatore, descrizioni delle foto a sfondo bianco | NO (dati prodotto/business) |
| B | **Generazione immagine ambientata** (`callGemini`) | Admin | Prompt + **foto prodotto** a sfondo bianco (pack-shot) | NO (foto di oggetti) |
| C | **Descrizione foto sfondo bianco** (`describeWhiteImages`) | Admin | Foto pack-shot dell'articolo | NO (oggetti) |
| D | **Embedding articolo** (`embedText`) | Admin/sistema (backfill) | Blob testo: nome + famiglia + colore + descrizione | NO (business) |
| E | **Riscrittura query** (`rewriteQuery`) | Cliente | **Testo di ricerca** digitato dal cliente | Potenziale (dipende da cosa scrive) |
| F | **Embedding query** (`embedText`) | Cliente | Testo di ricerca normalizzato | Potenziale |
| G | **Analisi foto ricerca** (`analyzeImage`, Vision) | Cliente | **Foto caricata dal cliente** | **Potenziale** (vedi sotto) |
| H | **Estrazione colore** (`estraiColoreDaTesto`) | Admin | Nome + descrizione articolo | NO (business) |

### Dato personale effettivamente trasmesso
- ➖ **Dati prodotto** (nomi articoli, colori, dimensioni, foto di vasi/oggetti, descrizioni): **NON** personali. È la stragrande maggioranza del traffico AI.
- ⚠️ **Testo di ricerca del cliente** (E/F): free text → *potrebbe* contenere dati personali se il cliente li digita, ma è orientato al prodotto ("vaso nocciola da esterno"). Rischio basso.
- ⚠️ **Foto caricata dal cliente per la ricerca per immagine** (G): è l'unico punto davvero da valutare. Una foto **può** contenere incidentalmente persone, volti, mani, un ambiente riconoscibile → dato personale. La foto **viene trasmessa a Google** per l'analisi.

### Minimizzazione GIÀ presente (punti a favore)
- **Nessun dato anagrafico del cliente** (nome, email, P.IVA, indirizzo, telefono) viene mai inviato a Gemini: le descrizioni riguardano i **prodotti**, non i clienti.
- **Le immagini generate/ambientate (A/B/C) raffigurano solo prodotti**: mai persone né altro che non sia l'articolo ambientato per sito e cataloghi → **nessun dato personale** in questi flussi.
- Ogni immagine generata dall'AI porta il **badge "AI"** **sia sul sito sia nei cataloghi** → disclosure art. 50 assolta in modo coerente su tutti i canali.
- Il **guardrail Vision** istruisce il modello a **ignorare persone, mani, sfondo** e a concentrarsi solo sul contenitore → riduce il valore dei dati personali eventualmente presenti in una foto caricata.
- La foto caricata dal cliente **non viene salvata**: è usata solo per l'analisi al volo (nessuna persistenza lato Luis).
- Il **log costi AI** (`ai_usage`) memorizza l'attore (id admin/cliente) **solo in locale** nel DB Luis: **non** viene inviato a Google.

> In sintesi: verso Google esce **quasi solo roba di prodotto** (testi e foto di oggetti). Gli unici dati potenzialmente personali sono il **testo di ricerca** e la **foto caricata dal cliente**.

---

## 2. GDPR

Poiché in un caso (foto caricata dal cliente) e potenzialmente in un altro (testo di ricerca) possono transitare dati personali, **il GDPR si applica** a quei flussi. La conformità dipende **quasi tutta dal PIANO Google usato**:

| Destinazione | Training sui dati? | DPA (art. 28)? | Idoneo per dati personali? |
|---|---|---|---|
| ❌ **Gemini API — free tier (AI Studio)** | Sì: i dati possono essere usati per migliorare i prodotti e **revisionati da umani** | No | **NO** |
| ✅ **Gemini API — a pagamento** | No (Google non usa i prompt a pagamento per il training) | Sì (Google Cloud DPA) | Sì |
| ✅ **Vertex AI (Google Cloud)** | No | Sì, con **data residency UE** selezionabile | Sì |

> ✅ **Stato attuale (confermato): piano a PAGAMENTO.** Su Gemini API a pagamento Google **non usa i prompt/contenuti per addestrare i modelli** e si applica il **Google Cloud Data Processing Addendum (DPA)**. Il blocco principale del free tier **non sussiste**. Resta da fare il passo formale: **accettare/firmare il DPA** e verificare le **SCC**/eventuale **data residency UE**.

### Requisiti GDPR per usarlo lecitamente
1. **Piano a pagamento + DPA** con Google (Cloud Data Processing Addendum) — copre anche le SCC per il trasferimento USA.
2. **Base giuridica** (art. 6): per la ricerca semantica/immagine, *legittimo interesse* (fornire il servizio richiesto dal cliente), con LIA documentata; per le descrizioni admin, esecuzione del contratto/interesse legittimo.
3. **Trasferimento extra-UE**: coperto da SCC nel DPA Google, oppure **data residency UE** su Vertex AI.
4. **Informativa e registro trattamenti** (artt. 13/30): indicare Google come responsabile, il trasferimento USA, e la funzione "ricerca per immagine".
5. **Minimizzazione** (art. 5): già buona (nessun dato anagrafico, foto non salvata, guardrail che ignora le persone).

### Mitigazioni forti disponibili
- **Avviso sulla foto**: prima dell'upload nella ricerca per immagine, mostrare una nota "**Carica solo foto del prodotto, evita di includere persone o dati personali**" + spunta di consenso. Riduce a monte il rischio.
- **Non persistere** la foto (già così) e non loggarla.
- Valutare **Vertex AI con data residency UE** se si vuole tenere tutto il trattamento in Europa.

---

## 3. EU AI Act

Classificazione per rischio del sistema (assistente di catalogo e-commerce con ricerca semantica/immagine + generazione di descrizioni e immagini prodotto):

- **Rischio: MINIMO / LIMITATO.** Non rientra nelle pratiche vietate né nell'**Allegato III (alto rischio)**: nessuna biometria, nessuna valutazione di credito/assicurazioni/servizi essenziali, nessuna gestione di lavoratori.
- **Obbligo principale (deployer) — Trasparenza, art. 50**:
  1. **Sistema che interagisce con persone**: la ricerca AI deve far capire che è un'IA. → già assolto dall'etichetta "**Ricerca intelligente / AI**" nella UI (basta mantenerla chiara).
  2. **Contenuti generati dall'AI** (immagini ambientate e descrizioni): vanno **dichiarati come generati/manipolati dall'AI**. → le immagini AI hanno **già il badge "AI"** visibile **sia sul sito sia nei cataloghi**; inoltre il modello immagini Google applica un **watermark SynthID** (machine-readable) nativamente. Disclosure ben coperta. Consigliato aggiungere una piccola nota anche sulle **descrizioni generate**.
- Gli obblighi sui **modelli GPAI** ricadono su **Google** (fornitore del modello), **non** su Luis come utilizzatore.

### Nota su Vision e foto dei clienti
L'analisi di foto caricate dai clienti **non** è "riconoscimento biometrico" (non identifica persone: estrae attributi di prodotto, e il guardrail ignora le persone). Resta un tema **GDPR** (§2), non un fattore di "alto rischio" AI Act.

---

## 4. Raccomandazioni operative

1. **Piano a pagamento (a consumo di token) confermato** → Google non addestra sui dati: manca solo il passo formale di **accettare/firmare il DPA** (Google Cloud Data Processing Addendum) e archiviarne prova.
2. Valutare **Vertex AI con data residency UE** se si vuole tenere il trattamento interamente in Europa (opzionale, non obbligatorio con DPA+SCC).
3. **Avviso + consenso sulla foto** nella ricerca per immagine ("evita persone/dati personali"). — *piccola aggiunta UI*
4. Mantenere: **niente persistenza** della foto, **niente dati anagrafici** verso l'AI, **guardrail** che ignora le persone.
5. **Trasparenza AI Act**: mantenere l'etichetta "AI" sulla ricerca e sulle immagini; aggiungere nota "descrizione generata con AI" sulle descrizioni.
6. Aggiornare **informativa privacy, registro trattamenti, LIA**; valutare se serve una **DPIA** (probabile NO se piano a pagamento + minimizzazione attuale).
7. Il **log costi AI** già presente aiuta l'**accountability** (art. 5.2): chi ha usato l'AI, quando, quanto.

---

## 5. Sintesi per il cliente (1 riga)
> Il piano Gemini è **a pagamento (a consumo)**, quindi Google non addestra sui dati: manca solo **firmare il DPA** e aggiungere un **avviso sulla foto** caricata dal cliente; sul piano AI Act il sistema è **a basso rischio**, con i soli obblighi di **dichiarare che è un'IA** e **marcare i contenuti generati** — **già assolti** (badge "AI" su sito e cataloghi + watermark SynthID).
