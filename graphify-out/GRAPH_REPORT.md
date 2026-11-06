# Graph Report - Luis Srl - B2B  (2026-11-06)

## Corpus Check
- 431 files · ~440,067 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 12, .css 11, .cmd 6)

## Summary
- 3299 nodes · 7521 edges · 253 communities (114 shown, 139 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 389 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `87c5dc74`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- @nestjs/common
- DataTable
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
- integrazione.service.ts
- LeadsController
- environment
- mail.service.ts
- cataloghi-admin.service.ts
- SchedaArticoloPage
- admin.service.ts
- MailService
- restore-b2b-views.sql
- CataloghiSection.tsx
- AdminOrdiniService
- DashboardService
- CustomersController
- useConfirm
- app.js
- AiUsageController
- CheckoutController
- UsersController
- SpeseSpedizioneService
- ref_react
- OrdiniController
- FamiglieSection
- CataloghiService
- compilerOptions
- CarrelloService
- DataTable
- "permission_groups"
- azioni.service.ts
- AuditController
- EventLogSection.tsx
- useAuth
- dependencies
- @prisma/adapter-pg
- CatalogoController
- admin-leads.service.ts
- "users"
- LeadsService
- SyncService
- customer-profile.service.ts
- ExportOrdiniService
- SpeseSpedizioneController
- frontend/package.json
- src/app/layout.tsx
- seed-integra-from-export.js
- CatalogoPublicController
- dependencies
- compilerOptions
- compilerOptions
- v_user
- devDependencies
- frontend/app/page.tsx
- mail.service.ts
- ImgController
- scripts
- CheckoutService
- DashboardController
- CustomerProfileService
- InsightController
- BoxSuggerimentiSection
- checkout.service.ts
- customers
- frontend-vetrina/package.json
- backend/eslint.config.mjs
- 20260624143908_catalogo_models/migration.sql
- scripts
- https-proxy.mjs
- createCombobox
- verifica-costo-trasporto.cjs
- conservazione.service.ts
- customers.service.ts
- seed.js
- 20260708000000_cache_integra/migration.sql
- verifica-coupon-illimitato.cjs
- spese-spedizione.service.ts
- privacy/page.tsx
- riallinea-immagini.js
- frontend/app/layout.tsx
- auth.controller.ts
- integra_clienti_piva_digits_idx
- CustomerTimeline.tsx
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
- BrevoService
- EventsController
- 20260711000001_sync_state_listini/migration.sql
- 20260714000000_progetti/migration.sql
- 20260812104416_add_event_log/migration.sql
- 20261012000000_add_leads/migration.sql
- CreateUserDto
- frontend/eslint.config.mjs
- main.ts
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
- express-session
- 20260806000000_add_tariffe_spedizione/migration.sql
- 20260811140000_create_site_config/migration.sql
- 20260807000001_add_anomalia_log/migration.sql
- postcss.config.mjs
- tailwind.config.mjs
- CustomerDossier.tsx
- scripts
- Tooltip
- typescript
- UpdateUserPermissionsDto
- engines
- seed-integra-from-export.js
- ClientiSection
- UpdateTariffaDto
- AggiornaStatoOrdineDto
- app.e2e-spec.ts
- CreateFamigliaDto
- HealthController
- fix-coupon-scope.js
- SyncButton.tsx
- get-article.js
- temp-check.js
- next.config.mjs
- startTimeout

## God Nodes (most connected - your core abstractions)
1. `IntegrazioneService` - 112 edges
2. `RequirePermission()` - 107 edges
3. `@nestjs/common` - 102 edges
4. `PrismaService` - 89 edges
5. `AuthenticatedRequest` - 77 edges
6. `Modal()` - 61 edges
7. `api` - 54 edges
8. `Notice()` - 52 edges
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

## Communities (253 total, 139 thin omitted)

### Community 0 - "@nestjs/common"
Cohesion: 0.07
Nodes (15): CarrelloModule, Dossier, DossierFamiglia, DossierKpi, MotivoOfferta, Offerta, EventsService, SyncConfigRow (+7 more)

### Community 1 - "DataTable"
Cohesion: 0.13
Nodes (19): AdminOrdiniSection(), DashboardData, fmtDate(), fmtEur(), OrderSummary, PageData, STATI, staticRangesIT (+11 more)

### Community 2 - "app.module.ts"
Cohesion: 0.06
Nodes (17): AdminModule, AdminOrdiniModule, AiUsageModule, AppModule, AuditModule, CheckoutModule, CouponModule, CustomersModule (+9 more)

### Community 3 - "ref_react"
Cohesion: 0.07
Nodes (59): AdminTopBar(), Column, DataTableProps, RowAction, IconChevronLeft, IconChevronRight, IconEdit, IconEye (+51 more)

### Community 4 - "UserEditorModal.tsx"
Cohesion: 0.09
Nodes (23): CustomerOfferte(), ProvisionalPasswordModal(), AddrCard(), descrizioneOrdine(), Field(), fmtDataIt(), fmtDate(), RoField() (+15 more)

### Community 6 - "src/app/page.tsx"
Cohesion: 0.07
Nodes (36): Page(), CatalogoPage(), one(), Search, Page(), Home(), Page(), Variante (+28 more)

### Community 7 - "users.service.ts"
Cohesion: 0.14
Nodes (9): toUserProfile(), UserProfile, buildStatoFilter(), UserFilter, UpdateUserDto, UsersModule, AVATAR_COLORS, GRUPPO_PER_RUOLO (+1 more)

### Community 8 - "backend/package.json"
Cohesion: 0.05
Nodes (51): author, description, devDependencies, eslint-config-prettier@^10.0.1, @eslint/eslintrc@^3.2.0, jest@^30.0.0, @nestjs/cli@^11.0.0, @nestjs/schematics@^11.0.0 (+43 more)

### Community 11 - "RichiesteAccessoSection.tsx"
Cohesion: 0.09
Nodes (22): Azione, AZIONI_PER_STATO, BADGE_SEGNALE, dataOra(), Dettaglio, EmailAccessoEditor(), ETICHETTA_AZIONE, EVENTI (+14 more)

### Community 12 - "checkout/page.tsx"
Cohesion: 0.05
Nodes (33): CartItem, CheckoutPage(), closeNuovoForm(), conferma(), saveIndirizzo(), DatiCheckout, fmtEur(), Indirizzo (+25 more)

### Community 13 - "RequirePermission"
Cohesion: 0.17
Nodes (4): AdminController, RequirePermission(), AuthenticatedRequest, AdminLeadsController

### Community 14 - "@nestjs/common"
Cohesion: 0.12
Nodes (13): @nestjs/core@^11.0.1, AuthModule, PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard (+5 more)

### Community 15 - "SpeseSpedizioneSection.tsx"
Cohesion: 0.12
Nodes (28): GuidaModal(), SpeseSpedizioneSection(), onDeleteTariffa(), refresh(), toggleStato(), TariffaCalcModal(), TariffaEditor(), calcFee() (+20 more)

### Community 17 - "ProgettiService"
Cohesion: 0.10
Nodes (3): ProgettiController, ProgettiPublicController, ProgettiService

### Community 18 - "export-cliente.service.ts"
Cohesion: 0.06
Nodes (25): exceljs@4.4.0, FatturazioneDto, confermaRichiesta(), erroreCanaleSdi(), FatturazioneService, ok, cartellaOrdiniIntegra(), scriviXlsxAtomico() (+17 more)

### Community 19 - "ImpostazioniSection.tsx"
Cohesion: 0.47
Nodes (4): ConfigField(), ConfigToggle(), ImpostazioniSection(), SiteConfig

### Community 20 - ".login"
Cohesion: 0.06
Nodes (4): AuthController, ChangePasswordDto, LoginDto, UpdateProfileDto

### Community 21 - "AdminPanel.tsx"
Cohesion: 0.06
Nodes (39): AdminPanel(), AdminPanelTab, AI_GROUPS, AiConfigEntry, AiConfigSection(), ALL_PERMISSIONS, ConfigField(), formatDate() (+31 more)

### Community 23 - "integrazione.service.ts"
Cohesion: 0.09
Nodes (15): AiUsageService, Candidato, DEFAULT_PESI, PesiSegnali, Segnali, InsightService, EmbeddingService, ASSETS_CACHE_DIR (+7 more)

### Community 25 - "environment"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "mail.service.ts"
Cohesion: 0.12
Nodes (20): estraiJson(), calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede, Segnale, DatiIndagine (+12 more)

### Community 27 - "cataloghi-admin.service.ts"
Cohesion: 0.20
Nodes (7): CataloghiModule, ASSETS_BASE_DIR, ASSETS_PUBLIC_URL, CATALOGHI_DIR, ALLOWED_WIDTHS, CACHE_DIR, @nestjs/config

### Community 28 - "SchedaArticoloPage"
Cohesion: 0.09
Nodes (19): getStock(), ProductBreadcrumb(), SchedaArticoloPage(), activeEntries(), addAllToCart(), addSingleToCart(), galleryModalNav(), getAvailableValues() (+11 more)

### Community 29 - "admin.service.ts"
Cohesion: 0.09
Nodes (11): @nestjs/mapped-types@^2.1.1, CreateGroupDto, CreateRaccoltaDto, CreateSuggestionBoxDto, UpdateFamigliaDto, UpdateGroupDto, UpdateRaccoltaDto, UpdateSuggestionBoxDto (+3 more)

### Community 30 - "MailService"
Cohesion: 0.25
Nodes (5): esc(), euro(), MailService, reportLeadHtml(), riempi()

### Community 31 - "restore-b2b-views.sql"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 32 - "CataloghiSection.tsx"
Cohesion: 0.11
Nodes (19): CataloghiSection(), apriDettaglio(), inviaABrevo(), revoca(), Catalogo, Cliente, Destinatario, DettaglioScreen() (+11 more)

### Community 36 - "CustomersController"
Cohesion: 0.10
Nodes (5): CustomerProfile, toCustomerProfile(), generateProvisionalPassword(), CustomersController, CustomersService

### Community 37 - "useConfirm"
Cohesion: 0.05
Nodes (36): AnteprimaArticoloPage(), Articolo, DimEntry, Immagine, Variante, ItemP, ProgettoPubblicoPage(), Pubblico (+28 more)

### Community 38 - "app.js"
Cohesion: 0.18
Nodes (26): aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer(), conta() (+18 more)

### Community 42 - "SpeseSpedizioneService"
Cohesion: 0.15
Nodes (3): euCount(), SpeseSpedizioneService, zonaOf()

### Community 43 - "ref_react"
Cohesion: 0.06
Nodes (43): LoginPage(), AdminSidebar(), logout(), ICONS, NAV_ITEMS, CouponReviewModal(), fmtDate(), AccountTab() (+35 more)

### Community 44 - "OrdiniController"
Cohesion: 0.13
Nodes (4): OrdiniController, OrdiniModule, OrdiniService, PrismaModule

### Community 45 - "FamiglieSection"
Cohesion: 0.14
Nodes (6): displayNome(), FamigliaEditModal(), handleSave(), FamiglieSection(), genDeleteCode(), requestDelete()

### Community 46 - "CataloghiService"
Cohesion: 0.14
Nodes (3): CataloghiPublicController, CataloghiService, confrontaSegreto()

### Community 47 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 49 - "DataTable"
Cohesion: 0.05
Nodes (34): AdminPage(), SECTION_TITLES, calcTotale(), fmtDate(), fmtPrezzo(), OrdiniPage(), SortField, staticRangesIT (+26 more)

### Community 50 - ""permission_groups""
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "azioni.service.ts"
Cohesion: 0.11
Nodes (19): EsitoAggancio, Azione, AZIONI, EsitoToken, firma(), segretoAzioni(), AzioniLeadService, EsitoAzione (+11 more)

### Community 53 - "EventLogSection.tsx"
Cohesion: 0.17
Nodes (15): categoriaDi(), EventDetailModal(), EventLogItem, categoriaDi(), EVENT_TYPES, EventLogItem, EventLogSection(), fmtDt() (+7 more)

### Community 54 - "useAuth"
Cohesion: 0.05
Nodes (66): CarrelloPage(), notifyCart(), remove(), toggleSave(), CartItem, PrezzoInfo, Articolo, CorrelatoCard (+58 more)

### Community 55 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, class-transformer@^0.5.1, class-validator@^0.15.1, cron-parser@^5.6.1, dotenv@^17.4.2, @nestjs/common@^11.0.1, @nestjs/config@^4.0.4, @nestjs/platform-express@^11.0.1 (+17 more)

### Community 56 - "@prisma/adapter-pg"
Cohesion: 0.25
Nodes (6): @prisma/adapter-pg@7.8.0, adapter, prisma, { PrismaClient }, { PrismaPg }, @prisma/adapter-pg

### Community 58 - "admin-leads.service.ts"
Cohesion: 0.18
Nodes (10): COPPIE_ERRORE, erroriAttivi(), FILTRI_STATO, GIORNI_ALLARME, giorniAttesa(), ORDINAMENTI, AdminLeadsService, STATI_IN_ATTESA (+2 more)

### Community 59 - ""users""
Cohesion: 0.14
Nodes (14): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+6 more)

