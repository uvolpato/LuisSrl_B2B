# Graph Report - Luis Srl - B2B  (2026-11-22)

## Corpus Check
- 478 files · ~470,463 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 12, .css 11, .cmd 6)

## Summary
- 3518 nodes · 8002 edges · 298 communities (123 shown, 175 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 420 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `10cea986`
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
- ref_next
- @nestjs/common
- SpeseSpedizioneSection.tsx
- Post
- thumbUrl
- CarrelloService
- users.service.ts
- catalogo/[codiceLinea]/page.tsx
- Get
- RequirePermission
- dependencies
- azioni.service.ts
- environment
- mail.service.ts
- request-context.ts
- AiUsageService
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
- BoxSuggerimentiSection
- CheckoutController
- CreaMailingDto
- SpeseSpedizioneService
- Notice
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
- CustomerTimeline.tsx
- main.ts
- CatalogoController
- Modal
- "users"
- leads.service.ts
- SyncService
- area/layout.tsx
- auth.controller.ts
- SpeseSpedizioneController
- frontend/package.json
- src/app/layout.tsx
- ref_react
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
- AdminOrdiniSection.tsx
- boxClienteIntegra
- .importaVarianti
- devDependencies
- AccessoB2B.tsx
- customers
- admin-leads.service.ts
- CouponEditorModal
- 20260624143908_catalogo_models/migration.sql
- AuditController
- spese-spedizione.service.ts
- createCombobox
- verifica-costo-trasporto.cjs
- conservazione.service.ts
- seed.js
- FamiglieSection
- @prisma/client
- 20260708000000_cache_integra/migration.sql
- verifica-coupon-illimitato.cjs
- https-proxy.mjs
- privacy/page.tsx
- FamiglieController
- ClientiSection
- integra_clienti_piva_digits_idx
- app.e2e-spec.ts
- Icons.tsx
- devDependencies
- Hero.tsx
- jest
- 20261025000000_cataloghi_brevo/migration.sql
- customer-profile.service.ts
- CustomerDossier.tsx
- nest-cli.json
- AggancioLeadService
- CreateTariffaDto
- 20260803000000_dashboard_ai/migration.sql
- SpeseSpedizioneSection
- ComboboxField
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
- engines
- backend/eslint.config.mjs
- CustomerIntelligenceService
- UpdateTariffaDto
- "mfa_devices"
- ExportClienteService
- customer-intelligence.service.ts
- [codiceLinea]/route.ts
- express-session
- frontend-vetrina/package.json
- prepara-template-soggetti.cjs
- scripts
- typescript

## God Nodes (most connected - your core abstractions)
1. `IntegrazioneService` - 113 edges
2. `RequirePermission()` - 109 edges
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

## Communities (298 total, 175 thin omitted)

### Community 0 - "checkout/page.tsx"
Cohesion: 0.06
Nodes (24): CartItem, CheckoutPage(), closeNuovoForm(), conferma(), saveIndirizzo(), DatiCheckout, fmtEur(), Indirizzo (+16 more)

### Community 1 - "CataloghiService"
Cohesion: 0.13
Nodes (3): CataloghiPublicController, CataloghiService, confrontaSegreto()

### Community 2 - "app.module.ts"
Cohesion: 0.09
Nodes (13): AdminModule, AppModule, AuthModule, CarrelloModule, CouponModule, DashboardModule, ExportOrdiniModule, ImgModule (+5 more)

### Community 3 - "ref_react"
Cohesion: 0.07
Nodes (57): Column, DataTableProps, RowAction, IconChevronLeft, IconChevronRight, IconDownload, IconEdit, IconEye (+49 more)

### Community 4 - "ProgettiService"
Cohesion: 0.10
Nodes (3): ProgettiController, ProgettiPublicController, ProgettiService

### Community 6 - "src/lib/api.ts"
Cohesion: 0.15
Nodes (22): CatalogoPage(), one(), Search, CollezionePage(), generateMetadata(), generateStaticParams(), Params, sitemap() (+14 more)

### Community 7 - "pg"
Cohesion: 0.07
Nodes (18): pg@^8.21.0, base, { Client }, url, { Client }, PEZZI, { Client }, { Client } (+10 more)

### Community 8 - "backend/package.json"
Cohesion: 0.05
Nodes (51): author, description, devDependencies, eslint-config-prettier@^10.0.1, @eslint/eslintrc@^3.2.0, jest@^30.0.0, @nestjs/cli@^11.0.0, @nestjs/schematics@^11.0.0 (+43 more)

### Community 9 - "CataloghiAdminService"
Cohesion: 0.07
Nodes (3): BrevoService, CataloghiAdminController, CataloghiAdminService

### Community 11 - "RichiesteAccessoSection.tsx"
Cohesion: 0.07
Nodes (25): Azione, AZIONI_PER_STATO, BADGE_SEGNALE, dataOra(), Dettaglio, EmailAccessoEditor(), ETICHETTA_AZIONE, EVENTI (+17 more)

### Community 13 - "ref_next"
Cohesion: 0.04
Nodes (59): AdminPage(), SECTION_TITLES, CarrelloPage(), notifyCart(), remove(), toggleSave(), CartItem, PrezzoInfo (+51 more)

### Community 14 - "@nestjs/common"
Cohesion: 0.16
Nodes (10): PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard, CustomersModule, SyncResult (+2 more)

### Community 15 - "SpeseSpedizioneSection.tsx"
Cohesion: 0.17
Nodes (22): TariffaCalcModal(), TariffaEditor(), calcFee(), describeTariffa(), destName(), destTitle(), euCount(), fmtEur() (+14 more)

### Community 17 - "thumbUrl"
Cohesion: 0.06
Nodes (20): ItemP, ProgettoPubblicoPage(), Pubblico, CustomerOfferte(), MOTIVO, Offerta, ImageDropzone(), AnalisiFotoModal() (+12 more)

### Community 19 - "users.service.ts"
Cohesion: 0.07
Nodes (12): toUserProfile(), UserProfile, buildStatoFilter(), UserFilter, generateProvisionalPassword(), CreateUserDto, UpdateUserDto, UsersController (+4 more)

### Community 20 - "catalogo/[codiceLinea]/page.tsx"
Cohesion: 0.09
Nodes (22): AnteprimaArticoloPage(), Articolo, DimEntry, Immagine, Variante, ArticoloEditModal(), handleClose(), handleSave() (+14 more)

### Community 22 - "RequirePermission"
Cohesion: 0.12
Nodes (5): AdminController, RequirePermission(), AuthenticatedRequest, CustomersController, AdminLeadsController

### Community 23 - "dependencies"
Cohesion: 0.07
Nodes (27): dependencies, class-validator@^0.15.1, cron-parser@^5.6.1, dotenv@^17.4.2, exceljs@4.4.0, @nestjs/common@^11.0.1, @nestjs/config@^4.0.4, @nestjs/core@^11.0.1 (+19 more)

### Community 24 - "azioni.service.ts"
Cohesion: 0.18
Nodes (13): EsitoAggancio, Azione, AZIONI, EsitoToken, firma(), segretoAzioni(), AzioniLeadService, Parametri (+5 more)

### Community 25 - "environment"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "mail.service.ts"
Cohesion: 0.12
Nodes (20): estraiJson(), calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede, Segnale, DatiIndagine (+12 more)

### Community 27 - "request-context.ts"
Cohesion: 0.12
Nodes (9): rxjs@^7.8.1, AUDITED, auditExtension, WRITES, HttpErrorFilter, RequestContextInterceptor, reqCtx, RequestContext (+1 more)

### Community 28 - "AiUsageService"
Cohesion: 0.08
Nodes (17): AiUsageController, AiUsageModule, AiUsageService, DEFAULT_PRICES, FALLBACK, Candidato, DEFAULT_PESI, PesiSegnali (+9 more)

### Community 29 - "admin.service.ts"
Cohesion: 0.06
Nodes (15): class-transformer@^0.5.1, CreateGroupDto, CreateRaccoltaDto, CreateSuggestionBoxDto, UpdateFamigliaDto, UpdateGroupDto, UpdateRaccoltaDto, UpdateSuggestionBoxDto (+7 more)

### Community 30 - "mail.service.ts"
Cohesion: 0.18
Nodes (8): esc(), COLORE, ETICHETTA, paginaAzione(), euro(), MailService, reportLeadHtml(), riempi()

### Community 31 - "restore-b2b-views.sql"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 32 - "AdminPanel.tsx"
Cohesion: 0.05
Nodes (54): calcTotale(), fmtDate(), fmtPrezzo(), OrdiniPage(), SortField, staticRangesIT, AdminPanel(), AdminPanelTab (+46 more)

### Community 33 - "AdminOrdiniService"
Cohesion: 0.11
Nodes (3): AdminOrdiniController, AdminOrdiniService, AggiornaStatoOrdineDto

### Community 35 - "CataloghiSection.tsx"
Cohesion: 0.09
Nodes (21): CataloghiSection(), apriDettaglio(), inviaABrevo(), revoca(), Catalogo, Cliente, Destinatario, DettaglioScreen() (+13 more)

### Community 36 - "AuditService"
Cohesion: 0.06
Nodes (16): AuditService, AccessLogInterceptor, ACTION_MAP, getLabel(), hashLogIdentifier(), urlSenzaSegreti(), COLONNE, EsitoOrdine (+8 more)

### Community 37 - "src/app/page.tsx"
Cohesion: 0.18
Nodes (12): Page(), Page(), Home(), Azienda(), d(), Contatti(), DATES, PopupAperture() (+4 more)

### Community 38 - "app.js"
Cohesion: 0.18
Nodes (26): aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer(), conta() (+18 more)

### Community 39 - "BoxSuggerimentiSection"
Cohesion: 0.18
Nodes (6): BoxEditModal(), BoxSuggerimentiSection(), loadRefs(), openCreate(), openEdit(), ribilancia()

### Community 41 - "CreaMailingDto"
Cohesion: 0.22
Nodes (4): CreaMailingDto, ImportClientiDto, AzioneDto, ReinviaDto

### Community 43 - "Notice"
Cohesion: 0.08
Nodes (20): LoginPage(), ImportaArticoliModal(), doImport(), startTimeout(), ArticoliSection(), MfaSection(), MustChangePasswordModal(), onSubmit() (+12 more)

### Community 44 - "admin-ordini.module.ts"
Cohesion: 0.11
Nodes (5): AdminOrdiniModule, OrdiniController, OrdiniModule, OrdiniService, PrismaModule

### Community 45 - ".log"
Cohesion: 0.09
Nodes (4): AdminService, CustomerProfile, toCustomerProfile(), CustomersService

### Community 46 - "catalogo/[codiceLinea]/page.tsx"
Cohesion: 0.07
Nodes (26): Articolo, Componente, CorrelatoCard, DimEntry, getStock(), Immagine, PrezzoInfo, ProductBreadcrumb() (+18 more)

### Community 47 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 48 - "use-websocket.ts"
Cohesion: 0.31
Nodes (8): OnlineEvent, usePresence(), connect(), Listener, listeners, useWebSocket(), useWsEvent(), WsMessage

### Community 49 - "LeadsController"
Cohesion: 0.12
Nodes (5): EmailAccessoDto, EsitoAzione, CreateLeadDto, LeadsController, valido

### Community 50 - ""permission_groups""
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "mail.service.ts"
Cohesion: 0.08
Nodes (19): conferma, interna, mail, ora, CataloghiModule, ASSETS_BASE_DIR, ASSETS_PUBLIC_URL, CATALOGHI_DIR (+11 more)

### Community 52 - "checkout.service.ts"
Cohesion: 0.08
Nodes (16): CheckoutModule, DatiCheckout, ModalitaConsegna, FatturazioneDto, confermaRichiesta(), erroreCanaleSdi(), FatturazioneService, ok (+8 more)

### Community 53 - "export-cliente.service.ts"
Cohesion: 0.16
Nodes (19): scriviXlsxDaModello(), anagraficaDaCliente(), anagraficaDaLead(), AnagraficaIntegra, CAMPI_OBBLIGATORI, CAMPI_OPZIONALI, campiObbligatoriMancanti(), formattaIndirizzo() (+11 more)

### Community 54 - "EmbeddingService"
Cohesion: 0.09
Nodes (4): InsightController, InsightService, EmbeddingService, purgeThumbCache()

### Community 55 - "CustomerTimeline.tsx"
Cohesion: 0.22
Nodes (7): Comportamento, CustomerTimeline(), DOT, Evento, fmt(), Insight, label()

### Community 56 - "main.ts"
Cohesion: 0.13
Nodes (15): connect-pg-simple@^10.0.0, cookie@^1.1.1, cookie-parser@^1.4.7, helmet@^8.2.0, socket.io@^4.8.3, FRONTEND_ORIGINS, bootstrap(), online (+7 more)

### Community 58 - "Modal"
Cohesion: 0.08
Nodes (36): AdminLayout(), AdminSidebar(), logout(), ICONS, NAV_ITEMS, AdminTopBar(), categoriaDi(), EventDetailModal() (+28 more)

### Community 59 - ""users""
Cohesion: 0.14
Nodes (14): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+6 more)

