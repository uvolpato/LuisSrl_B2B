# Graph Report - Luis Srl - B2B  (2026-11-17)

## Corpus Check
- 470 files · ~468,251 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 12, .css 11, .cmd 6)

## Summary
- 3489 nodes · 7930 edges · 281 communities (108 shown, 173 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 419 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a23107c0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- RequirePermission
- CataloghiService
- app.module.ts
- ref_react
- InsightService
- IntegrazioneService
- src/app/page.tsx
- pg
- backend/package.json
- CataloghiAdminService
- CouponService
- RichiesteAccessoSection.tsx
- AuthService
- EditImageModal.tsx
- @nestjs/common
- SpeseSpedizioneSection.tsx
- AuthenticatedRequest
- ProgettiService
- DescrizioneAiWizard.tsx
- users.service.ts
- area/page.tsx
- IntegrazioneController
- .log
- dashboard.service.ts
- azioni.service.ts
- environment
- mail.service.ts
- Modal
- AuditService
- admin.service.ts
- mail.service.ts
- restore-b2b-views.sql
- AdminPanel.tsx
- AdminOrdiniService
- DashboardService
- CataloghiSection.tsx
- CustomerProfileService
- UsersController
- app.js
- Notice
- CheckoutController
- frontend-vetrina/package.json
- SpeseSpedizioneService
- EventLogSection.tsx
- OrdiniController
- ref_next_intl
- SchedaArticoloPage
- compilerOptions
- ProfileSection.tsx
- LeadsController
- "permission_groups"
- dependencies
- ExportOrdiniService
- CouponSection.tsx
- ref_react
- DashboardController
- CarrelloController
- CatalogoController
- admin-leads.service.ts
- "users"
- leads.service.ts
- SyncService
- CustomersService
- auth.controller.ts
- SpeseSpedizioneController
- frontend/package.json
- src/app/layout.tsx
- UpdateProfileDto
- customers.service.ts
- cambia-superuser.js
- compilerOptions
- compilerOptions
- v_user
- backend/eslint.config.mjs
- frontend/app/page.tsx
- genera-docx.cjs
- EventsService
- scripts
- CheckoutService
- UpdateUserPermissionsDto
- CustomerIntelligenceService
- .importaVarianti
- checkout.service.ts
- CreaMailingDto
- customers
- engines
- customer-profile.service.ts
- 20260624143908_catalogo_models/migration.sql
- CheckoutPage
- @prisma/adapter-pg
- createCombobox
- verifica-costo-trasporto.cjs
- conservazione.service.ts
- seed.js
- CreateUserDto
- dependencies
- 20260708000000_cache_integra/migration.sql
- verifica-coupon-illimitato.cjs
- spese-spedizione.service.ts
- privacy/page.tsx
- scripts
- attiva/layout.tsx
- integra_clienti_piva_digits_idx
- https-proxy.mjs
- Icons.tsx
- use-websocket.ts
- AdminLeadsController
- jest
- 20261025000000_cataloghi_brevo/migration.sql
- PrismaService
- nest-cli.json
- AggancioLeadService
- CreateTariffaDto
- 20260803000000_dashboard_ai/migration.sql
- ImpostazioniSection.tsx
- CreateFamigliaDto
- 20260711000001_sync_state_listini/migration.sql
- 20260714000000_progetti/migration.sql
- 20260812104416_add_event_log/migration.sql
- 20261012000000_add_leads/migration.sql
- prod-align-2026-07.sql
- frontend/eslint.config.mjs
- 20260709120000_add_carrello/migration.sql
- MfaSection
- manual-fixups.sql
- 20260715000000_ai_usage/migration.sql
- c/[token]/page.tsx
- "customer_insight"
- campaigns
- tsconfig.build.json
- 20260806000000_add_tariffe_spedizione/migration.sql
- 20260811140000_create_site_config/migration.sql
- 20260807000001_add_anomalia_log/migration.sql
- postcss.config.mjs
- tailwind.config.mjs
- scripts
- fix-coupon-scope.js
- "mfa_devices"
- UserEditorModal.tsx
- InvitaBulkDto
- [codiceLinea]/route.ts
- ExportOrdiniService

## God Nodes (most connected - your core abstractions)
1. `IntegrazioneService` - 113 edges
2. `RequirePermission()` - 108 edges
3. `@nestjs/common` - 102 edges
4. `AuthenticatedRequest` - 89 edges
5. `PrismaService` - 89 edges
6. `api` - 58 edges
7. `Modal()` - 56 edges
8. `IntegrazioneController` - 46 edges
9. `DashboardService` - 44 edges
10. `Notice()` - 44 edges

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

## Communities (281 total, 173 thin omitted)

### Community 1 - "CataloghiService"
Cohesion: 0.13
Nodes (3): CataloghiPublicController, CataloghiService, confrontaSegreto()

### Community 2 - "app.module.ts"
Cohesion: 0.07
Nodes (16): AdminModule, AuthModule, CarrelloModule, CheckoutModule, RequestContextInterceptor, CouponModule, CustomersModule, DashboardModule (+8 more)

### Community 3 - "ref_react"
Cohesion: 0.05
Nodes (70): AdminTopBar(), Column, RowAction, IconChevronLeft, IconChevronRight, IconDownload, IconEdit, IconEye (+62 more)

### Community 4 - "InsightService"
Cohesion: 0.11
Nodes (3): InsightController, InsightService, EmbeddingService

### Community 6 - "src/app/page.tsx"
Cohesion: 0.07
Nodes (38): Page(), CatalogoPage(), one(), Search, Page(), Home(), Page(), Composizione() (+30 more)

### Community 7 - "pg"
Cohesion: 0.07
Nodes (18): pg@^8.21.0, base, { Client }, url, { Client }, PEZZI, { Client }, { Client } (+10 more)

### Community 8 - "backend/package.json"
Cohesion: 0.04
Nodes (60): author, @nestjs/platform-socket.io@^11.1.26, @nestjs/websockets@^11.1.26, nodemailer@9.1.1, reflect-metadata@^0.2.2, description, devDependencies, eslint-config-prettier@^10.0.1 (+52 more)

### Community 9 - "CataloghiAdminService"
Cohesion: 0.07
Nodes (3): BrevoService, CataloghiAdminController, CataloghiAdminService

### Community 10 - "CouponService"
Cohesion: 0.07
Nodes (4): qrcode@1.5.4, CouponController, CouponService, qrcode

### Community 11 - "RichiesteAccessoSection.tsx"
Cohesion: 0.07
Nodes (28): AiSuggestion, AiSuggestionsResponse, stl, Azione, AZIONI_PER_STATO, BADGE_SEGNALE, dataOra(), Dettaglio (+20 more)

### Community 12 - "AuthService"
Cohesion: 0.10
Nodes (9): AuthService, mascheraEmail(), AuthUser, DUMMY_HASH, hashPassword(), verifyPassword(), generaTokenInvito(), hashSessionToken() (+1 more)

### Community 13 - "EditImageModal.tsx"
Cohesion: 0.09
Nodes (23): RelatedSection(), AnteprimaArticoloPage(), Articolo, DimEntry, Immagine, Variante, ArticoloEditModal(), handleClose() (+15 more)

### Community 14 - "@nestjs/common"
Cohesion: 0.17
Nodes (9): PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard, FamiglieController, @nestjs/common (+1 more)

### Community 15 - "SpeseSpedizioneSection.tsx"
Cohesion: 0.07
Nodes (43): ComboboxField(), onKeyDown(), select(), CustomerDossier(), euroK(), fmtData(), MESI, SALUTE (+35 more)

### Community 16 - "AuthenticatedRequest"
Cohesion: 0.13
Nodes (3): AuthController, AuthenticatedRequest, CustomersController

### Community 17 - "ProgettiService"
Cohesion: 0.10
Nodes (3): ProgettiController, ProgettiPublicController, ProgettiService

### Community 18 - "DescrizioneAiWizard.tsx"
Cohesion: 0.12
Nodes (10): AnalisiFotoModal(), Props, DescrizioneAiWizard(), handleAnalisiAccepted(), handleGenerate(), Props, StepDef, STEPS (+2 more)

### Community 19 - "users.service.ts"
Cohesion: 0.13
Nodes (10): toUserProfile(), UserProfile, buildStatoFilter(), UserFilter, generateProvisionalPassword(), UpdateUserDto, UsersModule, AVATAR_COLORS (+2 more)

### Community 20 - "area/page.tsx"
Cohesion: 0.14
Nodes (18): Catalogo, CatalogoArticolo, CatalogoPage(), colorDistance(), hexToLab(), normKey(), SORT_OPTIONS, AreaClientePage() (+10 more)

### Community 23 - "dashboard.service.ts"
Cohesion: 0.14
Nodes (3): AiUsageController, AiUsageModule, AiUsageService

### Community 24 - "azioni.service.ts"
Cohesion: 0.14
Nodes (17): AzioneDto, ReinviaDto, EsitoAggancio, Azione, AZIONI, EsitoToken, firma(), segretoAzioni() (+9 more)

### Community 25 - "environment"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "mail.service.ts"
Cohesion: 0.13
Nodes (20): estraiJson(), calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede, Segnale, DatiIndagine (+12 more)

### Community 27 - "Modal"
Cohesion: 0.07
Nodes (38): LoginPage(), AdminLayout(), AdminSidebar(), logout(), ICONS, NAV_ITEMS, AccountTab(), InfoTab() (+30 more)

### Community 28 - "AuditService"
Cohesion: 0.06
Nodes (10): rxjs@^7.8.1, AuditController, AuditModule, AuditService, AccessLogInterceptor, ACTION_MAP, getLabel(), HttpErrorFilter (+2 more)

### Community 29 - "admin.service.ts"
Cohesion: 0.09
Nodes (11): class-transformer@^0.5.1, CreateGroupDto, CreateRaccoltaDto, CreateSuggestionBoxDto, UpdateFamigliaDto, UpdateGroupDto, UpdateRaccoltaDto, UpdateSuggestionBoxDto (+3 more)

### Community 30 - "mail.service.ts"
Cohesion: 0.10
Nodes (17): esc(), ReportIndagine, box(), boxClienteIntegra(), esc(), MailModule, BADGE, DatiClienteMail (+9 more)

### Community 31 - "restore-b2b-views.sql"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 32 - "AdminPanel.tsx"
Cohesion: 0.04
Nodes (59): calcTotale(), fmtDate(), fmtPrezzo(), OrdiniPage(), SortField, staticRangesIT, AdminPanel(), AdminPanelTab (+51 more)

### Community 33 - "AdminOrdiniService"
Cohesion: 0.10
Nodes (4): AdminOrdiniController, AdminOrdiniService, AggiornaStatoOrdineDto, STATI_ORDINE_CONSENTITI

### Community 35 - "CataloghiSection.tsx"
Cohesion: 0.09
Nodes (21): CataloghiSection(), apriDettaglio(), inviaABrevo(), revoca(), Catalogo, Cliente, Destinatario, DettaglioScreen() (+13 more)

### Community 38 - "app.js"
Cohesion: 0.18
Nodes (26): aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer(), conta() (+18 more)

### Community 39 - "Notice"
Cohesion: 0.06
Nodes (24): AdminPage(), SECTION_TITLES, ImportaClientiModal(), doImport(), startTimeout(), BoxEditModal(), BoxSuggerimentiSection(), loadRefs() (+16 more)

### Community 41 - "frontend-vetrina/package.json"
Cohesion: 0.07
Nodes (39): eslint@^9.18.0, @types/node@^24.0.0, typescript@^5.7.3, eslint, @types/node, typescript, devDependencies, eslint@^9 (+31 more)

### Community 42 - "SpeseSpedizioneService"
Cohesion: 0.13
Nodes (3): euCount(), SpeseSpedizioneService, zonaOf()

### Community 43 - "EventLogSection.tsx"
Cohesion: 0.17
Nodes (15): categoriaDi(), EventDetailModal(), EventLogItem, categoriaDi(), EVENT_TYPES, EventLogItem, EventLogSection(), fmtDt() (+7 more)

### Community 44 - "OrdiniController"
Cohesion: 0.11
Nodes (5): AdminOrdiniModule, OrdiniController, OrdiniModule, OrdiniService, PrismaModule

### Community 45 - "ref_next_intl"
Cohesion: 0.07
Nodes (25): AdminOrdiniSection(), DashboardData, fmtDate(), fmtEur(), OrderSummary, PageData, STATI, staticRangesIT (+17 more)

### Community 46 - "SchedaArticoloPage"
Cohesion: 0.09
Nodes (19): getStock(), ProductBreadcrumb(), SchedaArticoloPage(), activeEntries(), addAllToCart(), addSingleToCart(), galleryModalNav(), getAvailableValues() (+11 more)

### Community 47 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 48 - "ProfileSection.tsx"
Cohesion: 0.17
Nodes (9): PrivacyControls(), BuildingIcon(), Indirizzo, NAZIONI_OPTS, ProfileSection(), closeForm(), saveAddr(), PROVINCE_OPTS (+1 more)

### Community 49 - "LeadsController"
Cohesion: 0.12
Nodes (6): EmailAccessoDto, EsitoAzione, CreateLeadDto, LeadsController, valido, paginaAzione()

### Community 50 - ""permission_groups""
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "dependencies"
Cohesion: 0.04
Nodes (51): dependencies, class-validator@^0.15.1, connect-pg-simple@^10.0.0, cookie@^1.1.1, cookie-parser@^1.4.7, cron-parser@^5.6.1, express-session@^1.19.0, helmet@^8.2.0 (+43 more)

### Community 52 - "ExportOrdiniService"
Cohesion: 0.07
Nodes (24): exceljs@4.4.0, FatturazioneDto, confermaRichiesta(), erroreCanaleSdi(), FatturazioneService, ok, cartellaOrdiniIntegra(), scriviXlsxAtomico() (+16 more)

### Community 53 - "CouponSection.tsx"
Cohesion: 0.09
Nodes (12): CouponEditorModal(), CouponReviewModal(), fmtDate(), Campaign, CouponSection(), Dashboard, fmtDate(), STATUS_CLS (+4 more)

### Community 54 - "ref_react"
Cohesion: 0.04
Nodes (70): CarrelloPage(), notifyCart(), remove(), toggleSave(), CartItem, PrezzoInfo, Articolo, Componente (+62 more)

### Community 58 - "admin-leads.service.ts"
Cohesion: 0.13
Nodes (11): COPPIE_ERRORE, erroriAttivi(), FILTRI_STATO, GIORNI_ALLARME, giorniAttesa(), ORDINAMENTI, AdminLeadsService, STATI_IN_ATTESA (+3 more)

### Community 59 - ""users""
Cohesion: 0.14
Nodes (14): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+6 more)

