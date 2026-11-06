# Graph Report - Luis Srl - B2B  (2026-11-06)

## Corpus Check
- 427 files · ~438,265 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 12, .css 11, .cmd 6)

## Summary
- 3286 nodes · 7503 edges · 231 communities (105 shown, 126 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 388 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2e0ae716`
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
- export-cliente.ts
- ImpostazioniSection.tsx
- .login
- AdminPanel.tsx
- .log
- AiUsageService
- LeadsController
- environment
- mail.service.ts
- cataloghi-admin.service.ts
- SchedaArticoloPage
- admin.service.ts
- MailService
- restore-b2b-views.sql
- EventsModule
- AdminOrdiniService
- DashboardService
- CustomersController
- thumbUrl
- app.js
- auth.service.ts
- CheckoutController
- DataTable
- SpeseSpedizioneService
- ref_react
- OrdiniController
- integrazione.module.ts
- CataloghiService
- compilerOptions
- InsightService
- CouponSection.tsx
- "permission_groups"
- azioni.service.ts
- leads.service.ts
- EventLogSection.tsx
- useAuth
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
- frontend/package.json
- compilerOptions
- compilerOptions
- v_user
- DashboardController
- frontend/app/page.tsx
- mail.service.ts
- ImgController
- scripts
- CheckoutService
- fix-coupon-scope.js
- CustomerProfileService
- CreateFamigliaDto
- SyncManagerService
- export-cliente.service.ts
- customers
- FatturazioneDto
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
- CustomerTimeline.tsx
- frontend/app/layout.tsx
- DatiImpresaService
- integra_clienti_piva_digits_idx
- CouponEditorModal
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
- access-log.interceptor.ts
- frontend/eslint.config.mjs
- main.ts
- 20260709120000_add_carrello/migration.sql
- c/[token]/page.tsx
- AuditController
- manual-fixups.sql
- 20260715000000_ai_usage/migration.sql
- "customer_event"
- "customer_insight"
- campaigns
- tsconfig.build.json
- route.ts
- EmbeddingService
- 20260806000000_add_tariffe_spedizione/migration.sql
- 20260811140000_create_site_config/migration.sql
- 20260807000001_add_anomalia_log/migration.sql
- postcss.config.mjs
- tailwind.config.mjs
- AppModule
- HealthController
- mail.module.ts
- get-article.js
- engines
- AuditModule
- RequestContextInterceptor
- temp-check.js
- AdminModule
- startTimeout

## God Nodes (most connected - your core abstractions)
1. `IntegrazioneService` - 112 edges
2. `RequirePermission()` - 107 edges
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

## Communities (231 total, 126 thin omitted)

### Community 0 - "PrismaService"
Cohesion: 0.04
Nodes (36): DEFAULT_PRICES, FALLBACK, AuditService, DatiCheckout, ModalitaConsegna, AUDITED, auditExtension, WRITES (+28 more)

### Community 1 - "Modal"
Cohesion: 0.05
Nodes (22): AdminPage(), SECTION_TITLES, BoxEditModal(), BoxSuggerimentiSection(), loadRefs(), openCreate(), openEdit(), ribilancia() (+14 more)

### Community 2 - "app.module.ts"
Cohesion: 0.10
Nodes (11): AdminOrdiniModule, AuthModule, CataloghiModule, CheckoutModule, CustomersModule, ExportOrdiniModule, ImgModule, LeadsModule (+3 more)

### Community 3 - "ref_react"
Cohesion: 0.06
Nodes (62): Column, DataTableProps, RowAction, IconChevronLeft, IconChevronRight, IconEdit, IconEye, IconEyeOff (+54 more)

### Community 4 - "UserEditorModal.tsx"
Cohesion: 0.07
Nodes (37): CustomerDossier(), euroK(), fmtData(), MESI, SALUTE, Tile(), Trend(), DataTip() (+29 more)

### Community 6 - "src/app/page.tsx"
Cohesion: 0.07
Nodes (36): Page(), CatalogoPage(), one(), Search, Page(), Home(), Page(), Variante (+28 more)

### Community 7 - "users.service.ts"
Cohesion: 0.07
Nodes (12): toUserProfile(), UserProfile, buildStatoFilter(), UserFilter, EmailAccessoDto, CreateUserDto, UpdateUserDto, UsersController (+4 more)

### Community 8 - "backend/package.json"
Cohesion: 0.05
Nodes (59): author, description, devDependencies, eslint-config-prettier@^10.0.1, @eslint/eslintrc@^3.2.0, @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0 (+51 more)

### Community 9 - "CataloghiAdminService"
Cohesion: 0.07
Nodes (3): BrevoService, CataloghiAdminController, CataloghiAdminService

### Community 10 - "CouponService"
Cohesion: 0.06
Nodes (8): provinciaToRegione(), CouponController, CouponService, FILTER_VALUES, REGION_ALIASES, SegCustomer, SegFilter, Suggestion

### Community 11 - "RichiesteAccessoSection.tsx"
Cohesion: 0.05
Nodes (45): CataloghiSection(), apriDettaglio(), inviaABrevo(), revoca(), Catalogo, Cliente, Destinatario, DettaglioScreen() (+37 more)

### Community 12 - "checkout/page.tsx"
Cohesion: 0.08
Nodes (22): CartItem, CheckoutPage(), closeNuovoForm(), conferma(), saveIndirizzo(), DatiCheckout, fmtEur(), Indirizzo (+14 more)

### Community 13 - "RequirePermission"
Cohesion: 0.12
Nodes (4): AdminController, RequirePermission(), AuthenticatedRequest, AdminLeadsController

### Community 14 - "@nestjs/common"
Cohesion: 0.15
Nodes (9): PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard, OrdiniService, @nestjs/common (+1 more)

### Community 15 - "SpeseSpedizioneSection.tsx"
Cohesion: 0.12
Nodes (28): GuidaModal(), SpeseSpedizioneSection(), onDeleteTariffa(), refresh(), toggleStato(), TariffaCalcModal(), TariffaEditor(), calcFee() (+20 more)

### Community 17 - "ProgettiService"
Cohesion: 0.06
Nodes (5): CarrelloController, CarrelloService, ProgettiController, ProgettiPublicController, ProgettiService

### Community 18 - "export-cliente.ts"
Cohesion: 0.21
Nodes (10): anagraficaDaLead(), AnagraficaIntegra, Colonna, formattaIndirizzo(), piva(), rigaCliente(), lead, t() (+2 more)

### Community 19 - "ImpostazioniSection.tsx"
Cohesion: 0.47
Nodes (4): ConfigField(), ConfigToggle(), ImpostazioniSection(), SiteConfig

### Community 20 - ".login"
Cohesion: 0.06
Nodes (4): AuthController, ChangePasswordDto, LoginDto, UpdateProfileDto

### Community 21 - "AdminPanel.tsx"
Cohesion: 0.04
Nodes (56): AdminLayout(), AdminPanel(), AdminPanelTab, AI_GROUPS, AiConfigEntry, AiConfigSection(), ALL_PERMISSIONS, ConfigField() (+48 more)

### Community 24 - "LeadsController"
Cohesion: 0.14
Nodes (5): EsitoAzione, LeadsController, COLORE, ETICHETTA, paginaAzione()

### Community 25 - "environment"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "mail.service.ts"
Cohesion: 0.12
Nodes (21): estraiJson(), calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede, Segnale, DatiIndagine (+13 more)

### Community 27 - "cataloghi-admin.service.ts"
Cohesion: 0.22
Nodes (6): ASSETS_BASE_DIR, ASSETS_PUBLIC_URL, CATALOGHI_DIR, ALLOWED_WIDTHS, CACHE_DIR, @nestjs/config

### Community 28 - "SchedaArticoloPage"
Cohesion: 0.09
Nodes (19): getStock(), ProductBreadcrumb(), SchedaArticoloPage(), activeEntries(), addAllToCart(), addSingleToCart(), galleryModalNav(), getAvailableValues() (+11 more)

### Community 29 - "admin.service.ts"
Cohesion: 0.07
Nodes (13): CreateGroupDto, CreateRaccoltaDto, CreateSuggestionBoxDto, UpdateFamigliaDto, UpdateGroupDto, UpdateRaccoltaDto, UpdateSuggestionBoxDto, PermissionOverrideDto (+5 more)

### Community 30 - "MailService"
Cohesion: 0.14
Nodes (6): esc(), LeadsService, euro(), MailService, reportLeadHtml(), riempi()

### Community 31 - "restore-b2b-views.sql"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 33 - "AdminOrdiniService"
Cohesion: 0.11
Nodes (3): AdminOrdiniController, AdminOrdiniService, AggiornaStatoOrdineDto

### Community 36 - "CustomersController"
Cohesion: 0.08
Nodes (8): CustomerProfile, toCustomerProfile(), generateProvisionalPassword(), CustomersController, CustomersService, CreateCustomerDto, InvitaBulkDto, UpdateCustomerDto

### Community 37 - "thumbUrl"
Cohesion: 0.12
Nodes (10): AnalisiFotoModal(), Props, DescrizioneAiWizard(), handleAnalisiAccepted(), handleGenerate(), Props, StepDef, STEPS (+2 more)

### Community 38 - "app.js"
Cohesion: 0.18
Nodes (26): aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer(), conta() (+18 more)

### Community 39 - "auth.service.ts"
Cohesion: 0.19
Nodes (5): AuthService, AuthUser, DUMMY_HASH, hashPassword(), verifyPassword()

### Community 41 - "DataTable"
Cohesion: 0.10
Nodes (28): calcTotale(), fmtDate(), fmtPrezzo(), OrdiniPage(), SortField, staticRangesIT, DataTable(), AdminOrdiniSection() (+20 more)

### Community 42 - "SpeseSpedizioneService"
Cohesion: 0.14
Nodes (3): euCount(), SpeseSpedizioneService, zonaOf()

### Community 43 - "ref_react"
Cohesion: 0.05
Nodes (46): CartItem, PrezzoInfo, Progetto, LoginPage(), ItemP, ProgettoPubblicoPage(), Pubblico, AiSuggestion (+38 more)

### Community 45 - "integrazione.module.ts"
Cohesion: 0.14
Nodes (7): AiUsageModule, CarrelloModule, CouponModule, DashboardModule, InsightModule, IntegrazioneModule, ProgettiModule

### Community 46 - "CataloghiService"
Cohesion: 0.14
Nodes (3): CataloghiPublicController, CataloghiService, confrontaSegreto()

### Community 47 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 49 - "CouponSection.tsx"
Cohesion: 0.07
Nodes (29): CarrelloPage(), notifyCart(), remove(), toggleSave(), Dettaglio, ItemP, ProgettoDetailPage(), CustomerOfferte() (+21 more)

### Community 50 - ""permission_groups""
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "azioni.service.ts"
Cohesion: 0.14
Nodes (16): AzioneDto, ReinviaDto, Azione, AZIONI, EsitoToken, firma(), segretoAzioni(), AzioniLeadService (+8 more)

### Community 52 - "leads.service.ts"
Cohesion: 0.14
Nodes (7): CreateLeadDto, pulisci(), valido, giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA

### Community 53 - "EventLogSection.tsx"
Cohesion: 0.17
Nodes (15): categoriaDi(), EventDetailModal(), EventLogItem, categoriaDi(), EVENT_TYPES, EventLogItem, EventLogSection(), fmtDt() (+7 more)

### Community 54 - "useAuth"
Cohesion: 0.06
Nodes (42): Catalogo, CatalogoArticolo, CatalogoPage(), colorDistance(), hexToLab(), normKey(), SORT_OPTIONS, Famiglia (+34 more)

### Community 55 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, class-transformer@^0.5.1, class-validator@^0.15.1, cron-parser@^5.6.1, exceljs@4.4.0, @nestjs/common@^11.0.1, @nestjs/config@^4.0.4, @nestjs/core@^11.0.1 (+21 more)

### Community 56 - "@prisma/adapter-pg"
Cohesion: 0.25
Nodes (6): @prisma/adapter-pg@7.8.0, adapter, prisma, { PrismaClient }, { PrismaPg }, @prisma/adapter-pg

### Community 57 - "CatalogoController"
Cohesion: 0.13
Nodes (6): CatalogoController, hexToLab(), hexToSrgb(), rgbToXyz(), srgbToLinear(), xyzToLab()

### Community 58 - "admin-leads.service.ts"
Cohesion: 0.13
Nodes (10): COPPIE_ERRORE, erroriAttivi(), FILTRI_STATO, GIORNI_ALLARME, giorniAttesa(), ORDINAMENTI, AdminLeadsService, STATI_IN_ATTESA (+2 more)

### Community 59 - ""users""
Cohesion: 0.14
Nodes (14): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+6 more)

### Community 60 - "riallinea-immagini.js"
Cohesion: 0.18
Nodes (9): dotenv@^17.4.2, ASSETS_BASE_DIR, dotenv, EXCLUDED, fs, path, prisma, { PrismaClient } (+1 more)

### Community 62 - "catalogo/[codiceLinea]/page.tsx"
Cohesion: 0.08
Nodes (29): Articolo, CorrelatoCard, DimEntry, Immagine, PrezzoInfo, Raccolta, RelatedSection(), STOCK_CLASS (+21 more)

### Community 63 - "ExportOrdiniService"
Cohesion: 0.14
Nodes (3): main(), ExportOrdiniController, ExportOrdiniService

### Community 65 - "frontend/package.json"
Cohesion: 0.10
Nodes (22): dependencies, date-fns@4.4.0, next@16.2.9, next-intl@^4.13.0, react@19.2.4, react-date-range@2.0.1, react-dom@19.2.4, react-markdown@^10.1.0 (+14 more)

### Community 66 - "src/app/layout.tsx"
Cohesion: 0.18
Nodes (11): RootLayout(), b(), Footer(), Header(), switchLang(), LINGUE, setLangCookie(), PopupApertureLink() (+3 more)

### Community 67 - "seed-integra-from-export.js"
Cohesion: 0.11
Nodes (13): pg@^8.21.0, base, { Client }, url, { Client }, { Client }, cols, fs (+5 more)

### Community 68 - "CatalogoPublicController"
Cohesion: 0.12
Nodes (3): CatalogoPublicController, formatDimensioni(), FamiglieController

### Community 69 - "frontend/package.json"
Cohesion: 0.05
Nodes (50): eslint@^9.18.0, @types/node@^24.0.0, typescript@^5.7.3, eslint, @types/node, typescript, devDependencies, eslint@^9 (+42 more)

### Community 70 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 71 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 72 - "v_user"
Cohesion: 0.12
Nodes (10): admin.fn_user_assign_group(), users.fn_user_set_blocked(), users.fn_user_create(), admin.fn_user_assign_group(), customers.fn_customer_create(), users.fn_user_set_blocked(), users.fn_user_set_password(), users.fn_user_update() (+2 more)

### Community 74 - "frontend/app/page.tsx"
Cohesion: 0.22
Nodes (9): LandingPage(), AiSearchSection(), CtaSection(), FeaturesSection(), HeroSection(), LandingNav(), LineeSection(), PublicFooter() (+1 more)

### Community 75 - "mail.service.ts"
Cohesion: 0.17
Nodes (11): ReportIndagine, box(), boxClienteIntegra(), esc(), BADGE, DatiClienteMail, DatiConfermaOrdine, DatiLeadMail (+3 more)

### Community 77 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:migrate, db:seed, db:setup, embeddings:backfill, format, lint (+9 more)

### Community 83 - "export-cliente.service.ts"
Cohesion: 0.22
Nodes (8): confermaRichiesta(), erroreCanaleSdi(), ok, cartellaOrdiniIntegra(), scriviXlsxAtomico(), anagraficaDaCliente(), COLONNE_CLIENTI, exceljs

### Community 84 - "customers"
Cohesion: 0.17
Nodes (10): customers, customers.fn_customer_update(), contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, customer_profiles, idx_customer_profiles_customer_id (+2 more)

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
Nodes (9): Calcola(), NAZIONI, NAZIONI_ORDER, PctOf(), REGIONI_IT, Resolved, Row, ZONE_KEYS (+1 more)

### Community 100 - "privacy/page.tsx"
Cohesion: 0.33
Nodes (7): CookiePage(), Tabella(), En(), It(), PrivacyPage(), Da(), Documento()

### Community 101 - "CustomerTimeline.tsx"
Cohesion: 0.22
Nodes (7): Comportamento, CustomerTimeline(), DOT, Evento, fmt(), Insight, label()

### Community 102 - "frontend/app/layout.tsx"
Cohesion: 0.24
Nodes (3): RootLayout(), ConfirmProvider(), SessionTerminatedOverlay()

### Community 103 - "DatiImpresaService"
Cohesion: 0.25
Nodes (3): CustomerProfileData, DatiImpresa, DatiImpresaService

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
Cohesion: 0.24
Nodes (4): AggancioLeadService, EsitoRicerca, emailAccesso(), emailEffettiva()

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

### Community 132 - "access-log.interceptor.ts"
Cohesion: 0.29
Nodes (3): AccessLogInterceptor, ACTION_MAP, getLabel()

### Community 134 - "main.ts"
Cohesion: 0.10
Nodes (19): connect-pg-simple@^10.0.0, cookie@^1.1.1, cookie-parser@^1.4.7, express-session@^1.19.0, helmet@^8.2.0, socket.io@^4.8.3, FRONTEND_ORIGINS, bootstrap() (+11 more)

### Community 135 - "20260709120000_add_carrello/migration.sql"
Cohesion: 0.70
Nodes (4): carrelli, carrello_items, idx_carrello_items_carrello_id, idx_carrello_items_salvato

### Community 137 - "c/[token]/page.tsx"
Cohesion: 0.40
Nodes (3): LandingCatalogo, LandingData, styles

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

### Community 219 - "AppModule"
Cohesion: 0.29
Nodes (5): @nestjs/testing@^11.0.1, supertest@^7.0.0, AppModule, @nestjs/testing, supertest

### Community 224 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1115 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **126 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `PrismaService`, `app.module.ts`, `access-log.interceptor.ts`, `main.ts`, `users.service.ts`, `backend/package.json`, `CouponService`, `LeadsController`, `mail.service.ts`, `cataloghi-admin.service.ts`, `admin.service.ts`, `CustomersController`, `auth.service.ts`, `integrazione.module.ts`, `azioni.service.ts`, `leads.service.ts`, `dependencies`, `admin-leads.service.ts`, `mail.service.ts`, `export-cliente.service.ts`, `AppModule`, `conservazione.service.ts`, `mail.module.ts`, `spese-spedizione.service.ts`, `DatiImpresaService`, `AggancioLeadService`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `PrismaService` be split into smaller, more focused modules?**
  _Cohesion score 0.035897435897435895 - nodes in this community are weakly interconnected._
- **Why does `handleSave()` connect `mail.service.ts` to `ref_react`, `app.js`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `Modal` be split into smaller, more focused modules?**
  _Cohesion score 0.05319148936170213 - nodes in this community are weakly interconnected._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Should `ref_react` be split into smaller, more focused modules?**
  _Cohesion score 0.05800588078053996 - nodes in this community are weakly interconnected._