# Graph Report - Luis Srl - B2B  (2026-11-06)

## Corpus Check
- 426 files · ~437,625 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 12, .css 11, .cmd 6)

## Summary
- 3278 nodes · 7485 edges · 214 communities (101 shown, 113 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 387 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `06944815`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PrismaService
- Modal
- app.module.ts
- ref_react
- UserEditorModal.tsx
- IntegrazioneService
- src/app/page.tsx
- users.service.ts
- backend/package.json
- CataloghiAdminService
- CouponService
- RichiesteAccessoSection.tsx
- checkout/page.tsx
- RequirePermission
- @nestjs/common
- SpeseSpedizioneSection.tsx
- IntegrazioneController
- ProgettiService
- export-cliente.service.ts
- ImpostazioniSection.tsx
- .login
- AdminPanel.tsx
- .log
- dashboard.service.ts
- LeadsController
- environment
- mail.service.ts
- cataloghi-admin.service.ts
- SchedaArticoloPage
- admin.service.ts
- MailService
- restore-b2b-views.sql
- EventsService
- AdminOrdiniService
- DashboardService
- CustomersController
- thumbUrl
- app.js
- auth.service.ts
- CheckoutController
- WizardScreen
- SpeseSpedizioneService
- ref_react
- admin-ordini.module.ts
- devDependencies
- CataloghiService
- compilerOptions
- backend/eslint.config.mjs
- CouponSection.tsx
- "permission_groups"
- azioni.service.ts
- LeadsService
- BoxSuggerimentiSection
- ordini/page.tsx
- dependencies
- @prisma/adapter-pg
- CatalogoController
- admin-leads.service.ts
- "users"
- riallinea-immagini.js
- SyncService
- catalogo/[codiceLinea]/page.tsx
- ExportOrdiniService
- SpeseSpedizioneController
- frontend/package.json
- src/app/layout.tsx
- seed-integra-from-export.js
- CatalogoPublicController
- frontend-vetrina/package.json
- compilerOptions
- compilerOptions
- v_user
- dependencies
- frontend/app/page.tsx
- BrevoService
- ImgController
- scripts
- CheckoutService
- customers.service.ts
- customer-profile.service.ts
- CreateFamigliaDto
- SyncManagerService
- typescript
- customers
- scripts
- next.config.mjs
- 20260624143908_catalogo_models/migration.sql
- scripts
- https-proxy.mjs
- createCombobox
- verifica-costo-trasporto.cjs
- conservazione.service.ts
- startTimeout
- seed.js
- 20260708000000_cache_integra/migration.sql
- verifica-coupon-illimitato.cjs
- spese-spedizione.service.ts
- privacy/page.tsx
- frontend/app/layout.tsx
- integra_clienti_piva_digits_idx
- Icons.tsx
- use-websocket.ts
- jest
- 20261025000000_cataloghi_brevo/migration.sql
- cambia-superuser.js
- CreaMailingDto
- nest-cli.json
- AggancioLeadService
- CreateTariffaDto
- 20260803000000_dashboard_ai/migration.sql
- prod-align-2026-07.sql
- CustomerIntelligenceService
- UpdateTariffaDto
- 20260711000001_sync_state_listini/migration.sql
- 20260714000000_progetti/migration.sql
- 20260812104416_add_event_log/migration.sql
- 20261012000000_add_leads/migration.sql
- frontend/eslint.config.mjs
- express-session
- 20260709120000_add_carrello/migration.sql
- c/[token]/page.tsx
- AuditService
- manual-fixups.sql
- 20260715000000_ai_usage/migration.sql
- "customer_event"
- "customer_insight"
- campaigns
- tsconfig.build.json
- route.ts
- 20260806000000_add_tariffe_spedizione/migration.sql
- 20260811140000_create_site_config/migration.sql
- 20260807000001_add_anomalia_log/migration.sql
- postcss.config.mjs
- tailwind.config.mjs

## God Nodes (most connected - your core abstractions)
1. `IntegrazioneService` - 112 edges
2. `RequirePermission()` - 106 edges
3. `@nestjs/common` - 101 edges
4. `PrismaService` - 89 edges
5. `AuthenticatedRequest` - 77 edges
6. `Modal()` - 61 edges
7. `Notice()` - 54 edges
8. `api` - 54 edges
9. `IntegrazioneController` - 46 edges
10. `DashboardService` - 44 edges

## Surprising Connections (you probably didn't know these)
- `handleSave()` --indirect_call--> `stato()`  [INFERRED]
  frontend/components/admin/sections/FamiglieSection.tsx → backend/src/leads/indagine.service.ts
- `handleSave()` --indirect_call--> `stato()`  [INFERRED]
  frontend/components/admin/sections/RaccolteSection.tsx → backend/src/leads/indagine.service.ts
- `previewTariffa()` --indirect_call--> `stato()`  [INFERRED]
  frontend/components/admin/sections/SpeseSpedizioneSection.tsx → backend/src/leads/indagine.service.ts
- `save()` --indirect_call--> `stato()`  [INFERRED]
  frontend/components/admin/sections/SpeseSpedizioneSection.tsx → backend/src/leads/indagine.service.ts
- `handleSave()` --indirect_call--> `sconto()`  [INFERRED]
  frontend/components/admin/sections/RaccolteSection.tsx → Rivendita Privati/app.js

## Import Cycles
- 2-file cycle: `frontend/components/admin/sections/AnalisiFotoModal.tsx -> frontend/components/admin/sections/DescrizioneAiWizard.tsx -> frontend/components/admin/sections/AnalisiFotoModal.tsx`

## Communities (214 total, 113 thin omitted)

### Community 0 - "PrismaService"
Cohesion: 0.08
Nodes (15): AUDITED, auditExtension, WRITES, COLONNE, EsitoOrdine, ReportExport, HealthController, SyncConfigRow (+7 more)

### Community 1 - "Modal"
Cohesion: 0.05
Nodes (39): AdminPage(), SECTION_TITLES, AdminLayout(), AdminSidebar(), logout(), AdminOrdiniSection(), DashboardData, fmtDate() (+31 more)

### Community 2 - "app.module.ts"
Cohesion: 0.07
Nodes (17): AdminModule, AppModule, AuthModule, CheckoutModule, CouponModule, CustomersModule, DashboardModule, ImgModule (+9 more)

### Community 3 - "ref_react"
Cohesion: 0.05
Nodes (65): AdminTopBar(), IconChevronLeft, IconChevronRight, IconEdit, IconEye, IconEyeOff, IconGrid, IconInfo (+57 more)

### Community 4 - "UserEditorModal.tsx"
Cohesion: 0.04
Nodes (64): CustomerDossier(), euroK(), fmtData(), MESI, SALUTE, Tile(), Trend(), CustomerOfferte() (+56 more)

### Community 6 - "src/app/page.tsx"
Cohesion: 0.07
Nodes (36): Page(), CatalogoPage(), one(), Search, Page(), Home(), Page(), Variante (+28 more)

### Community 7 - "users.service.ts"
Cohesion: 0.07
Nodes (11): toUserProfile(), UserProfile, buildStatoFilter(), UserFilter, CreateUserDto, UpdateUserDto, UsersController, UsersModule (+3 more)

### Community 8 - "backend/package.json"
Cohesion: 0.05
Nodes (57): author, description, devDependencies, eslint-config-prettier@^10.0.1, @eslint/eslintrc@^3.2.0, jest@^30.0.0, @nestjs/cli@^11.0.0, @nestjs/schematics@^11.0.0 (+49 more)

### Community 11 - "RichiesteAccessoSection.tsx"
Cohesion: 0.09
Nodes (21): Azione, AZIONI_PER_STATO, BADGE_SEGNALE, dataOra(), Dettaglio, ETICHETTA_AZIONE, EVENTI, IconReinvia() (+13 more)

### Community 12 - "checkout/page.tsx"
Cohesion: 0.05
Nodes (44): CartItem, CheckoutPage(), closeNuovoForm(), conferma(), saveIndirizzo(), DatiCheckout, fmtEur(), Indirizzo (+36 more)

### Community 13 - "RequirePermission"
Cohesion: 0.12
Nodes (4): AdminController, RequirePermission(), AuthenticatedRequest, AdminLeadsController

### Community 14 - "@nestjs/common"
Cohesion: 0.14
Nodes (11): PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard, CarrelloModule, AzioneDto (+3 more)

### Community 15 - "SpeseSpedizioneSection.tsx"
Cohesion: 0.11
Nodes (31): ComboboxField(), onKeyDown(), select(), GuidaModal(), SpeseSpedizioneSection(), onDeleteTariffa(), refresh(), toggleStato() (+23 more)

### Community 17 - "ProgettiService"
Cohesion: 0.06
Nodes (5): CarrelloController, CarrelloService, ProgettiController, ProgettiPublicController, ProgettiService

### Community 18 - "export-cliente.service.ts"
Cohesion: 0.07
Nodes (23): exceljs@4.4.0, FatturazioneDto, confermaRichiesta(), erroreCanaleSdi(), FatturazioneService, ok, cartellaOrdiniIntegra(), scriviXlsxAtomico() (+15 more)

### Community 19 - "ImpostazioniSection.tsx"
Cohesion: 0.47
Nodes (4): ConfigField(), ConfigToggle(), ImpostazioniSection(), SiteConfig

### Community 20 - ".login"
Cohesion: 0.06
Nodes (4): AuthController, ChangePasswordDto, LoginDto, UpdateProfileDto

### Community 21 - "AdminPanel.tsx"
Cohesion: 0.05
Nodes (52): AdminPanel(), AdminPanelTab, AI_GROUPS, AiConfigEntry, AiConfigSection(), ALL_PERMISSIONS, ConfigField(), formatDate() (+44 more)

### Community 23 - "dashboard.service.ts"
Cohesion: 0.06
Nodes (19): AiUsageController, AiUsageModule, AiUsageService, DEFAULT_PRICES, FALLBACK, Candidato, DEFAULT_PESI, PesiSegnali (+11 more)

### Community 24 - "LeadsController"
Cohesion: 0.09
Nodes (7): EsitoAzione, CreateLeadDto, LeadsController, valido, COLORE, ETICHETTA, paginaAzione()

### Community 25 - "environment"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "mail.service.ts"
Cohesion: 0.14
Nodes (18): calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede, Segnale, DatiIndagine, fonti() (+10 more)

### Community 27 - "cataloghi-admin.service.ts"
Cohesion: 0.10
Nodes (16): { Client }, cols, fs, path, rows, CataloghiModule, confrontaSegreto(), ASSETS_BASE_DIR (+8 more)

### Community 28 - "SchedaArticoloPage"
Cohesion: 0.09
Nodes (19): getStock(), ProductBreadcrumb(), SchedaArticoloPage(), activeEntries(), addAllToCart(), addSingleToCart(), galleryModalNav(), getAvailableValues() (+11 more)

### Community 29 - "admin.service.ts"
Cohesion: 0.07
Nodes (13): class-transformer@^0.5.1, CreateGroupDto, CreateRaccoltaDto, CreateSuggestionBoxDto, UpdateFamigliaDto, UpdateGroupDto, UpdateRaccoltaDto, UpdateSuggestionBoxDto (+5 more)

### Community 30 - "MailService"
Cohesion: 0.11
Nodes (14): esc(), box(), boxClienteIntegra(), esc(), MailModule, BADGE, DatiClienteMail, DatiConfermaOrdine (+6 more)

### Community 31 - "restore-b2b-views.sql"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 32 - "EventsService"
Cohesion: 0.08
Nodes (12): DatiCheckout, ModalitaConsegna, provinciaToRegione(), FILTER_VALUES, REGION_ALIASES, SegCustomer, SegFilter, Suggestion (+4 more)

### Community 33 - "AdminOrdiniService"
Cohesion: 0.10
Nodes (4): AdminOrdiniController, AdminOrdiniService, AggiornaStatoOrdineDto, STATI_ORDINE_CONSENTITI

### Community 34 - "DashboardService"
Cohesion: 0.06
Nodes (3): DashboardController, DashboardService, InsightController

### Community 37 - "thumbUrl"
Cohesion: 0.12
Nodes (10): AnalisiFotoModal(), Props, DescrizioneAiWizard(), handleAnalisiAccepted(), handleGenerate(), Props, StepDef, STEPS (+2 more)

### Community 38 - "app.js"
Cohesion: 0.17
Nodes (27): handleSave(), aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer() (+19 more)

### Community 39 - "auth.service.ts"
Cohesion: 0.15
Nodes (9): AuthService, AuthUser, DUMMY_HASH, verifyPassword(), Dossier, DossierFamiglia, DossierKpi, MotivoOfferta (+1 more)

### Community 41 - "WizardScreen"
Cohesion: 0.11
Nodes (19): CataloghiSection(), apriDettaglio(), inviaABrevo(), revoca(), Catalogo, Cliente, Destinatario, DettaglioScreen() (+11 more)

### Community 43 - "ref_react"
Cohesion: 0.06
Nodes (46): Famiglia, FamigliePage(), AreaLayout(), ProgettiPage(), Progetto, LoginPage(), ItemP, ProgettoPubblicoPage() (+38 more)

### Community 44 - "admin-ordini.module.ts"
Cohesion: 0.11
Nodes (5): AdminOrdiniModule, OrdiniController, OrdiniModule, OrdiniService, PrismaModule

### Community 45 - "devDependencies"
Cohesion: 0.14
Nodes (14): eslint@^9.18.0, @types/node@^24.0.0, eslint, @types/node, devDependencies, eslint@^9, @types/node@^20, @types/react@^19 (+6 more)

### Community 47 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 48 - "backend/eslint.config.mjs"
Cohesion: 0.22
Nodes (8): @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0, typescript-eslint@^8.20.0, @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 49 - "CouponSection.tsx"
Cohesion: 0.06
Nodes (29): CarrelloPage(), notifyCart(), remove(), toggleSave(), CartItem, PrezzoInfo, Dettaglio, ItemP (+21 more)

### Community 50 - ""permission_groups""
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "azioni.service.ts"
Cohesion: 0.18
Nodes (12): Azione, AZIONI, EsitoToken, firma(), segretoAzioni(), AzioniLeadService, Parametri, link() (+4 more)

### Community 52 - "LeadsService"
Cohesion: 0.19
Nodes (9): ReportIndagine, LeadsService, pulisci(), giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA, crea() (+1 more)

### Community 53 - "BoxSuggerimentiSection"
Cohesion: 0.18
Nodes (6): BoxEditModal(), BoxSuggerimentiSection(), loadRefs(), openCreate(), openEdit(), ribilancia()

### Community 54 - "ordini/page.tsx"
Cohesion: 0.11
Nodes (27): Catalogo, CatalogoArticolo, CatalogoPage(), colorDistance(), hexToLab(), normKey(), SORT_OPTIONS, calcTotale() (+19 more)

### Community 55 - "dependencies"
Cohesion: 0.06
Nodes (36): dependencies, class-validator@^0.15.1, connect-pg-simple@^10.0.0, cookie@^1.1.1, cookie-parser@^1.4.7, cron-parser@^5.6.1, dotenv@^17.4.2, helmet@^8.2.0 (+28 more)

### Community 56 - "@prisma/adapter-pg"
Cohesion: 0.25
Nodes (6): @prisma/adapter-pg@7.8.0, adapter, prisma, { PrismaClient }, { PrismaPg }, @prisma/adapter-pg

### Community 58 - "admin-leads.service.ts"
Cohesion: 0.19
Nodes (10): COPPIE_ERRORE, erroriAttivi(), FILTRI_STATO, GIORNI_ALLARME, giorniAttesa(), ORDINAMENTI, AdminLeadsService, STATI_IN_ATTESA (+2 more)

### Community 59 - ""users""
Cohesion: 0.14
Nodes (14): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+6 more)

