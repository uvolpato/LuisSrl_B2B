# Roadmap di costruzione — Piattaforma B2B Luis S.r.l.

Versione: bozza 4.3 — 13 giugno 2026 (allineata al modello Articolo → Variante e ai canali viste Postgres + Excel AGOMIR, spec v1.12)
Architettura: server locale (app + DB) + Mini PC 128GB GPU condivisa (LM Studio)
Approccio: sviluppo AI-assisted (Claude), tutto in LAN

---

## Progresso attuale

### Blocco 1 — Infrastruttura e accessi — ✅ COMPLETATO

**Completato — backend e accessi (commit 4502b97, a00adb7):**
- NestJS + Prisma 6 su PostgreSQL `LuisSrlDb` (pgvector abilitato), Docker compose
- **Stored procedure PL/pgSQL** per ogni scrittura applicativa (`fn_user_create`,
  `fn_user_update`, `fn_user_set_blocked`, `fn_user_set_password`, `fn_audit_log`,
  `fn_auth_log_attempt`): audit nella stessa transazione
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

**Blocco 1A — Backend completato in sessione 13/06/2026:**
- Nuovi model Prisma: PermissionGroup, AdminPermission, isSuperAdmin + groupId su User
- 6 stored procedure PL/pgSQL per scritture: `fn_permission_group_create/update/delete`, `fn_admin_permission_upsert/remove`, `fn_user_assign_group`
- AdminRepository + AdminService (letture Prisma, scritture SP)
- `@RequirePermission(perm)` decorator + PermissionsGuard
- API: CRUD gruppi, permessi utente, assegnazione gruppo
- UsersController protetto con permessi granulari
- Seed: 2 gruppi predefiniti, admin promosso a super admin
- **Schemi PostgreSQL:** funzioni organizzate in `core` (fn_audit_log), `auth` (fn_auth_log_attempt), `users` (fn_user_*), `admin` (fn_permission_group_*, fn_admin_permission_*, fn_user_assign_group) — tutte chiamate con nome qualificato da codice e tra SP

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
| Gestione utenti | Crea/modifica/blocca/reset via stored procedure | ✅ fatto |
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
| Backend: stored procedure profili | `fn_permission_group_create`, `fn_permission_group_update`, `fn_permission_group_delete`, `fn_admin_permission_upsert`, `fn_admin_permission_remove`, `fn_user_assign_group` — audit in transazione, errori `LAI01`÷`LAI05` | ✅ fatto |
| Backend: schemi PostgreSQL | Funzioni organizzate in 4 schemi: `core` (fn_audit_log), `auth` (fn_auth_log_attempt), `users` (fn_user_*), `admin` (fn_permission_group_*, fn_admin_permission_*, fn_user_assign_group). Riferimenti fully qualified tra SP e dal codice NestJS. | ✅ fatto |
| Backend: AdminRepository | Wrapper SP stessi pattern di UsersRepository | ✅ fatto |
| Backend: AdminService | Letture Prisma, scritture su SP | ✅ fatto |
| Backend: decorator + guard | `@RequirePermission('...')` + `PermissionsGuard` (super admin bypassa, altrimenti set effettivo da gruppo + override) | ✅ fatto |
| Backend: API gruppi | `GET/POST/PUT/DELETE /api/admin/groups` | ✅ fatto |
| Backend: API permessi utente | `GET /api/admin/users/:id/permissions`, `PUT .../permissions`, `PUT .../group` | ✅ fatto |
| Backend: protezione controller esistenti | UsersController protetto con permessi granulari (view, create, edit, block) | ✅ fatto |
| Panoramica utenti da DB | Tabella reale da GET /api/admin/users, avatar color, presenza WS | ✅ fatto |
| Avatar color utenti | Colonna avatar_color, palette 10 oklch, SP fn_user_create assegna random | ✅ fatto |
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

**Blocco 1A — Backend completato in sessione 13/06/2026:**
- Tutto il backend profili e permessi: migrazione, SP, repository, service, guard, decorator, API
- Ogni scrittura passa da stored procedure PL/pgSQL con audit nella stessa transazione
- Gruppi di permessi (PermissionGroup) con set di permessi in array text[]
- Override per utente (AdminPermission): può concedere un permesso non nel gruppo o negarne uno presente
- Super admin bypassa tutti i controlli
- Seed: due gruppi predefiniti, admin esistente promosso a super admin
- API `/api/admin/groups` e `/api/admin/users/:id/permissions` + `/api/admin/users/:id/group`
- **Schemi PostgreSQL:** funzioni organizzate in `core` (fn_audit_log), `auth` (fn_auth_log_attempt), `users` (fn_user_*), `admin` (fn_permission_group_*, fn_admin_permission_*, fn_user_assign_group) — riferimenti fully qualified, tabelle restano in `public`

**Aggiornamenti successivi (sessione 13-14/06/2026):**
- **Avatar color:** colonna `avatar_color` su users, palette 10 colori oklch assegnata random via `fn_user_create`. Migration `20260613220000_avatar_color`. Utenti esistenti aggiornati con colori random.
- **Endpoint `GET /api/admin/users`:** lista completa (ADMIN + CLIENTE) con paginazione, ricerca, filtro stato. Permesso `admin.permissions.view`.
- **AdminPanel da DB:** tabella utenti collegata all'API reale invece di mock data. Avatar circolare con colore dal DB.
- **WebSocket presenza:** socket.io su stesso server HTTP (path `/ws`). Autenticazione via session cookie `luis.sid`. Presenza in tempo reale: broadcast `user.online`/`user.offline`, lista `presence` al nuovo connesso.
- **Hook frontend riutilizzabili:** `useWebSocket()` (connessione singleton, reconnect auto, onAny router), `usePresence()` (isOnline, onlineIds, connected). Stesso socket usabile da qualsiasi componente per eventi futuri (notifiche, aggiornamenti).
- **Pallino presenza:** verde pulsante = utente con WS attiva online ora, grigio = offline (indipendentemente da stato DB).

**Aggiornamenti successivi (sessione 15-17/06/2026):**
- **Split utenti/clienti in due tabelle DB:** `users` (admin/staff) e `customers` (clienti). Model Prisma separati, migration `split_users_customers`. Profili (`UserProfile`/`CustomerProfile`) e service separati.
- **Login bifasico:** `auth.fn_login_lookup()` cerca prima `users` poi `customers`. `RolesGuard` controlla `userType` (`'admin'`|`'customer'`), `PermissionsGuard` solo per admin.
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
| Badge disponibilità | Solo "Disponibile" / "Non disponibile" in griglia e scheda (la quantità non è esposta al cliente) |
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
| | **Totale** | **32 giorni** | | **€11.200** |

### Opzioni di fatturazione

| Opzione | Importo | Note |
|---------|---------|------|
| **Forfait unico** | **€9.450** | Prezzo fisso, pagato a milestone |
| **Giornaliera** | €350/giorno | Fatturato a fine mese su ore effettive |
| **Solo blocchi 1-4** (primo rilascio utile) | €4.900 | Cliente inizia subito a caricare articoli, poi si decide il resto |

### Costi operativi mensili (a carico del cliente)

| Voce | Costo/mese |
|------|-----------|
| Elettricità Mini PC (~100W × 24h) | ~€22 |
| Elettricità server locale (già esistente) | ~€5 |
| Dominio + DNS | ~€2 |
| API immagini DALL·E / SD (~25 foto/mese) | ~€9 |
| Backup esterno (opzionale) | ~€5 |
| **Totale/mese** | **~€38-43** |
