# Agenti — Specifica Applicazione

## 1. Visione d'Insieme

L'applicazione Agenti è un **frontend dedicato** per i venditori/agenti che operano per conto di clienti B2B. L'agente accede con le stesse credenziali del personale interno (tabella `users`), ma viene instradato su una interfaccia ottimizzata per la gestione per conto terzi. Il database è lo stesso del B2B; nessuna nuova entità viene creata senza necessità.

### 1.1. Principi Fondamentali

- **Single sign-on**: l'agente è un utenza `users` con `ruolo=AGENTE` (nuovo valore di `AdminRole`)
- **Contesto cliente**: l'agente seleziona un cliente su cui operare; tutto il resto dell'applicazione opera in quel contesto
- **Mobile-first**: interfaccia progettata per uso prevalente da smartphone/tablet
- **Stesso DB**: nessun dato duplicato; le entità `Carrello`, `CartItem`, `RigaOrdine`, `OrdineCliente` sono le stesse usate dal portale clienti B2B
- **Nessuna modifica all'esistente**: l'applicazione Agenti si aggiunge come modulo frontend + backend, senza alterare i percorsi, controller o componenti esistenti

---

## 2. Architettura

### 2.1. Modello Dati — Estensioni Necessarie

```
┌─────────────────────┐
│       User          │ ← tabella esistente
│  ruolo: AdminRole   │ ← si aggiunge ADMIN_ROLE.AGENTE
└─────────┬───────────┘
          │ 1
          │
          │ N
┌─────────▼───────────┐
│  AgentCustomer       │ ← NUOVA tabella
│  userId              │
│  customerId          │
│  createdAt           │
└─────────────────────┘

┌─────────────────────┐
│    CartItem          │ ← tabella esistente
│  ...                 │
│  notaAgente?         │ ← NUOVO campo opzionale (TEXT)
└─────────────────────┘

┌─────────────────────┐
│  RigaOrdine          │ ← tabella esistente
│  ...                 │
│  notaAgente?         │ ← NUOVO campo opzionale (TEXT)
└─────────────────────┘
```

**Dettaglio nuove entità/campi:**

| Entità | Tipo | Descrizione |
|---|---|---|
| `User.ruolo` | `AdminRole` | Nuovo valore: `AGENTE` |
| `AgentCustomer` | Nuova tabella | Relazione N:N tra `User` e `Customer` |
| `AgentCustomer.userId` | FK → `User.id` | |
| `AgentCustomer.customerId` | FK → `Customer.id` | |
| `CartItem.notaAgente` | `TEXT?` | Nota dell'agente sulla riga carrello |
| `RigaOrdine.notaAgente` | `TEXT?` | Nota dell'agente copiata dal carrello all'atto dell'ordine |

### 2.2. Schema Di Navigazione

```
Login (stessa pagina /login)
  │
  ▼
Reindirizzamento per ruolo:
  ├── ruolo=AGENTE  ──►  /agent
  ├── ruolo=admin   ──►  /admin (admin panel)
  └── customer      ──►  /area (portale cliente B2B)
         │
         ▼
  /agent/                         → Selezione cliente (00)
  /agent/{customerId}/dashboard   → Dashboard cliente (01)
  /agent/{customerId}/catalogo    → Catalogo (02)
  /agent/{customerId}/catalogo/{codiceLinea}  → Dettaglio prodotto (03)
  /agent/{customerId}/carrello    → Carrello (04)
  /agent/{customerId}/checkout    → Checkout (05)
  /agent/{customerId}/ordini      → Storico ordini
```

### 2.3. Flussi Principali

#### 2.3.1. Login e Reindirizzamento
1. L'utente inserisce email/password su `/login`
2. `AuthService.validateLogin()` cerca in `users` e `customers`
3. Se trovato in `users` e `ruolo=AGENTE` → `userType: 'agent'`
4. Il frontend reindirizza a `/agent`
5. Se l'utente non ha clienti associati, mostra schermata di errore

