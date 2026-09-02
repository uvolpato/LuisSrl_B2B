# Roadmap di costruzione — Piattaforma B2B Luis S.r.l.

Versione: 5.4 — 2 settembre 2026 (allineato stato reale: export ordini e box dashboard completati)
Architettura: server locale (app + DB) + Mini PC 128GB GPU condivisa (LM Studio)
Approccio: sviluppo AI-assisted (Claude), tutto in LAN

---

## Progresso attuale (riepilogo)

| Blocco | Stato | Gap |
|--------|-------|-----|
| **1** — Infrastruttura e accessi | ✅ COMPLETATO | — |
| **1A** — Profilazione ruoli e permessi | ✅ COMPLETATO | 🔴 modale crea/modifica utente con gruppo + override; 🔴 separazione anagrafica clienti read‑only |
| **2** — Integrazione Integra (lettura) | ✅ COMPLETATO | — |
| **3** — Listini e prezzi | ✅ Backend OK, frontend da ripulire | ⚠️ codice morto `variantExamplePrice()` + commento fuorviante in scheda prodotto |
| **4** — Gestione articoli + AI | ✅ COMPLETATO | — |
| **5** — Catalogo lato cliente | ✅ COMPLETATO | 🔴 3 fix UI in ToDo (filtri sticky, responsive carrello, riepilogo checkout) |
| **6** — Clienti e inviti | ✅ COMPLETATO | — |
| **7** — Giacenza | ⚠️ Parziale | ❌ filtro "solo disponibili"; ❌ data ultimo aggiornamento |
| **8** — Ordini | ⚠️ Parziale | ⚠️ admin cambio stato/note manuale; ✅ mail conferma ordine fatta |
| **9** — Export ordini verso Integra | ✅ COMPLETATO | .xlsx + riconciliazione `mvt_vsrif` + vista `riferimento_b2b` |
| **10** — AI lato cliente | ⚠️ Parziale | ❌ cronologia visite (in Blocco 13); ❌ cache embedding; ✅ ricerca semantica/immagine |
| **11** — Collaudo, formazione, go‑live | ❌ NON INIZIATO | — |
| **12** — Tracciamento clienti | ⚠️ Parziale | ✅ `CustomerEvent` (beacon) attivo; ❌ funnel/analisi avanzate |
| **13** — Dashboard AI: box suggerimenti personalizzati | ⚠️ Parziale | ✅ engine + cache + cron + Fase 2 (LLM) + Fase 3 (planner/anteprima); ❌ CRUD promozioni |
| **14** — Assistente commerciale: catalogo ad hoc | ❌ NON INIZIATO | Progettato in `DASHBOARD-SUGGERIMENTI-AI.md` §14 |

### Gap critici
1. **Admin gestione ordini (Blocco 8)** — manca UI/API per cambiare stato e note ordini (oggi lo stato arriva solo dalla sync Integra).
2. **CRUD promozioni (Blocco 13)** — modello `Promozione` esiste ma senza UI; i box `soloInOfferta` restano vuoti finché non ci sono promozioni a DB.
3. **Cache embedding (Blocco 10)** — Redis per le query semantiche frequenti non implementato.
4. **Assistente commerciale catalogo ad hoc (Blocco 14)** — non iniziato.
5. **Giacenza (Blocco 7)** — filtro "solo disponibili" e data ultimo aggiornamento.
6. **Codice morto** — `variantExamplePrice()` in scheda prodotto + commento fuorviante.

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

**Valore: €1.050 (3 giorni × €350)**

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

**Valore: €1.400 (4 giorni × €350)**

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

**Valore: €700 (2 giorni × €350)**

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

**Valore: €1.400 (4 giorni × €350)**

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

**Valore: €700 (2 giorni × €350)**

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

**Valore: €700 (2 giorni × €350)**

---

## Blocco 7 — Giacenza (1 giorno) ⚠️ Parziale

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Lettura giacenza da viste Postgres | Quantità per Variante (codice articolo) | ✅ backend (`syncGiacenza()`) |
| Badge disponibilità | Solo "Disponibile" / "Non disponibile" in griglia e scheda | ✅ (3 livelli: ok/low/out) |
| Filtro disponibilità | Mostra solo articoli disponibili | ❌ mancante |
| Data ultimo aggiornamento | Trasparenza sul dato mostrato | ❌ mancante |

**Cosa si vede:** badge colorati in catalogo, filtro funzionante.

**Valore: €350 (1 giorno × €350)**

---

## Blocco 8 — Ordini (2-3 giorni) ⚠️ Parziale

| Attività | Dettaglio | Stato |
|----------|-----------|-------|
| Carrello | Aggiungi/rimuovi articoli, quantità, varianti, salva per dopo | ✅ |
| Checkout | Riepilogo, indirizzi, note ordine, conferma | ✅ (fix riepilogo in ToDo) |
| Stati ordine | Bozza → Confermato → In lavorazione → Spedito | ✅ backend (solo BOZZA usato) |
| Storico ordini cliente | Elenco ordini con stato e data | ✅ |
| Dettaglio ordine | Righe, quantità, prezzi, stato | ✅ `OrdineDetailModal` |
| Admin: gestione ordini | Elenco, cambio stato, note interne | ❌ mancante |
| Notifica email | Conferma ordine, aggiornamento stato | ❌ mancante (MailModule esiste) |

**Cosa si vede:** cliente ordina, admin evasa, email di notifica.

**Valore: €1.050 (3 giorni × €350)**

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

**Valore: €700 (2 giorni × €350)**

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
| Cronologia visite | "Ripresi da dove hai lasciato" | ❌ sezione statica (in Blocco 13) |
| Cache embedding | Redis per query frequenti | ❌ mancante |

