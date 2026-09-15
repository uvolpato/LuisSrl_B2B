# Roadmap di costruzione — Piattaforma B2B Luis S.r.l.

Versione: 5.5 — 2 settembre 2026 (cache embedding, consolidamento modali, unificazione log, refactor sicurezza/prestazioni)
Architettura: server locale (app + DB) + Mini PC 128GB GPU condivisa (LM Studio)
Approccio: sviluppo AI-assisted (Claude), tutto in LAN

---

## Progresso attuale (riepilogo)

| Blocco | Stato | Gap |
|--------|-------|-----|
| **1** — Infrastruttura e accessi | ✅ COMPLETATO | — |
| **1A** — Profilazione ruoli e permessi | ✅ COMPLETATO | 🔴 modale crea/modifica utente con gruppo + override; 🔴 separazione anagrafica clienti read‑only |
| **2** — Integrazione Integra (lettura) | ✅ COMPLETATO | — |
| **3** — Listini e prezzi | ✅ Backend OK, frontend da ripulire | ⚠️ fallback listino unificato (`codiceListinoCliente`); resta pulizia UI scheda prodotto |
| **4** — Gestione articoli + AI | ✅ COMPLETATO | — |
| **5** — Catalogo lato cliente | ✅ COMPLETATO | 🔴 3 fix UI in ToDo (filtri sticky, responsive carrello, riepilogo checkout) |
| **6** — Clienti e inviti | ✅ COMPLETATO | — |
| **7** — Giacenza | ⚠️ Quasi completo | ✅ badge 3 livelli + filtro "solo disponibili"; ❌ data ultimo aggiornamento (~2 h) |
| **8** — Ordini | ⚠️ Quasi completo | ✅ carrello, checkout, admin cambio stato, mail conferma, sync schedulata; ❌ note interne (~3 h), ❌ mail cambio stato (~3 h) |
| **9** — Export ordini verso Integra | ✅ COMPLETATO | .xlsx + riconciliazione `mvt_vsrif` + vista `riferimento_b2b` + dedupe import |
| **10** — AI lato cliente | ⚠️ Quasi completo | ✅ ricerca semantica/immagine + cache embedding (LRU); ❌ cronologia visite (~6 h) |
| **11** — Collaudo, formazione, go‑live | ❌ NON INIZIATO | — |
| **12** — Tracciamento clienti | ⚠️ Quasi completo | ✅ eventi + beacon + funnel + timeline + sintesi AI (`customer_insight`); ❌ tabella sessioni aggregate (~10 h) |
| **13** — Dashboard AI: box suggerimenti personalizzati | ⚠️ Quasi completo | ✅ engine + cache + cron a finestra + selezione LLM + planner/anteprima + dedupe/profilo; ❌ CRUD promozioni (~10 h), ❌ click per box (~4 h) |
| **14** — Assistente commerciale: catalogo ad hoc | ❌ NON INIZIATO | Progettato in `DASHBOARD-SUGGERIMENTI-AI.md` §14 |

### Fatto in questa sessione (2 settembre 2026)
- **Box dashboard** completato: engine deterministico, cache+batch notturno, Fase 2 (selezione LLM con flag `DASHBOARD_LLM_SELECTION`), dedupe tra box, profilo cliente nel contesto, Fase 3 (planner a edit-time + anteprima test).
- **Sicurezza e robustezza**: SQL injection fix in `randomFallback`/`poolVincoli`, `confermaOrdine` in `$transaction`, `deleteCustomer` = blocco permanente (mai hard-delete), import ordini deduplicato (`riferimento_b2b`), fallback listino unificato.
- **Prestazioni**: N+1 eliminati (carrello/progetti/catalogo prezzi in batch), cache embedding LRU in-memory.
- **Infrastruttura frontend**: un solo sistema di modali (`common/Modal` + `maxWidth`), `.modal-root-*` spostate in globals, `.combobox` unico, tooltip DataTable via portal, CSS admin scopato sotto `.admin-page`.
- **Log**: `event_log` + `anomalia_log` unificati in `audit_log`; sezione "Log eventi" come tab del Pannello Amministrazione.
- **Mail**: conferma ordine con logo inline (CID) + intro di ringraziamento; import clienti con colonna email e skip dei senza-email.
- **Sync**: ordini schedulati automaticamente ogni 15 min; rimosso il tasto "Sincronizza" da "I miei ordini"; range date di default = mese corrente.

### Gap critici
1. **Admin gestione ordini (Blocco 8)** — manca UI/API per cambiare stato e note ordini (oggi lo stato arriva solo dalla sync Integra).
2. **CRUD promozioni (Blocco 13)** — modello `Promozione` esiste ma senza UI; i box `soloInOfferta` restano vuoti finché non ci sono promozioni a DB.
3. **Assistente commerciale catalogo ad hoc (Blocco 14)** — non iniziato.
4. **Giacenza (Blocco 7)** — filtro "solo disponibili" e timestamp ultimo aggiornamento in admin.

---

### Blocco 1 — Infrastruttura e accessi — ✅ COMPLETATO

**Completato — backend e accessi (commit 4502b97, a00adb7):**
- NestJS + Prisma 6 su PostgreSQL `LuisSrlDb` (pgvector abilitato), Docker compose
- ~~Stored procedure PL/pgSQL per ogni scrittura applicativa~~ → **rifattorizzato in Prisma CRUD (19/06)**
- **Autenticazione completa**: login argon2id, sessioni server-side su Postgres,
  cookie **HttpOnly + SameSite** (Secure in produzione), **CSRF**, **rate limiting
  5 login/min**, Helmet, CORS ristretto — tutto testato
- Cookie "Ricordami" (sessione 30 giorni) opzionale
- **Gestione clienti** via API (crea con password provvisoria, modifica,
  blocca/sblocca — mai cancellare, reset password)
- **Area cliente** con cambio password obbligato al primo accesso
- **Multilingua it/en** (next-intl), errori backend tradotti

**Completato — UI dal prototipo (commit da4c5b8):**
- Landing page pubblica da prototipo (hero, features, AI search, stats, linee, CTA, footer)
- Struttura immagini: `public/images/b2b/` (portale) + `public/images/articoli/` (prodotti futuri)
- Disclaimer "Prototipo dimostrativo" in fixed bottom
- Login modal riutilizzabile (`LoginModal`): Esc, click fuori, auto-focus, focus trap,
  toggle password, "password dimenticata", nota "accesso su invito → info@luisbg.it"
- `LoginForm` condiviso tra modale e pagina `/login`
- Admin con sidebar a sezioni (Gestione/Vendite/Strumenti) in stile prototipo
- `CLAUDE.md` aggiornato con architettura server locale + Mini PC

**Blocco 1 — Completato in sessione 13/06/2026:**
- **SettingsModal**: modale impostazioni con bordo fisso dal viewport, menu sinistro (cerca, Account, Informazioni), voce fissa "Impostazioni amministrazione" in basso
- **Login prefill**: credenziali admin precompilate in sviluppo (NODE_ENV=development o localhost), facili da rimuovere per produzione
- **Pannello di Amministrazione**: nuova sezione admin con tab Utenti e sub-nav Panoramica/Gruppi. Tabella utenti con DataTable condiviso, ricerca, paginazione, ruolo, nome, email, ultima attività, creato il
- **DataTable**: pagination footer nascosto quando totalPages ≤ 1
- **AdminSidebar**: click "Pannello di Amministrazione" naviga alla sezione

