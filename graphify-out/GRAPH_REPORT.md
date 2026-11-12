# Graph Report - Luis Srl - B2B  (2026-11-12)

## Corpus Check
- 433 files · ~441,366 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 12, .css 11, .cmd 6)

## Summary
- 3314 nodes · 7535 edges · 242 communities (96 shown, 146 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 389 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ac99ec7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PrismaService
- CataloghiService
- app.module.ts
- ref_react
- UserEditorModal.tsx
- IntegrazioneService
- src/app/page.tsx
- @prisma/client
- backend/package.json
- CataloghiAdminService
- CouponService
- RichiesteAccessoSection.tsx
- checkout/page.tsx
- AuthenticatedRequest
- @nestjs/common
- SpeseSpedizioneSection.tsx
- IntegrazioneController
- ProgettiService
- riallinea-immagini.js
- checkout.module.ts
- .login
- DataTable
- AdminService
- EmbeddingService
- leads.controller.ts
- environment
- mail.service.ts
- cataloghi-admin.controller.ts
- SchedaArticoloPage
- admin.service.ts
- MailService
- restore-b2b-views.sql
- CataloghiSection.tsx
- AdminOrdiniService
- DashboardService
- AdminOrdiniSection.tsx
- CustomersController
- AiUsageService
- app.js
- area/page.tsx
- CheckoutController
- UsersController
- SpeseSpedizioneService
- ref_react
- OrdiniController
- CreateUserDto
- CataloghiPublicController
- compilerOptions
- FamiglieSection
- Notice
- "permission_groups"
- azioni.service.ts
- AuditController
- EventLogSection.tsx
- frontend/lib/api.ts
- dependencies
- CatalogoController
- admin-leads.service.ts
- "users"
- leads.service.ts
- SyncService
- InvitaBulkDto
- ExportOrdiniService
- SpeseSpedizioneController
- frontend/package.json
- src/app/layout.tsx
- seed-integra-from-export.js
- CatalogoPublicController
- compilerOptions
- compilerOptions
- customers
- frontend-vetrina/package.json
- frontend/app/page.tsx
- mail.service.ts
- ImgController
- scripts
- CheckoutService
- DashboardController
- CustomerIntelligenceService
- fix-coupon-scope.js
- CouponSection.tsx
- checkout.controller.ts
- prod-align-2026-07.sql
- engines
- 20260624143908_catalogo_models/migration.sql
- https-proxy.mjs
- createCombobox
- verifica-costo-trasporto.cjs
- conservazione.service.ts
- seed-integra-from-export.js
- seed.js
- 20260708000000_cache_integra/migration.sql
- verifica-coupon-illimitato.cjs
- spese-spedizione.service.ts
- privacy/page.tsx
- frontend/app/layout.tsx
- EditImageModal.tsx
- integra_clienti_piva_digits_idx
- Icons.tsx
- use-websocket.ts
- jest
- 20261025000000_cataloghi_brevo/migration.sql
- nest-cli.json
- AggancioLeadService
- CreateTariffaDto
- 20260803000000_dashboard_ai/migration.sql
- BrevoService
- 20260711000001_sync_state_listini/migration.sql
- 20260714000000_progetti/migration.sql
- 20260812104416_add_event_log/migration.sql
- 20261012000000_add_leads/migration.sql
- CreaMailingDto
- frontend/eslint.config.mjs
- 20260709120000_add_carrello/migration.sql
- customer-intelligence.service.ts
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
- app.e2e-spec.ts
- UpdateTariffaDto

## God Nodes (most connected - your core abstractions)
1. `IntegrazioneService` - 112 edges
2. `RequirePermission()` - 106 edges
3. `@nestjs/common` - 102 edges
4. `PrismaService` - 89 edges
5. `AuthenticatedRequest` - 77 edges
6. `Modal()` - 61 edges
7. `api` - 54 edges
8. `Notice()` - 51 edges
9. `IntegrazioneController` - 46 edges
10. `DashboardService` - 44 edges

## Surprising Connections (you probably didn't know these)
- `handleSave()` --indirect_call--> `stato()`  [INFERRED]
  frontend/components/admin/sections/FamiglieSection.tsx → backend/src/leads/indagine.service.ts
- `previewTariffa()` --indirect_call--> `stato()`  [INFERRED]
  frontend/components/admin/sections/SpeseSpedizioneSection.tsx → backend/src/leads/indagine.service.ts
- `save()` --indirect_call--> `stato()`  [INFERRED]
  frontend/components/admin/sections/SpeseSpedizioneSection.tsx → backend/src/leads/indagine.service.ts
- `handleSave()` --indirect_call--> `sconto()`  [INFERRED]
  frontend/components/admin/sections/RaccolteSection.tsx → Rivendita Privati/app.js
- `handleSave()` --indirect_call--> `stato()`  [INFERRED]
  frontend/components/admin/sections/RaccolteSection.tsx → backend/src/leads/indagine.service.ts

## Import Cycles
- 2-file cycle: `frontend/components/admin/sections/AnalisiFotoModal.tsx -> frontend/components/admin/sections/DescrizioneAiWizard.tsx -> frontend/components/admin/sections/AnalisiFotoModal.tsx`

## Communities (242 total, 146 thin omitted)

### Community 0 - "PrismaService"
Cohesion: 0.04
Nodes (38): AuditService, ASSETS_PUBLIC_URL, cartellaOrdiniIntegra(), FILTER_VALUES, REGION_ALIASES, SegCustomer, SegFilter, Suggestion (+30 more)

### Community 2 - "app.module.ts"
Cohesion: 0.06
Nodes (18): AdminModule, AuditModule, AuthModule, CarrelloModule, CouponModule, CustomerProfileData, CustomerProfileResult, CustomersModule (+10 more)

### Community 3 - "ref_react"
Cohesion: 0.08
Nodes (53): AdminTopBar(), Column, DataTableProps, RowAction, IconChevronLeft, IconChevronRight, IconEdit, IconEye (+45 more)

### Community 4 - "UserEditorModal.tsx"
Cohesion: 0.03
Nodes (86): AdminPanel(), AdminPanelTab, AI_GROUPS, AiConfigEntry, AiConfigSection(), ALL_PERMISSIONS, ConfigField(), formatDate() (+78 more)

### Community 6 - "src/app/page.tsx"
Cohesion: 0.07
Nodes (36): Page(), CatalogoPage(), one(), Search, Page(), Home(), Page(), Variante (+28 more)

### Community 7 - "@prisma/client"
Cohesion: 0.06
Nodes (24): prisma, { PrismaClient }, AuthService, AuthUser, CustomerProfile, toCustomerProfile(), toUserProfile(), UserProfile (+16 more)

### Community 8 - "backend/package.json"
Cohesion: 0.05
Nodes (59): author, description, devDependencies, eslint-config-prettier@^10.0.1, @eslint/eslintrc@^3.2.0, @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0 (+51 more)

### Community 10 - "CouponService"
Cohesion: 0.07
Nodes (4): qrcode@1.5.4, CouponController, CouponService, qrcode

### Community 11 - "RichiesteAccessoSection.tsx"
Cohesion: 0.09
Nodes (22): Azione, AZIONI_PER_STATO, BADGE_SEGNALE, dataOra(), Dettaglio, EmailAccessoEditor(), ETICHETTA_AZIONE, EVENTI (+14 more)

### Community 12 - "checkout/page.tsx"
Cohesion: 0.05
Nodes (33): CartItem, CheckoutPage(), closeNuovoForm(), conferma(), saveIndirizzo(), DatiCheckout, fmtEur(), Indirizzo (+25 more)

### Community 14 - "@nestjs/common"
Cohesion: 0.17
Nodes (11): @nestjs/core@^11.0.1, PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard, FamiglieController (+3 more)

### Community 15 - "SpeseSpedizioneSection.tsx"
Cohesion: 0.12
Nodes (28): GuidaModal(), SpeseSpedizioneSection(), onDeleteTariffa(), refresh(), toggleStato(), TariffaCalcModal(), TariffaEditor(), calcFee() (+20 more)

### Community 17 - "ProgettiService"
Cohesion: 0.06
Nodes (5): CarrelloController, CarrelloService, ProgettiController, ProgettiPublicController, ProgettiService

### Community 18 - "riallinea-immagini.js"
Cohesion: 0.22
Nodes (7): ASSETS_BASE_DIR, dotenv, EXCLUDED, fs, path, prisma, { PrismaClient }

### Community 19 - "checkout.module.ts"
Cohesion: 0.25
Nodes (3): ConfigController, CheckoutModule, SpeseSpedizioneModule

### Community 20 - ".login"
Cohesion: 0.06
Nodes (4): AuthController, ChangePasswordDto, LoginDto, UpdateProfileDto

### Community 21 - "DataTable"
Cohesion: 0.13
Nodes (19): calcTotale(), fmtDate(), fmtPrezzo(), OrdiniPage(), SortField, staticRangesIT, DataTable(), formatDateTime() (+11 more)

### Community 23 - "EmbeddingService"
Cohesion: 0.09
Nodes (4): InsightController, InsightService, EmbeddingService, purgeThumbCache()

### Community 24 - "leads.controller.ts"
Cohesion: 0.08
Nodes (7): EsitoAzione, CreateLeadDto, LeadsController, valido, COLORE, ETICHETTA, paginaAzione()

### Community 25 - "environment"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "mail.service.ts"
Cohesion: 0.07
Nodes (23): estraiJson(), CustomerProfileService, DatiImpresaService, calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede (+15 more)

### Community 27 - "cataloghi-admin.controller.ts"
Cohesion: 0.21
Nodes (6): CataloghiModule, ASSETS_BASE_DIR, CATALOGHI_DIR, ALLOWED_WIDTHS, CACHE_DIR, @nestjs/config

### Community 28 - "SchedaArticoloPage"
Cohesion: 0.06
Nodes (26): getStock(), ProductBreadcrumb(), SchedaArticoloPage(), activeEntries(), addAllToCart(), addSingleToCart(), galleryModalNav(), getAvailableValues() (+18 more)

### Community 29 - "admin.service.ts"
Cohesion: 0.05
Nodes (15): class-validator@^0.15.1, @nestjs/mapped-types@^2.1.1, CreateGroupDto, CreateRaccoltaDto, CreateSuggestionBoxDto, CreateFamigliaDto, UpdateFamigliaDto, UpdateGroupDto (+7 more)

### Community 30 - "MailService"
Cohesion: 0.23
Nodes (5): esc(), euro(), MailService, reportLeadHtml(), riempi()

### Community 31 - "restore-b2b-views.sql"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 32 - "CataloghiSection.tsx"
Cohesion: 0.09
Nodes (21): CataloghiSection(), apriDettaglio(), inviaABrevo(), revoca(), Catalogo, Cliente, Destinatario, DettaglioScreen() (+13 more)

### Community 33 - "AdminOrdiniService"
Cohesion: 0.10
Nodes (4): AdminOrdiniController, AdminOrdiniService, AggiornaStatoOrdineDto, STATI_ORDINE_CONSENTITI

### Community 35 - "AdminOrdiniSection.tsx"
Cohesion: 0.13
Nodes (19): AdminOrdiniSection(), DashboardData, fmtDate(), fmtEur(), OrderSummary, PageData, STATI, staticRangesIT (+11 more)

### Community 37 - "AiUsageService"
Cohesion: 0.13
Nodes (5): AiUsageController, AiUsageModule, AiUsageService, DEFAULT_PRICES, FALLBACK

### Community 38 - "app.js"
Cohesion: 0.18
Nodes (26): aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer(), conta() (+18 more)

### Community 39 - "area/page.tsx"
Cohesion: 0.11
Nodes (17): AreaClientePage(), BoxArticolo, GridIcon(), SearchIcon(), SparkleIcon(), SuggestionBoxView, AiSearchModal(), ChangePasswordCard() (+9 more)

### Community 42 - "SpeseSpedizioneService"
Cohesion: 0.14
Nodes (3): euCount(), SpeseSpedizioneService, zonaOf()

### Community 43 - "ref_react"
Cohesion: 0.10
Nodes (29): LoginPage(), AdminLayout(), AdminSidebar(), logout(), ICONS, NAV_ITEMS, AccountTab(), InfoTab() (+21 more)

### Community 44 - "OrdiniController"
Cohesion: 0.11
Nodes (5): AdminOrdiniModule, OrdiniController, OrdiniModule, OrdiniService, PrismaModule

### Community 47 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 48 - "FamiglieSection"
Cohesion: 0.15
Nodes (5): displayNome(), FamigliaEditModal(), FamiglieSection(), genDeleteCode(), requestDelete()

### Community 49 - "Notice"
Cohesion: 0.05
Nodes (28): AdminPage(), SECTION_TITLES, ImportaArticoliModal(), doImport(), startTimeout(), ImportaClientiModal(), doImport(), startTimeout() (+20 more)

### Community 50 - ""permission_groups""
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "azioni.service.ts"
Cohesion: 0.19
Nodes (13): EsitoAggancio, Azione, AZIONI, EsitoToken, firma(), segretoAzioni(), AzioniLeadService, Parametri (+5 more)

### Community 53 - "EventLogSection.tsx"
Cohesion: 0.17
Nodes (15): categoriaDi(), EventDetailModal(), EventLogItem, categoriaDi(), EVENT_TYPES, EventLogItem, EventLogSection(), fmtDt() (+7 more)

### Community 54 - "frontend/lib/api.ts"
Cohesion: 0.05
Nodes (59): CarrelloPage(), notifyCart(), remove(), toggleSave(), CartItem, PrezzoInfo, Articolo, CorrelatoCard (+51 more)

### Community 55 - "dependencies"
Cohesion: 0.05
Nodes (42): dependencies, class-transformer@^0.5.1, connect-pg-simple@^10.0.0, cookie@^1.1.1, cookie-parser@^1.4.7, cron-parser@^5.6.1, dotenv@^17.4.2, express-session@^1.19.0 (+34 more)

### Community 58 - "admin-leads.service.ts"
Cohesion: 0.13
Nodes (11): COPPIE_ERRORE, erroriAttivi(), FILTRI_STATO, GIORNI_ALLARME, giorniAttesa(), ORDINAMENTI, AdminLeadsService, STATI_IN_ATTESA (+3 more)

### Community 59 - ""users""
Cohesion: 0.11
Nodes (18): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+10 more)