### Community 60 - "LeadsService"
Cohesion: 0.21
Nodes (7): LeadsService, pulisci(), giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA, crea()

### Community 61 - "SyncService"
Cohesion: 0.10
Nodes (3): sqlAggiornaClienti(), SyncManagerService, SyncService

### Community 62 - "customer-profile.service.ts"
Cohesion: 0.21
Nodes (4): CustomerProfileData, CustomerProfileResult, DatiImpresa, DatiImpresaService

### Community 63 - "ExportOrdiniService"
Cohesion: 0.13
Nodes (3): main(), ExportOrdiniController, ExportOrdiniService

### Community 65 - "frontend/package.json"
Cohesion: 0.13
Nodes (19): dependencies, date-fns@4.4.0, next@16.2.9, next-intl@^4.13.0, react@19.2.4, react-date-range@2.0.1, react-markdown@^10.1.0, socket.io-client@^4.8.3 (+11 more)

### Community 66 - "src/app/layout.tsx"
Cohesion: 0.18
Nodes (11): RootLayout(), b(), Footer(), Header(), switchLang(), LINGUE, setLangCookie(), PopupApertureLink() (+3 more)

### Community 67 - "seed-integra-from-export.js"
Cohesion: 0.17
Nodes (8): pg@^8.21.0, base, { Client }, url, { Client }, { Client }, rows, pg

