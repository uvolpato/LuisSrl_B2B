# Costi e architettura — Piattaforma B2B Luis S.r.l.

Versione: bozza 1.0 — 5 giugno 2026

## Come funziona (spiegato semplice)

Il portale B2B si appoggia a **due macchine** già presenti in azienda, collegate in rete locale:

**1. Il server che già usate per Integra** — ospita il portale vero e proprio (catalogo, ordini, clienti, listini) e il database. È lo stesso server che già gestite, nessun costo aggiuntivo.

**2. Un Mini PC con 128 GB di RAM condivisa** — fa solo da "motore AI". Ci girano i modelli di linguaggio (Qwen 27B) che generano descrizioni articoli, rispondono alle ricerche dei clienti e analizzano le immagini. Costa solo l'elettricità (~€22/mese) perché la macchina è vostra.

**Il vantaggio:** l'AI non ha costi di abbonamento o di chiamata API. Le performance sono paragonabili a modelli cloud come GPT-4o o Claude, ma senza pagare al token o al minuto di GPU. Il modello gira in locale, sempre acceso, con latenza zero (è sulla stessa rete).

**L'unico costo extra** sono le immagini "ambientate" (foto dei prodotti in contesto d'uso, es. un vaso dentro un soggiorno arredato) che vengono generate tramite servizi come DALL·E o Stable Diffusion. Sono circa €9/mese per una ventina di immagini.

---

## Schema architettura

```
┌─────────────────────────────────────────────────────────────┐
│                     RETE LOCALE (LAN)                       │
│                                           ┌─────────────┐  │
│  ┌──────────────────────────────────┐     │             │  │
│  │         SERVER LOCALE            │     │  MINI PC    │  │
│  │                                  │     │             │  │
│  │  • PostgreSQL + pgvector         │     │  • LM Studio│  │
│  │  • n8n                           │◄────│  • Qwen 27B │  │
│  │  • Next.js (frontend)            │ HTTP│  • Embedding│  │
│  │  • FastAPI (backend)             │     │  • Image2Txt│  │
│  │  • Redis                         │     │             │  │
│  │  • App B2B completa              │     │  128 GB RAM │  │
│  │                                  │     │  (condivisa) │  │
│  └──────────────────────────────────┘     └─────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼  (solo traffico clienti/fornitore)
                     ─── INTERNET ───
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Clienti B2B              Fornitore Integra
         (rivenditori)            (scambio Excel ordini)
```

**Vantaggi della soluzione:**
- Latenza zero tra app e GPU (stessa LAN, ~1ms)
- GPU sempre calda (modello in VRAM, nessun cold start)
- Costo GPU = solo elettricità
- Dati sensibili in rete locale, non su cloud pubblico
- 128 GB RAM condivisa GPU/CPU = modelli grandi senza problemi

---

## Costi

### Una tantum (hardware)

| Voce | Dettaglio | Costo |
|------|-----------|-------|
| Mini PC (128 GB RAM unificata) | Es. AMD Ryzen AI MAX+ 395, 128GB LPDDR5X condivisa, SSD 1TB | ~€1.200-1.800 (una tantum) |
| Server locale | Già esistente | €0 |

### Mensili (esercizio)

| Voce | Dettaglio | Costo/mese |
|------|-----------|-----------|
| **Elettricità Mini PC** | ~100W medio × 24h × 30gg × €0,30/kWh | **~€22** |
| **Elettricità server locale** | Già esistente, consumo irrisorio aggiuntivo | ~€5 |
| **Dominio e DNS** | .it o .com | ~€2 |
| **SSL (Let's Encrypt)** | Gratuito | €0 |
| **Backup esterno** (opzionale) | Cloud storage per backup DB | ~€5 |
| **API immagini DALL·E / SD** | ~25 immagini/mese | ~€9 |
| **Notifiche email** | Resend / SendGrid tier gratuito | €0 |
| **TOTALE** | | **~€38-43/mese** |

### Riepilogo annuale

| Voce | Costo |
|------|-------|
| Mini PC (una tantum) | €1.200-1.800 |
| Esercizio primo anno (€40 × 12) | ~€480 |
| **Totale primo anno** | **~€1.700-2.300** |
| **Anni successivi** | **~€480/anno** |

### Confronto con soluzioni cloud

| Soluzione | Costo/mese GPU | Latenza | Cold start |
|-----------|---------------|---------|-----------|
| **Mini PC locale** (questa soluzione) | **€22 (elettricità)** | ~1ms | No |
| TensorDock 24/7 (RTX 3090) | ~€200 | ~20-50ms | No |
| TensorDock on-demand | ~€14 (60h) | ~20-50ms | Sì (~2-5 min) |
| RunPod Serverless | ~$15 (60h) | ~20-50ms | Sì (~15-30 sec) |

### Note

- I costi di sviluppo (tue ore) non sono inclusi — solo costi operativi e hardware.
- API DALL·E/SD per immagini ambientate: costo variabile, stimato ~€9/mese per ~25 immagini.
- Se usi modelli immagine open-source (SDXL, FLUX) sul Mini PC invece di DALL·E, risparmi quei €9/mese ma perdi qualità sulle immagini ambientate.
- 128 GB di RAM condivisa ti permettono di eseguire anche modelli 70B in Q4 (~40 GB), lasciando il resto del sistema fluido.