### Community 60 - "leads.service.ts"
Cohesion: 0.19
Nodes (9): ReportIndagine, LeadsService, pulisci(), giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA, crea() (+1 more)

### Community 61 - "SyncService"
Cohesion: 0.11
Nodes (3): sqlAggiornaClienti(), SyncManagerService, SyncService

### Community 63 - "ExportOrdiniService"
Cohesion: 0.07
Nodes (18): exceljs@4.4.0, main(), scriviXlsxAtomico(), ExportOrdiniController, ExportOrdiniService, anagraficaDaCliente(), anagraficaDaLead(), AnagraficaIntegra (+10 more)

### Community 65 - "frontend/package.json"
Cohesion: 0.09
Nodes (26): dependencies, date-fns@4.4.0, next@16.2.9, react@19.2.4, react-date-range@2.0.1, react-markdown@^10.1.0, socket.io-client@^4.8.3, engines (+18 more)

### Community 66 - "src/app/layout.tsx"
Cohesion: 0.18
Nodes (11): RootLayout(), b(), Footer(), Header(), switchLang(), LINGUE, setLangCookie(), PopupApertureLink() (+3 more)

### Community 67 - "seed-integra-from-export.js"
Cohesion: 0.17
Nodes (8): pg@^8.21.0, base, { Client }, url, { Client }, { Client }, rows, pg

