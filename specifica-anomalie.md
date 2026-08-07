# Proposta · Tracciamento anomalie e problemi

## Modello dati (`anomalia_log`)

```sql
CREATE TABLE anomalia_log (
  id          SERIAL PRIMARY KEY,
  tipo        TEXT NOT NULL,            -- 'sync', 'api', 'calcolo', 'carrello', 'checkout'
  gravita     TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  contesto    TEXT,                      -- 'cliente:123', 'listino:LIS1', 'ordine:B2B-123'
  messaggio   TEXT NOT NULL,
  dettaglio   JSONB,                    -- payload, stack, parametri
  risolto     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  risolto_il  TIMESTAMPTZ
);
```

## Backend

1. **`AnomaliaService`** — scrive sul DB e opzionalmente notifica (Slack/email)
2. **Interceptor globale** — cattura eccezioni 500 e le logga come anomalie
3. **Chiamata manuale** dalle `catch` esistenti nei sync e nei servizi critici

## Frontend

4. **Admin → Sezione "Anomalie"** (nuova voce sidebar):
   - Tabella con tipo, gravità, contesto, data, stato (aperto/risolto)
   - Filtro per tipo, gravità, risolto/non risolto
   - Bottone "Segna come risolto"
   - Badge colorati per gravità

## Punti di aggancio prioritari

| Punto | Cosa tracciare |
|-------|---------------|
| `sync.service.ts` catch | Sync falliti (articoli, clienti, listini, ordini) |
| `checkout.service.ts` catch | Checkout falliti |
| `integrazione.service.ts` catch | Errori dblink/fdw |
| Global exception filter | 500 non gestiti |

## Stima

~2 ore backend + ~2 ore frontend. Totale ~4 ore.