### Community 60 - "leads.service.ts"
Cohesion: 0.17
Nodes (9): ReportIndagine, LeadsService, pulisci(), giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA, crea() (+1 more)

### Community 61 - "SyncService"
Cohesion: 0.06
Nodes (7): main(), scriviXlsxAtomico(), ExportOrdiniController, ExportOrdiniService, sqlAggiornaClienti(), SyncManagerService, SyncService

### Community 62 - "area/layout.tsx"
Cohesion: 0.20
Nodes (8): AreaLayout(), AreaFooter(), PrivacyNoticeModal(), StatoPrivacy, Tracker(), HeaderCenterContext, HeaderCenterContextType, HeaderCenterProvider()

### Community 63 - "auth.controller.ts"
Cohesion: 0.04
Nodes (22): AuthService, DEVICE_COOKIE, DEVICE_GIORNI, mascheraEmail(), AttivaAccountDto, ChangePasswordDto, LoginDto, MfaCodiceDto (+14 more)

### Community 65 - "frontend/package.json"
Cohesion: 0.13
Nodes (19): dependencies, date-fns@4.4.0, next@16.2.9, react@19.2.4, react-date-range@2.0.1, react-markdown@^10.1.0, socket.io-client@^4.8.3, engines (+11 more)

### Community 66 - "src/app/layout.tsx"
Cohesion: 0.18
Nodes (7): RootLayout(), b(), Footer(), PopupApertureLink(), HasJs(), Reveal(), SITE