### Community 60 - "riallinea-immagini.js"
Cohesion: 0.22
Nodes (7): ASSETS_BASE_DIR, dotenv, EXCLUDED, fs, path, prisma, { PrismaClient }

### Community 62 - "catalogo/[codiceLinea]/page.tsx"
Cohesion: 0.08
Nodes (29): Articolo, CorrelatoCard, DimEntry, Immagine, PrezzoInfo, Raccolta, RelatedSection(), STOCK_CLASS (+21 more)

### Community 63 - "ExportOrdiniService"
Cohesion: 0.12
Nodes (4): main(), ExportOrdiniController, ExportOrdiniModule, ExportOrdiniService

### Community 65 - "frontend/package.json"
Cohesion: 0.13
Nodes (19): dependencies, date-fns@4.4.0, next@16.2.9, next-intl@^4.13.0, react@19.2.4, react-date-range@2.0.1, react-markdown@^10.1.0, socket.io-client@^4.8.3 (+11 more)

### Community 66 - "src/app/layout.tsx"
Cohesion: 0.18
Nodes (10): RootLayout(), b(), Footer(), Header(), switchLang(), setLangCookie(), PopupApertureLink(), HasJs() (+2 more)

### Community 67 - "seed-integra-from-export.js"
Cohesion: 0.17
Nodes (8): pg@^8.21.0, base, { Client }, url, { Client }, { Client }, rows, pg