**Blocco 1A — Backend completato in sessione 13/06/2026 (rifattorizzato in Prisma CRUD 19/06):**
- Nuovi model Prisma: PermissionGroup, AdminPermission, isSuperAdmin + groupId su User
- ~~6 stored procedure PL/pgSQL~~ → **Prisma CRUD diretto**
- ~~AdminRepository + AdminService~~ → **AdminService usa Prisma direttamente**
- `@RequirePermission(perm)` decorator + PermissionsGuard
- API: CRUD gruppi, permessi utente, assegnazione gruppo
- UsersController protetto con permessi granulari
- Seed: 2 gruppi predefiniti, admin promosso a super admin
- ~~Schemi PostgreSQL organizzati in core/auth/users/admin~~ → **eliminati, tutto in TypeScript**

**Completato — frontend Blocco 1A (sessione 17/06/2026):**
- **MustChangePasswordModal**: cambio password obbligatorio al login (prima di entrare in admin), con logo Luis, campi nuova password + conferma, validazione client-side
- **Flusso change password spostato**: da admin page a livello login — LoginForm → onLoginSuccess → MustChangePasswordModal → redirect
- **Modal unificati**: backdrop onPointerDown con target check, stopPropagation sul div modale — fix chiusura involontaria
- **AdminPanel — sub-nav utenti**: Panoramica + Gruppi nella sidebar sinistra quando activeTab === "utenti"
- **GroupsSection**: DataTable con ricerca, crea/modifica/elimina gruppi
- **GroupEditorModal**: 21 permessi checkbox, CRUD via API (GET/POST/PUT/DELETE /api/admin/groups)
- **DataTable sorting**: sortable per colonna, client-side locale o server-side via onSort. Attivo su colonne utenti (Ruolo, Nome, Email, Creato il), clienti (Nome, Email), gruppi (Nome, Slug)
- **SettingsModal**: pulsante "Impostazioni amministrazione" solo per AMMINISTRATORE/SUPERUSER
- **AdminSidebar**: "Pannello di Amministrazione" nascosto per ruolo UTENTE
- **ProvisionalPasswordModal**: rimossa esposizione password in chiaro, solo messaggio "email inviata a X"
- **Bottone blocco/sblocco**: lucchetto chiuso rosso (BLOCCATO) / aperto (ATTIVO) via `icon` callback in RowAction
- **Conferma dialogo**: window.confirm su reset password, blocco/sblocco, elimina
- **Sezione Articoli (shell)**: header unificato con ricerca, filter pills, view toggle (Vista riga/Vista griglia — due bottoni separati con icona + tooltip), bottone "Nuovo Articolo", "Importa Excel"
- **View toggle responsive**: i bottoni Importa Excel e Nuovo Articolo si impilano verticalmente nel contenitore `.action-buttons` quando lo spazio è insufficiente; restando nella stessa riga di ricerca e pills

**Da fare — Blocco 2:** HTTPS/tunnel per il go-live (differito); sezioni admin oltre Clienti (Articoli, Famiglie, Raccolte, Ordini) con dati mock — diventano reali dal Blocco 2.

### Blocco 2 — Integrazione Integra — ✅ COMPLETATO (lettura, giugno–luglio 2026)
- Tabella `integrazioni_raw` + viste `vista_integra_famiglie/linee/prodotti` dall'export reale
  (`esportazioni.xlsx` → `backend/data/integra-prodotti.json`, script `seed-integra-from-export.js` con `--wipe`)
- **Import per linea**: l'aggregato Articolo è la linea (prodotti come Varianti); prodotti senza
  linea → un Articolo per prodotto. Mappa euristica id→linea (`integrazioni_linee_map`) in attesa
  dell'id esplicito da AGOMIR
- Schermata "Nuovo Articolo" con ricerca, selezione e import; lista aggiornata dopo l'import
- **⚠️ Solo lettura — export verso Integra (Blocco 9) non implementato**

### Blocco 4 — Gestione articoli + AI (admin) — ✅ COMPLETATO (giugno–luglio 2026)
- Sezioni admin Articoli / Famiglie / Raccolte complete (griglia+card, colonna descrizione,
  immagini con placeholder, stato attivo/nascosto)
- Famiglie: **titolo alternativo** (`nome_portale`, vince ovunque sul nome Integra), descrizione, immagine
- Scheda articolo admin: tab Generale/Immagini/Varianti/Descrizione AI/Famiglia/Raccolte,
  posizionamento immagini (EditImageModal: fit/posizione/zoom/rotazione), generazione immagini
  ambientate (Gemini) e wizard descrizione AI
- Flusso "configurato" irreversibile (foto+colore+varianti+descrizione AI; criterio listino nel Blocco 3)

### Blocco 5 — Catalogo lato cliente — ✅ COMPLETATO (luglio 2026)
- **Fase A**: `/area/catalogo` fedele al prototipo 02-catalog (sidebar filtri, tab raccolte,
  ricerca, griglia card, paginazione, modale AI, facets con conteggi, CIELAB color filter).
  API `GET /api/catalogo` — solo articoli configurati+attivi, guard customer
- **Fase B**: scheda articolo `/area/catalogo/[codice]` fedele a 03-product (galleria che
  rispetta il posizionamento immagini, lightbox, griglia d'ordine varianti con multipli,
  buy-box, articoli correlati con scoring CIELAB+raccolte+dimensioni).
  **Prezzi reali dal listino cliente** (`integra_listini_righe` con sconti a cascata)
- Dettaglio cliente blindato: 404 su articoli nascosti/non configurati, campi admin esclusi
- **⚠️ 3 fix UI in sospeso**: filtri sticky, responsive carrello, riepilogo checkout

### Credenziali admin
- Email: `admin@luissrl.it`
- Password: `LuisAdmin2026!`

---

## Blocco 1 — Infrastruttura e accessi (2-3 giorni)

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Setup server locale | App + DB su macchina interna (Docker, Postgres+pgvector) | ✅ fatto (deploy go-live a parte) |
| Landing page pubblica | Da prototipo HTML, immagini reali, hero/features/CTA | ✅ fatto |
| Login modale riutilizzabile | Con focus trap, Esc, toggle pwd, "password dimenticata" | ✅ fatto |
| LoginForm condiviso | Stesso form in modale e pagina `/login` | ✅ fatto |
| Login prefill dev | Credenziali admin precompilate in sviluppo | ✅ fatto |
| Autenticazione | Login argon2id, ruoli admin/cliente, sessioni Postgres | ✅ fatto |
| Gestione utenti | Crea/modifica/blocca/reset via stored procedure | ✅ rifattorizzato (Prisma CRUD) |
| Sicurezza app | Sessioni HttpOnly+SameSite, CSRF, rate limiting, Helmet | ✅ fatto |
| Settings modal | Modale impostazioni con menu (Account, Info, Impostazioni amministrazione) | ✅ fatto |
| Pannello Amministrazione | Sezione admin con tab Utenti (Panoramica + Gruppi), tabella DataTable | ✅ fatto |
| HTTPS in produzione | Reverse proxy / tunnel crittografato | 🔴 al go-live |
| Struttura immagini | `public/images/b2b/` + `public/images/articoli/` | ✅ fatto |