### Community 67 - "ref_react"
Cohesion: 0.05
Nodes (44): AttivaPage(), CostiAiSection(), eur(), PERIODS, Summary, AiSuggestion, AiSuggestionsResponse, stl (+36 more)

### Community 69 - "cambia-superuser.js"
Cohesion: 0.12
Nodes (14): @prisma/adapter-pg@7.8.0, adapter, prisma, { PrismaClient }, { PrismaPg }, adapter, argon2, generaPassword() (+6 more)

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
Cohesion: 0.09
Nodes (23): SyncButton(), AddrCard(), BadgeFatturazione(), descrizioneOrdine(), Field(), fmtDataIt(), fmtDate(), RoField() (+15 more)

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

### Community 79 - "AdminOrdiniSection.tsx"
Cohesion: 0.21
Nodes (10): AdminOrdiniSection(), DashboardData, fmtDate(), fmtEur(), OrderSummary, PageData, STATI, staticRangesIT (+2 more)

### Community 80 - "boxClienteIntegra"
Cohesion: 0.70
Nodes (3): box(), boxClienteIntegra(), esc()

### Community 81 - ".importaVarianti"
Cohesion: 0.21
Nodes (6): codiceLineaSicuro(), candidatoPadre(), padreComponente(), promptComposizione(), PADRI, VarianteConComposizione