### Community 69 - "frontend-vetrina/package.json"
Cohesion: 0.13
Nodes (18): eslint-config-next@16.2.9, @types/react-dom@^19, eslint-config-next, @types/react-dom, devDependencies, eslint-config-next@16.2.9, postcss@^8.5.29, tailwindcss@^4.3.3 (+10 more)

### Community 70 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 71 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 72 - "v_user"
Cohesion: 0.12
Nodes (10): admin.fn_user_assign_group(), users.fn_user_set_blocked(), users.fn_user_create(), admin.fn_user_assign_group(), customers.fn_customer_create(), users.fn_user_set_blocked(), users.fn_user_set_password(), users.fn_user_update() (+2 more)

### Community 73 - "dependencies"
Cohesion: 0.22
Nodes (9): react-dom@19.2.4, react-dom, dependencies, next@16.2.9, next-intl@4.13.0, react@19.2.4, react-dom@19.2.4, next (+1 more)

### Community 74 - "frontend/app/page.tsx"
Cohesion: 0.22
Nodes (9): LandingPage(), AiSearchSection(), CtaSection(), FeaturesSection(), HeroSection(), LandingNav(), LineeSection(), PublicFooter() (+1 more)

### Community 77 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:migrate, db:seed, db:setup, embeddings:backfill, format, lint (+9 more)