### Community 68 - "CatalogoPublicController"
Cohesion: 0.11
Nodes (3): CatalogoPublicController, formatDimensioni(), FamiglieController

### Community 69 - "dependencies"
Cohesion: 0.22
Nodes (9): react-dom@19.2.4, react-dom, dependencies, next@16.2.9, next-intl@4.13.0, react@19.2.4, react-dom@19.2.4, next (+1 more)

### Community 70 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 71 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 72 - "v_user"
Cohesion: 0.12
Nodes (10): admin.fn_user_assign_group(), users.fn_user_set_blocked(), users.fn_user_create(), admin.fn_user_assign_group(), customers.fn_customer_create(), users.fn_user_set_blocked(), users.fn_user_set_password(), users.fn_user_update() (+2 more)

### Community 73 - "devDependencies"
Cohesion: 0.14
Nodes (14): eslint@^9.18.0, @types/node@^24.0.0, eslint, @types/node, devDependencies, eslint@^9, @types/node@^20, @types/react@^19 (+6 more)

### Community 74 - "frontend/app/page.tsx"
Cohesion: 0.22
Nodes (9): LandingPage(), AiSearchSection(), CtaSection(), FeaturesSection(), HeroSection(), LandingNav(), LineeSection(), PublicFooter() (+1 more)