### Community 82 - "devDependencies"
Cohesion: 0.14
Nodes (14): @types/node@^24.0.0, @types/node, @types/node@^20, @types/react@^19, @types/react, devDependencies, postcss@^8.5.29, tailwindcss@^4.3.3 (+6 more)

### Community 83 - "AccessoB2B.tsx"
Cohesion: 0.33
Nodes (6): Page(), AccessoB2B(), onSubmit(), CAMPI, EsitoRichiesta, inviaRichiestaAccesso()

### Community 84 - "customers"
Cohesion: 0.14
Nodes (13): customers, contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, "customer_event", customer_event_customer_created_idx, customer_event_tipo_created_idx (+5 more)

### Community 85 - "admin-leads.service.ts"
Cohesion: 0.19
Nodes (10): COPPIE_ERRORE, erroriAttivi(), FILTRI_STATO, GIORNI_ALLARME, giorniAttesa(), ORDINAMENTI, AdminLeadsService, STATI_IN_ATTESA (+2 more)

### Community 87 - "20260624143908_catalogo_models/migration.sql"
Cohesion: 0.14
Nodes (17): articolo_embedding, "articoli", articoli_codice_linea_key, "articoli_raccolte", articoli_raccolte_articolo_id_raccolta_id_key, "famiglie", "immagini", "raccolte" (+9 more)

