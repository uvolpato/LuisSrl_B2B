# Graph Report - Luis Srl - B2B  (2026-11-13)

## Corpus Check
- 459 files · ~462,608 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 12, .css 11, .cmd 6)

## Summary
- 3451 nodes · 7907 edges · 289 communities (111 shown, 178 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 418 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc14cc98`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- prisma.service.ts
- CataloghiService
- app.module.ts
- ref_react
- AdminPanel.tsx
- IntegrazioneService
- src/app/page.tsx
- pg
- backend/package.json
- CataloghiAdminService
- CouponService
- RichiesteAccessoSection.tsx
- PrismaService
- main.ts
- @nestjs/common
- SpeseSpedizioneSection.tsx
- AuthenticatedRequest
- ProgettiService
- customers.service.ts
- UsersController
- LoginDto
- area/page.tsx
- .log
- EmbeddingService
- leads.controller.ts
- environment
- mail.service.ts
- ref_react
- SchedaArticoloPage
- admin.service.ts
- mail.service.ts
- restore-b2b-views.sql
- CataloghiSection.tsx
- AdminOrdiniService
- DashboardService
- frontend/app/layout.tsx
- auth.controller.ts
- checkout.service.ts
- app.js
- ImpostazioniSection.tsx
- CheckoutController
- frontend-vetrina/package.json
- SpeseSpedizioneService
- EventLogSection.tsx
- OrdiniController
- CreateLeadDto
- AuditService
- compilerOptions
- EventsController
- auth.service.ts
- "permission_groups"
- dependencies
- ExportOrdiniService
- Notice
- ref_next
- cataloghi-admin.service.ts
- ProfileSection.tsx
- CatalogoController
- admin-leads.service.ts
- "users"
- leads.service.ts
- SyncService
- DashboardController
- export-cliente.service.ts
- SpeseSpedizioneController
- frontend/package.json
- src/app/layout.tsx
- UpdateProfileDto
- CatalogoPublicController
- RequirePermission
- compilerOptions
- compilerOptions
- v_user
- devDependencies
- frontend/app/page.tsx
- startTimeout
- CarrelloController
- scripts
- CheckoutService
- backend/eslint.config.mjs
- CustomerIntelligenceService
- ordini/page.tsx
- CouponSection.tsx
- DescrizioneAiWizard.tsx
- customers
- toUserProfile
- customer-profile.service.ts
- 20260624143908_catalogo_models/migration.sql
- @prisma/adapter-pg
- createCombobox
- verifica-costo-trasporto.cjs
- conservazione.service.ts
- devDependencies
- cambia-superuser.js
- seed.js
- 20260708000000_cache_integra/migration.sql
- verifica-coupon-illimitato.cjs
- spese-spedizione.service.ts
- privacy/page.tsx
- CustomerTimeline.tsx
- catalogo/[codiceLinea]/page.tsx
- integra_clienti_piva_digits_idx
- https-proxy.mjs
- Icons.tsx
- use-websocket.ts
- jest
- 20261025000000_cataloghi_brevo/migration.sql
- scripts
- nest-cli.json
- AggancioLeadService
- CreateTariffaDto
- 20260803000000_dashboard_ai/migration.sql
- CreateSuggestionBoxDto
- UpdateUserPermissionsDto
- CreateFamigliaDto
- 20260711000001_sync_state_listini/migration.sql
- 20260714000000_progetti/migration.sql
- 20260812104416_add_event_log/migration.sql
- 20261012000000_add_leads/migration.sql
- prod-align-2026-07.sql
- frontend/eslint.config.mjs
- EmbeddingService
- 20260709120000_add_carrello/migration.sql
- scripts
- CreateRaccoltaDto
- manual-fixups.sql
- 20260715000000_ai_usage/migration.sql
- BrevoService
- "customer_insight"
- campaigns
- tsconfig.build.json
- IntegrazioneController
- 20260806000000_add_tariffe_spedizione/migration.sql
- 20260811140000_create_site_config/migration.sql
- 20260807000001_add_anomalia_log/migration.sql
- postcss.config.mjs
- tailwind.config.mjs
- [codiceLinea]/route.ts
- c/[token]/page.tsx
- CreateUserDto
- UpdateUserDto
- fix-coupon-scope.js
- "mfa_devices"
- CustomerProfileService
- InvitaBulkDto
- frontend/app/privacy/page.tsx
- express-session
- app.e2e-spec.ts
- eslint
- AuthService
- engines
- attiva/layout.tsx
- startTimeout

## God Nodes (most connected - your core abstractions)
1. `IntegrazioneService` - 113 edges
2. `RequirePermission()` - 108 edges
3. `@nestjs/common` - 102 edges
4. `AuthenticatedRequest` - 91 edges
5. `PrismaService` - 89 edges
6. `Modal()` - 59 edges
7. `api` - 58 edges
8. `Notice()` - 49 edges
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

## Communities (289 total, 178 thin omitted)

### Community 0 - "prisma.service.ts"
Cohesion: 0.11
Nodes (13): AUDITED, auditExtension, WRITES, hashLogIdentifier(), urlSenzaSegreti(), RequestContextInterceptor, reqCtx, RequestContext (+5 more)

### Community 1 - "CataloghiService"
Cohesion: 0.13
Nodes (3): CataloghiPublicController, CataloghiService, confrontaSegreto()

### Community 2 - "app.module.ts"
Cohesion: 0.07
Nodes (18): AdminModule, AiUsageModule, AppModule, AuthModule, CarrelloModule, CheckoutModule, CouponModule, CustomersModule (+10 more)

### Community 3 - "ref_react"
Cohesion: 0.07
Nodes (55): AdminTopBar(), Column, DataTableProps, RowAction, IconChevronLeft, IconChevronRight, IconDownload, IconEdit (+47 more)

### Community 4 - "AdminPanel.tsx"
Cohesion: 0.03
Nodes (74): AdminPanel(), AdminPanelTab, AI_GROUPS, AiConfigEntry, AiConfigSection(), ALL_PERMISSIONS, ConfigField(), formatDate() (+66 more)

### Community 6 - "src/app/page.tsx"
Cohesion: 0.07
Nodes (36): Page(), CatalogoPage(), one(), Search, Page(), Home(), Page(), Variante (+28 more)

### Community 7 - "pg"
Cohesion: 0.09
Nodes (15): pg@^8.21.0, base, { Client }, url, { Client }, { Client }, { Client }, { Client } (+7 more)

### Community 8 - "backend/package.json"
Cohesion: 0.05
Nodes (51): author, description, devDependencies, eslint-config-prettier@^10.0.1, @eslint/eslintrc@^3.2.0, jest@^30.0.0, @nestjs/cli@^11.0.0, @nestjs/schematics@^11.0.0 (+43 more)

### Community 10 - "CouponService"
Cohesion: 0.07
Nodes (4): qrcode@1.5.4, CouponController, CouponService, qrcode

### Community 11 - "RichiesteAccessoSection.tsx"
Cohesion: 0.07
Nodes (28): AiSuggestion, AiSuggestionsResponse, stl, Azione, AZIONI_PER_STATO, BADGE_SEGNALE, dataOra(), Dettaglio (+20 more)

### Community 12 - "PrismaService"
Cohesion: 0.05
Nodes (19): AiUsageService, DEFAULT_PRICES, FALLBACK, CarrelloService, Candidato, DEFAULT_PESI, PesiSegnali, Segnali (+11 more)

### Community 13 - "main.ts"
Cohesion: 0.13
Nodes (15): connect-pg-simple@^10.0.0, cookie@^1.1.1, cookie-parser@^1.4.7, helmet@^8.2.0, socket.io@^4.8.3, FRONTEND_ORIGINS, bootstrap(), online (+7 more)

### Community 14 - "@nestjs/common"
Cohesion: 0.13
Nodes (12): AiUsageController, PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard, SyncConfigRow (+4 more)

### Community 15 - "SpeseSpedizioneSection.tsx"
Cohesion: 0.10
Nodes (32): ComboboxField(), onKeyDown(), select(), ComboboxOption, GuidaModal(), SpeseSpedizioneSection(), onDeleteTariffa(), refresh() (+24 more)

### Community 17 - "ProgettiService"
Cohesion: 0.10
Nodes (3): ProgettiController, ProgettiPublicController, ProgettiService

### Community 18 - "customers.service.ts"
Cohesion: 0.13
Nodes (6): CustomerProfile, toCustomerProfile(), generaTokenInvito(), CustomersService, CreateCustomerDto, UpdateCustomerDto

### Community 21 - "area/page.tsx"
Cohesion: 0.09
Nodes (25): Catalogo, CatalogoArticolo, CatalogoPage(), colorDistance(), hexToLab(), normKey(), SORT_OPTIONS, AreaLayout() (+17 more)

### Community 24 - "leads.controller.ts"
Cohesion: 0.09
Nodes (19): EsitoAggancio, Azione, AZIONI, EsitoToken, firma(), segretoAzioni(), AzioniLeadService, EsitoAzione (+11 more)

### Community 25 - "environment"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "mail.service.ts"
Cohesion: 0.12
Nodes (20): estraiJson(), calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede, Segnale, DatiIndagine (+12 more)

### Community 27 - "ref_react"
Cohesion: 0.05
Nodes (51): LoginPage(), AdminLayout(), AdminSidebar(), logout(), ICONS, NAV_ITEMS, Address, fmtDate() (+43 more)

### Community 28 - "SchedaArticoloPage"
Cohesion: 0.09
Nodes (18): ProductBreadcrumb(), SchedaArticoloPage(), activeEntries(), addAllToCart(), addSingleToCart(), galleryModalNav(), getAvailableValues(), handleKey() (+10 more)

### Community 29 - "admin.service.ts"
Cohesion: 0.09
Nodes (19): prisma, { PrismaClient }, CreateGroupDto, UpdateFamigliaDto, UpdateGroupDto, UpdateRaccoltaDto, UpdateSuggestionBoxDto, STATI_ORDINE_CONSENTITI (+11 more)

### Community 30 - "mail.service.ts"
Cohesion: 0.10
Nodes (17): esc(), ReportIndagine, box(), boxClienteIntegra(), esc(), MailModule, BADGE, DatiClienteMail (+9 more)

### Community 31 - "restore-b2b-views.sql"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 32 - "CataloghiSection.tsx"
Cohesion: 0.09
Nodes (21): CataloghiSection(), apriDettaglio(), inviaABrevo(), revoca(), Catalogo, Cliente, Destinatario, DettaglioScreen() (+13 more)

### Community 33 - "AdminOrdiniService"
Cohesion: 0.11
Nodes (3): AdminOrdiniController, AdminOrdiniService, AggiornaStatoOrdineDto

### Community 35 - "frontend/app/layout.tsx"
Cohesion: 0.24
Nodes (3): RootLayout(), ConfirmProvider(), SessionTerminatedOverlay()

### Community 36 - "auth.controller.ts"
Cohesion: 0.10
Nodes (9): ChangePasswordDto, PrivacyAccettaDto, TrackingOptOutDto, PRIVACY_VERSIONE_PORTALE, Dossier, DossierFamiglia, DossierKpi, MotivoOfferta (+1 more)

### Community 37 - "checkout.service.ts"
Cohesion: 0.10
Nodes (12): DatiCheckout, ModalitaConsegna, FatturazioneDto, confermaRichiesta(), erroreCanaleSdi(), FatturazioneService, provinciaToRegione(), FILTER_VALUES (+4 more)

### Community 38 - "app.js"
Cohesion: 0.18
Nodes (26): aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer(), conta() (+18 more)

### Community 39 - "ImpostazioniSection.tsx"
Cohesion: 0.47
Nodes (4): ConfigField(), ConfigToggle(), ImpostazioniSection(), SiteConfig

### Community 41 - "frontend-vetrina/package.json"
Cohesion: 0.12
Nodes (19): next-intl@^4.13.0, react-dom@19.2.4, next-intl, react-dom, dependencies, next@16.2.9, next-intl@4.13.0, react@19.2.4 (+11 more)

### Community 42 - "SpeseSpedizioneService"
Cohesion: 0.13
Nodes (3): euCount(), SpeseSpedizioneService, zonaOf()

### Community 43 - "EventLogSection.tsx"
Cohesion: 0.17
Nodes (15): categoriaDi(), EventDetailModal(), EventLogItem, categoriaDi(), EVENT_TYPES, EventLogItem, EventLogSection(), fmtDt() (+7 more)

### Community 44 - "OrdiniController"
Cohesion: 0.11
Nodes (5): AdminOrdiniModule, OrdiniController, OrdiniModule, OrdiniService, PrismaModule

### Community 45 - "CreateLeadDto"
Cohesion: 0.11
Nodes (9): AttivaAccountDto, MfaCodiceDto, MfaPasswordDto, CreaMailingDto, ImportClientiDto, AzioneDto, EmailAccessoDto, ReinviaDto (+1 more)

### Community 46 - "AuditService"
Cohesion: 0.06
Nodes (9): rxjs@^7.8.1, AuditController, AuditModule, AuditService, AccessLogInterceptor, ACTION_MAP, getLabel(), HttpErrorFilter (+1 more)

### Community 47 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 49 - "auth.service.ts"
Cohesion: 0.16
Nodes (17): DEVICE_COOKIE, DEVICE_GIORNI, mascheraEmail(), normalizzaCodice(), apri(), chiave(), sigilla(), base32Decode() (+9 more)

### Community 50 - ""permission_groups""
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, class-transformer@^0.5.1, class-validator@^0.15.1, cron-parser@^5.6.1, dotenv@^17.4.2, @nestjs/common@^11.0.1, @nestjs/config@^4.0.4, @nestjs/core@^11.0.1 (+16 more)

### Community 52 - "ExportOrdiniService"
Cohesion: 0.14
Nodes (3): main(), ExportOrdiniController, ExportOrdiniService

### Community 53 - "Notice"
Cohesion: 0.03
Nodes (54): AdminPage(), SECTION_TITLES, DataTable(), ImportaArticoliModal(), ImportaClientiModal(), AdminOrdiniSection(), DashboardData, fmtDate() (+46 more)

### Community 54 - "ref_next"
Cohesion: 0.05
Nodes (56): CarrelloPage(), notifyCart(), remove(), toggleSave(), CartItem, PrezzoInfo, CartItem, CheckoutPage() (+48 more)

### Community 55 - "cataloghi-admin.service.ts"
Cohesion: 0.11
Nodes (15): ASSETS_BASE_DIR, dotenv, EXCLUDED, fs, path, prisma, { PrismaClient }, CataloghiModule (+7 more)

### Community 56 - "ProfileSection.tsx"
Cohesion: 0.17
Nodes (9): PrivacyControls(), BuildingIcon(), Indirizzo, NAZIONI_OPTS, ProfileSection(), closeForm(), saveAddr(), PROVINCE_OPTS (+1 more)

### Community 58 - "admin-leads.service.ts"
Cohesion: 0.18
Nodes (10): COPPIE_ERRORE, erroriAttivi(), FILTRI_STATO, GIORNI_ALLARME, giorniAttesa(), ORDINAMENTI, AdminLeadsService, STATI_IN_ATTESA (+2 more)

### Community 59 - ""users""
Cohesion: 0.14
Nodes (14): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+6 more)

### Community 60 - "leads.service.ts"
Cohesion: 0.19
Nodes (8): LeadsService, pulisci(), giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA, crea(), lead

### Community 61 - "SyncService"
Cohesion: 0.11
Nodes (3): sqlAggiornaClienti(), SyncManagerService, SyncService

### Community 63 - "export-cliente.service.ts"
Cohesion: 0.10
Nodes (18): exceljs@4.4.0, ok, cartellaOrdiniIntegra(), scriviXlsxAtomico(), anagraficaDaCliente(), anagraficaDaLead(), AnagraficaIntegra, Colonna (+10 more)

### Community 65 - "frontend/package.json"
Cohesion: 0.14
Nodes (17): dependencies, date-fns@4.4.0, next@16.2.9, react@19.2.4, react-date-range@2.0.1, react-markdown@^10.1.0, socket.io-client@^4.8.3, engines (+9 more)

### Community 66 - "src/app/layout.tsx"
Cohesion: 0.18
Nodes (11): RootLayout(), b(), Footer(), Header(), switchLang(), LINGUE, setLangCookie(), PopupApertureLink() (+3 more)

### Community 67 - "UpdateProfileDto"
Cohesion: 0.12
Nodes (3): UpdateProfileDto, ImgController, snapWidth()

### Community 69 - "RequirePermission"
Cohesion: 0.10
Nodes (3): AdminController, RequirePermission(), AdminLeadsController

### Community 70 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 71 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 72 - "v_user"
Cohesion: 0.11
Nodes (11): admin.fn_user_assign_group(), users.fn_user_set_blocked(), users.fn_user_create(), admin.fn_user_assign_group(), customers.fn_customer_create(), customers.fn_customer_update(), users.fn_user_set_blocked(), users.fn_user_set_password() (+3 more)

### Community 73 - "devDependencies"
Cohesion: 0.14
Nodes (14): @types/node@^24.0.0, typescript@^5.7.3, @types/node, typescript, devDependencies, @types/node@^20, @types/react-date-range@1.4.10, @types/react-dom@^19 (+6 more)

### Community 74 - "frontend/app/page.tsx"
Cohesion: 0.22
Nodes (9): LandingPage(), AiSearchSection(), CtaSection(), FeaturesSection(), HeroSection(), LandingNav(), LineeSection(), PublicFooter() (+1 more)

### Community 77 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:migrate, db:seed, db:setup, embeddings:backfill, format, lint (+9 more)

### Community 79 - "backend/eslint.config.mjs"
Cohesion: 0.22
Nodes (8): @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0, typescript-eslint@^8.20.0, @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 81 - "ordini/page.tsx"
Cohesion: 0.21
Nodes (13): calcTotale(), fmtDate(), fmtPrezzo(), OrdiniPage(), SortField, staticRangesIT, fmt(), OrdineDetailModal() (+5 more)

### Community 82 - "CouponSection.tsx"
Cohesion: 0.09
Nodes (12): CouponEditorModal(), CouponReviewModal(), fmtDate(), Campaign, CouponSection(), Dashboard, fmtDate(), STATUS_CLS (+4 more)

### Community 83 - "DescrizioneAiWizard.tsx"
Cohesion: 0.11
Nodes (14): ItemP, ProgettoPubblicoPage(), Pubblico, AnalisiFotoModal(), Props, DescrizioneAiWizard(), handleAnalisiAccepted(), handleGenerate() (+6 more)

### Community 84 - "customers"
Cohesion: 0.14
Nodes (13): customers, contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, "customer_event", customer_event_customer_created_idx, customer_event_tipo_created_idx (+5 more)

### Community 85 - "toUserProfile"
Cohesion: 0.35
Nodes (4): toUserProfile(), UserProfile, generateProvisionalPassword(), UsersService

### Community 86 - "customer-profile.service.ts"
Cohesion: 0.39
Nodes (5): CustomerProfileData, CustomerProfileResult, filtraReferentiPubblici(), ReferentePubblico, DatiImpresa

### Community 87 - "20260624143908_catalogo_models/migration.sql"
Cohesion: 0.23
Nodes (11): articolo_embedding, "articoli", articoli_codice_linea_key, "articoli_raccolte", articoli_raccolte_articolo_id_raccolta_id_key, "famiglie", "immagini", "raccolte" (+3 more)

### Community 89 - "@prisma/adapter-pg"
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

### Community 94 - "devDependencies"
Cohesion: 0.15
Nodes (13): eslint-config-next@16.2.9, @types/react@^19, eslint-config-next, @types/react, devDependencies, eslint-config-next@16.2.9, postcss@^8.5.29, tailwindcss@^4.3.3 (+5 more)

### Community 95 - "cambia-superuser.js"
Cohesion: 0.25
Nodes (8): adapter, argon2, generaPassword(), main(), prisma, { PrismaClient }, { PrismaPg }, { randomBytes }

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

### Community 102 - "CustomerTimeline.tsx"
Cohesion: 0.22
Nodes (7): Comportamento, CustomerTimeline(), DOT, Evento, fmt(), Insight, label()

### Community 103 - "catalogo/[codiceLinea]/page.tsx"
Cohesion: 0.07
Nodes (30): Articolo, CorrelatoCard, DimEntry, getStock(), Immagine, PrezzoInfo, Raccolta, RelatedSection() (+22 more)

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

### Community 111 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, dev:full, dev:https, lint, start

### Community 116 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, watchAssets, $schema, sourceRoot

### Community 119 - "AggancioLeadService"
Cohesion: 0.18
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

### Community 132 - "prod-align-2026-07.sql"
Cohesion: 0.29
Nodes (6): indirizzi_clienti_customer_id_codice_destinazione_key, "integra_pagamenti_descr", "integra_porti", "integra_spedizioni", "integra_vettori", "sync_config"

### Community 135 - "20260709120000_add_carrello/migration.sql"
Cohesion: 0.70
Nodes (4): carrelli, carrello_items, idx_carrello_items_carrello_id, idx_carrello_items_salvato

### Community 137 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 140 - "manual-fixups.sql"
Cohesion: 0.67
Nodes (3): site_config, site_config_key_key, "sync_config"

### Community 142 - "20260715000000_ai_usage/migration.sql"
Cohesion: 0.83
Nodes (3): "ai_usage", ai_usage_attore_idx, ai_usage_created_at_idx

### Community 144 - ""customer_insight""
Cohesion: 0.83
Nodes (3): "customer_insight", customer_insight_customer_idx, customer_insight_customer_periodo_key

### Community 146 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 222 - "[codiceLinea]/route.ts"
Cohesion: 0.83
Nodes (3): fetchWithRetry(), isRetryableNetworkError(), POST()

### Community 224 - "c/[token]/page.tsx"
Cohesion: 0.40
Nodes (3): LandingCatalogo, LandingData, styles

### Community 228 - ""mfa_devices""
Cohesion: 0.83
Nodes (3): "mfa_devices", mfa_devices_token_hash_key, mfa_devices_user_id_idx

### Community 270 - "express-session"
Cohesion: 0.40
Nodes (4): express-session@^1.19.0, express-session, SessionData, express-session

### Community 272 - "app.e2e-spec.ts"
Cohesion: 0.40
Nodes (4): @nestjs/testing@^11.0.1, supertest@^7.0.0, @nestjs/testing, supertest

### Community 273 - "eslint"
Cohesion: 0.50
Nodes (4): eslint@^9.18.0, eslint, eslint@^9, eslint@^9

### Community 283 - "AuthService"
Cohesion: 0.11
Nodes (7): AuthService, AuthUser, DUMMY_HASH, hashPassword(), verifyPassword(), hashSessionToken(), hashToken()

### Community 284 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `RFC-6238`, `RFC-6238`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1175 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **178 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `prisma.service.ts`, `app.module.ts`, `backend/package.json`, `PrismaService`, `main.ts`, `app.e2e-spec.ts`, `customers.service.ts`, `leads.controller.ts`, `mail.service.ts`, `admin.service.ts`, `mail.service.ts`, `auth.controller.ts`, `checkout.service.ts`, `OrdiniController`, `AuditService`, `EventsController`, `auth.service.ts`, `dependencies`, `cataloghi-admin.service.ts`, `admin-leads.service.ts`, `leads.service.ts`, `export-cliente.service.ts`, `customer-profile.service.ts`, `conservazione.service.ts`, `spese-spedizione.service.ts`, `AggancioLeadService`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `RFC-6238`, `RFC-6238` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `prisma.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Why does `stato()` connect `mail.service.ts` to `Notice`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Should `CataloghiService` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `TariffaEditor()` connect `SpeseSpedizioneSection.tsx` to `mail.service.ts`, `ref_react`, `AdminPanel.tsx`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06862745098039216 - nodes in this community are weakly interconnected._