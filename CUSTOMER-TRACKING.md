# Tracciamento comportamento clienti — Progetto

## 1. È possibile? Sì. E parti avvantaggiato.

Hai già:
- **`AuditLog`** (append-only: chi, azione, entità, dettagli JSON, ip, quando)
  → oggi logga le scritture admin, si estende agli eventi cliente.
- **`Session`** (express-session) → sai chi è loggato a ogni richiesta.
- Le **azioni chiave passano già dal backend** (catalogo, carrello, ordini):
  gran parte del tracking è "gratis", basta scriverlo.

Quello che NON hai ancora e serve aggiungere: i **micro-eventi lato browser**
(pagina vista, tempo di permanenza, scroll, ricerche) — perché non tutti
passano dall'API.

## 2. Decisione critica prima del codice: privacy

È tracciamento di persone identificate → **GDPR si applica** anche in B2B.
Regole non negoziabili:
- **Trasparenza**: informativa + finalità ("miglioriamo il servizio, assistenza
  commerciale"). Base giuridica: legittimo interesse / esecuzione contratto.
- **Minimizzazione**: traccia comportamenti d'uso, **mai** dati sensibili.
- **Retention**: eventi grezzi es. 12-24 mesi, poi si tengono solo gli
  aggregati. Definiscila a monte.
- **Accesso ristretto**: solo admin autorizzati vedono il dettaglio per cliente.

Senza questo, lo strumento è un rischio legale, non un asset.

## 3. Cosa tracciare (tassonomia eventi)

Un unico "vocabolario" di eventi, ognuno con: `customerId`, `tipo`,
`entita`+`entitaId`, `dettagli` (JSON), `sessionId`, `ts`.

**Lato server (affidabile, già in transito):**
- `login`, `logout`
- `articolo.view` (apre scheda)
- `ricerca` (query + n. risultati)
- `carrello.add` / `carrello.remove` / `carrello.update_qty`
- `ordine.create` / `ordine.view`
- `listino.view`, `giacenza.check`

**Lato client (beacon leggero, per il "quanto tempo / dove"):**
- `page.view` (path + referrer)
- `page.leave` (tempo di permanenza in secondi)
- `scroll.depth` (25/50/75/100%)
- `articolo.dwell` (secondi sulla scheda, foto guardate)

Un solo endpoint `POST /api/eventi` che accetta batch di eventi client
(inviati con `navigator.sendBeacon`, non blocca la navigazione).

## 4. Dove stoccare (modello dati)

Due tabelle, semplici:

**`customer_event`** (append-only, il grezzo):
```
id, customer_id, session_id, tipo, entita, entita_id,
dettagli jsonb, ip, user_agent, ts
indice: (customer_id, ts), (tipo, ts), (entita, entita_id)
```
> Riusa la logica di `AuditLog` ma tabella dedicata: volumi alti, non mischiare
> con l'audit amministrativo.

**`customer_session`** (una riga per sessione, aggregata):
```
id, customer_id, started_at, ended_at, durata_sec,
pagine_viste, articoli_visti[], ricerche[], device, ip
```
> Si popola/aggiorna dagli eventi: dà subito "dove va, quanto ci resta".

Partizionamento per mese quando il volume cresce (Postgres `PARTITION BY
RANGE(ts)`) — non subito, solo se serve.

## 5. Renderlo fruibile da un UMANO (strumenti admin)

- **Timeline cliente**: cronologia eventi leggibile ("14:02 ha cercato 'cotto
  h50', 14:03 aperto ARGO NOCCIOLA, 14:05 aggiunto 3 pz, 14:09 rimosso").
- **Scheda comportamentale** per cliente: sessioni, tempo medio, articoli più
  visti, articoli visti-ma-mai-ordinati, ultimo accesso.
- **Funnel**: vede → aggiunge → ordina (dove si perdono).
- **Heatmap articoli**: i più visti / i "abbandonati nel carrello".
- **Alert commerciali**: "cliente X attivo dopo 60 gg di silenzio",
  "ha guardato 5 volte l'articolo Y senza ordinarlo" → spunto per l'agente.

Tutto sopra le due tabelle: nessun tool esterno necessario.

## 6. Renderlo fruibile da un'AI (la parte che conta)

Il grezzo eventi **non** si dà in pasto a un LLM: è troppo, e costa. Serve un
**layer di sintesi** in tre livelli:

1. **Eventi grezzi** (`customer_event`) → verità, interrogabili con SQL.
2. **Riassunti in linguaggio naturale**, generati periodicamente (fine
   sessione / notturno):
   - per **sessione**: "Il cliente ha esplorato i vasi in cotto, interessato
     alle altezze 50cm, ha ordinato 3 referenze."
   - per **cliente** (profilo aggiornato): interessi, stagionalità, categorie
     preferite, segnali di abbandono.
   Salvati in una tabella `customer_insight` (`customer_id`, `periodo`,
   `testo`, `metriche jsonb`, `generato_il`).
3. **Embedding** dei riassunti (pgvector) → l'AI recupera per similarità e
   risponde a domande tipo "quali clienti si comportano come X?" o "riassumi
   l'interesse del cliente Y negli ultimi 3 mesi".

Così l'AI lavora su testo sintetico + numeri, non su milioni di righe: veloce,
economico, e con l'SQL sotto per i dettagli quando servono.

Usi AI concreti:
- Riassunto on-demand di un cliente per l'agente prima di una chiamata.
- "Prossima azione consigliata" per cliente (up-sell, riattivazione).
- Segmentazione automatica ("esploratori", "ricompratori", "dormienti").

## 7. Architettura in una riga

```
Browser (beacon) ─┐
                  ├─→ POST /api/eventi ─→ customer_event (grezzo)
API server (hook)─┘                          │
                                    job notturno ▼
                        customer_session (aggregato) + customer_insight (AI)
                                             │
                              Admin UI  ◄────┴────►  AI (RAG su insight+embedding)
```

## 8. Roadmap a fasi

- **Fase 1 (base):** tabella `customer_event` + logging server-side degli
  eventi che già passano dall'API (login, view, carrello, ordini). Timeline
  cliente in admin. → Valore immediato, zero frontend nuovo.
- **Fase 2 (client):** endpoint `/api/eventi` + beacon per page.view/tempo/
  scroll. Tabella `customer_session`. Scheda comportamentale + funnel.
- **Fase 3 (AI):** job di sintesi → `customer_insight`, embedding pgvector,
  riassunti on-demand e "prossima azione".

## 9. Cosa NON fare

- Non tracciare tutto "a caso": definisci prima la **tassonomia** (§3),
  altrimenti raccogli rumore inutilizzabile.
- Non dare gli eventi grezzi all'AI: usa il **layer di sintesi** (§6).
- Non usare uno strumento esterno (GA, Hotjar) per dati B2B nominativi: perdi
  controllo, privacy e proprietà del dato. Tieni tutto in casa.
- Non rimandare la **retention**: senza policy, la tabella cresce senza
  controllo e diventa un problema legale e tecnico.
- Non esporre il dettaglio comportamentale fuori dal ruolo admin.