### Community 90 - "spese-spedizione.service.ts"
Cohesion: 0.18
Nodes (10): Calcola(), euCount(), NAZIONI, NAZIONI_ORDER, PctOf(), REGIONI_IT, Resolved, Row (+2 more)

### Community 91 - "createCombobox"
Cohesion: 0.22
Nodes (9): buildComboboxOptions(), createCombobox(), filterOptions(), highlight(), open(), renderOptions(), selectOption(), getComboboxOptions() (+1 more)

### Community 92 - "verifica-costo-trasporto.cjs"
Cohesion: 0.21
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 93 - "conservazione.service.ts"
Cohesion: 0.28
Nodes (6): datiAnonimi(), limite(), MESI_DEFAULT, mesiConservazione(), ConservazioneLeadService, STATI_DA_ANONIMIZZARE

### Community 94 - "seed.js"
Cohesion: 0.17
Nodes (10): argon2@^0.44.0, adapter, argon2, AVATAR_COLORS, PERMISSION_KEYS, prisma, { PrismaClient }, { PrismaPg } (+2 more)

### Community 95 - "FamiglieSection"
Cohesion: 0.14
Nodes (6): displayNome(), FamigliaEditModal(), handleSave(), FamiglieSection(), genDeleteCode(), requestDelete()

### Community 96 - "@prisma/client"
Cohesion: 0.10
Nodes (14): p, { PrismaClient }, prisma, { PrismaClient }, ASSETS_BASE_DIR, dotenv, EXCLUDED, fs (+6 more)

### Community 97 - "20260708000000_cache_integra/migration.sql"
Cohesion: 0.32
Nodes (11): idx_articoli_cod, idx_articoli_descr, idx_articoli_errors, idx_articoli_extra, idx_articoli_famiglia, idx_articoli_linea, idx_sync_log_entity, integra_articoli (+3 more)

### Community 98 - "verifica-coupon-illimitato.cjs"
Cohesion: 0.19
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 99 - "https-proxy.mjs"
Cohesion: 0.15
Nodes (7): __dirname, httpsProxy, nextDev, __dirname, options, PROXY_PORT, server

### Community 100 - "privacy/page.tsx"
Cohesion: 0.33
Nodes (7): CookiePage(), Tabella(), En(), It(), PrivacyPage(), Da(), Documento()

### Community 103 - "ClientiSection"
Cohesion: 0.23
Nodes (12): ImportaClientiModal(), doImport(), startTimeout(), ClientiSection(), doSyncClienti(), forzaRiscrittura(), onBlockToggle(), onInvita() (+4 more)

### Community 105 - "app.e2e-spec.ts"
Cohesion: 0.40
Nodes (4): @nestjs/testing@^11.0.1, supertest@^7.0.0, @nestjs/testing, supertest

### Community 106 - "Icons.tsx"
Cohesion: 0.20
Nodes (8): IconEdit, IconEye, IconEyeOff, IconLock, IconLockOpen, IconPlus, IconReset, IconTrash

### Community 107 - "devDependencies"
Cohesion: 0.15
Nodes (13): eslint@^9.18.0, eslint, devDependencies, eslint@^9, eslint-config-next@16.2.9, @types/react-date-range@1.4.10, @types/react-dom@^19, eslint-config-next (+5 more)

### Community 108 - "Hero.tsx"
Cohesion: 0.60
Nodes (3): Hero(), HERO_IMAGES, HeroImages()