**Cosa si vede:** landing pubblica, login accessibile (con credenziali precompilate in dev),
admin con sezioni complete, modale impostazioni, pannello amministrazione con tabella utenti.
Tutto in italiano o inglese.


---

## Blocco 1A — Profilazione ruoli e permessi admin (2-3 giorni)

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| **Frontend UI shell** | AdminPanel (tab Utenti, sub-nav Panoramica/Gruppi), SettingsModal | ✅ fatto |
| **Panoramica utenti** | Tabella DataTable con colonne, ricerca, "+", icona edit, mock data | ✅ fatto (da collegare a API) |
| **Gruppi placeholder** | Pagina vuota per editor gruppi | ✅ fatto (da riempire) |
| Backend: tabella PermissionGroup | Nome, slug, set permessi (array text[]) | ✅ fatto |
| Backend: tabella AdminPermission | userId, permission, granted (UNIQUE su userId+permission) | ✅ fatto |
| Backend: flag super admin | `is_super_admin` su users + `groupId` (FK → permission_groups) | ✅ fatto |
| Backend: migration Prisma | `20260613183553_permission_models` | ✅ fatto |
| Backend: seed iniziale | Gruppo "Amministratore" (tutti permessi) + "Visualizzatore" (sola lettura), admin esistente promosso a super admin | ✅ fatto |
| Backend: stored procedure profili | Eliminate, sostituite con Prisma CRUD | ✅ rifattorizzato |
| Backend: schemi PostgreSQL | Eliminati (tutto in TypeScript) | ✅ rifattorizzato |
| Backend: AdminRepository | Eliminato (service usa Prisma direttamente) | ✅ rifattorizzato |
| Backend: AdminService | Letture Prisma, scritture su SP | ✅ fatto |
| Backend: decorator + guard | `@RequirePermission('...')` + `PermissionsGuard` (super admin bypassa, altrimenti set effettivo da gruppo + override) | ✅ fatto |
| Backend: API gruppi | `GET/POST/PUT/DELETE /api/admin/groups` | ✅ fatto |
| Backend: API permessi utente | `GET /api/admin/users/:id/permissions`, `PUT .../permissions`, `PUT .../group` | ✅ fatto |
| Backend: protezione controller esistenti | UsersController protetto con permessi granulari (view, create, edit, block) | ✅ fatto |
| Panoramica utenti da DB | Tabella reale da GET /api/admin/users, avatar color, presenza WS | ✅ fatto |
| Avatar color utenti | Colonna avatar_color, palette 10 oklch | ✅ fatto |
| WebSocket presenza | socket.io path /ws, auth via session, presence broadcast | ✅ fatto |
| Hook useWebSocket/usePresence | Singleton WS, reconnect, onAny router, isOnline(userId) | ✅ fatto |
| Pallino presenza tabella | Verde pulsante = WS online, grigio = offline | ✅ fatto |
| Panoramica: modale crea/modifica utente | Editor admin con gruppo + override permessi | 🔴 da fare |
| Gruppi: editor completo | Checkbox permessi, crea/modifica/elimina gruppo | ✅ fatto |
| Sidebar filtrata | Voci admin si mostrano/nascondono in base ai permessi | ✅ fatto |
| Settings → Impostazioni amministrazione | Pagina con config di sistema | ✅ fatto |
| Change password al login | MustChangePasswordModal prima di entrare in admin | ✅ fatto |
| Provisional password via email | Password provvisoria mai mostrata in chiaro | ✅ fatto |
| DataTable sorting | Ordinamento colonne cliccabili | ✅ fatto |
| Sezione Articoli (shell) | Header con ricerca, filtri, view toggle, bottoni azione | ✅ fatto |
| Separazione Anagrafica clienti | Sezione Clienti diventa read-only (da Integra) | 🔴 da fare |

**Blocco 1A — Backend completato in sessione 13/06/2026 (rifattorizzato 19/06):**
- Migrazione, guard, decorator, API invariati
- ~~Ogni scrittura passa da stored procedure PL/pgSQL con audit~~ → **Prisma CRUD + audit log inline**
- Gruppi di permessi (PermissionGroup) con set di permessi in array text[]
- Override per utente (AdminPermission): può concedere un permesso non nel gruppo o negarne uno presente
- Super admin bypassa tutti i controlli
- Seed: due gruppi predefiniti, admin esistente promosso a super admin
- API `/api/admin/groups` e `/api/admin/users/:id/permissions` + `/api/admin/users/:id/group`
- ~~Schemi PostgreSQL: core/auth/users/admin~~ → **eliminati**

**Aggiornamenti successivi (sessione 13-14/06/2026):**
- **Avatar color:** colonna `avatar_color` su users, palette 10 colori oklch assegnata random via service (ex `fn_user_create`). Migration `20260613220000_avatar_color`. Utenti esistenti aggiornati con colori random.
- **Endpoint `GET /api/admin/users`:** lista completa (ADMIN + CLIENTE) con paginazione, ricerca, filtro stato. Permesso `admin.permissions.view`.
- **AdminPanel da DB:** tabella utenti collegata all'API reale invece di mock data. Avatar circolare con colore dal DB.
- **WebSocket presenza:** socket.io su stesso server HTTP (path `/ws`). Autenticazione via session cookie `luis.sid`. Presenza in tempo reale: broadcast `user.online`/`user.offline`, lista `presence` al nuovo connesso.
- **Hook frontend riutilizzabili:** `useWebSocket()` (connessione singleton, reconnect auto, onAny router), `usePresence()` (isOnline, onlineIds, connected). Stesso socket usabile da qualsiasi componente per eventi futuri (notifiche, aggiornamenti).
- **Pallino presenza:** verde pulsante = utente con WS attiva online ora, grigio = offline (indipendentemente da stato DB).