### Community 79 - "customers.service.ts"
Cohesion: 0.10
Nodes (14): p, { PrismaClient }, prisma, { PrismaClient }, CustomerProfile, toCustomerProfile(), generateProvisionalPassword(), hashPassword() (+6 more)

### Community 80 - "customer-profile.service.ts"
Cohesion: 0.13
Nodes (6): estraiJson(), CustomerProfileData, CustomerProfileResult, CustomerProfileService, DatiImpresa, DatiImpresaService

### Community 83 - "typescript"
Cohesion: 0.50
Nodes (4): typescript@^5.7.3, typescript, typescript@^5, typescript@^5

### Community 84 - "customers"
Cohesion: 0.17
Nodes (10): customers, customers.fn_customer_update(), contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, customer_profiles, idx_customer_profiles_customer_id (+2 more)

### Community 85 - "scripts"
Cohesion: 0.21
Nodes (8): engines, node, npm, scripts, build, dev, lint, start

### Community 87 - "20260624143908_catalogo_models/migration.sql"
Cohesion: 0.23
Nodes (11): articolo_embedding, "articoli", articoli_codice_linea_key, "articoli_raccolte", articoli_raccolte_articolo_id_raccolta_id_key, "famiglie", "immagini", "raccolte" (+3 more)

### Community 89 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, dev:full, dev:https, lint, start