### Community 70 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 71 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 72 - "customers"
Cohesion: 0.13
Nodes (11): admin.fn_user_assign_group(), auth.fn_login_lookup(), customers, customers.fn_customer_create(), customers.fn_customer_update(), users.fn_user_set_password(), users.fn_user_update(), auth.fn_login_lookup() (+3 more)

### Community 73 - "frontend-vetrina/package.json"
Cohesion: 0.05
Nodes (55): eslint@^9.18.0, @types/node@^24.0.0, typescript@^5.7.3, eslint, @types/node, typescript, next-intl@^4.13.0, react-dom@19.2.4 (+47 more)

### Community 74 - "frontend/app/page.tsx"
Cohesion: 0.18
Nodes (10): LandingPage(), LoginModal(), AiSearchSection(), CtaSection(), FeaturesSection(), HeroSection(), LandingNav(), LineeSection() (+2 more)

### Community 75 - "mail.service.ts"
Cohesion: 0.16
Nodes (10): box(), boxClienteIntegra(), esc(), MailModule, BADGE, DatiClienteMail, DatiConfermaOrdine, DatiOrdineMail (+2 more)

### Community 77 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:migrate, db:seed, db:setup, embeddings:backfill, format, lint (+9 more)

### Community 82 - "CouponSection.tsx"
Cohesion: 0.08
Nodes (15): AiSuggestion, AiSuggestionsResponse, CouponEditorModal(), stl, CouponReviewModal(), fmtDate(), Campaign, CouponSection() (+7 more)