**Aggiornamenti successivi (sessione 15-17/06/2026):**
- **Split utenti/clienti in due tabelle DB:** `users` (admin/staff) e `customers` (clienti). Model Prisma separati, migration `split_users_customers`. Profili (`UserProfile`/`CustomerProfile`) e service separati.
- **Login bifasico:** query Prisma diretta su `users` poi `customers` (sostituisce `auth.fn_login_lookup()`). `RolesGuard` controlla `userType` (`'admin'`|`'customer'`), `PermissionsGuard` solo per admin.
- **Soft-delete utenti admin:** campo `deletedAt` su `users`. Migration `soft_delete_users`. Endpoint `DELETE /users/:id` con soft-delete (stato BLOCCATO + deletedAt). Lista filtra per stato: ATTIVO, BLOCCATO, ELIMINATO, TUTTI. SUPERUSER escluso da blocco/eliminazione.
- **AdminPanel frontend — tabella unificata:** tab Utenti e tab Clienti con colonne distinte, DataTable condiviso. Azioni riga: Modifica, Reset password (icona `[===]`), Blocca/Sblocca (lucchetto), Elimina (solo admin). Filtro stato a tendina (solo tab Utenti). Bottone "+" per creazione.
- **Barra strumenti:** titolo, filtro stato, ricerca e bottone "Nuovo" sulla stessa riga.
- **Modali creazione/modifica utente:** `UserAdminEditorModal` per admin (email, nome, ruolo, lingua). Azioni interne: Reset password, Blocca/Sblocca, Elimina. Modale password provvisoria dopo creazione/reset.
- **Modali creazione/modifica cliente:** `UserEditorModal` già esistente, usato da entrambe le tabelle clienti.
- **Invio email password provvisoria:** `MailModule` + `MailService` con nodemailer. SMTP configurato in `.env`. Invia email con password provvisoria alla creazione e al reset password, sia per utenti admin che per clienti.
- **Icone azioni DataTable:** `IconLock` per blocca/sblocca, `IconReset` (rectangle-ellipsis) per reset password, `IconTrash` per elimina. Bottone blocco e reset nascosti per SUPERUSER.

**Cosa si vede:** backend completo per la gestione di gruppi e permessi; admin panel collegato al DB con avatar colorati e presenza WebSocket reale.

**Aggiornamenti nella tabella Blocco 1A:**
- Panoramica utenti: ✅ fatto (da DB reale, avatar color + presenza WS)
- Avatar color: ✅ fatto (colonna, palette, SP, migration)
- WebSocket presenza: ✅ fatto (socket.io, auth via session, useWebSocket/usePresence)
- Pallino presenza tabella: ✅ fatto (verde pulsante online, grigio offline)

**REFACTOR — stored procedure → Prisma CRUD (sessione 19/06/2026):**
- Eliminate tutte le stored procedure PL/pgSQL (`fn_user_*`, `fn_customer_*`, `fn_auth_log_attempt`, `fn_audit_log`, `fn_permission_group_*`, `fn_admin_permission_*`, `fn_user_assign_group`)
- Eliminati repository wrapper (`users.repository.ts`, `customers.repository.ts`, `admin.repository.ts`) e mapper errori (`sp-error.ts`, `user-row.ts`, `customer-row.ts`)
- Eliminati schemi PostgreSQL (`core`, `auth`, `users`, `customers`, `admin`)
- Sostituito con Prisma CRUD diretto nei service (`prisma.user.create/update/findUnique/...`)
- Audit log inline con `prisma.auditLog.create(...)` nei service
- Avatar color assegnato inline nel service (non più via SP)
- Login lookup unificato: query diretta Prisma su `users` e `customers` invece di `auth.fn_login_lookup()`
- ~1700 righe eliminate tra SQL raw e TypeScript boilerplate

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


---

## Blocco 3 — Listini e prezzi (1-2 giorni) ⚠️ Backend OK, frontend da ripulire

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Lettura listini da viste Postgres | Listini con prezzi per Variante (codice articolo), sola lettura | ✅ backend |
| Associazione cliente-listino | Admin assegna un listino a ogni cliente (campo `codiceListino` su Customer) | ✅ |
| Lettura sconti personalizzati da viste Postgres | Sconti aggiuntivi clienti specifici (opzionale) | ✅ backend (`integra_listini_sconti`) |
| Calcolo prezzo finale | Prezzo = listino del cliente − sconti a cascata (s1–s4) + extra raccolta | ✅ backend (`getPrezzo()`) |
| Esposizione prezzo in scheda articolo | Visibile solo a cliente loggato | ✅ frontend |
| Pulizia codice morto | Rimuovere `variantExamplePrice()` e commento "Listini non ancora integrati" da `[codiceLinea]/page.tsx` | 🔴 da fare |

**Cosa si vede:** i listini arrivano dalle viste Postgres, il cliente vede il prezzo corretto.


---

## Blocco 4 — Gestione articoli + AI (3-4 giorni) ✅ COMPLETATO

| Attività | Dettaglio |
|----------|-----------|
| Selezione articoli da configurare | Flag "configurato", modale ricerca articoli non ancora configurati |
| Scheda configurazione articolo | Nome, descrizione breve, attributi extra (non in Integra) |
| Upload immagini sfondo bianco | Drag & drop, anteprima, salvataggio su storage |
| Connessione Mini PC LM Studio | API locale chiama http://mini-pc:1234/v1 per inferenza |
| Generazione immagini ambientate (AI) | Integrazione DALL·E / SD: click → genera → salva |
| Descrizione AI via Mini PC | Input testo → Qwen 27B su Mini PC → descrizione discorsiva + punti + metadati |
| Image-to-text via Mini PC | Foto articolo → Qwen visione su Mini PC → descrizione testuale |
| Embedding descrizione | Generazione vettore su pgvector per ricerca semantica (tabella `articolo_embedding`, vedi `RAG-RICERCA-SEMANTICA.md`) |
| Anteprima scheda articolo finita | Vista cliente: immagini, descrizione, prezzo, dimensioni |
| Filtri elenco | Configurati / Da configurare / Tutti |

**Cosa si vede:** admin seleziona articolo, carica foto, genera descrizione e immagini AI, vede risultato finale. L'inferenza va al Mini PC in LAN.


---

## Blocco 5 — Catalogo lato cliente (2 giorni) ✅ COMPLETATO

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Griglia articoli | Card con immagine, nome, prezzo, badge disponibilità, AI badge, sort | ✅ |
| Filtri e ricerca | Per Famiglia, Raccolta, testo, CIELAB colore, prezzo, dimensioni | ✅ |
| Scheda articolo cliente | Galleria, lightbox, griglia varianti, multipli, buy-box, correlati | ✅ |
| Prezzi personalizzati | Listino cliente (`integra_listini_righe` + sconti a cascata) | ✅ |
| Design responsive | Mobile-first | ⚠️ 3 fix in ToDo |

**Cosa si vede:** cliente loggato naviga catalogo con prezzi personalizzati.


---

## Blocco 6 — Clienti e inviti (1-2 giorni) ✅ COMPLETATO

| Attività | Dettaglio |
|----------|-----------|
| Invito cliente | Admin inserisce email → link di registrazione |
| Registrazione | Nome, ragione sociale, partita IVA, telefono, sede |
| Profilo cliente | Modifica dati, cambio password |
| Blocco/sblocco | Flag che impedisce ordini ma mantiene storico |
| Assegnazione listino | Admin seleziona listino per cliente |
| Login cliente | Email + password o magic link |

**Cosa si vede:** cliente riceve invito, si registra, vede i suoi prezzi.


---

## Blocco 7 — Giacenza (1 giorno) ⚠️ Parziale

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Lettura giacenza da viste Postgres | Quantità per Variante (codice articolo) | ✅ backend (`syncGiacenza()`) |
| Badge disponibilità | Solo "Disponibile" / "Non disponibile" in griglia e scheda | ✅ (3 livelli: ok/low/out) |
| Filtro disponibilità | Mostra solo articoli disponibili | ✅ `soloDisponibili` (catalogo, controller, service) |
| Data ultimo aggiornamento | Trasparenza sul dato mostrato | ❌ mancante (~2 h) |