### Community 75 - "mail.service.ts"
Cohesion: 0.13
Nodes (12): ReportIndagine, box(), boxClienteIntegra(), esc(), MailModule, BADGE, DatiClienteMail, DatiConfermaOrdine (+4 more)

### Community 77 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:migrate, db:seed, db:setup, embeddings:backfill, format, lint (+9 more)

### Community 82 - "BoxSuggerimentiSection"
Cohesion: 0.18
Nodes (6): BoxEditModal(), BoxSuggerimentiSection(), loadRefs(), openCreate(), openEdit(), ribilancia()

### Community 83 - "checkout.service.ts"
Cohesion: 0.22
Nodes (8): DatiCheckout, ModalitaConsegna, provinciaToRegione(), FILTER_VALUES, REGION_ALIASES, SegCustomer, SegFilter, Suggestion

### Community 84 - "customers"
Cohesion: 0.17
Nodes (10): customers, customers.fn_customer_update(), contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, customer_profiles, idx_customer_profiles_customer_id (+2 more)

### Community 85 - "frontend-vetrina/package.json"
Cohesion: 0.13
Nodes (18): eslint-config-next@16.2.9, @types/react-dom@^19, eslint-config-next, @types/react-dom, devDependencies, eslint-config-next@16.2.9, postcss@^8.5.29, tailwindcss@^4.3.3 (+10 more)

### Community 86 - "backend/eslint.config.mjs"
Cohesion: 0.22
Nodes (8): @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0, typescript-eslint@^8.20.0, @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

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

### Community 94 - "customers.service.ts"
Cohesion: 0.17
Nodes (3): CreateCustomerDto, InvitaBulkDto, UpdateCustomerDto

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
Cohesion: 0.20
Nodes (8): NAZIONI, NAZIONI_ORDER, PctOf(), REGIONI_IT, Resolved, Row, ZONE_KEYS, ZONE_ORDER

### Community 100 - "privacy/page.tsx"
Cohesion: 0.33
Nodes (7): CookiePage(), Tabella(), En(), It(), PrivacyPage(), Da(), Documento()