### Community 60 - "leads.service.ts"
Cohesion: 0.19
Nodes (8): LeadsService, pulisci(), giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA, crea(), lead

### Community 61 - "SyncService"
Cohesion: 0.11
Nodes (3): sqlAggiornaClienti(), SyncManagerService, SyncService

### Community 62 - "CustomersService"
Cohesion: 0.18
Nodes (3): CustomerProfile, toCustomerProfile(), CustomersService

### Community 63 - "auth.controller.ts"
Cohesion: 0.08
Nodes (10): DEVICE_COOKIE, DEVICE_GIORNI, AttivaAccountDto, ChangePasswordDto, LoginDto, MfaCodiceDto, MfaPasswordDto, PrivacyAccettaDto (+2 more)

### Community 65 - "frontend/package.json"
Cohesion: 0.11
Nodes (24): dependencies, date-fns@4.4.0, next@16.2.9, next-intl@^4.13.0, react@19.2.4, react-date-range@2.0.1, react-dom@19.2.4, react-markdown@^10.1.0 (+16 more)

### Community 66 - "src/app/layout.tsx"
Cohesion: 0.18
Nodes (11): RootLayout(), b(), Footer(), Header(), switchLang(), LINGUE, setLangCookie(), PopupApertureLink() (+3 more)