**Cosa si vede:** cliente cerca "vasi rettangolari grandi per esterno" e trova risultati; carica foto e trova articoli simili.

**Valore: €1.400 (4 giorni × €350)**

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
| Modello `Promozione` | Tabella + CRUD admin + fonte dati (prerequisito dei box "offerta") | ❌ da fare |
| Motore deterministico | Vincoli duri in SQL (in offerta/escludi acquistati/giacenza/scope) + intento semantico dal prompt (pgvector) | ❌ da fare |
| Score pesato | Acquisti/tracking/**progetti**/affinità con pesi editabili per box (default 40/25/20/15) | ❌ da fare |
| LLM structured output | Gemini JSON schema: selezione, ordine, rationale (fallback deterministico) | ❌ da fare |
| **Admin UI box** | CRUD "titolo+prompt+pesi+vincoli" (pattern `PromptTemplate`) + **LLM-planner a edit-time** (il prompt genera un piano di query revisionabile) + **anteprima test** | ❌ da fare |
| Endpoint + cache | `GET /dashboard/suggerimenti` + tabella `DashboardBox` (cache per cliente) | ❌ da fare |
| Batch notturno + trigger | Rigenerazione schedulata (`@nestjs/schedule`) + on-demand su ordine/promo/esaurito | ❌ da fare |
| Frontend + misurazione | Box da dati reali, nascosti se vuoti; tracciamento click-per-box per tarare i pesi | ❌ da fare |

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

**Valore: €1.750 (5 giorni × €350)**

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

**Valore: €1.750 (5 giorni × €350)**

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

**Valore: €1.050 (3 giorni × €350)**

---

## Blocco 12 — Tracciamento comportamento clienti (3-4 giorni)

> Progettazione completa in `CUSTOMER-TRACKING.md`.

| Attività | Dettaglio |
|----------|-----------|
| **Fase 1 — Base** | Tabella `customer_event` (append-only: customerId, tipo, entità, dettagli JSON, ip, ts). Logging server-side degli eventi già in transito: login, view articolo, ricerca, carrello add/remove, ordine create/view. Timeline cronologica in admin. |
| **Fase 2 — Client** | Endpoint `POST /api/eventi` con batch beacon (`navigator.sendBeacon`). Micro-eventi: page.view, page.leave (permanenza), scroll.depth. Tabella `customer_session` (aggregata per sessione: pagine viste, articoli visitati, ricerche, device). Scheda comportamentale per cliente + funnel vede→aggiunge→ordina. |
| **Fase 3 — AI** | Job periodico di sintesi → `customer_insight` (testo in linguaggio naturale + metriche JSONB). Embedding pgvector dei riassunti. "Prossima azione consigliata" per up-sell/riattivazione. Segmentazione automatica (esploratori, ricompratori, dormienti). |

**Cosa si vede:** admin vede timeline cliente, scheda comportamentale, funnel, alert commerciali; AI risponde su comportamento clienti.

**Note:**
- GDPR: informativa, minimizzazione, retention 12-24 mesi su eventi grezzi, accesso solo admin
- Tabelle dedicate (non mischiare con AuditLog admin)
- Nessun tool esterno (GA, Hotjar) — tutto in-house

**Valore: €1.400 (4 giorni × €350)**

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

---

## Riepilogo economico

| # | Blocco | Giorni | €/giorno | **Valore** |
|---|--------|--------|----------|-----------|
| 1 | Infrastruttura e accessi | 3 | €350 | **€1.050** |
| 1A | Profilazione ruoli e permessi admin | 3 | €350 | **€1.050** |
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
| 12 | Tracciamento comportamento clienti | 4 | €350 | **€1.400** |
| 13 | Dashboard AI: box suggerimenti personalizzati | 5 | €350 | **€1.750** |
| 14 | Assistente commerciale: catalogo ad hoc | 5 | €350 | **€1.750** |
| | **Totale** | **46 giorni** | | **€16.100** |

### Opzioni di fatturazione

| Opzione | Importo | Note |
|---------|---------|------|
| **Forfait unico** | **€9.450** | Prezzo fisso, pagato a milestone |
| **Giornaliera** | €350/giorno | Fatturato a fine mese su ore effettive |
| **Solo blocchi 1-4** (primo rilascio utile) | €4.900 | Cliente inizia subito a caricare articoli, poi si decide il resto |

### Confronto con prezzi di mercato

A titolo informativo, il benchmark di mercato Italia 2026 per un profilo full-stack senior
(Next.js + NestJS + PostgreSQL + AI) è:

| Figura | Tariffa/giorno | Su 46 giorni |
|--------|---------------|--------------|
| **Consulente senior diretto** | €450–550/giorno | **€20.700–25.300** |
| **Agenzia di sviluppo** | €600–800/giorno | **€27.600–36.800** |
| **Prezzo applicato (€350/giorno)** | **€350/giorno** | **€16.100** |

Il prezzo applicato è circa il **30% sotto il mercato** per un senior diretto
e circa la **metà di un'agenzia**. Il risparmio riflette:

- Sviluppo AI-assisted (Claude) che riduce i tempi rispetto a codice manuale
- Assenza di overhead aziendale (IVA esclusa, partita IVA del professionista)
- Collaborazione diretta, nessun intermediario

### Costi operativi mensili (a carico del cliente)

| Voce | Costo/mese |
|------|-----------|
| Elettricità Mini PC (~100W × 24h) | ~€22 |
| Elettricità server locale (già esistente) | ~€5 |
| Dominio + DNS | ~€2 |
| API immagini DALL·E / SD (~25 foto/mese) | ~€9 |
| Backup esterno (opzionale) | ~€5 |
| **Totale/mese** | **~€38-43** |
