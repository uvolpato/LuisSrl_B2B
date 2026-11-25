# Graph Report - Luis Srl - B2B  (2026-11-25)

## Corpus Check
- 480 files · ~471,465 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 12, .css 11, .cmd 6)

## Summary
- 3528 nodes · 8028 edges · 297 communities (110 shown, 187 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 421 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5697f454`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- checkout/page.tsx
- CataloghiService
- app.module.ts
- ref_react
- ProgettiService
- IntegrazioneService
- src/lib/api.ts
- pg
- backend/package.json
- CataloghiAdminService
- CouponService
- RichiesteAccessoSection.tsx
- CustomerProfileService
- frontend/lib/api.ts
- @nestjs/common
- SpeseSpedizioneSection.tsx
- Post
- ordini/page.tsx
- audit.service.ts
- users.service.ts
- useConfirm
- IntegrazioneController
- RequirePermission
- dependencies
- azioni.service.ts
- environment
- mail.service.ts
- AuthenticatedRequest
- integrazione.service.ts
- admin.service.ts
- mail.service.ts
- restore-b2b-views.sql
- AdminPanel.tsx
- AdminOrdiniService
- DashboardService
- CataloghiSection.tsx
- AuditService
- src/app/page.tsx
- app.js
- leads.controller.ts
- CheckoutController
- CreaMailingDto
- SpeseSpedizioneService
- ref_react
- admin-ordini.module.ts
- .log
- catalogo/[codiceLinea]/page.tsx
- compilerOptions
- use-websocket.ts
- LeadsController
- "permission_groups"
- mail.service.ts
- checkout.service.ts
- export-cliente.service.ts
- EmbeddingService
- img.controller.ts
- ws.setup.ts
- CatalogoController
- admin/page.tsx
- "users"
- leads.service.ts
- SyncService
- EmbeddingService
- auth.controller.ts
- SpeseSpedizioneController
- frontend/package.json
- src/app/layout.tsx
- sections/OrdineDetailModal.tsx
- DashboardController
- cambia-superuser.js
- compilerOptions
- compilerOptions
- v_user
- UserEditorModal.tsx
- frontend/app/page.tsx
- genera-docx.cjs
- EventsService
- scripts
- CheckoutService
- CustomersService
- .importaVarianti
- frontend-vetrina/package.json
- AccessoB2B.tsx
- customers
- CouponSection.tsx
- 20260624143908_catalogo_models/migration.sql
- UpdateUserPermissionsDto
- checkout.service.ts
- createCombobox
- verifica-costo-trasporto.cjs
- conservazione.service.ts
- seed.js
- UsersController
- cataloghi-admin.service.ts
- 20260708000000_cache_integra/migration.sql
- verifica-coupon-illimitato.cjs
- https-proxy.mjs
- privacy/page.tsx
- CreateSuggestionBoxDto
- ClientiSection
- integra_clienti_piva_digits_idx
- @prisma/adapter-pg
- Icons.tsx
- UpdateProfileDto
- Contatti
- jest
- 20261025000000_cataloghi_brevo/migration.sql
- customer-profile.service.ts
- BrevoService
- nest-cli.json
- AggancioLeadService
- CreateTariffaDto
- 20260803000000_dashboard_ai/migration.sql
- UpdateTariffaDto
- InvitaBulkDto
- CreateFamigliaDto
- 20260711000001_sync_state_listini/migration.sql
- 20260714000000_progetti/migration.sql
- 20260812104416_add_event_log/migration.sql
- 20261012000000_add_leads/migration.sql
- prod-align-2026-07.sql
- frontend/eslint.config.mjs
- 20260709120000_add_carrello/migration.sql
- frontend/app/layout.tsx
- manual-fixups.sql
- 20260715000000_ai_usage/migration.sql
- c/[token]/page.tsx
- "customer_insight"
- campaigns
- tsconfig.build.json
- scripts
- 20260806000000_add_tariffe_spedizione/migration.sql
- 20260811140000_create_site_config/migration.sql
- 20260807000001_add_anomalia_log/migration.sql
- postcss.config.mjs
- tailwind.config.mjs
- FamiglieController
- backend/eslint.config.mjs
- CustomerIntelligenceService
- AiUsageService
- attiva/layout.tsx
- "mfa_devices"
- riallinea-immagini.js
- [codiceLinea]/route.ts
- main.ts
- scripts
- ImpostazioniSection.tsx

## God Nodes (most connected - your core abstractions)
1. `IntegrazioneService` - 113 edges
2. `RequirePermission()` - 110 edges
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

## Communities (297 total, 187 thin omitted)

### Community 0 - "checkout/page.tsx"
Cohesion: 0.07
Nodes (18): CheckoutPage(), closeNuovoForm(), conferma(), saveIndirizzo(), fmtEur(), FatturazioneCheckout(), IndirizzoData, IndirizzoEditorModal() (+10 more)

### Community 1 - "CataloghiService"
Cohesion: 0.12
Nodes (3): CataloghiModule, CataloghiPublicController, CataloghiService

### Community 2 - "app.module.ts"
Cohesion: 0.09
Nodes (14): AdminModule, AuthModule, CarrelloModule, CheckoutModule, CouponModule, CustomersModule, DashboardModule, ExportOrdiniModule (+6 more)

### Community 3 - "ref_react"
Cohesion: 0.06
Nodes (66): AdminTopBar(), Column, DataTableProps, RowAction, IconChevronLeft, IconChevronRight, IconDownload, IconEdit (+58 more)

### Community 4 - "ProgettiService"
Cohesion: 0.06
Nodes (5): CarrelloController, CarrelloService, ProgettiController, ProgettiPublicController, ProgettiService

### Community 6 - "src/lib/api.ts"
Cohesion: 0.15
Nodes (22): CatalogoPage(), one(), Search, CollezionePage(), generateMetadata(), generateStaticParams(), Params, sitemap() (+14 more)

### Community 7 - "pg"
Cohesion: 0.09
Nodes (13): pg@^8.21.0, base, { Client }, url, { Client }, PEZZI, { Client }, { Client } (+5 more)

### Community 8 - "backend/package.json"
Cohesion: 0.04
Nodes (63): author, connect-pg-simple@^10.0.0, cron-parser@^5.6.1, @nestjs/platform-socket.io@^11.1.26, description, devDependencies, eslint-config-prettier@^10.0.1, @eslint/eslintrc@^3.2.0 (+55 more)

### Community 10 - "CouponService"
Cohesion: 0.07
Nodes (4): qrcode@1.5.4, CouponController, CouponService, qrcode

### Community 11 - "RichiesteAccessoSection.tsx"
Cohesion: 0.08
Nodes (23): Azione, AZIONI_PER_STATO, BADGE_SEGNALE, dataOra(), Dettaglio, EmailAccessoEditor(), ETICHETTA_AZIONE, EVENTI (+15 more)

### Community 13 - "frontend/lib/api.ts"
Cohesion: 0.04
Nodes (75): CarrelloPage(), notifyCart(), remove(), toggleSave(), CartItem, PrezzoInfo, Articolo, Componente (+67 more)

### Community 14 - "@nestjs/common"
Cohesion: 0.20
Nodes (8): PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard, @nestjs/common, @nestjs/platform-express

### Community 15 - "SpeseSpedizioneSection.tsx"
Cohesion: 0.11
Nodes (31): ComboboxField(), onKeyDown(), select(), GuidaModal(), SpeseSpedizioneSection(), onDeleteTariffa(), refresh(), toggleStato() (+23 more)

### Community 16 - "Post"
Cohesion: 0.10
Nodes (3): AuthController, AuthService, hashToken()

### Community 17 - "ordini/page.tsx"
Cohesion: 0.08
Nodes (23): Catalogo, CatalogoArticolo, CatalogoPage(), colorDistance(), hexToLab(), normKey(), SORT_OPTIONS, AreaClientePage() (+15 more)

### Community 18 - "audit.service.ts"
Cohesion: 0.11
Nodes (10): AccessLogInterceptor, ACTION_MAP, getLabel(), hashLogIdentifier(), urlSenzaSegreti(), RequestContextInterceptor, reqCtx, RequestContext (+2 more)

### Community 19 - "users.service.ts"
Cohesion: 0.10
Nodes (10): toUserProfile(), UserProfile, buildStatoFilter(), UserFilter, CreateUserDto, UpdateUserDto, UsersModule, AVATAR_COLORS (+2 more)

### Community 20 - "useConfirm"
Cohesion: 0.05
Nodes (37): RelatedSection(), AnteprimaArticoloPage(), Articolo, DimEntry, Immagine, Variante, ItemP, ProgettoPubblicoPage() (+29 more)

### Community 22 - "RequirePermission"
Cohesion: 0.10
Nodes (4): AdminController, RequirePermission(), CustomersController, AdminLeadsController

### Community 23 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, class-validator@^0.15.1, cookie-parser@^1.4.7, dotenv@^17.4.2, exceljs@4.4.0, helmet@^8.2.0, @nestjs/common@^11.0.1, @nestjs/core@^11.0.1 (+12 more)

### Community 24 - "azioni.service.ts"
Cohesion: 0.15
Nodes (15): AzioneDto, ReinviaDto, EsitoAggancio, Azione, AZIONI, EsitoToken, firma(), segretoAzioni() (+7 more)

### Community 25 - "environment"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "mail.service.ts"
Cohesion: 0.11
Nodes (21): estraiJson(), calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede, Segnale, DatiIndagine (+13 more)

### Community 28 - "integrazione.service.ts"
Cohesion: 0.06
Nodes (32): p, { PrismaClient }, prisma, { PrismaClient }, AUDITED, auditExtension, WRITES, Dossier (+24 more)

### Community 29 - "admin.service.ts"
Cohesion: 0.12
Nodes (10): class-transformer@^0.5.1, CreateGroupDto, CreateRaccoltaDto, UpdateFamigliaDto, UpdateGroupDto, UpdateRaccoltaDto, UpdateSuggestionBoxDto, class-transformer (+2 more)

### Community 30 - "mail.service.ts"
Cohesion: 0.18
Nodes (8): esc(), COLORE, ETICHETTA, paginaAzione(), euro(), MailService, reportLeadHtml(), riempi()

### Community 31 - "restore-b2b-views.sql"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 32 - "AdminPanel.tsx"
Cohesion: 0.05
Nodes (35): AdminPanel(), AdminPanelTab, AI_GROUPS, AiConfigEntry, AiConfigSection(), ALL_PERMISSIONS, ConfigField(), formatDate() (+27 more)

### Community 33 - "AdminOrdiniService"
Cohesion: 0.10
Nodes (4): AdminOrdiniController, AdminOrdiniService, AggiornaStatoOrdineDto, STATI_ORDINE_CONSENTITI

### Community 35 - "CataloghiSection.tsx"
Cohesion: 0.05
Nodes (34): CustomerOfferte(), Comportamento, CustomerTimeline(), DOT, Evento, fmt(), Insight, label() (+26 more)

### Community 36 - "AuditService"
Cohesion: 0.05
Nodes (8): AuditController, AuditModule, AuditService, HttpErrorFilter, HealthController, lead, PrismaService, dotenv

### Community 37 - "src/app/page.tsx"
Cohesion: 0.17
Nodes (13): Page(), Home(), Azienda(), d(), Hero(), HERO_IMAGES, HeroImages(), DATES (+5 more)

### Community 38 - "app.js"
Cohesion: 0.18
Nodes (26): aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer(), conta() (+18 more)

### Community 39 - "leads.controller.ts"
Cohesion: 0.16
Nodes (7): AttivaAccountDto, MfaCodiceDto, MfaPasswordDto, EmailAccessoDto, SedeDto, CreateLeadDto, valido

### Community 42 - "SpeseSpedizioneService"
Cohesion: 0.14
Nodes (3): euCount(), SpeseSpedizioneService, zonaOf()

### Community 43 - "ref_react"
Cohesion: 0.06
Nodes (41): AdminLayout(), AdminSidebar(), logout(), ICONS, NAV_ITEMS, ImportaArticoliModal(), doImport(), startTimeout() (+33 more)

### Community 44 - "admin-ordini.module.ts"
Cohesion: 0.11
Nodes (5): AdminOrdiniModule, OrdiniController, OrdiniModule, OrdiniService, PrismaModule

### Community 46 - "catalogo/[codiceLinea]/page.tsx"
Cohesion: 0.09
Nodes (19): getStock(), ProductBreadcrumb(), SchedaArticoloPage(), activeEntries(), addAllToCart(), addSingleToCart(), galleryModalNav(), getAvailableValues() (+11 more)

### Community 47 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 48 - "use-websocket.ts"
Cohesion: 0.31
Nodes (8): OnlineEvent, usePresence(), connect(), Listener, listeners, useWebSocket(), useWsEvent(), WsMessage

### Community 50 - ""permission_groups""
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "mail.service.ts"
Cohesion: 0.10
Nodes (18): nodemailer@9.1.1, conferma, interna, mail, ora, ReportIndagine, box(), boxClienteIntegra() (+10 more)

### Community 52 - "checkout.service.ts"
Cohesion: 0.16
Nodes (4): FatturazioneDto, confermaRichiesta(), erroreCanaleSdi(), FatturazioneService

### Community 53 - "export-cliente.service.ts"
Cohesion: 0.06
Nodes (38): ok, cartellaOrdiniIntegra(), scriviXlsxAtomico(), scriviXlsxDaModello(), COLONNE, EsitoOrdine, ReportExport, COPPIE_ERRORE (+30 more)

### Community 55 - "img.controller.ts"
Cohesion: 0.13
Nodes (9): @nestjs/throttler@^6.5.0, sharp@0.35.3, ASSETS_BASE_DIR, ALLOWED_WIDTHS, CACHE_DIR, ImgController, snapWidth(), @nestjs/throttler (+1 more)

### Community 56 - "ws.setup.ts"
Cohesion: 0.22
Nodes (7): cookie@^1.1.1, socket.io@^4.8.3, FRONTEND_ORIGINS, online, signature, cookie, socket.io

### Community 58 - "admin/page.tsx"
Cohesion: 0.04
Nodes (42): AdminPage(), SECTION_TITLES, calcTotale(), fmtDate(), fmtPrezzo(), OrdiniPage(), SortField, staticRangesIT (+34 more)

### Community 59 - ""users""
Cohesion: 0.14
Nodes (14): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+6 more)

### Community 60 - "leads.service.ts"
Cohesion: 0.20
Nodes (7): LeadsService, pulisci(), giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA, crea()

### Community 61 - "SyncService"
Cohesion: 0.06
Nodes (6): main(), ExportOrdiniController, ExportOrdiniService, sqlAggiornaClienti(), SyncManagerService, SyncService

### Community 63 - "auth.controller.ts"
Cohesion: 0.08
Nodes (13): DEVICE_COOKIE, DEVICE_GIORNI, mascheraEmail(), ChangePasswordDto, LoginDto, PrivacyAccettaDto, TrackingOptOutDto, AuthUser (+5 more)

### Community 65 - "frontend/package.json"
Cohesion: 0.09
Nodes (28): dependencies, date-fns@4.4.0, next@16.2.9, next-intl@^4.13.0, react@19.2.4, react-date-range@2.0.1, react-dom@19.2.4, react-markdown@^10.1.0 (+20 more)

### Community 66 - "src/app/layout.tsx"
Cohesion: 0.17
Nodes (8): RootLayout(), b(), Footer(), PopupApertureLink(), JsonLd(), HasJs(), Reveal(), SITE

### Community 67 - "sections/OrdineDetailModal.tsx"
Cohesion: 0.24
Nodes (9): Address, fmtDate(), fmtEur(), OrderDetail, OrderItem, OrdineDetailModal(), STATI, STATI_EDITABILI (+1 more)

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

### Community 73 - "UserEditorModal.tsx"
Cohesion: 0.06
Nodes (45): CustomerDossier(), euroK(), fmtData(), MESI, SALUTE, Tile(), Trend(), DataTip() (+37 more)

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
Cohesion: 0.10
Nodes (3): EventsController, EventsModule, EventsService

### Community 77 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:migrate, db:seed, db:setup, embeddings:backfill, format, lint (+9 more)

### Community 79 - "CustomersService"
Cohesion: 0.13
Nodes (7): CustomerProfile, toCustomerProfile(), generateProvisionalPassword(), hashPassword(), CustomersService, CreateCustomerDto, UpdateCustomerDto

### Community 81 - ".importaVarianti"
Cohesion: 0.19
Nodes (6): codiceLineaSicuro(), candidatoPadre(), padreComponente(), promptComposizione(), PADRI, VarianteConComposizione

### Community 82 - "frontend-vetrina/package.json"
Cohesion: 0.07
Nodes (39): eslint@^9.18.0, @types/node@^24.0.0, typescript@^5.7.3, eslint, @types/node, typescript, devDependencies, eslint@^9 (+31 more)

### Community 83 - "AccessoB2B.tsx"
Cohesion: 0.33
Nodes (6): Page(), AccessoB2B(), onSubmit(), CAMPI, EsitoRichiesta, inviaRichiestaAccesso()

### Community 84 - "customers"
Cohesion: 0.14
Nodes (13): customers, contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, "customer_event", customer_event_customer_created_idx, customer_event_tipo_created_idx (+5 more)

### Community 86 - "CouponSection.tsx"
Cohesion: 0.08
Nodes (15): AiSuggestion, AiSuggestionsResponse, CouponEditorModal(), stl, CouponReviewModal(), fmtDate(), Campaign, CouponSection() (+7 more)

### Community 87 - "20260624143908_catalogo_models/migration.sql"
Cohesion: 0.14
Nodes (17): articolo_embedding, "articoli", articoli_codice_linea_key, "articoli_raccolte", articoli_raccolte_articolo_id_raccolta_id_key, "famiglie", "immagini", "raccolte" (+9 more)

### Community 90 - "checkout.service.ts"
Cohesion: 0.10
Nodes (16): DatiCheckout, ModalitaConsegna, provinciaToRegione(), FILTER_VALUES, REGION_ALIASES, SegCustomer, SegFilter, Suggestion (+8 more)

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

### Community 96 - "cataloghi-admin.service.ts"
Cohesion: 0.33
Nodes (5): @nestjs/config@^4.0.4, confrontaSegreto(), ASSETS_PUBLIC_URL, CATALOGHI_DIR, @nestjs/config

### Community 97 - "20260708000000_cache_integra/migration.sql"
Cohesion: 0.32
Nodes (11): idx_articoli_cod, idx_articoli_descr, idx_articoli_errors, idx_articoli_extra, idx_articoli_famiglia, idx_articoli_linea, idx_sync_log_entity, integra_articoli (+3 more)

### Community 98 - "verifica-coupon-illimitato.cjs"
Cohesion: 0.21
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 99 - "https-proxy.mjs"
Cohesion: 0.15
Nodes (7): __dirname, httpsProxy, nextDev, __dirname, options, PROXY_PORT, server

### Community 100 - "privacy/page.tsx"
Cohesion: 0.33
Nodes (7): CookiePage(), Tabella(), En(), It(), PrivacyPage(), Da(), Documento()

### Community 103 - "ClientiSection"
Cohesion: 0.33
Nodes (9): ClientiSection(), doSyncClienti(), forzaRiscrittura(), onBlockToggle(), onInvita(), onResetPassword(), onRigeneraBox(), onRimuoviDatiPersonali() (+1 more)

### Community 105 - "@prisma/adapter-pg"
Cohesion: 0.25
Nodes (6): @prisma/adapter-pg@7.8.0, adapter, prisma, { PrismaClient }, { PrismaPg }, @prisma/adapter-pg

### Community 106 - "Icons.tsx"
Cohesion: 0.20
Nodes (8): IconEdit, IconEye, IconEyeOff, IconLock, IconLockOpen, IconPlus, IconReset, IconTrash

### Community 109 - "jest"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 110 - "20261025000000_cataloghi_brevo/migration.sql"
Cohesion: 0.33
Nodes (9): "cataloghi", "download_events", download_events_link_id_at_idx, "download_links", download_links_mailing_id_created_at_idx, download_links_token_key, "mailing", "mailing_catalogo" (+1 more)

### Community 111 - "customer-profile.service.ts"
Cohesion: 0.21
Nodes (6): CustomerProfileData, CustomerProfileResult, filtraReferentiPubblici(), ReferentePubblico, DatiImpresa, DatiImpresaService

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

### Community 132 - "prod-align-2026-07.sql"
Cohesion: 0.29
Nodes (6): indirizzi_clienti_customer_id_codice_destinazione_key, "integra_pagamenti_descr", "integra_porti", "integra_spedizioni", "integra_vettori", "sync_config"

### Community 135 - "20260709120000_add_carrello/migration.sql"
Cohesion: 0.70
Nodes (4): carrelli, carrello_items, idx_carrello_items_carrello_id, idx_carrello_items_salvato

### Community 138 - "frontend/app/layout.tsx"
Cohesion: 0.24
Nodes (3): RootLayout(), ConfirmProvider(), SessionTerminatedOverlay()

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

### Community 148 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, dev:full, dev:https, lint, start

### Community 224 - "backend/eslint.config.mjs"
Cohesion: 0.22
Nodes (8): @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0, typescript-eslint@^8.20.0, @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 226 - "AiUsageService"
Cohesion: 0.12
Nodes (5): AiUsageController, AiUsageModule, AiUsageService, DEFAULT_PRICES, FALLBACK

### Community 228 - ""mfa_devices""
Cohesion: 0.83
Nodes (3): "mfa_devices", mfa_devices_token_hash_key, mfa_devices_user_id_idx

### Community 272 - "riallinea-immagini.js"
Cohesion: 0.10
Nodes (15): ExcelJS, fs, path, ASSETS_BASE_DIR, dotenv, EXCLUDED, fs, path (+7 more)

### Community 273 - "[codiceLinea]/route.ts"
Cohesion: 0.83
Nodes (3): fetchWithRetry(), isRetryableNetworkError(), POST()

### Community 283 - "main.ts"
Cohesion: 0.16
Nodes (8): express-session@^1.19.0, AppModule, bootstrap(), express-session, SessionData, setupWebSocket(), express-session, @nestjs/core

### Community 289 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 297 - "ImpostazioniSection.tsx"
Cohesion: 0.47
Nodes (4): ConfigField(), ConfigToggle(), ImpostazioniSection(), SiteConfig

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1213 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **187 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `CataloghiService`, `app.module.ts`, `backend/package.json`, `audit.service.ts`, `users.service.ts`, `dependencies`, `azioni.service.ts`, `mail.service.ts`, `main.ts`, `integrazione.service.ts`, `admin.service.ts`, `AuditService`, `leads.controller.ts`, `admin-ordini.module.ts`, `mail.service.ts`, `checkout.service.ts`, `export-cliente.service.ts`, `img.controller.ts`, `leads.service.ts`, `auth.controller.ts`, `EventsService`, `CustomersService`, `checkout.service.ts`, `conservazione.service.ts`, `cataloghi-admin.service.ts`, `AiUsageService`, `customer-profile.service.ts`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `checkout/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07459677419354839 - nodes in this community are weakly interconnected._
- **Why does `TariffaEditor()` connect `SpeseSpedizioneSection.tsx` to `UserEditorModal.tsx`, `mail.service.ts`, `CataloghiSection.tsx`, `ref_react`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `CataloghiService` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08787878787878788 - nodes in this community are weakly interconnected._
- **Should `ref_react` be split into smaller, more focused modules?**
  _Cohesion score 0.058276333789329685 - nodes in this community are weakly interconnected._