### Community 69 - "cambia-superuser.js"
Cohesion: 0.25
Nodes (8): adapter, argon2, generaPassword(), main(), prisma, { PrismaClient }, { PrismaPg }, { randomBytes }

### Community 70 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 71 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 72 - "v_user"
Cohesion: 0.11
Nodes (11): admin.fn_user_assign_group(), users.fn_user_set_blocked(), users.fn_user_create(), admin.fn_user_assign_group(), customers.fn_customer_create(), customers.fn_customer_update(), users.fn_user_set_blocked(), users.fn_user_set_password() (+3 more)

### Community 73 - "backend/eslint.config.mjs"
Cohesion: 0.22
Nodes (8): @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0, typescript-eslint@^8.20.0, @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 74 - "frontend/app/page.tsx"
Cohesion: 0.22
Nodes (9): LandingPage(), AiSearchSection(), CtaSection(), FeaturesSection(), HeroSection(), LandingNav(), LineeSection(), PublicFooter() (+1 more)

### Community 75 - "genera-docx.cjs"
Cohesion: 0.17
Nodes (16): {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
}, buildDocument(), COLOR, footer(), fs, GDPR_DIR, header(), humanTitle() (+8 more)

### Community 76 - "EventsService"
Cohesion: 0.09
Nodes (3): EventsController, EventsModule, EventsService