### Community 109 - "jest"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 110 - "20261025000000_cataloghi_brevo/migration.sql"
Cohesion: 0.33
Nodes (9): "cataloghi", "download_events", download_events_link_id_at_idx, "download_links", download_links_mailing_id_created_at_idx, download_links_token_key, "mailing", "mailing_catalogo" (+1 more)

### Community 111 - "customer-profile.service.ts"
Cohesion: 0.39
Nodes (5): CustomerProfileData, CustomerProfileResult, filtraReferentiPubblici(), ReferentePubblico, DatiImpresa

### Community 114 - "CustomerDossier.tsx"
Cohesion: 0.20
Nodes (13): CustomerDossier(), euroK(), fmtData(), MESI, SALUTE, Tile(), Trend(), Hint() (+5 more)

### Community 116 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, watchAssets, $schema, sourceRoot

### Community 119 - "AggancioLeadService"
Cohesion: 0.16
Nodes (6): AggancioLeadService, EsitoRicerca, crea(), lead, emailAccesso(), emailEffettiva()

### Community 122 - "20260803000000_dashboard_ai/migration.sql"
Cohesion: 0.43
Nodes (6): "dashboard_boxes", dashboard_boxes_customer_box_key, dashboard_boxes_customer_idx, "promozioni", promozioni_attiva_data_fine_idx, "suggestion_boxes"

### Community 123 - "SpeseSpedizioneSection"
Cohesion: 0.22
Nodes (6): GuidaModal(), SpeseSpedizioneSection(), onDeleteTariffa(), refresh(), toggleStato(), currentRanges()

### Community 124 - "ComboboxField"
Cohesion: 0.67
Nodes (3): ComboboxField(), onKeyDown(), select()

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

### Community 217 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 224 - "backend/eslint.config.mjs"
Cohesion: 0.22
Nodes (8): @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0, typescript-eslint@^8.20.0, @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 228 - ""mfa_devices""
Cohesion: 0.83
Nodes (3): "mfa_devices", mfa_devices_token_hash_key, mfa_devices_user_id_idx

### Community 229 - "ExportClienteService"
Cohesion: 0.18
Nodes (3): cartellaOrdiniIntegra(), ExportClienteService, lead

### Community 272 - "customer-intelligence.service.ts"
Cohesion: 0.33
Nodes (5): Dossier, DossierFamiglia, DossierKpi, MotivoOfferta, Offerta

### Community 273 - "[codiceLinea]/route.ts"
Cohesion: 0.83
Nodes (3): fetchWithRetry(), isRetryableNetworkError(), POST()

### Community 283 - "express-session"
Cohesion: 0.40
Nodes (4): express-session@^1.19.0, express-session, SessionData, express-session

### Community 284 - "frontend-vetrina/package.json"
Cohesion: 0.12
Nodes (19): next-intl@^4.13.0, react-dom@19.2.4, next-intl, react-dom, dependencies, next@16.2.9, next-intl@4.13.0, react@19.2.4 (+11 more)

### Community 286 - "prepara-template-soggetti.cjs"
Cohesion: 0.40
Nodes (4): ExcelJS, fs, path, exceljs

### Community 289 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 290 - "typescript"
Cohesion: 0.50
Nodes (4): typescript@^5.7.3, typescript, typescript@^5, typescript@^5

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1210 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **175 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `app.module.ts`, `backend/package.json`, `customer-intelligence.service.ts`, `users.service.ts`, `dependencies`, `azioni.service.ts`, `mail.service.ts`, `request-context.ts`, `AiUsageService`, `admin.service.ts`, `AuditService`, `admin-ordini.module.ts`, `LeadsController`, `mail.service.ts`, `checkout.service.ts`, `export-cliente.service.ts`, `main.ts`, `leads.service.ts`, `auth.controller.ts`, `EventsService`, `admin-leads.service.ts`, `AuditController`, `spese-spedizione.service.ts`, `conservazione.service.ts`, `app.e2e-spec.ts`, `customer-profile.service.ts`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `checkout/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06342780026990553 - nodes in this community are weakly interconnected._
- **Why does `stato()` connect `mail.service.ts` to `FamiglieSection`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Should `CataloghiService` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `handleSave()` connect `mail.service.ts` to `thumbUrl`, `app.js`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08846153846153847 - nodes in this community are weakly interconnected._