**Cosa si vede:** badge colorati in catalogo, filtro funzionante.


---

## Blocco 8 — Ordini (2-3 giorni) ⚠️ Parziale

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Carrello | Aggiungi/rimuovi articoli, quantità, varianti, salva per dopo | ✅ |
| Checkout | Riepilogo, indirizzi, note ordine, conferma | ✅ (fix riepilogo in ToDo) |
| Stati ordine | Bozza → Confermato → In lavorazione → Spedito | ✅ backend (solo BOZZA usato) |
| Storico ordini cliente | Elenco ordini con stato e data | ✅ |
| Dettaglio ordine | Righe, quantità, prezzi, stato | ✅ `OrdineDetailModal` |
| Admin: gestione ordini | Elenco, cambio stato | ✅ `AdminOrdiniSection` + `PATCH /:id/stato` |
| Admin: note interne | Annotazioni sull'ordine visibili solo allo staff | ❌ mancante (~3 h) |
| Notifica email: conferma ordine | Template modificabile, logo, immagini prodotto | ✅ `sendConfermaOrdine` (`fda6022`) |
| Notifica email: cambio stato | Avviso al cliente quando l'ordine avanza | ❌ mancante (~3 h) |

**Cosa si vede:** cliente ordina, admin evasa, email di notifica.


---

## Blocco 9 — Export ordini verso Integra (1-2 giorni) ✅ COMPLETATO

| Attività | Dettaglio |
|----------|-----------|
| Tracciato export ordini | Tracciato Excel (testata + righe) per l'import AGOMIR |
| Generazione Excel ordini | File ordini generati dal portale (`export-ordini`, `eb756d0`) |
| Storico export | Log operazioni con esito |
| Marcatura "esportato" | Evita doppie esportazioni |

**Cosa si vede:** il portale genera l'Excel ordini che l'automazione AGOMIR importa in Integra.
Riconciliazione ordine B2B ↔ documento Integra via `mvt_vsrif` (`f876225`) e vista `riferimento_b2b`
(`0017db8`); storicizzati listino/sconto sulla riga (`b1449d6`).


---

## Blocco 10 — AI lato cliente (2-3 giorni) ⚠️ Parziale

> Spec dettagliata del RAG (spazio vettoriale multimodale, pgvector, provider embedding,
> backfill, endpoint, privacy, fasi): **`RAG-RICERCA-SEMANTICA.md`**.
> L'embedding descrizione del Blocco 4 confluisce nella stessa tabella `articolo_embedding`.

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Ricerca semantica | Input linguaggio naturale → pgvector `text_vec` → risultati | ✅ `POST /api/catalogo/ricerca` |
| Ricerca per immagini | Upload foto → Gemini Vision → pgvector → articoli simili | ✅ `POST /api/catalogo/ricerca-immagine` |
| Banner homepage | "Articoli interessanti" basati su cronologia cliente | ➡️ spostato al **Blocco 13** (`DASHBOARD-SUGGERIMENTI-AI.md`) |
| Cronologia visite | "Ripresi da dove hai lasciato" | ❌ mancante (~6 h) |
| Cache embedding | Memoizzazione query→vettore | ✅ cache LRU in-memory (`EmbeddingService`) |

**Cosa si vede:** cliente cerca "vasi rettangolari grandi per esterno" e trova risultati; carica foto e trova articoli simili.


---

## Blocco 13 — Dashboard AI: box di suggerimenti personalizzati (5 giorni) ⚠️ Parziale (manca CRUD promozioni)

> Progettazione completa in **`DASHBOARD-SUGGERIMENTI-AI.md`**.

I 6 box della dashboard cliente sono oggi hardcoded (`PRODUCT_BOXES` in `area/page.tsx`).
Obiettivo: box **configurabili dall'admin** (titolo + prompt, es. "Provali" → "10 articoli
mai acquistati che possono interessargli"; "Natale" → "10 articoli natalizi in linea con
gli acquisti"). Un'agente AI aggrega **consumi reali + tracking + progetti del cliente +
affinità (clienti simili) + giacenza + listino + promo**, con **pesi configurabili per box**
(la proporzione progetti/tracking è un parametro, non una costante). Pipeline ibrida:
motore deterministico (vincoli SQL + intento semantico via pgvector) → candidati → Gemini
structured output (selezione/ordine/rationale). **Il LLM non inventa mai prodotti.**

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Motore deterministico | Vincoli duri in SQL (in offerta/escludi acquistati/giacenza/scope) + intento semantico dal prompt | ✅ `dashboard.service` |
| Score pesato | Acquisti/tracking/**progetti**/affinità con pesi editabili per box (default 40/25/20/15) | ✅ pesi su `SuggestionBox` |
| LLM structured output | Gemini: selezione, ordine e rationale, con fallback deterministico | ✅ flag `DASHBOARD_LLM_SELECTION` |
| **Admin UI box** | CRUD "titolo+prompt+pesi+vincoli" + LLM-planner a edit-time + anteprima test | ✅ `BoxSuggerimentiSection` |
| Endpoint + cache | `GET /dashboard/suggerimenti` + tabella `DashboardBox` (cache per cliente) | ✅ |
| Batch notturno + trigger | Rigenerazione schedulata a finestra (max N clienti a notte) + rigenera per singolo cliente e reset globale | ✅ |
| Frontend | Box da dati reali, nascosti se vuoti, con titolo del box mantenuto nel catalogo | ✅ |
| Modello `Promozione` | Tabella + **CRUD admin** (prerequisito dei box "in offerta", oggi vuoti) | ⚠️ modello a DB, manca l'interfaccia (~10 h) |
| Misurazione | Tracciamento click-per-box per tarare i pesi | ❌ mancante (~4 h) |

**Cosa si vede:** l'admin definisce i box (titolo+prompt) senza codice e ne vede
l'anteprima; il cliente in dashboard vede box personalizzati con prodotti reali, prezzi del
suo listino e giacenza, rigenerati a batch notturno.

**Note:**
- **Niente framework agentico (LangChain/LangGraph) per i box**: pipeline deterministica +
  LLM-planner a edit-time; LangGraph è riservato a un eventuale chatbot consulente.
- Richiede i dati del Blocco 12 (tracciamento) per i segnali tracking/affinità; i box
  "offerta" richiedono la tabella `Promozione`.
- Costi LLM contenuti: caching a batch, ≤10 box attivi, monitorati da `AiUsage`.
- GDPR: prompt con candidati minimizzati, mai dati di altri clienti; log rigenerazioni.


---

## Blocco 14 — Assistente commerciale: catalogo ad hoc (5 giorni) ❌ NON INIZIATO

> Progettazione completa in **`DASHBOARD-SUGGERIMENTI-AI.md` §14**.