### Community 77 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:migrate, db:seed, db:setup, embeddings:backfill, format, lint (+9 more)

### Community 81 - ".importaVarianti"
Cohesion: 0.12
Nodes (7): codiceLineaSicuro(), candidatoPadre(), padreComponente(), promptComposizione(), PADRI, VarianteConComposizione, purgeThumbCache()

### Community 82 - "checkout.service.ts"
Cohesion: 0.22
Nodes (8): DatiCheckout, ModalitaConsegna, provinciaToRegione(), FILTER_VALUES, REGION_ALIASES, SegCustomer, SegFilter, Suggestion

### Community 84 - "customers"
Cohesion: 0.14
Nodes (13): customers, contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, "customer_event", customer_event_customer_created_idx, customer_event_tipo_created_idx (+5 more)

### Community 85 - "engines"
Cohesion: 0.27
Nodes (5): prisma@7.8.0, engines, node, npm, prisma

### Community 86 - "customer-profile.service.ts"
Cohesion: 0.39
Nodes (5): CustomerProfileData, CustomerProfileResult, filtraReferentiPubblici(), ReferentePubblico, DatiImpresa

### Community 87 - "20260624143908_catalogo_models/migration.sql"
Cohesion: 0.18
Nodes (13): articolo_embedding, "articoli", articoli_codice_linea_key, "articoli_raccolte", articoli_raccolte_articolo_id_raccolta_id_key, "famiglie", "immagini", "raccolte" (+5 more)

