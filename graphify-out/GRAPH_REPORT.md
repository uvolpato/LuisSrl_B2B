# Graph Report - Luis Srl - B2B  (2026-11-17)

## Corpus Check
- 472 files · ~468,362 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 12, .css 11, .cmd 6)

## Summary
- 3491 nodes · 7934 edges · 296 communities (116 shown, 180 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 418 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b15b1491`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- RequirePermission
- CataloghiService
- app.module.ts
- ref_react
- lib/types.ts
- IntegrazioneService
- src/app/page.tsx
- pg
- backend/package.json
- CataloghiAdminService
- CouponService
- RichiesteAccessoSection.tsx
- CustomerProfileService
- checkout/page.tsx
- @nestjs/common
- SpeseSpedizioneSection.tsx
- AuthenticatedRequest
- ProgettiService
- thumbUrl
- users.service.ts
- integrazione.service.ts
- IntegrazioneController
- .log
- dashboard.service.ts
- azioni.service.ts
- environment
- mail.service.ts
- ref_next_intl
- AuditService
- admin.service.ts
- mail.service.ts
- restore-b2b-views.sql
- AdminPanel.tsx
- AdminOrdiniService
- DashboardService
- CataloghiSection.tsx
- prisma.service.ts
- UsersController
- app.js
- admin/page.tsx
- CheckoutController
- frontend-vetrina/package.json
- SpeseSpedizioneService
- ref_react
- OrdiniController
- Post
- catalogo/[codiceLinea]/page.tsx
- compilerOptions
- dependencies
- LeadsController
- "permission_groups"
- integrazione.service.ts
- fatturazione.service.ts
- export-cliente.service.ts
- ref_react
- frontend/lib/api.ts
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
- CouponSection.tsx
- CustomerTimeline.tsx
- cambia-superuser.js
- compilerOptions
- compilerOptions
- v_user
- UserEditorModal.tsx
- frontend/app/page.tsx
- genera-docx.cjs
- PrismaService
- scripts
- CheckoutService
- UpdateProfileDto
- EventLogSection.tsx
- .importaVarianti
- devDependencies
- CreaMailingDto
- customers
- devDependencies
- 20260624143908_catalogo_models/migration.sql
- Tooltip
- spese-spedizione.service.ts
- createCombobox
- verifica-costo-trasporto.cjs
- conservazione.service.ts
- seed.js
- CreateSuggestionBoxDto
- @prisma/client
- 20260708000000_cache_integra/migration.sql
- verifica-coupon-illimitato.cjs
- CustomerDossier.tsx
- privacy/page.tsx
- riallinea-immagini.js
- CustomerIntelligenceService
- integra_clienti_piva_digits_idx
- SpeseSpedizioneSection
- Icons.tsx
- use-websocket.ts
- attiva/layout.tsx
- jest
- 20261025000000_cataloghi_brevo/migration.sql
- customer-profile.service.ts
- backend/eslint.config.mjs
- nest-cli.json
- AggancioLeadService
- CreateTariffaDto
- 20260803000000_dashboard_ai/migration.sql
- startTimeout
- ImpostazioniSection.tsx
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
- @prisma/adapter-pg
- 20260806000000_add_tariffe_spedizione/migration.sql
- 20260811140000_create_site_config/migration.sql
- 20260807000001_add_anomalia_log/migration.sql
- postcss.config.mjs
- tailwind.config.mjs
- scripts
- LoginDto
- prepara-template-soggetti.cjs
- UpdateUserDto
- "mfa_devices"
- InvitaBulkDto
- FamiglieController
- scripts
- [codiceLinea]/route.ts
- typescript
- ComboboxField
- express-session
- ExportOrdiniService
- prisma
- codiceLineaSicuro

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

## Communities (296 total, 180 thin omitted)

### Community 0 - "RequirePermission"
Cohesion: 0.16
Nodes (3): RequirePermission(), CustomersController, AdminLeadsController

### Community 1 - "CataloghiService"
Cohesion: 0.13
Nodes (3): CataloghiPublicController, CataloghiService, confrontaSegreto()

### Community 2 - "app.module.ts"
Cohesion: 0.08
Nodes (16): AdminModule, AppModule, AuthModule, CarrelloModule, CheckoutModule, CouponModule, CustomersModule, DashboardModule (+8 more)

### Community 3 - "ref_react"
Cohesion: 0.07
Nodes (53): AdminTopBar(), Column, DataTableProps, RowAction, IconChevronLeft, IconChevronRight, IconDownload, IconEdit (+45 more)

### Community 4 - "lib/types.ts"
Cohesion: 0.12
Nodes (21): calcTotale(), fmtDate(), fmtPrezzo(), OrdiniPage(), SortField, staticRangesIT, fmt(), OrdineDetailModal() (+13 more)

### Community 6 - "src/app/page.tsx"
Cohesion: 0.07
Nodes (38): Page(), CatalogoPage(), one(), Search, Page(), Home(), Page(), Composizione() (+30 more)

### Community 7 - "pg"
Cohesion: 0.07
Nodes (18): pg@^8.21.0, base, { Client }, url, { Client }, PEZZI, { Client }, { Client } (+10 more)

### Community 8 - "backend/package.json"
Cohesion: 0.05
Nodes (55): author, description, devDependencies, eslint-config-prettier@^10.0.1, @eslint/eslintrc@^3.2.0, jest@^30.0.0, @nestjs/cli@^11.0.0, @nestjs/schematics@^11.0.0 (+47 more)

### Community 11 - "RichiesteAccessoSection.tsx"
Cohesion: 0.09
Nodes (22): Azione, AZIONI_PER_STATO, BADGE_SEGNALE, dataOra(), Dettaglio, EmailAccessoEditor(), ETICHETTA_AZIONE, EVENTI (+14 more)

### Community 13 - "checkout/page.tsx"
Cohesion: 0.10
Nodes (16): CartItem, CheckoutPage(), closeNuovoForm(), conferma(), saveIndirizzo(), DatiCheckout, fmtEur(), Indirizzo (+8 more)

### Community 14 - "@nestjs/common"
Cohesion: 0.21
Nodes (8): PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard, @nestjs/common, @nestjs/platform-express

### Community 15 - "SpeseSpedizioneSection.tsx"
Cohesion: 0.17
Nodes (23): TariffaCalcModal(), TariffaEditor(), calcFee(), currentRanges(), describeTariffa(), destName(), destTitle(), euCount() (+15 more)

### Community 16 - "AuthenticatedRequest"
Cohesion: 0.11
Nodes (4): AuthController, AuthService, AuthenticatedRequest, hashToken()

### Community 17 - "ProgettiService"
Cohesion: 0.10
Nodes (3): ProgettiController, ProgettiPublicController, ProgettiService

### Community 18 - "thumbUrl"
Cohesion: 0.05
Nodes (37): AnteprimaArticoloPage(), Articolo, DimEntry, Immagine, Variante, ItemP, ProgettoPubblicoPage(), Pubblico (+29 more)

### Community 19 - "users.service.ts"
Cohesion: 0.13
Nodes (9): toUserProfile(), UserProfile, buildStatoFilter(), UserFilter, CreateUserDto, UsersModule, AVATAR_COLORS, GRUPPO_PER_RUOLO (+1 more)

### Community 20 - "integrazione.service.ts"
Cohesion: 0.14
Nodes (15): ASSETS_PUBLIC_URL, Dossier, DossierFamiglia, DossierKpi, MotivoOfferta, Offerta, formatDimensioni(), ASSETS_CACHE_DIR (+7 more)

### Community 23 - "dashboard.service.ts"
Cohesion: 0.07
Nodes (10): AiUsageController, AiUsageModule, AiUsageService, Candidato, DEFAULT_PESI, PesiSegnali, Segnali, InsightController (+2 more)

### Community 24 - "azioni.service.ts"
Cohesion: 0.15
Nodes (15): AzioneDto, ReinviaDto, EsitoAggancio, Azione, AZIONI, EsitoToken, firma(), segretoAzioni() (+7 more)

### Community 25 - "environment"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "mail.service.ts"
Cohesion: 0.12
Nodes (20): estraiJson(), calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede, Segnale, DatiIndagine (+12 more)

### Community 27 - "ref_next_intl"
Cohesion: 0.06
Nodes (31): AdminPage(), SECTION_TITLES, AdminLayout(), AdminOrdiniSection(), DashboardData, fmtDate(), fmtEur(), OrderSummary (+23 more)

### Community 28 - "AuditService"
Cohesion: 0.06
Nodes (9): rxjs@^7.8.1, AuditController, AuditModule, AuditService, AccessLogInterceptor, ACTION_MAP, getLabel(), HttpErrorFilter (+1 more)

### Community 29 - "admin.service.ts"
Cohesion: 0.09
Nodes (12): class-transformer@^0.5.1, CreateGroupDto, CreateRaccoltaDto, UpdateFamigliaDto, UpdateGroupDto, UpdateRaccoltaDto, UpdateSuggestionBoxDto, PermissionOverrideDto (+4 more)

### Community 30 - "mail.service.ts"
Cohesion: 0.11
Nodes (14): esc(), box(), boxClienteIntegra(), esc(), MailModule, BADGE, DatiClienteMail, DatiConfermaOrdine (+6 more)

### Community 31 - "restore-b2b-views.sql"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 32 - "AdminPanel.tsx"
Cohesion: 0.05
Nodes (39): AdminPanel(), AdminPanelTab, AI_GROUPS, AiConfigEntry, AiConfigSection(), ALL_PERMISSIONS, ConfigField(), formatDate() (+31 more)

### Community 33 - "AdminOrdiniService"
Cohesion: 0.10
Nodes (4): AdminOrdiniController, AdminOrdiniService, AggiornaStatoOrdineDto, STATI_ORDINE_CONSENTITI

### Community 35 - "CataloghiSection.tsx"
Cohesion: 0.09
Nodes (21): CataloghiSection(), apriDettaglio(), inviaABrevo(), revoca(), Catalogo, Cliente, Destinatario, DettaglioScreen() (+13 more)

### Community 36 - "prisma.service.ts"
Cohesion: 0.10
Nodes (13): DEFAULT_PRICES, FALLBACK, AUDITED, auditExtension, WRITES, urlSenzaSegreti(), RequestContextInterceptor, reqCtx (+5 more)

### Community 38 - "app.js"
Cohesion: 0.18
Nodes (26): aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer(), conta() (+18 more)

### Community 39 - "admin/page.tsx"
Cohesion: 0.04
Nodes (25): DataTable(), ImportaArticoliModal(), doImport(), startTimeout(), ImportaClientiModal(), ArticoliSection(), ArticoloEditModal(), handleClose() (+17 more)

### Community 41 - "frontend-vetrina/package.json"
Cohesion: 0.12
Nodes (19): next-intl@^4.13.0, react-dom@19.2.4, next-intl, react-dom, dependencies, next@16.2.9, next-intl@4.13.0, react@19.2.4 (+11 more)

### Community 42 - "SpeseSpedizioneService"
Cohesion: 0.13
Nodes (3): euCount(), SpeseSpedizioneService, zonaOf()

### Community 43 - "ref_react"
Cohesion: 0.07
Nodes (39): LoginPage(), AdminSidebar(), logout(), ICONS, NAV_ITEMS, AccountTab(), InfoTab(), LicenseModal() (+31 more)

### Community 44 - "OrdiniController"
Cohesion: 0.11
Nodes (5): AdminOrdiniModule, OrdiniController, OrdiniModule, OrdiniService, PrismaModule

### Community 46 - "catalogo/[codiceLinea]/page.tsx"
Cohesion: 0.07
Nodes (30): Articolo, Componente, CorrelatoCard, DimEntry, getStock(), Immagine, PrezzoInfo, ProductBreadcrumb() (+22 more)

### Community 47 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 48 - "dependencies"
Cohesion: 0.05
Nodes (37): dependencies, class-validator@^0.15.1, connect-pg-simple@^10.0.0, cookie@^1.1.1, cookie-parser@^1.4.7, cron-parser@^5.6.1, dotenv@^17.4.2, exceljs@4.4.0 (+29 more)

### Community 49 - "LeadsController"
Cohesion: 0.10
Nodes (8): EmailAccessoDto, EsitoAzione, CreateLeadDto, LeadsController, valido, COLORE, ETICHETTA, paginaAzione()

### Community 50 - ""permission_groups""
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "integrazione.service.ts"
Cohesion: 0.06
Nodes (21): BrevoService, CataloghiModule, ASSETS_BASE_DIR, CATALOGHI_DIR, FRONTEND_ORIGINS, ALLOWED_WIDTHS, CACHE_DIR, ImgController (+13 more)

### Community 52 - "fatturazione.service.ts"
Cohesion: 0.15
Nodes (5): FatturazioneDto, confermaRichiesta(), erroreCanaleSdi(), FatturazioneService, ok

### Community 53 - "export-cliente.service.ts"
Cohesion: 0.15
Nodes (17): cartellaOrdiniIntegra(), scriviXlsxDaModello(), anagraficaDaCliente(), anagraficaDaLead(), AnagraficaIntegra, formattaIndirizzo(), MODELLO_SOGGETTI, nomeFileLead() (+9 more)

### Community 54 - "ref_react"
Cohesion: 0.05
Nodes (51): CarrelloPage(), notifyCart(), remove(), toggleSave(), CartItem, PrezzoInfo, Catalogo, CatalogoArticolo (+43 more)

### Community 55 - "frontend/lib/api.ts"
Cohesion: 0.07
Nodes (27): AttivaPage(), Dispositivo, Address, fmtDate(), fmtEur(), OrderDetail, OrderItem, OrdineDetailModal() (+19 more)

### Community 58 - "admin-leads.service.ts"
Cohesion: 0.13
Nodes (10): COPPIE_ERRORE, erroriAttivi(), FILTRI_STATO, GIORNI_ALLARME, giorniAttesa(), ORDINAMENTI, AdminLeadsService, STATI_IN_ATTESA (+2 more)

### Community 59 - ""users""
Cohesion: 0.14
Nodes (14): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+6 more)

### Community 60 - "leads.service.ts"
Cohesion: 0.17
Nodes (10): ReportIndagine, LeadsService, pulisci(), giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA, crea() (+2 more)

### Community 61 - "SyncService"
Cohesion: 0.11
Nodes (3): sqlAggiornaClienti(), SyncManagerService, SyncService

### Community 62 - "CustomersService"
Cohesion: 0.11
Nodes (7): CustomerProfile, toCustomerProfile(), generateProvisionalPassword(), hashPassword(), CustomersService, CreateCustomerDto, UpdateCustomerDto

### Community 63 - "auth.controller.ts"
Cohesion: 0.07
Nodes (16): DEVICE_COOKIE, DEVICE_GIORNI, mascheraEmail(), AttivaAccountDto, ChangePasswordDto, MfaCodiceDto, MfaPasswordDto, PrivacyAccettaDto (+8 more)

### Community 65 - "frontend/package.json"
Cohesion: 0.13
Nodes (19): dependencies, date-fns@4.4.0, next@16.2.9, react@19.2.4, react-date-range@2.0.1, react-markdown@^10.1.0, socket.io-client@^4.8.3, engines (+11 more)

### Community 66 - "src/app/layout.tsx"
Cohesion: 0.18
Nodes (11): RootLayout(), b(), Footer(), Header(), switchLang(), LINGUE, setLangCookie(), PopupApertureLink() (+3 more)

### Community 67 - "CouponSection.tsx"
Cohesion: 0.08
Nodes (15): AiSuggestion, AiSuggestionsResponse, CouponEditorModal(), stl, CouponReviewModal(), fmtDate(), Campaign, CouponSection() (+7 more)

### Community 68 - "CustomerTimeline.tsx"
Cohesion: 0.22
Nodes (7): Comportamento, CustomerTimeline(), DOT, Evento, fmt(), Insight, label()

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
Cohesion: 0.10
Nodes (19): SyncButton(), AddrCard(), descrizioneOrdine(), Field(), fmtDataIt(), fmtDate(), RoField(), SALUTE (+11 more)

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

### Community 76 - "PrismaService"
Cohesion: 0.05
Nodes (14): DatiCheckout, ModalitaConsegna, provinciaToRegione(), FILTER_VALUES, REGION_ALIASES, SegCustomer, SegFilter, Suggestion (+6 more)

### Community 77 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, build, db:migrate, db:seed, db:setup, embeddings:backfill, format, lint (+9 more)

### Community 80 - "EventLogSection.tsx"
Cohesion: 0.17
Nodes (15): categoriaDi(), EventDetailModal(), EventLogItem, categoriaDi(), EVENT_TYPES, EventLogItem, EventLogSection(), fmtDt() (+7 more)

### Community 81 - ".importaVarianti"
Cohesion: 0.16
Nodes (6): candidatoPadre(), padreComponente(), promptComposizione(), PADRI, VarianteConComposizione, purgeThumbCache()

### Community 82 - "devDependencies"
Cohesion: 0.14
Nodes (14): @types/node@^24.0.0, @types/node, @types/node@^20, @types/react@^19, @types/react, devDependencies, postcss@^8.5.29, tailwindcss@^4.3.3 (+6 more)

### Community 84 - "customers"
Cohesion: 0.14
Nodes (13): customers, contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, "customer_event", customer_event_customer_created_idx, customer_event_tipo_created_idx (+5 more)

### Community 85 - "devDependencies"
Cohesion: 0.15
Nodes (13): eslint@^9.18.0, eslint, devDependencies, eslint@^9, eslint-config-next@16.2.9, @types/react-date-range@1.4.10, @types/react-dom@^19, eslint-config-next (+5 more)

### Community 87 - "20260624143908_catalogo_models/migration.sql"
Cohesion: 0.18
Nodes (13): articolo_embedding, "articoli", articoli_codice_linea_key, "articoli_raccolte", articoli_raccolte_articolo_id_raccolta_id_key, "famiglie", "immagini", "raccolte" (+5 more)

### Community 89 - "Tooltip"
Cohesion: 0.24
Nodes (8): DataTip(), Hint(), HintProps, toStr(), Tooltip(), TooltipProps, BadgeFatturazione(), ProfiloTab()

### Community 90 - "spese-spedizione.service.ts"
Cohesion: 0.20
Nodes (8): NAZIONI, NAZIONI_ORDER, PctOf(), REGIONI_IT, Resolved, Row, ZONE_KEYS, ZONE_ORDER

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

### Community 96 - "@prisma/client"
Cohesion: 0.18
Nodes (7): p, { PrismaClient }, prisma, { PrismaClient }, p, { PrismaClient }, @prisma/client

### Community 97 - "20260708000000_cache_integra/migration.sql"
Cohesion: 0.32
Nodes (11): idx_articoli_cod, idx_articoli_descr, idx_articoli_errors, idx_articoli_extra, idx_articoli_famiglia, idx_articoli_linea, idx_sync_log_entity, integra_articoli (+3 more)

### Community 98 - "verifica-coupon-illimitato.cjs"
Cohesion: 0.21
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 99 - "CustomerDossier.tsx"
Cohesion: 0.29
Nodes (9): CustomerDossier(), euroK(), fmtData(), MESI, SALUTE, Tile(), Trend(), CustomerDossier (+1 more)

### Community 100 - "privacy/page.tsx"
Cohesion: 0.33
Nodes (7): CookiePage(), Tabella(), En(), It(), PrivacyPage(), Da(), Documento()

### Community 101 - "riallinea-immagini.js"
Cohesion: 0.22
Nodes (7): ASSETS_BASE_DIR, dotenv, EXCLUDED, fs, path, prisma, { PrismaClient }

### Community 105 - "SpeseSpedizioneSection"
Cohesion: 0.24
Nodes (5): GuidaModal(), SpeseSpedizioneSection(), onDeleteTariffa(), refresh(), toggleStato()

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

### Community 111 - "customer-profile.service.ts"
Cohesion: 0.39
Nodes (5): CustomerProfileData, CustomerProfileResult, filtraReferentiPubblici(), ReferentePubblico, DatiImpresa

### Community 114 - "backend/eslint.config.mjs"
Cohesion: 0.22
Nodes (8): @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0, typescript-eslint@^8.20.0, @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 116 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, watchAssets, $schema, sourceRoot

### Community 119 - "AggancioLeadService"
Cohesion: 0.18
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

### Community 138 - "frontend/app/layout.tsx"
Cohesion: 0.17
Nodes (6): RootLayout(), ConfirmContext, ConfirmFn, ConfirmOptions, ConfirmProvider(), SessionTerminatedOverlay()

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

### Community 148 - "@prisma/adapter-pg"
Cohesion: 0.25
Nodes (6): @prisma/adapter-pg@7.8.0, adapter, prisma, { PrismaClient }, { PrismaPg }, @prisma/adapter-pg

### Community 224 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, dev:full, dev:https, lint, start

### Community 226 - "prepara-template-soggetti.cjs"
Cohesion: 0.40
Nodes (4): ExcelJS, fs, path, exceljs

### Community 228 - ""mfa_devices""
Cohesion: 0.83
Nodes (3): "mfa_devices", mfa_devices_token_hash_key, mfa_devices_user_id_idx

### Community 272 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 273 - "[codiceLinea]/route.ts"
Cohesion: 0.83
Nodes (3): fetchWithRetry(), isRetryableNetworkError(), POST()

### Community 283 - "typescript"
Cohesion: 0.50
Nodes (4): typescript@^5.7.3, typescript, typescript@^5, typescript@^5

### Community 284 - "ComboboxField"
Cohesion: 0.67
Nodes (3): ComboboxField(), onKeyDown(), select()

### Community 286 - "express-session"
Cohesion: 0.40
Nodes (4): express-session@^1.19.0, express-session, SessionData, express-session

### Community 289 - "ExportOrdiniService"
Cohesion: 0.09
Nodes (9): main(), scriviXlsxAtomico(), ExportOrdiniController, COLONNE, EsitoOrdine, ExportOrdiniService, ReportExport, SyncConfigRow (+1 more)

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1199 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **180 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `app.module.ts`, `backend/package.json`, `users.service.ts`, `integrazione.service.ts`, `dashboard.service.ts`, `azioni.service.ts`, `mail.service.ts`, `AuditService`, `admin.service.ts`, `mail.service.ts`, `ExportOrdiniService`, `prisma.service.ts`, `OrdiniController`, `dependencies`, `LeadsController`, `integrazione.service.ts`, `fatturazione.service.ts`, `export-cliente.service.ts`, `admin-leads.service.ts`, `leads.service.ts`, `CustomersService`, `auth.controller.ts`, `PrismaService`, `spese-spedizione.service.ts`, `conservazione.service.ts`, `customer-profile.service.ts`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `CataloghiService` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `stato()` connect `mail.service.ts` to `admin/page.tsx`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Should `app.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07922705314009662 - nodes in this community are weakly interconnected._
- **Why does `TariffaEditor()` connect `SpeseSpedizioneSection.tsx` to `AdminPanel.tsx`, `SpeseSpedizioneSection`, `ref_react`, `Tooltip`, `mail.service.ts`, `ComboboxField`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `ref_react` be split into smaller, more focused modules?**
  _Cohesion score 0.07418788410886742 - nodes in this community are weakly interconnected._