#### 2.3.2. Selezione Cliente
1. `GET /api/agent/clienti` → lista clienti associati all'agente
2. Ogni card cliente mostra: badge, nome, codice, P.IVA, fatturato YTD, n. ordini
3. Al click → naviga a `/agent/{customerId}/dashboard` e imposta `activeCustomerId` in sessione

#### 2.3.3. Contesto Cliente in Sessione
- Il backend memorizza `activeCustomerId` nella sessione
- Tutte le API agenti usano `req.session.activeCustomerId` come contesto
- L'header mostra il cliente attivo con badge, nome e link per cambiare

#### 2.3.4. Carrello e Checkout
- L'agente opera SUL carrello DEL cliente (`Carrello.clienteId`)
- Le `CartItem` hanno il nuovo campo `notaAgente`
- In checkout, la `notaAgente` di ogni riga viene copiata su `RigaOrdine.notaAgente`
- Un campo "Nota agente" globale viene salvato su `OrdineCliente.notaAgente` (campo esistente o nuovo)

---

## 3. Pagine e Componenti (Frontend)

### 3.1. Nuovo Route Group: `/agent/`

| Route | Funzione | Componenti Chiave |
|---|---|---|
| `/agent` | Selezione cliente | `ClientList`, `ClientCard` |
| `/agent/{customerId}/dashboard` | Dashboard cliente | `DashboardCards`, `OrdiniRecenti`, `TopArticoli` |
| `/agent/{customerId}/catalogo` | Catalogo con prezzi cliente | `CatalogGrid`, `FilterBar` |
| `/agent/{customerId}/catalogo/{codiceLinea}` | Dettaglio prodotto | `VariantSelector`, `PrezziCliente` |
| `/agent/{customerId}/carrello` | Carrello | `CartItems`, `CartSummary`, `QtyControl`, `NotaAgenteInput` |
| `/agent/{customerId}/checkout` | Checkout | `Stepper`, `SpedizioneForm`, `PaymentSelector`, `Riepilogo`, `NotaAgenteGlobal` |
| `/agent/{customerId}/ordini` | Storico ordini | `OrderTable`, `OrderDetailModal` |

### 3.2. Componenti Condivisi

- `AgentLayout` — layout con header agente, tab-bar mobile, sidebar desktop
- `AgentHeader` — barra agente (nome, avatar, zona) + badge cliente attivo
- `ClientBadge` — badge cilindrico con iniziali e colore
- `ClientSwitcher` — dropdown per cambiare cliente rapidamente
- `TabBar` — navigazione bottom fisso (Dashboard, Catalogo, Carrello, Checkout)
- `ThemeToggle` — bottone Aa per modalità accessibile

### 3.3. Componenti Esistenti da Riutilizzare

- `DataTable` (admin) → per storico ordini agente
- `VariantSelector` → da catalogo area cliente, adattato per agente
- `ImageDropzone` / `EditImageModal` → per admin raccolte/famiglie

---

## 4. API Backend — Nuovo Modulo `AgentModule`

| Endpoint | Metodo | Descrizione |
|---|---|---|
| `GET /api/agent/clienti` | — | Lista clienti associati all'agente con statistiche YTD |
| `GET /api/agent/dashboard` | — | Dati dashboard per cliente attivo |
| `GET /api/agent/catalogo` | — | Catalogo con prezzi del cliente attivo (riusa logica esistente) |
| `GET /api/agent/catalogo/:codiceLinea` | — | Dettaglio con prezzi cliente attivo |
| `GET /api/agent/carrello` | — | Carrello del cliente attivo |
| `POST /api/agent/carrello` | — | Aggiungi articolo al carrello cliente |
| `PATCH /api/agent/carrello/:itemId` | — | Modifica quantità/nota agente |
| `DELETE /api/agent/carrello/:itemId` | — | Rimuovi articolo |
| `GET /api/agent/checkout/dati` | — | Dati checkout del cliente attivo |
| `POST /api/agent/checkout/conferma` | — | Invia ordine per conto cliente |
| `GET /api/agent/ordini` | — | Storico ordini del cliente attivo |
| `GET /api/agent/stats` | — | Statistiche riepilogative per l'agente (tutti i clienti) |