Scenario: un **agente di commercio** costruisce un **catalogo personalizzato** per un
cliente **interagendo con l'AI** (chat): "creami un catalogo per Rossi con terracotta
primaverile, escludi ciò che ha già comprato" → "aggiungi i fiberstone ordinati per margine"
→ "salva". Qui **sì che serve un agente** (conversazionale, stateful, tool-calling), a
differenza dei box del Blocco 13 (batch e deterministici). L'agente consuma gli **stessi
tool** del motore (ricerca semantica, articolo, giacenza, listino cliente, promo, progetti).

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Modello `BozzaCatalogo` | Tabella (criteri, righe, stato, conversazione) + API CRUD | ❌ da fare |
| Agente conversazionale | Gemini function-calling: ricerca/articolo/giacenza/listino/promo/progetti + aggiungi/rimuovi da bozza + salva | ❌ da fare |
| Human-in-the-loop | Conferma prima del salvataggio, storico modifiche (annulla/riprendi) | ❌ da fare |
| UI commerciale | Pannello "Crea catalogo" con chat, anteprima righe, prezzi dal listino cliente | ❌ da fare |
| Export/condivisione | Catalogo ad hoc → PDF/Excel / link condiviso | ❌ da fare |
| Integrazione MCP | Tool esposti per agenti esterni (Claude/opencode) via `MCP-B2B.md` | ❌ da fare |

**Cosa si vede:** il commerciale crea e modifica un catalogo personalizzato parlando con
l'AI; i prezzi e la disponibilità restano reali (layer deterministico); salva solo dopo
conferma; può esportarlo o condividerlo.

**Note:**
- Riusa il motore del Blocco 13 + dati Blocco 12 (tracking/progetti) e Blocco 3 (listini).
- **Framework**: partire dal function-calling nativo di Gemini + tabella stato;
  **LangGraph solo se** servono multi-agente/branching/interrupt formali.
- Costi agentici per sessione utente (non a batch) → monitorare `AiUsage`.
- GDPR: bozza con dati cliente → permessi per operatore, audit salvataggio, retention.


---

## Blocco 11 — Collaudo, formazione e go-live (2-3 giorni) ❌ NON INIZIATO

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


---

## Blocco 12 — Tracciamento comportamento clienti (3-4 giorni)

> Progettazione completa in `CUSTOMER-TRACKING.md`.

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| **Fase 1 — Base** | Tabella `customer_event` (append-only: customerId, tipo, entità, dettagli JSON, ip, ts). Logging server-side degli eventi già in transito: login, view articolo, ricerca, carrello add/remove, ordine create/view. Timeline cronologica in admin. | ✅ `CustomerEvent` + `CustomerTimeline` |
| **Fase 2 — Client** | Endpoint `POST /api/eventi` con batch beacon (`navigator.sendBeacon`). Micro-eventi: page.view, page.leave (permanenza), scroll.depth. Scheda comportamentale per cliente + funnel vede→aggiunge→ordina. | ✅ beacon + metriche aggregate con funnel (`events.service`) |
| **Fase 2 — Sessioni** | Tabella `customer_session` aggregata per sessione: pagine viste, articoli visitati, ricerche, device | ❌ mancante (~10 h) — oggi `session_id` è sull'evento, non aggregato |
| **Fase 3 — AI** | Job periodico di sintesi → `customer_insight` (testo in linguaggio naturale + metriche JSONB). Embedding dei riassunti. "Prossima azione consigliata" per up-sell/riattivazione. Segmentazione automatica. | ✅ `insight.service` + embedding + clienti simili |

**Cosa si vede:** admin vede timeline cliente, scheda comportamentale, funnel, alert commerciali; AI risponde su comportamento clienti.

**Note:**
- GDPR: informativa, minimizzazione, retention 12-24 mesi su eventi grezzi, accesso solo admin
- Tabelle dedicate (non mischiare con AuditLog admin)
- Nessun tool esterno (GA, Hotjar) — tutto in-house


---

## To do — Rafinamenti UI e fix