### Community 83 - "checkout.controller.ts"
Cohesion: 0.16
Nodes (5): FatturazioneDto, confermaRichiesta(), erroreCanaleSdi(), FatturazioneService, ok

### Community 84 - "prod-align-2026-07.sql"
Cohesion: 0.15
Nodes (11): contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, ordini_clienti_da_esportare_idx, indirizzi_clienti_customer_id_codice_destinazione_key, "integra_pagamenti_descr", "integra_porti" (+3 more)

### Community 85 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 87 - "20260624143908_catalogo_models/migration.sql"
Cohesion: 0.23
Nodes (11): articolo_embedding, "articoli", articoli_codice_linea_key, "articoli_raccolte", articoli_raccolte_articolo_id_raccolta_id_key, "famiglie", "immagini", "raccolte" (+3 more)

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

### Community 94 - "seed-integra-from-export.js"
Cohesion: 0.29
Nodes (5): { Client }, cols, fs, path, rows

### Community 96 - "seed.js"
Cohesion: 0.07
Nodes (24): argon2@^0.44.0, @prisma/adapter-pg@7.8.0, adapter, prisma, { PrismaClient }, { PrismaPg }, adapter, argon2 (+16 more)

### Community 97 - "20260708000000_cache_integra/migration.sql"
Cohesion: 0.32
Nodes (11): idx_articoli_cod, idx_articoli_descr, idx_articoli_errors, idx_articoli_extra, idx_articoli_famiglia, idx_articoli_linea, idx_sync_log_entity, integra_articoli (+3 more)

