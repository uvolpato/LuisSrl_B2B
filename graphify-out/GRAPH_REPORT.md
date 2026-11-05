# Graph Report - Luis Srl - B2B  (2026-11-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3235 nodes · 7422 edges · 206 communities (113 shown, 93 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 382 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7fdaed08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 154
- Community 156
- Community 157

## God Nodes (most connected - your core abstractions)
1. `IntegrazioneService` - 112 edges
2. `RequirePermission()` - 105 edges
3. `@nestjs/common` - 101 edges
4. `PrismaService` - 89 edges
5. `AuthenticatedRequest` - 77 edges
6. `Modal()` - 62 edges
7. `Notice()` - 56 edges
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

## Communities (206 total, 93 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (19): AuditController, AuditService, AccessLogInterceptor, ACTION_MAP, getLabel(), Candidato, DEFAULT_PESI, PesiSegnali (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (33): AdminPage(), SECTION_TITLES, ItemP, ProgettoPubblicoPage(), Pubblico, AdminTopBar(), IconGrid, IconList (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (23): AdminModule, AppModule, AuditModule, AuthModule, CarrelloModule, CheckoutModule, CouponModule, CustomerProfileData (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (47): Column, DataTableProps, RowAction, IconChevronLeft, IconChevronRight, IconEdit, IconEyeOff, IconInfo (+39 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (45): CustomerDossier(), euroK(), fmtData(), MESI, SALUTE, Tile(), Trend(), Hint() (+37 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (36): Page(), CatalogoPage(), one(), Search, Page(), Home(), Page(), Variante (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (16): AuthService, AuthUser, toUserProfile(), UserProfile, buildStatoFilter(), UserFilter, DUMMY_HASH, generateProvisionalPassword() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (52): author, description, devDependencies, eslint-config-prettier@^10.0.1, @eslint/eslintrc@^3.2.0, jest@^30.0.0, @nestjs/cli@^11.0.0, @nestjs/schematics@^11.0.0 (+44 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (3): BrevoService, CataloghiAdminController, CataloghiAdminService

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (4): qrcode@1.5.4, CouponController, CouponService, qrcode

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (35): CustomerOfferte(), MOTIVO, Offerta, Comportamento, CustomerTimeline(), DOT, Evento, fmt() (+27 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (36): CartItem, DatiCheckout, Indirizzo, ModalitaConsegna, NAZIONI_OPTS, OrdineConfermato, PROVINCE_OPTS, ShippingResult (+28 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (9): PERMISSION_KEY, AuthenticatedGuard, PermissionsGuard, Roles(), ROLES_KEY, RolesGuard, EventsController, @nestjs/common (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (31): ComboboxField(), onKeyDown(), select(), GuidaModal(), SpeseSpedizioneSection(), onDeleteTariffa(), refresh(), toggleStato() (+23 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (3): ProgettiController, ProgettiPublicController, ProgettiService

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (22): prisma, { PrismaClient }, exceljs@4.4.0, cartellaOrdiniIntegra(), scriviXlsxAtomico(), anagraficaDaCliente(), anagraficaDaLead(), AnagraficaIntegra (+14 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (26): AdminLayout(), AdminSidebar(), logout(), ICONS, NAV_ITEMS, ConfigField(), ConfigToggle(), ImpostazioniSection() (+18 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (4): AuthController, ChangePasswordDto, LoginDto, UpdateProfileDto

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (29): AdminPanel(), AdminPanelTab, AI_GROUPS, AiConfigEntry, AiConfigSection(), ALL_PERMISSIONS, ConfigField(), formatDate() (+21 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (12): AiUsageController, AiUsageModule, AiUsageService, DEFAULT_PRICES, FALLBACK, AUDITED, auditExtension, WRITES (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (7): EsitoAzione, CreateLeadDto, LeadsController, valido, COLORE, ETICHETTA, paginaAzione()

### Community 25 - "Community 25"
Cohesion: 0.06
Nodes (35): build, depends_on, environment, ports, condition, environment, healthcheck, image (+27 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (20): estraiJson(), calcolaVerdetto(), checklistVerifica(), parseIndirizzoVies(), pivaItalianaValida(), Sede, Segnale, DatiIndagine (+12 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (20): CataloghiModule, ASSETS_BASE_DIR, ASSETS_PUBLIC_URL, CATALOGHI_DIR, Dossier, DossierFamiglia, DossierKpi, MotivoOfferta (+12 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (17): LoginPage(), ChangePasswordModal(), onSubmit(), validatePassword(), MustChangePasswordModal(), onSubmit(), validatePassword(), FocusTrap() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (10): CreateGroupDto, CreateRaccoltaDto, UpdateFamigliaDto, UpdateGroupDto, UpdateRaccoltaDto, UpdateSuggestionBoxDto, STATI_ORDINE_CONSENTITI, class-transformer (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (15): nodemailer@9.1.1, esc(), ReportIndagine, BADGE, DatiClienteMail, DatiConfermaOrdine, DatiLeadMail, DatiOrdineMail (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (14): public.b2b_clienti, public.b2b_giacenze, public.b2b_indirizzi_clienti, public.b2b_listini_righe, public.b2b_listini_testata, public.b2b_ordini_clienti, public.b2b_pagamenti_clienti, public.b2b_prodotti (+6 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (13): DatiCheckout, ModalitaConsegna, FatturazioneDto, confermaRichiesta(), erroreCanaleSdi(), FatturazioneService, ok, provinciaToRegione() (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (3): AdminOrdiniController, AdminOrdiniService, AggiornaStatoOrdineDto

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (23): Articolo, CorrelatoCard, DimEntry, getStock(), Immagine, PrezzoInfo, Raccolta, RelatedSection() (+15 more)

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (26): aggancia(), aggiornaConta(), aggiungi(), apriDrawer(), badgeHTML(), cardHTML(), chiudiDrawer(), conta() (+18 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (21): calcTotale(), fmtDate(), fmtPrezzo(), OrdiniPage(), SortField, staticRangesIT, DataTable(), IconEye (+13 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (19): CataloghiSection(), apriDettaglio(), inviaABrevo(), revoca(), Catalogo, Cliente, Destinatario, DettaglioScreen() (+11 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (18): Catalogo, CatalogoArticolo, CatalogoPage(), colorDistance(), hexToLab(), normKey(), SORT_OPTIONS, AreaClientePage() (+10 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (5): AdminOrdiniModule, OrdiniController, OrdiniModule, OrdiniService, PrismaModule

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (3): CataloghiPublicController, CataloghiService, confrontaSegreto()

### Community 47 - "Community 47"
Cohesion: 0.08
Nodes (23): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+15 more)

### Community 48 - "Community 48"
Cohesion: 0.15
Nodes (14): CarrelloPage(), notifyCart(), remove(), toggleSave(), CartItem, PrezzoInfo, Dettaglio, ItemP (+6 more)

### Community 49 - "Community 49"
Cohesion: 0.10
Nodes (11): CouponEditorModal(), CouponReviewModal(), fmtDate(), Campaign, CouponSection(), Dashboard, fmtDate(), STATUS_CLS (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (17): "admin_permissions", admin_permissions_user_id_permission_key, "permission_groups", permission_groups_slug_key, fn_admin_permission_remove(), fn_admin_permission_upsert(), fn_permission_group_create(), fn_permission_group_delete() (+9 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (14): AzioneDto, ReinviaDto, Azione, AZIONI, EsitoToken, firma(), segretoAzioni(), AzioniLeadService (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (8): LeadsService, pulisci(), giorniDa(), giorniPromemoria(), servePromemoria(), STATI_IN_ATTESA, crea(), lead

### Community 53 - "Community 53"
Cohesion: 0.16
Nodes (12): Famiglia, FamigliePage(), ProfilePage(), ProgettiPage(), Progetto, ClientEvent, LoadingScreen(), SUPPORTED_LOCALES (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (21): AdminOrdiniSection(), DashboardData, fmtDate(), fmtEur(), OrderSummary, PageData, STATI, staticRangesIT (+13 more)

### Community 55 - "Community 55"
Cohesion: 0.09
Nodes (22): dependencies, class-transformer@^0.5.1, class-validator@^0.15.1, cron-parser@^5.6.1, @nestjs/common@^11.0.1, @nestjs/config@^4.0.4, @nestjs/core@^11.0.1, @nestjs/mapped-types@^2.1.1 (+14 more)

### Community 58 - "Community 58"
Cohesion: 0.16
Nodes (9): COPPIE_ERRORE, erroriAttivi(), FILTRI_STATO, GIORNI_ALLARME, giorniAttesa(), ORDINAMENTI, AdminLeadsService, STATI_IN_ATTESA (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.14
Nodes (14): "audit_log", audit_log_actor_id_created_at_idx, audit_log_azione_created_at_idx, "session", session_expire_idx, "users", users_email_key, users_partita_iva_key (+6 more)

### Community 62 - "Community 62"
Cohesion: 0.12
Nodes (10): AnalisiFotoModal(), Props, DescrizioneAiWizard(), handleAnalisiAccepted(), handleGenerate(), Props, StepDef, STEPS (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (3): main(), ExportOrdiniController, ExportOrdiniService

### Community 65 - "Community 65"
Cohesion: 0.13
Nodes (19): dependencies, date-fns@4.4.0, next@16.2.9, next-intl@^4.13.0, react@19.2.4, react-date-range@2.0.1, react-markdown@^10.1.0, socket.io-client@^4.8.3 (+11 more)

### Community 66 - "Community 66"
Cohesion: 0.18
Nodes (11): RootLayout(), b(), Footer(), Header(), switchLang(), LINGUE, setLangCookie(), PopupApertureLink() (+3 more)

### Community 67 - "Community 67"
Cohesion: 0.11
Nodes (13): pg@^8.21.0, base, { Client }, url, { Client }, { Client }, cols, fs (+5 more)

### Community 68 - "Community 68"
Cohesion: 0.12
Nodes (3): CatalogoPublicController, formatDimensioni(), FamiglieController

### Community 69 - "Community 69"
Cohesion: 0.13
Nodes (18): eslint-config-next@16.2.9, @types/react-dom@^19, eslint-config-next, @types/react-dom, devDependencies, eslint-config-next@16.2.9, postcss@^8.5.29, tailwindcss@^4.3.3 (+10 more)

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 71 - "Community 71"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 72 - "Community 72"
Cohesion: 0.12
Nodes (10): admin.fn_user_assign_group(), users.fn_user_set_blocked(), users.fn_user_create(), admin.fn_user_assign_group(), customers.fn_customer_create(), users.fn_user_set_blocked(), users.fn_user_set_password(), users.fn_user_update() (+2 more)

### Community 73 - "Community 73"
Cohesion: 0.14
Nodes (10): ProductBreadcrumb(), SchedaArticoloPage(), activeEntries(), addAllToCart(), addSingleToCart(), galleryModalNav(), getAvailableValues(), handleKey() (+2 more)

### Community 74 - "Community 74"
Cohesion: 0.22
Nodes (9): LandingPage(), AiSearchSection(), CtaSection(), FeaturesSection(), HeroSection(), LandingNav(), LineeSection(), PublicFooter() (+1 more)

### Community 75 - "Community 75"
Cohesion: 0.18
Nodes (3): CreateCustomerDto, InvitaBulkDto, UpdateCustomerDto

### Community 76 - "Community 76"
Cohesion: 0.14
Nodes (15): connect-pg-simple@^10.0.0, cookie@^1.1.1, cookie-parser@^1.4.7, helmet@^8.2.0, socket.io@^4.8.3, FRONTEND_ORIGINS, bootstrap(), online (+7 more)

### Community 77 - "Community 77"
Cohesion: 0.12
Nodes (17): scripts, build, db:migrate, db:seed, db:setup, embeddings:backfill, format, lint (+9 more)

### Community 79 - "Community 79"
Cohesion: 0.24
Nodes (3): CustomerProfile, toCustomerProfile(), CustomersService

### Community 83 - "Community 83"
Cohesion: 0.17
Nodes (11): buildCss(), EditImageModal(), handleChange(), handleNudge(), handlePositionClick(), EditImageModalProps, FIT_OPTIONS, INFO (+3 more)

### Community 84 - "Community 84"
Cohesion: 0.17
Nodes (10): customers, customers.fn_customer_update(), contatti_clienti, indirizzi_clienti, ordini_clienti, righe_ordini, customer_profiles, idx_customer_profiles_customer_id (+2 more)

### Community 86 - "Community 86"
Cohesion: 0.14
Nodes (14): eslint@^9.18.0, @types/node@^24.0.0, eslint, @types/node, devDependencies, eslint@^9, @types/node@^20, @types/react@^19 (+6 more)

### Community 87 - "Community 87"
Cohesion: 0.23
Nodes (11): articolo_embedding, "articoli", articoli_codice_linea_key, "articoli_raccolte", articoli_raccolte_articolo_id_raccolta_id_key, "famiglie", "immagini", "raccolte" (+3 more)

### Community 89 - "Community 89"
Cohesion: 0.26
Nodes (9): AreaLayout(), AreaFooter(), AreaHeader(), INITIALS_CSS(), Tracker(), HeaderCenterContext, HeaderCenterContextType, HeaderCenterProvider() (+1 more)

### Community 90 - "Community 90"
Cohesion: 0.14
Nodes (7): __dirname, httpsProxy, nextDev, __dirname, options, PROXY_PORT, server

### Community 91 - "Community 91"
Cohesion: 0.22
Nodes (9): buildComboboxOptions(), createCombobox(), filterOptions(), highlight(), open(), renderOptions(), selectOption(), getComboboxOptions() (+1 more)

### Community 92 - "Community 92"
Cohesion: 0.19
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 93 - "Community 93"
Cohesion: 0.28
Nodes (6): datiAnonimi(), limite(), MESI_DEFAULT, mesiConservazione(), ConservazioneLeadService, STATI_DA_ANONIMIZZARE

### Community 94 - "Community 94"
Cohesion: 0.18
Nodes (6): CheckoutPage(), closeNuovoForm(), conferma(), saveIndirizzo(), fmtEur(), FatturazioneCheckout()

### Community 95 - "Community 95"
Cohesion: 0.18
Nodes (6): BoxEditModal(), BoxSuggerimentiSection(), loadRefs(), openCreate(), openEdit(), ribilancia()

### Community 96 - "Community 96"
Cohesion: 0.17
Nodes (10): argon2@^0.44.0, adapter, argon2, AVATAR_COLORS, PERMISSION_KEYS, prisma, { PrismaClient }, { PrismaPg } (+2 more)

### Community 97 - "Community 97"
Cohesion: 0.32
Nodes (11): idx_articoli_cod, idx_articoli_descr, idx_articoli_errors, idx_articoli_extra, idx_articoli_famiglia, idx_articoli_linea, idx_sync_log_entity, integra_articoli (+3 more)

### Community 98 - "Community 98"
Cohesion: 0.21
Nodes (10): api(), argon2, assert, p, { PrismaClient }, { PrismaPg }, readCart(), SEED (+2 more)

### Community 99 - "Community 99"
Cohesion: 0.18
Nodes (10): Calcola(), euCount(), NAZIONI, NAZIONI_ORDER, PctOf(), REGIONI_IT, Resolved, Row (+2 more)

### Community 100 - "Community 100"
Cohesion: 0.33
Nodes (7): CookiePage(), Tabella(), En(), It(), PrivacyPage(), Da(), Documento()

### Community 101 - "Community 101"
Cohesion: 0.18
Nodes (9): dotenv@^17.4.2, ASSETS_BASE_DIR, dotenv, EXCLUDED, fs, path, prisma, { PrismaClient } (+1 more)

### Community 102 - "Community 102"
Cohesion: 0.24
Nodes (3): RootLayout(), ConfirmProvider(), SessionTerminatedOverlay()

### Community 103 - "Community 103"
Cohesion: 0.25
Nodes (9): ImportaClientiModal(), doImport(), startTimeout(), ClientiSection(), onBlockToggle(), onInvita(), onResetPassword(), onRigeneraBox() (+1 more)

### Community 106 - "Community 106"
Cohesion: 0.20
Nodes (8): IconEdit, IconEye, IconEyeOff, IconLock, IconLockOpen, IconPlus, IconReset, IconTrash

### Community 107 - "Community 107"
Cohesion: 0.31
Nodes (8): OnlineEvent, usePresence(), connect(), Listener, listeners, useWebSocket(), useWsEvent(), WsMessage

### Community 108 - "Community 108"
Cohesion: 0.22
Nodes (8): @eslint/js@^9.18.0, eslint-plugin-prettier@^5.2.2, globals@^17.0.0, typescript-eslint@^8.20.0, @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 109 - "Community 109"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 110 - "Community 110"
Cohesion: 0.44
Nodes (8): "cataloghi", "download_events", download_events_link_id_at_idx, "download_links", download_links_mailing_id_created_at_idx, download_links_token_key, "mailing", "mailing_catalogo"

### Community 111 - "Community 111"
Cohesion: 0.25
Nodes (8): adapter, argon2, generaPassword(), main(), prisma, { PrismaClient }, { PrismaPg }, { randomBytes }

### Community 114 - "Community 114"
Cohesion: 0.25
Nodes (5): BuildingIcon(), ProfileSection(), closeForm(), saveAddr(), ShieldIcon()

### Community 115 - "Community 115"
Cohesion: 0.22
Nodes (9): react-dom@19.2.4, react-dom, dependencies, next@16.2.9, next-intl@4.13.0, react@19.2.4, react-dom@19.2.4, next (+1 more)

### Community 116 - "Community 116"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, watchAssets, $schema, sourceRoot

### Community 117 - "Community 117"
Cohesion: 0.25
Nodes (6): @prisma/adapter-pg@7.8.0, adapter, prisma, { PrismaClient }, { PrismaPg }, @prisma/adapter-pg

### Community 121 - "Community 121"
Cohesion: 0.21
Nodes (8): engines, node, npm, scripts, build, dev, lint, start

### Community 122 - "Community 122"
Cohesion: 0.43
Nodes (6): "dashboard_boxes", dashboard_boxes_customer_box_key, dashboard_boxes_customer_idx, "promozioni", promozioni_attiva_data_fine_idx, "suggestion_boxes"

### Community 123 - "Community 123"
Cohesion: 0.29
Nodes (6): indirizzi_clienti_customer_id_codice_destinazione_key, "integra_pagamenti_descr", "integra_porti", "integra_spedizioni", "integra_vettori", "sync_config"

### Community 127 - "Community 127"
Cohesion: 0.29
Nodes (7): scripts, build, dev, dev:full, dev:https, lint, start

### Community 128 - "Community 128"
Cohesion: 0.53
Nodes (5): idx_listini_righe_listino, idx_listini_righe_prodotto, integra_listini, integra_listini_righe, sync_state

### Community 129 - "Community 129"
Cohesion: 0.60
Nodes (5): "progetti", progetti_cliente_id_idx, progetti_share_token_key, "progetto_items", progetto_items_progetto_id_variante_codice_key

### Community 130 - "Community 130"
Cohesion: 0.60
Nodes (5): event_log, idx_actor_time, idx_entity, idx_event_type_time, idx_request_id

### Community 131 - "Community 131"
Cohesion: 0.60
Nodes (5): "lead_events", lead_events_lead_id_created_at_idx, "leads", leads_created_at_idx, leads_stato_created_at_idx

### Community 134 - "Community 134"
Cohesion: 0.40
Nodes (4): express-session@^1.19.0, express-session, SessionData, express-session

### Community 135 - "Community 135"
Cohesion: 0.70
Nodes (4): carrelli, carrello_items, idx_carrello_items_carrello_id, idx_carrello_items_salvato

### Community 137 - "Community 137"
Cohesion: 0.40
Nodes (3): LandingCatalogo, LandingData, styles

### Community 139 - "Community 139"
Cohesion: 0.50
Nodes (4): typescript@^5.7.3, typescript, typescript@^5, typescript@^5

### Community 140 - "Community 140"
Cohesion: 0.67
Nodes (3): site_config, site_config_key_key, "sync_config"

### Community 142 - "Community 142"
Cohesion: 0.83
Nodes (3): "ai_usage", ai_usage_attore_idx, ai_usage_created_at_idx

### Community 143 - "Community 143"
Cohesion: 0.83
Nodes (3): "customer_event", customer_event_customer_created_idx, customer_event_tipo_created_idx

### Community 144 - "Community 144"
Cohesion: 0.83
Nodes (3): "customer_insight", customer_insight_customer_idx, customer_insight_customer_periodo_key

### Community 146 - "Community 146"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

### Community 147 - "Community 147"
Cohesion: 0.83
Nodes (3): fetchWithRetry(), isRetryableNetworkError(), POST()

### Community 148 - "Community 148"
Cohesion: 0.83
Nodes (4): AddToProjectModal(), addItems(), addTo(), createAndAdd()

### Community 150 - "Community 150"
Cohesion: 0.67
Nodes (3): engines, node, npm

## Knowledge Gaps
- **1 isolated node(s):** `./tsconfig.json`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1087 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **93 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `Community 14` to `Community 0`, `Community 2`, `Community 7`, `Community 8`, `Community 18`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 32`, `Community 44`, `Community 51`, `Community 52`, `Community 55`, `Community 58`, `Community 75`, `Community 76`, `Community 85`, `Community 93`, `Community 99`?**
  _High betweenness centrality (0.251) - this node is a cross-community bridge._
- **What connects `./tsconfig.json` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04616588419405321 - nodes in this community are weakly interconnected._
- **Why does `stato()` connect `Community 26` to `Community 1`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.053613053613053616 - nodes in this community are weakly interconnected._
- **Why does `IntegrazioneService` connect `Community 5` to `Community 0`, `Community 2`, `Community 10`, `Community 14`, `Community 16`, `Community 23`, `Community 26`, `Community 27`, `Community 32`, `Community 35`, `Community 57`, `Community 60`, `Community 68`, `Community 80`, `Community 81`, `Community 82`, `Community 85`, `Community 119`, `Community 124`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.055299539170506916 - nodes in this community are weakly interconnected._