### Community 89 - "CheckoutPage"
Cohesion: 0.22
Nodes (5): CheckoutPage(), closeNuovoForm(), conferma(), saveIndirizzo(), fmtEur()

### Community 90 - "@prisma/adapter-pg"
Cohesion: 0.25
Nodes (6): @prisma/adapter-pg@7.8.0, adapter, prisma, { PrismaClient }, { PrismaPg }, @prisma/adapter-pg

### Community 91 - "createCombobox"
Cohesion: 0.22
Nodes (9): buildComboboxOptions(), createCombobox(), filterOptions(), highlight(), open(), renderOptions(), selectOption(), getComboboxOptions() (+1 more)

### Community 92 - "verifica-costo-trasporto.cjs"
Cohesion: 0.19
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 93 - "conservazione.service.ts"
Cohesion: 0.28
Nodes (6): datiAnonimi(), limite(), MESI_DEFAULT, mesiConservazione(), ConservazioneLeadService, STATI_DA_ANONIMIZZARE

### Community 94 - "seed.js"
Cohesion: 0.17
Nodes (10): argon2@^0.44.0, adapter, argon2, AVATAR_COLORS, PERMISSION_KEYS, prisma, { PrismaClient }, { PrismaPg } (+2 more)

### Community 96 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, next@16.2.9, react@19.2.4, react-dom@19.2.4, next, react

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