| # | Attività | Priorità |
|---|----------|----------|
| 1 | **Catalogo — filtri fissi nello scroll** | alta | ✅ fatto |
|   | I filtri laterali (sidebar) rimangono visibili durante lo scroll (position: sticky con top:80px, max-height limitata, box propria). | |
| 2 | **Carrello — responsive mobile/tablet** | alta |
|   | Le card del carrello hanno problemi di layout su viewport piccolo (sforamento, elementi sovrapposti). Verificare e sistemare a 375px e 768px. | |
| 3 | **Checkout — riepilogo ordine** | alta |
|   | La sezione riepilogo dell'ordine nella pagina di checkout va sistemata (dati mancanti o layout rotto). | |
| 4 | **Codice morto listini** | media |
|   | Rimuovere `variantExamplePrice()` e commento "Listini non ancora integrati" da `[codiceLinea]/page.tsx`. I prezzi sono reali da `integra_listini_righe`. | |
| 5 | **Catalogo — filtro sticky si ferma a fine contenuto** | media |
|   | È fatto (item 1) ma: quando i filtri in sidebar superano l'altezza dello schermo, lo sticky si ferma una volta raggiunta la fine del proprio contenitore (limite nativo di `position: sticky`) e non segue più lo scroll. Valutare sidebar scorrevole a piena altezza o `max-height` con scroll interno. | |
| 6 | **AI — Chatbot che segue il cliente** | alta |
|   | Assistente conversazionale in-app per il cliente B2B: risponde su **ordini, articoli e scadenze** usando tool reali (dati dal DB, mai inventati dall'LLM) e suggerimenti contestuali secondo il contesto di pagina. Progettazione completa in `specifica-chatbot-ai.md`. | |
| 7 | **Tema white-label — colori e brand configurabili** | media |
|   | Rendere la palette (oggi token `:root` in `frontend/app/globals.css:3-19`, spec in `brand-spec.md`, impronta attuale congelata lì) configurabile per rivendere il B2B ad altre realtà: override di `--bg/--surface/--fg/--muted/--border/--accent(+soft)/--danger/--ok/--amber/--blue` senza toccare il codice, più logo/nome azienda (pagina login, header, email) da configurazione (env o tab admin). Verificare contrasto WCAG 2.2 AA su ogni combinazione e che i `color-mix` derivati si adattino. | |

---

## Riepilogo economico

> **Nota sulla lettura.** Le ore qui sotto servono a **dimensionare il perimetro** in fase di
> pianificazione: non sono un importo. La fatturazione è a ore effettive su due tariffe
> (€90/h analisi, €50/h sviluppo) — vedi «Tariffe» e «Consuntivo economico» più sotto.

| # | Blocco | Peso relativo | Ore indicative |
|---|--------|---------------|----------------|
| 1 | Infrastruttura e accessi | medio | ~17 |
| 1A | Profilazione ruoli e permessi admin | medio | ~17 |
| 2 | Integrazione Integra (viste Postgres + Excel AGOMIR) | alto | ~23 |
| 3 | Listini e prezzi | basso | ~11 |
| 4 | Gestione articoli + AI | alto | ~23 |
| 5 | Catalogo lato cliente | basso | ~11 |
| 6 | Clienti e inviti | basso | ~11 |
| 7 | Giacenza | minimo | ~6 |
| 8 | Ordini | medio | ~17 |
| 9 | Export ordini verso Integra | basso | ~11 |
| 10 | AI lato cliente | medio | ~17 |
| 11 | Collaudo, formazione, go-live | medio | ~17 |
| 12 | Tracciamento comportamento clienti | alto | ~23 |
| 13 | Dashboard AI: box suggerimenti personalizzati | molto alto | ~29 |
| 14 | Assistente commerciale: catalogo ad hoc | molto alto | ~29 |
| | **Totale perimetro** | | **~262 h** |

Le ore indicative servono a **dimensionare il perimetro** in fase di pianificazione. La
fatturazione è a ore effettive sulle due tariffe: a oggi il consuntivo reale è di 215 h e
il residuo stimato di 96 h, per un totale di ~311 h: il dimensionamento iniziale era ottimistico.

### Consuntivo ore (al 9 settembre 2026)

Misurato sulla cronologia git, unica fonte oggettiva disponibile. Metodo: i commit vengono
raggruppati in sessioni (nuova sessione se passano più di 2 ore dal commit precedente), si
somma la durata di ogni sessione e si aggiungono **30 minuti prima del primo commit e 30
dopo l'ultimo**: il lavoro non comincia col primo salvataggio e non finisce con l'ultimo —
prima c'è l'analisi del problema, dopo restano verifica, deploy e prove.

| Ipotesi di calcolo | Ore |
|--------------------|-----|
| 30 min solo in avvio (lettura minima) | 173 |
| **30 min in avvio e in chiusura** — adottata | **215** |
| Soglia sessione a 3 h, 30 min per lato | 233 |
| Soglia 3 h, 45 min per lato | 269 |

| Misura | Valore |
|--------|--------|
| Periodo | 5 giugno → 9 settembre 2026 |
| Commit | 847 |
| Giornate con attività | 45 |
| Sessioni di lavoro | 84 (media 2,6 h) |
| **Ore misurate** | **~215 h** |
| di cui **analisi** (commit su sole specifiche e prototipi) | **~47 h** |
| di cui **sviluppo** (commit che toccano codice) | **~168 h** |

> **Resta un minimo.** Anche 215 h contano solo le sessioni che hanno prodotto almeno un
> commit. Restano fuori per intero: riunioni e analisi con il cliente, scambi con AGOMIR sui
> tracciati, prove in produzione, deploy e sessioni di studio che non hanno lasciato codice.
> Quelle ore esistono ma non sono in git: vanno aggiunte a parte, su dichiarazione.

La separazione tra analisi e sviluppo è ricavata dai file toccati da ogni commit: 166 commit
riguardano solo specifiche, documenti e prototipi HTML, 682 toccano codice. Il rapporto
risultante, **22/78**, è applicato alle ore misurate.

> **Il dato è un minimo, non un totale.** La cronologia git vede solo il lavoro che
> finisce in un commit: restano fuori analisi e progettazione, prove in produzione,
> deploy, scambi con AGOMIR, ricerca sui tracciati e tutto ciò che non produce codice.

### Avanzamento economico

| Stato | Blocchi | Peso sul perimetro |
|-------|---------|--------------------|
| ✅ Completati | 1, 1A, 2, 4, 5, 6, 9 | 43% |
| ✅ Backend completo, rifiniture UI | 3 | 4% |
| ⚠️ Quasi completi | 7, 8, 10, 12, 13 | 35% |
| ❌ Non iniziati | 11, 14 | 18% |

I cinque blocchi "quasi completi" sono consegnati nella sostanza: il residuo verificato voce
per voce è di **38 ore**.

| Blocco | Cosa manca | Ore |
|--------|-----------|-----|
| 7 Giacenza | Data ultimo aggiornamento del dato in admin | 2 |
| 8 Ordini | Note interne sull'ordine · email al cambio stato | 6 |
| 10 AI cliente | "Riprendi da dove hai lasciato" (cronologia visite) | 6 |
| 12 Tracciamento | Tabella sessioni aggregate + scheda relativa | 10 |
| 13 Box | CRUD promozioni · tracciamento click per box | 14 |
| | **Totale residuo** | **38 h** |

### Lavoro fuori perimetro (non previsto nel preventivo)

Sviluppato su richiesta in corso d'opera e non riconducibile a nessun blocco. Il preventivo
a 15 blocchi non contiene nulla di tutto questo:

| Area | Cosa è stato costruito |
|------|------------------------|
| **Profilo cliente AI** | `CustomerProfile`: settore, dimensione, fatturato stimato, composizione del business, sedi, contatti chiave, interessi principali e secondari, stagionalità, cosa il cliente **non comprerà mai**. Generato da LLM con ricerca web (grounding) e arricchito dal registro imprese via P.IVA (`DatiImpresaService`) |
| **Dossier commerciale** | `CustomerIntelligence`: fatturato 12 mesi e trend su anno precedente, ticket medio, cadenza d'ordine, giorni dall'ultimo ordine, stagionalità su 12 mesi, composizione del basket per famiglia, concentrazione (indice HHI), segmento e **stato di salute** (buona / media / a rischio) |
| **Motore offerte** | Raccomandazioni deterministiche per cliente: riordino ciclico sugli articoli a cadenza regolare e cross-sell sui best-seller delle famiglie che già compra, con esclusione di ciò che il profilo segnala come non vendibile. Da lì si genera un'offerta pronta (`Progetto` condivisibile) |
| **Coupon e campagne** | Modello, CRUD admin, destinatari e filtri, QR, validazione server-side al checkout, tracciamento utilizzi |
| **Spese di spedizione** | Tariffe per nazione e regione, soglie di gratuità, minimi d'ordine, range per fascia, simulatore di calcolo e banner soglia |
| **Uso e costi AI** | Registrazione di ogni chiamata AI con token e costo stimato, attribuzione all'attore, cruscotto costi per tipo/modello/giorno, prompt di sistema modificabili da interfaccia |
| **Log eventi unificato** | `event_log` e `anomalia_log` unificati in `audit_log`, intercettore di accesso, `requestId` di correlazione, sezione "Log eventi" in amministrazione |
| **Pagina di manutenzione** | Pagina di cortesia con logo mostrata durante i deploy, con rientro automatico al termine |
| **Analisi sistema agentico** | `SISTEMA-AGENTICO-LUIS.md`: analisi e piano per un sistema multi-agente che elabori clienti, ordini, carrelli, mercato e prezzi in continuo |

### Quotazione del fuori perimetro

Attribuire ore a singole funzioni è il punto debole della misura, perché quasi tutto è stato
costruito in sessioni che toccano più aree. Sono stati provati tre metodi, con esiti molto
diversi sullo stesso lavoro:

| Metodo | Totale extra | Difetto |
|--------|--------------|---------|
| Solo sessioni contigue sull'area | ~11 h | **Sottostima**: ignora il lavoro intrecciato con altre aree (il dossier risulta 0 h) |
| Sessione divisa in parti uguali tra le aree toccate | 44 h | Sovrastima le aree sfiorate per pochi minuti |
| Sessione divisa in proporzione ai file toccati | 10,8 h | **Sottostima**: il perimetro base tocca sempre molti più file |

La misura fornisce quindi un intervallo, non un numero. La colonna **Stima** è il valore che
riteniamo corretto: parte dall'intervallo misurato e lo corregge con la dimensione e la
complessità di quanto effettivamente consegnato.

| Area | Misurato | **Stima** | Importo |
|------|----------|-----------|---------|
| Spese di spedizione | 5 – 17 h | **16 h** | €944 |
| Profilo cliente AI | 2 – 7 h | **10 h** | €590 |
| Dossier e motore offerte | 1 – 3 h | **9 h** | €531 |
| Coupon e campagne | 4 – 7 h | **9 h** | €531 |
| Uso e costi AI | 1 – 6 h | **5 h** | €295 |
| Log eventi unificato | 1 – 3 h | **5 h** | €295 |
| Pagina manutenzione | 1 – 1,5 h | **2 h** | €118 |
| **Totale fuori perimetro** | 13 – 44 h | **~56 h** | **~€3.300** |

Intervalli e stime riportati alla base di 215 h.

Importi alla media effettiva di €59/h (ripartizione 22/78 tra analisi e sviluppo).

**Dove la misura sottostimava, e perché.** Il dossier commerciale risultava 0,7–2,3 h: sono
321 righe di analisi dense di SQL (RFM, stagionalità su 12 mesi, concentrazione del basket,
stato di salute) più il motore di raccomandazione e la generazione dell'offerta, costruite in
sessioni condivise con il resto del portale. Stessa dinamica per il profilo cliente, dove
gran parte del lavoro è stata la messa a punto dei prompt e del grounding, che lascia poca
traccia nei file. Per le spese di spedizione, invece, la misura alta è attendibile: è un'area
isolata, con prototipo e specifica propri.

Con la stima corretta il perimetro base scende a ~159 h: il **26% del consuntivo** è lavoro
che il preventivo non prevedeva.

> **Non si sommano al consuntivo: ne fanno parte.** Con la fatturazione a ore effettive queste
> 56 h sono già dentro le 215 h e quindi già dentro i €12.630. La tabella serve a rendere
> visibile quanto del consuntivo è lavoro **mai previsto dal preventivo**: circa un quinto.
> Sommarle di nuovo significherebbe fatturarle due volte.

> **Limite dell'attribuzione.** Quando una sessione tocca più aree il tempo viene diviso in
> parti uguali, senza pesare quanto lavoro è andato a ciascuna. Per questo il dossier
> commerciale risulta basso (2,3 h) pur essendo un servizio corposo: è stato costruito in
> sessioni condivise con altre aree. I totali sono solidi, la ripartizione fine no.

L'analisi del sistema agentico non è in tabella: è un documento di strategia e, se si decide
di realizzarla, va quotata a parte.

### Tariffe

La fatturazione è a ore effettive, con due tariffe distinte per tipo di attività:

| Attività | Tariffa | Cosa comprende |
|----------|---------|----------------|
| **Analisi** | **€90/h** | Requisiti, progettazione, specifiche, tracciati, prototipi, scelte architetturali |
| **Sviluppo AI-assisted** | **€50/h** | Implementazione, test, correzioni, deploy |

La distinzione riflette una differenza reale: l'analisi è lavoro umano non comprimibile
(capire il gestionale, i tracciati, il processo commerciale), lo sviluppo è la parte dove
l'assistenza AI incide di più. Sul consuntivo la media effettiva è **€59/h**, perché
l'analisi pesa il 22% delle ore.

### Consuntivo economico a oggi

| Voce | Ore | Tariffa | Importo |
|------|-----|---------|---------|
| Analisi | 47 h | €90 | €4.230 |
| Sviluppo | 168 h | €50 | €8.400 |
| **Totale maturato** | **215 h** | | **€12.630** |

A cui vanno aggiunte le ore fuori da git (riunioni, analisi con il cliente, prove in
produzione): da quantificare su dichiarazione, non sono stimabili dal codice.

### Stima per completare

Due voci: il residuo dei blocchi quasi completi, verificato voce per voce, e i due blocchi non
ancora avviati (collaudo/formazione e assistente commerciale), stimati al ritmo osservato di
7,2 h per giornata preventivata.

| Voce | Ore stimate |
|------|-------------|
| Residuo blocchi 7, 8, 10, 12, 13 | 38 h |
| Blocchi 11 e 14 (8 giornate preventivate) | ~58 h |
| **Totale** | **~96 h** |

Con la stessa ripartizione 22/78 tra analisi e sviluppo:

| Voce | Ore stimate | Tariffa | Importo |
|------|-------------|---------|---------|
| Analisi | ~21 h | €90 | €1.890 |
| Sviluppo | ~75 h | €50 | €3.750 |
| **Totale da completare** | **~96 h** | | **~€5.640** |

**Totale progetto stimato: ~€18.300** (215 h maturate + ~96 h da completare), al netto delle
ore non tracciate da git.

> I giorni indicati nei blocchi restano il riferimento per **dimensionare il perimetro**, non
> per fatturare: la fatturazione è a ore effettive sulle due tariffe.

### Rilascio parziale

Se si vuole fermare il perimetro prima di completarlo, il punto naturale è la fine del
Blocco 4: il catalogo è caricabile e utilizzabile e il resto si decide dopo. Tutto ciò che
segue resta da concordare a ore sulle stesse tariffe.

### Confronto con prezzi di mercato

A titolo informativo, il benchmark di mercato Italia 2026 per un profilo full-stack senior
(Next.js + NestJS + PostgreSQL + AI) è:

| Figura | Tariffa oraria | Su questo progetto |
|--------|---------------|--------------------|
| **Consulente senior diretto** | €56–69/h | €20.600–25.400 |
| **Agenzia di sviluppo** | €75–100/h | €27.600–36.800 |
| **Tariffe applicate** | **€90/h analisi · €50/h sviluppo** | **~€15.000** |

Il confronto assume che senza assistenza AI lo stesso perimetro richieda le ~368 ore che la
pianificazione iniziale stimava, contro le ~311 ore di questo progetto. È
l'assunzione che regge il paragone: a parità di ore le tariffe sarebbero simili a quelle di
un consulente senior: il vantaggio non sta nel prezzo orario, sta nel numero di ore.

Sul consuntivo a oggi la **media effettiva è €59/h** (€12.630 su 215 h), perché l'analisi
pesa il 22% delle ore. È dentro la fascia di un consulente senior diretto e ben sotto quella
di un'agenzia, ma il confronto onesto non è sulla tariffa: è sul **totale**. Il vantaggio non
viene dal prezzo orario, viene dalle ore — lo sviluppo assistito consuma 7,2 h per giornata
preventivata invece di 8.

Le due tariffe distinte riflettono una differenza reale: l'analisi è lavoro umano non
comprimibile (capire il gestionale, i tracciati, il processo commerciale), lo sviluppo è la
parte dove l'assistenza AI incide di più. Pagare meno l'ora dove la produttività è più alta
è coerente con come il lavoro viene effettivamente prodotto.

### Costi operativi mensili (a carico del cliente)

| Voce | Costo/mese |
|------|-----------|
| Elettricità Mini PC (~100W × 24h) | ~€22 |
| Elettricità server locale (già esistente) | ~€5 |
| Dominio + DNS | ~€2 |
| API immagini DALL·E / SD (~25 foto/mese) | ~€9 |
| Backup esterno (opzionale) | ~€5 |
| **Totale/mese** | **~€38-43** |