### Community 90 - "https-proxy.mjs"
Cohesion: 0.15
Nodes (7): __dirname, httpsProxy, nextDev, __dirname, options, PROXY_PORT, server

### Community 91 - "createCombobox"
Cohesion: 0.22
Nodes (9): buildComboboxOptions(), createCombobox(), filterOptions(), highlight(), open(), renderOptions(), selectOption(), getComboboxOptions() (+1 more)

### Community 92 - "verifica-costo-trasporto.cjs"
Cohesion: 0.19
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 93 - "conservazione.service.ts"
Cohesion: 0.28
Nodes (6): datiAnonimi(), limite(), MESI_DEFAULT, mesiConservazione(), ConservazioneLeadService, STATI_DA_ANONIMIZZARE

### Community 96 - "seed.js"
Cohesion: 0.17
Nodes (10): argon2@^0.44.0, adapter, argon2, AVATAR_COLORS, PERMISSION_KEYS, prisma, { PrismaClient }, { PrismaPg } (+2 more)

### Community 97 - "20260708000000_cache_integra/migration.sql"
Cohesion: 0.32
Nodes (11): idx_articoli_cod, idx_articoli_descr, idx_articoli_errors, idx_articoli_extra, idx_articoli_famiglia, idx_articoli_linea, idx_sync_log_entity, integra_articoli (+3 more)