### Community 98 - "verifica-coupon-illimitato.cjs"
Cohesion: 0.21
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 99 - "spese-spedizione.service.ts"
Cohesion: 0.14
Nodes (12): DatiCheckout, ModalitaConsegna, provinciaToRegione(), Calcola(), NAZIONI, NAZIONI_ORDER, PctOf(), REGIONI_IT (+4 more)

### Community 100 - "privacy/page.tsx"
Cohesion: 0.33
Nodes (7): CookiePage(), Tabella(), En(), It(), PrivacyPage(), Da(), Documento()

### Community 102 - "frontend/app/layout.tsx"
Cohesion: 0.24
Nodes (3): RootLayout(), ConfirmProvider(), SessionTerminatedOverlay()

### Community 103 - "EditImageModal.tsx"
Cohesion: 0.05
Nodes (37): RelatedSection(), AnteprimaArticoloPage(), Articolo, DimEntry, Immagine, Variante, ItemP, ProgettoPubblicoPage() (+29 more)

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
Cohesion: 0.33
Nodes (9): "cataloghi", "download_events", download_events_link_id_at_idx, "download_links", download_links_mailing_id_created_at_idx, download_links_token_key, "mailing", "mailing_catalogo" (+1 more)

### Community 116 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, watchAssets, $schema, sourceRoot

### Community 119 - "AggancioLeadService"
Cohesion: 0.17
Nodes (6): AggancioLeadService, EsitoRicerca, crea(), lead, emailAccesso(), emailEffettiva()

### Community 122 - "20260803000000_dashboard_ai/migration.sql"
Cohesion: 0.43
Nodes (6): "dashboard_boxes", dashboard_boxes_customer_box_key, dashboard_boxes_customer_idx, "promozioni", promozioni_attiva_data_fine_idx, "suggestion_boxes"

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

### Community 132 - "CreaMailingDto"
Cohesion: 0.22
Nodes (4): CreaMailingDto, ImportClientiDto, AzioneDto, ReinviaDto

### Community 135 - "20260709120000_add_carrello/migration.sql"
Cohesion: 0.70
Nodes (4): carrelli, carrello_items, idx_carrello_items_carrello_id, idx_carrello_items_salvato

### Community 138 - "customer-intelligence.service.ts"
Cohesion: 0.09
Nodes (11): AccessLogInterceptor, ACTION_MAP, getLabel(), AUDITED, auditExtension, WRITES, HttpErrorFilter, RequestContextInterceptor (+3 more)

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

### Community 221 - "app.e2e-spec.ts"
Cohesion: 0.29
Nodes (5): @nestjs/testing@^11.0.1, supertest@^7.0.0, AppModule, @nestjs/testing, supertest

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1143 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **146 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `PrismaService`, `app.module.ts`, `@prisma/client`, `backend/package.json`, `customer-intelligence.service.ts`, `checkout.module.ts`, `leads.controller.ts`, `mail.service.ts`, `cataloghi-admin.controller.ts`, `admin.service.ts`, `AiUsageService`, `OrdiniController`, `azioni.service.ts`, `dependencies`, `admin-leads.service.ts`, `leads.service.ts`, `mail.service.ts`, `checkout.controller.ts`, `conservazione.service.ts`, `app.e2e-spec.ts`, `spese-spedizione.service.ts`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `PrismaService` be split into smaller, more focused modules?**
  _Cohesion score 0.03651202749140894 - nodes in this community are weakly interconnected._
- **Why does `handleSave()` connect `mail.service.ts` to `Notice`, `app.js`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06458635703918723 - nodes in this community are weakly interconnected._
- **Should `ref_react` be split into smaller, more focused modules?**
  _Cohesion score 0.07550860719874804 - nodes in this community are weakly interconnected._
- **Should `UserEditorModal.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.02824858757062147 - nodes in this community are weakly interconnected._