**Principio**: ogni endpoint agente chiama internamente i servizi esistenti (`CarrelloService`, `CheckoutService`, `OrdiniService`, `CatalogoService`) ma con il `customerId` contestuale invece che dal `req.user` del cliente loggato.

---

## 5. Verifica Congruenze con Struttura Attuale

### 5.1. Punti di Attenzione

| Area | Stato | Azione |
|---|---|---|
| **Autenticazione** | `AuthUser.userType` è `'admin' \| 'customer'` | Aggiungere `'agent'` come terzo tipo. Aggiornare tipo TypeScript in `auth-types.ts` |
| **Login redirect** | `userType === 'admin' → /admin` | Aggiungere `'agent' → /agent` |
| **RolesGuard** | Usa `@Roles('admin')` o `@Roles('customer')` | Aggiungere `'agent'` dove serve, o creare `AgentGuard` |
| **Permessi** | Permission strings esistenti non coprono agenti | Aggiungere permessi `agent.clienti.view`, `agent.ordini.create`, ecc. (opzionale, sotto `AGENTE` si può procedere senza permessi granulari) |
| **Carrello** | Un carrello per cliente (`Carrello.clienteId` unique) | L'agente usa lo STESSO carrello del cliente. OK senza modifiche strutturali. |
| **Checkout** | `CheckoutService.conferma()` usa `req.user` per customerId | Modificare per accettare `customerId` opzionale (dalla sessione agente) |
| **Nota agente** | Campo inesistente su `CartItem` e `RigaOrdine` | Aggiungere `notaAgente TEXT` su entrambe le tabelle |
| **Prezzi** | Catalogo calcola prezzi in base a `codiceListino` del cliente | L'agente vede i prezzi del cliente selezionato. Logica già presente, va solo contestualizzata. |
| **Ordini** | `OrdiniService` filtra per `customerId` da `req.user` | Accettare `customerId` esplicito dalla richiesta agente |
| **Admin esistente** | Nessuna modifica ai percorsi esistenti | OK: il modulo Agenti è autonomo |
| **Middleware** | Nessun `middleware.ts` lato Next.js | Da creare per instradare `/agent/*` |

### 5.2. Schema Database — Modifiche Minime

```sql
-- 1. Aggiungere nuovo ruolo all'enum AdminRole (migrazione)
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'AGENTE';

-- 2. Nuova tabella ponte
CREATE TABLE "AgentCustomer" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "customerId" INTEGER NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("userId", "customerId")
);

-- 3. Nuovo campo su CartItem
ALTER TABLE "CartItem" ADD COLUMN "notaAgente" TEXT;

-- 4. Nuovo campo su RigaOrdine
ALTER TABLE "RigaOrdine" ADD COLUMN "notaAgente" TEXT;
```

---

## 6. Roadmap di Sviluppo

### Step 1 — Modello Dati e Backend Core (3-5 giorni)
- [ ] Migrazione Prisma: `AdminRole.AGENTE`, tabella `AgentCustomer`, campi `notaAgente`
- [ ] Nuovo `AgentModule` con controller, service, DTO
- [ ] Estendere `AuthUser` con `userType: 'agent'` e `toAgentProfile()`
- [ ] `AgentGuard` e `AgentCustomerGuard`
- [ ] Endpoint `GET /api/agent/clienti`
- [ ] Endpoint `GET /api/agent/dashboard` (statistiche YTD)
- [ ] Endpoint di contesto: set/get `activeCustomerId` in sessione
- [ ] Test di login e reindirizzamento