### Community 101 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 105 - "https-proxy.mjs"
Cohesion: 0.15
Nodes (7): __dirname, httpsProxy, nextDev, __dirname, options, PROXY_PORT, server

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

### Community 111 - "PrismaService"
Cohesion: 0.05
Nodes (40): prisma, { PrismaClient }, dotenv@^17.4.2, @nestjs/schedule@^5.0.1, DEFAULT_PRICES, FALLBACK, AUDITED, auditExtension (+32 more)

### Community 116 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, watchAssets, $schema, sourceRoot

### Community 119 - "AggancioLeadService"
Cohesion: 0.17
Nodes (6): AggancioLeadService, EsitoRicerca, crea(), lead, emailAccesso(), emailEffettiva()

### Community 122 - "20260803000000_dashboard_ai/migration.sql"
Cohesion: 0.43
Nodes (6): "dashboard_boxes", dashboard_boxes_customer_box_key, dashboard_boxes_customer_idx, "promozioni", promozioni_attiva_data_fine_idx, "suggestion_boxes"

### Community 124 - "ImpostazioniSection.tsx"
Cohesion: 0.47
Nodes (4): ConfigField(), ConfigToggle(), ImpostazioniSection(), SiteConfig

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

### Community 132 - "prod-align-2026-07.sql"
Cohesion: 0.29
Nodes (6): indirizzi_clienti_customer_id_codice_destinazione_key, "integra_pagamenti_descr", "integra_porti", "integra_spedizioni", "integra_vettori", "sync_config"

### Community 135 - "20260709120000_add_carrello/migration.sql"
Cohesion: 0.70
Nodes (4): carrelli, carrello_items, idx_carrello_items_carrello_id, idx_carrello_items_salvato

### Community 140 - "manual-fixups.sql"
Cohesion: 0.67
Nodes (3): site_config, site_config_key_key, "sync_config"

### Community 142 - "20260715000000_ai_usage/migration.sql"
Cohesion: 0.83
Nodes (3): "ai_usage", ai_usage_attore_idx, ai_usage_created_at_idx

### Community 143 - "c/[token]/page.tsx"
Cohesion: 0.40
Nodes (3): LandingCatalogo, LandingData, styles

### Community 144 - ""customer_insight""
Cohesion: 0.83
Nodes (3): "customer_insight", customer_insight_customer_idx, customer_insight_customer_periodo_key

### Community 146 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 224 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, dev:full, dev:https, lint, start

### Community 228 - ""mfa_devices""
Cohesion: 0.83
Nodes (3): "mfa_devices", mfa_devices_token_hash_key, mfa_devices_user_id_idx

### Community 232 - "UserEditorModal.tsx"
Cohesion: 0.05
Nodes (36): RootLayout(), CustomerOfferte(), Comportamento, CustomerTimeline(), DOT, Evento, fmt(), Insight (+28 more)

### Community 273 - "[codiceLinea]/route.ts"
Cohesion: 0.83
Nodes (3): fetchWithRetry(), isRetryableNetworkError(), POST()

### Community 289 - "ExportOrdiniService"
Cohesion: 0.12
Nodes (4): main(), ExportOrdiniController, cronExportOrdini(), ExportOrdiniService

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1195 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **173 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `stato()` connect `mail.service.ts` to `ref_react`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `RequirePermission` be split into smaller, more focused modules?**
  _Cohesion score 0.09398496240601503 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `@nestjs/common` to `app.module.ts`, `backend/package.json`, `AuthService`, `users.service.ts`, `dashboard.service.ts`, `azioni.service.ts`, `mail.service.ts`, `AuditService`, `admin.service.ts`, `mail.service.ts`, `OrdiniController`, `LeadsController`, `dependencies`, `ExportOrdiniService`, `admin-leads.service.ts`, `leads.service.ts`, `auth.controller.ts`, `customers.service.ts`, `EventsService`, `checkout.service.ts`, `customer-profile.service.ts`, `conservazione.service.ts`, `spese-spedizione.service.ts`, `PrismaService`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Should `CataloghiService` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `handleSave()` connect `mail.service.ts` to `ref_react`, `app.js`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07183673469387755 - nodes in this community are weakly interconnected._