### Community 98 - "verifica-coupon-illimitato.cjs"
Cohesion: 0.21
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 99 - "spese-spedizione.service.ts"
Cohesion: 0.18
Nodes (10): Calcola(), euCount(), NAZIONI, NAZIONI_ORDER, PctOf(), REGIONI_IT, Resolved, Row (+2 more)

### Community 100 - "privacy/page.tsx"
Cohesion: 0.33
Nodes (7): CookiePage(), Tabella(), En(), It(), PrivacyPage(), Da(), Documento()

### Community 102 - "frontend/app/layout.tsx"
Cohesion: 0.24
Nodes (3): RootLayout(), ConfirmProvider(), SessionTerminatedOverlay()

### Community 106 - "Icons.tsx"
Cohesion: 0.20
Nodes (8): IconEdit, IconEye, IconEyeOff, IconLock, IconLockOpen, IconPlus, IconReset, IconTrash

### Community 107 - "use-websocket.ts"
Cohesion: 0.31
Nodes (8): OnlineEvent, usePresence(), connect(), Listener, listeners, useWebSocket(), useWsEvent(), WsMessage

### Community 109 - "jest"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 110 - "20261025000000_cataloghi_brevo/migration.sql"
Cohesion: 0.44
Nodes (8): "cataloghi", "download_events", download_events_link_id_at_idx, "download_links", download_links_mailing_id_created_at_idx, download_links_token_key, "mailing", "mailing_catalogo"

### Community 111 - "cambia-superuser.js"
Cohesion: 0.25
Nodes (8): adapter, argon2, generaPassword(), main(), prisma, { PrismaClient }, { PrismaPg }, { randomBytes }

### Community 116 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, watchAssets, $schema, sourceRoot

### Community 122 - "20260803000000_dashboard_ai/migration.sql"
Cohesion: 0.43
Nodes (6): "dashboard_boxes", dashboard_boxes_customer_box_key, dashboard_boxes_customer_idx, "promozioni", promozioni_attiva_data_fine_idx, "suggestion_boxes"