### Step 2 — Selezione Cliente e Dashboard (3-4 giorni)
- [ ] Route `/agent` con `AgentLayout`
- [ ] `ClientList` e `ClientCard` (dati reali da API)
- [ ] Ricerca clienti con filtro locale
- [ ] Route `/agent/{customerId}/dashboard`
- [ ] `DashboardCards` (Fatturato YTD, Ordini YTD, Valore carrello)
- [ ] `OrdiniRecenti` (ultimi 5 ordini)
- [ ] `TopArticoli` (articoli più ordinati)
- [ ] `AgentHeader` con badge cliente e dropdown switcher
- [ ] `TabBar` navigazione

### Step 3 — Catalogo e Dettaglio Prodotto (3-5 giorni)
- [ ] Route `/agent/{customerId}/catalogo`
- [ ] `CatalogGrid` con filtri (famiglia, raccolta, ricerca, ordinamento)
- [ ] Prezzi contestualizzati per listino cliente
- [ ] Route `/agent/{customerId}/catalogo/{codiceLinea}`
- [ ] `VariantSelector` con giacenza e multiplo
- [ ] Pulsante "Aggiungi al carrello"
- [ ] Breadcrumb navigazione

### Step 4 — Carrello (4-5 giorni)
- [ ] Route `/agent/{customerId}/carrello`
- [ ] `CartItems` (carosello orizzontale mobile, lista verticale desktop)
- [ ] `QtyControl` con rispetto multiplo
- [ ] `NotaAgenteInput` per ogni riga
- [ ] `CartSummary` con sticky sidebar desktop
- [ ] Riepilogo sconti (cliente, famiglia, articolo)
- [ ] Pulsante "Procedi al checkout"
- [ ] Layout responsive (tab-bar fissa mobile, due colonne desktop)

### Step 5 — Checkout e Invio Ordine (4-5 giorni)
- [ ] Route `/agent/{customerId}/checkout`
- [ ] `Stepper` (Carrello → Checkout → Conferma)
- [ ] Sezione Spedizione (indirizzo, vettore, porto)
- [ ] Sezione Pagamento (condizioni lette da cliente)
- [ ] `NotaAgenteGlobal` (campo textarea per nota generale)
- [ ] `RiepilogoEconomico` (subtotale, sconti, IVA, totale)
- [ ] `ConfermaOrdine` con recap finale
- [ ] Invio ordine con contesto agente
- [ ] Copia `notaAgente` da carrello a righe ordine
- [ ] Modal success con numero ordine

### Step 6 — Storico Ordini (2-3 giorni)
- [ ] Route `/agent/{customerId}/ordini`
- [ ] `OrderTable` filtrabile per anno
- [ ] `OrderDetailModal` con dettaglio righe e note agente
- [ ] Stato ordine e tracking

### Step 7 — Admin: Gestione Agenti (3-4 giorni)
- [ ] Nuova sezione `Agenti` nel pannello admin
- [ ] Lista agenti (`User` con `ruolo=AGENTE`)
- [ ] Creazione/modifica agente
- [ ] Associazione cliente → agente (`AgentCustomer`)
- [ ] Visualizzazione clienti associati per agente
- [ ] Permessi: `admin.agents.view`, `admin.agents.create`, `admin.agents.edit`
- [ ] Email di benvenuto per nuovi agenti (template dedicato)

### Step 8 — Messa in Produzione (2-3 giorni)
- [ ] Test incrociati: login come admin → /admin, login come customer → /area, login come agente → /agent
- [ ] Verifica coesistenza carrelli (agente e cliente condividono lo stesso carrello)
- [ ] Test permessi e sicurezza (agente non può operare su clienti non associati)
- [ ] Verifica sync Integra (ordini creati da agente vengono sincronizzati come ordini cliente)
- [ ] Deploy migrazioni DB
- [ ] Documentazione utente (guida rapida agente)

---

## 7. Pagine Admin da Sviluppare