### Community 101 - "riallinea-immagini.js"
Cohesion: 0.22
Nodes (7): ASSETS_BASE_DIR, dotenv, EXCLUDED, fs, path, prisma, { PrismaClient }

### Community 102 - "frontend/app/layout.tsx"
Cohesion: 0.24
Nodes (3): RootLayout(), ConfirmProvider(), SessionTerminatedOverlay()

### Community 103 - "auth.controller.ts"
Cohesion: 0.27
Nodes (5): AuthService, AuthUser, DUMMY_HASH, hashPassword(), verifyPassword()

### Community 105 - "CustomerTimeline.tsx"
Cohesion: 0.22
Nodes (7): Comportamento, CustomerTimeline(), DOT, Evento, fmt(), Insight, label()

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

### Community 119 - "AggancioLeadService"
Cohesion: 0.17
Nodes (6): AggancioLeadService, EsitoRicerca, crea(), lead, emailAccesso(), emailEffettiva()

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

### Community 134 - "main.ts"
Cohesion: 0.13
Nodes (15): connect-pg-simple@^10.0.0, cookie@^1.1.1, cookie-parser@^1.4.7, helmet@^8.2.0, socket.io@^4.8.3, FRONTEND_ORIGINS, bootstrap(), online (+7 more)

### Community 135 - "20260709120000_add_carrello/migration.sql"
Cohesion: 0.70
Nodes (4): carrelli, carrello_items, idx_carrello_items_carrello_id, idx_carrello_items_salvato

### Community 137 - "c/[token]/page.tsx"
Cohesion: 0.40
Nodes (3): LandingCatalogo, LandingData, styles

### Community 138 - "AuditService"
Cohesion: 0.07
Nodes (15): rxjs@^7.8.1, DEFAULT_PRICES, FALLBACK, AuditService, AccessLogInterceptor, ACTION_MAP, getLabel(), AUDITED (+7 more)

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

### Community 150 - "express-session"
Cohesion: 0.40
Nodes (4): express-session@^1.19.0, express-session, SessionData, express-session

### Community 219 - "CustomerDossier.tsx"
Cohesion: 0.29
Nodes (9): CustomerDossier(), euroK(), fmtData(), MESI, SALUTE, Tile(), Trend(), CustomerDossier (+1 more)

### Community 220 - "scripts"
Cohesion: 0.21
Nodes (8): engines, node, npm, scripts, build, dev, lint, start

### Community 221 - "Tooltip"
Cohesion: 0.27
Nodes (7): Hint(), HintProps, toStr(), Tooltip(), TooltipProps, BadgeFatturazione(), ProfiloTab()

### Community 222 - "typescript"
Cohesion: 0.50
Nodes (4): typescript@^5.7.3, typescript, typescript@^5, typescript@^5

### Community 224 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 225 - "seed-integra-from-export.js"
Cohesion: 0.29
Nodes (5): { Client }, cols, fs, path, rows

### Community 227 - "ClientiSection"
Cohesion: 0.24
Nodes (11): ImportaClientiModal(), doImport(), startTimeout(), ClientiSection(), doSyncClienti(), forzaRiscrittura(), onBlockToggle(), onInvita() (+3 more)

### Community 231 - "app.e2e-spec.ts"
Cohesion: 0.40
Nodes (4): @nestjs/testing@^11.0.1, supertest@^7.0.0, @nestjs/testing, supertest

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1125 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **139 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `stato()` connect `mail.service.ts` to `FamiglieSection`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `@nestjs/common` be split into smaller, more focused modules?**
  _Cohesion score 0.06885245901639345 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `@nestjs/common` to `app.module.ts`, `main.ts`, `users.service.ts`, `backend/package.json`, `AuditService`, `@nestjs/common`, `export-cliente.service.ts`, `integrazione.service.ts`, `mail.service.ts`, `cataloghi-admin.service.ts`, `admin.service.ts`, `OrdiniController`, `azioni.service.ts`, `dependencies`, `admin-leads.service.ts`, `LeadsService`, `customer-profile.service.ts`, `CatalogoPublicController`, `mail.service.ts`, `checkout.service.ts`, `conservazione.service.ts`, `customers.service.ts`, `spese-spedizione.service.ts`, `auth.controller.ts`, `app.e2e-spec.ts`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Should `DataTable` be split into smaller, more focused modules?**
  _Cohesion score 0.12857142857142856 - nodes in this community are weakly interconnected._
- **Why does `handleSave()` connect `mail.service.ts` to `DataTable`, `app.js`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0641025641025641 - nodes in this community are weakly interconnected._