### Community 123 - "prod-align-2026-07.sql"
Cohesion: 0.29
Nodes (6): indirizzi_clienti_customer_id_codice_destinazione_key, "integra_pagamenti_descr", "integra_porti", "integra_spedizioni", "integra_vettori", "sync_config"

### Community 128 - "20260711000001_sync_state_listini/migration.sql"
Cohesion: 0.53
Nodes (5): idx_listini_righe_listino, idx_listini_righe_prodotto, integra_listini, integra_listini_righe, sync_state

### Community 129 - "20260714000000_progetti/migration.sql"
Cohesion: 0.60
Nodes (5): "progetti", progetti_cliente_id_idx, progetti_share_token_key, "progetto_items", progetto_items_progetto_id_variante_codice_key

### Community 130 - "20260812104416_add_event_log/migration.sql"
Cohesion: 0.60
Nodes (5): event_log, idx_actor_time, idx_entity, idx_event_type_time, idx_request_id

### Community 131 - "20261012000000_add_leads/migration.sql"
Cohesion: 0.60
Nodes (5): "lead_events", lead_events_lead_id_created_at_idx, "leads", leads_created_at_idx, leads_stato_created_at_idx

### Community 134 - "express-session"
Cohesion: 0.40
Nodes (4): express-session@^1.19.0, express-session, SessionData, express-session

### Community 135 - "20260709120000_add_carrello/migration.sql"
Cohesion: 0.70
Nodes (4): carrelli, carrello_items, idx_carrello_items_carrello_id, idx_carrello_items_salvato

### Community 137 - "c/[token]/page.tsx"
Cohesion: 0.40
Nodes (3): LandingCatalogo, LandingData, styles

### Community 138 - "AuditService"
Cohesion: 0.06
Nodes (12): rxjs@^7.8.1, AuditController, AuditModule, AuditService, AccessLogInterceptor, ACTION_MAP, getLabel(), HttpErrorFilter (+4 more)

### Community 140 - "manual-fixups.sql"
Cohesion: 0.67
Nodes (3): site_config, site_config_key_key, "sync_config"

### Community 142 - "20260715000000_ai_usage/migration.sql"
Cohesion: 0.83
Nodes (3): "ai_usage", ai_usage_attore_idx, ai_usage_created_at_idx

### Community 143 - ""customer_event""
Cohesion: 0.83
Nodes (3): "customer_event", customer_event_customer_created_idx, customer_event_tipo_created_idx

### Community 144 - ""customer_insight""
Cohesion: 0.83
Nodes (3): "customer_insight", customer_insight_customer_idx, customer_insight_customer_periodo_key

### Community 146 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 147 - "route.ts"
Cohesion: 0.83
Nodes (3): fetchWithRetry(), isRetryableNetworkError(), POST()

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1113 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **113 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `stato()` connect `mail.service.ts` to `ref_react`, `app.js`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `PrismaService` be split into smaller, more focused modules?**
  _Cohesion score 0.07827260458839407 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `@nestjs/common` to `PrismaService`, `app.module.ts`, `users.service.ts`, `backend/package.json`, `AuditService`, `ProgettiService`, `export-cliente.service.ts`, `dashboard.service.ts`, `LeadsController`, `mail.service.ts`, `cataloghi-admin.service.ts`, `admin.service.ts`, `MailService`, `EventsService`, `auth.service.ts`, `admin-ordini.module.ts`, `azioni.service.ts`, `LeadsService`, `dependencies`, `admin-leads.service.ts`, `ExportOrdiniService`, `customers.service.ts`, `customer-profile.service.ts`, `conservazione.service.ts`, `spese-spedizione.service.ts`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Should `Modal` be split into smaller, more focused modules?**
  _Cohesion score 0.04824561403508772 - nodes in this community are weakly interconnected._
- **Why does `handleSave()` connect `app.js` to `mail.service.ts`, `ref_react`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07358156028368794 - nodes in this community are weakly interconnected._