### 7.1. Sezione "Agenti" nel Pannello Admin

Una nuova sezione nell'admin sidebar, sotto "Vendite" o come gruppo autonomo:

| Pagina | Funzione |
|---|---|
| `/admin/agenti` | Lista agenti con ricerca, filtro per zona/stato |
| `/admin/agenti/nuovo` | Creazione nuovo agente (nome, email, password, zona, clienti associati) |
| `/admin/agenti/{id}` | Dettaglio agente: modifica profilo, gestione clienti associati, statistiche |
| `/admin/agenti/{id}/clienti` | Tabella clienti associati con aggiunta/rimozione |

**Componenti admin necessari:**
- `AgentiSection.tsx` — componente principale sezione
- `AgenteDetailModal.tsx` o pagina dedicata
- `AssociaClientiModal.tsx` — multi-select clienti con ricerca

### 7.2. Nota: Permessi "Agenti"

I permessi esistenti si estendono con:

```
admin.agents.view
admin.agents.create
admin.agents.edit
admin.agents.delete   (soft-delete, come per utenti admin)
```

---

## 8. Considerazioni sul Design

### 8.1. Coerenza con l'Esistente
- Il layout agente usa lo stesso `globals.css` del B2B
- I colori, font, spaziature seguono il design system esistente (`oklch` palette)
- La tab-bar mobile è mutuata dal pattern del portale clienti

### 8.2. Mobile-First
- Breakpoint: mobile < 768px, tablet/desktop ≥ 768px
- Tab-bar fissa in basso su mobile, statica su desktop
- Carosello orizzontale per card carrello su mobile
- Due colonne (lista + summary) su desktop

### 8.3. Accessibilità
- Pulsante "Aa" per tema ad alto contrasto, già presente in tutti i prototipi
- Stessa logica di `localStorage('agentTheme')` e `[data-theme="accessible"]`
- Dimensioni font incrementate nel tema accessibile (già implementato in `agent.css`)

---

## 9. Riepilogo Modifiche al DB

| Tabella | Modifica | Impatto |
|---|---|---|
| `User` | Nuovo valore `AGENTE` per `ruolo` (enum `AdminRole`) | Nessuna modifica struttura; migrazione ALTER TYPE |
| `CartItem` | Nuovo campo `notaAgente TEXT` | Campo opzionale; non rompe esistente |
| `RigaOrdine` | Nuovo campo `notaAgente TEXT` | Campo opzionale; non rompe esistente |
| — | Nuova tabella `AgentCustomer` (FK → User, Customer) | Entità nuova; nessun impatto su esistenti |
| — | Nuova tabella `AgentSession` o campo `activeCustomerId` in sessione | Solo runtime; nessuna migrazione |

**Nessuna modifica a**: `Customer`, `Articolo`, `Variante`, `Famiglia`, `Raccolta`, `OrdineCliente`, `IndirizzoCliente`, `ContattoCliente`, `ModalitaPagamento`, `ModalitaPorto`, `ModalitaSpedizione`, `Vettore`, `PermissionGroup`, `AdminPermission`, `AuditLog`, `SiteConfig`, `Session`, `SyncConfig`.

---

## 10. Conclusione

L'applicazione Agenti si inserisce come **terzo ramo** dell'ecosistema B2B:

```
          ┌──────────┐
          │  /login  │
          └────┬─────┘
               │
     ┌─────────┼─────────┐
     │         │         │
     ▼         ▼         ▼
  ┌──────┐ ┌──────┐ ┌──────┐
  │Admin │ │Area  │ │Agent │
  │/admin│ │/area │ │/agent│
  └──────┘ └──────┘ └──────┘
     ↑         ↑         ↑
     └─────────┼─────────┘
               │
          ┌────▼────┐
          │ Stesso  │
          │   DB    │
          └─────────┘
```

Sviluppo stimato: **25-33 giorni/uomo** per la prima release completa.
