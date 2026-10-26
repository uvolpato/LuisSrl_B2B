# Prompt per OpenCode — Admin Cataloghi

Sei nel repo `C:\Progetti\Luis Srl - B2B` (portale B2B Luis, Next.js + NestJS + Prisma/PostgreSQL).

## Compito

Reimplementa la sezione admin **Cataloghi** sostituendo `frontend/components/admin/sections/CataloghiSection.tsx`
con una UI fedele al prototipo `admin-cataloghi.html`, sui componenti e sui token reali dell'admin.
La fonte di verità è **`specifica-admin-cataloghi.md`**: leggila per intero prima di scrivere codice.

## Letture obbligatorie (in quest'ordine)

1. `specifica-admin-cataloghi.md` — specifica completa (schermate, copy, API, migrazione, scostamenti, QA).
2. `admin-cataloghi.html` — riferimento visivo 1:1 (aprilo nel browser; non copiare il CSS del prototipo).
3. `frontend/components/admin/sections/RichiesteAccessoSection.tsx` + `frontend/app/admin/richieste-accesso.css`
   — pattern di sezione già migrata (AdminTopBar, Notice, useConfirm, CSS scopato, responsive).
4. `frontend/app/admin/admin.css`, `brand-spec.md` — token e classi (`.data-table`, `.status-pill`, `.btn`, `.input`).
5. `frontend/components/admin/AdminTopBar.tsx`, `DataTable.tsx`, `frontend/components/common/ConfirmProvider.tsx`,
   `Notice.tsx`, `frontend/lib/api.ts`.
6. `backend/src/cataloghi/cataloghi-admin.{controller,service}.ts`, `backend/prisma/schema.prisma`
   (modelli `Catalogo`, `Mailing`, `DownloadLink`, `DownloadEvent`), migration `20261025000000_cataloghi_brevo`.
7. `frontend/AGENTS.md` e `AGENTS.md` (barra di qualità; Next.js di questo repo ha API diverse dalle versioni note:
   consulta `node_modules/next/dist/docs/` prima di usare API che non conosci).

## Risultato atteso

### Frontend

- `CataloghiSection.tsx` riscritto: viste `elenco` / `nuova` / `dettaglio`, stato locale, nessun drawer.
- **Zero stili inline**, nessun `<div className="admin-page">` interno (lo fornisce `AdminLayout`).
- Elenco campagne con skeleton, vuoto, errore, pager client 10/pagina; azioni e copy del §5.1.
- Wizard 3 passi (Cataloghi, Destinatari, Conferma): upload PDF, archivio/ripristino cataloghi, anteprima
  `.xlsx` con selezione, sorgente Clienti B2B attiva, riepilogo, creazione con import dei soli selezionati.
- Dettaglio: pill stato, meta, stat strip con percentuali, tabella destinatari, copia link, revoca link,
  revoca campagna, export CSV Brevo, invio a Brevo, aggiungi da file; sola lettura se `revocata`.
- Conferme distruttive con `useConfirm({ tone: "danger" })` e nota "L'operazione è irreversibile.".
  Esiti/errori con `Notice` (niente toast flottante).
- Nuovo `frontend/app/admin/cataloghi.css` (regole sotto `.cat`) importato da `frontend/app/admin/page.tsx`.
- `AdminTopBar`: prop opzionale `subtitle` + `.admin-top-heading`/`.top-sub` in `admin.css` (§3.1).
- Etichette corrette: **Destinatari**, **Aperture**, **Download** (non "Inviate"/"Click"). Nessun selettore canale.

### Backend (tutto autorizzato con i permessi esistenti)

- Migration additiva: `Catalogo.archiviatoAt` (`archiviato_at`).
- `GET /api/admin/cataloghi` → aggiunge `archiviatoIl`; `POST /:id/archivia`, `POST /:id/ripristina`.
- `GET /api/admin/cataloghi/mailing` → aggiunge `cataloghiNomi`.
- `POST /api/admin/cataloghi/mailing/:id/revoca` → revoca atomica di tutti i link + `stato = 'revocata'`.
- `GET /api/admin/cataloghi/mailing/:id/export-brevo` → CSV `EMAIL;NOME;CATALOGO_LINK` (solo link attivi).
- `POST /api/admin/cataloghi/contatti/anteprima` (multipart, `.xlsx` ≤ 5 MB) e
  `POST /api/admin/cataloghi/mailing/:id/destinatari` (DTO validato, max 2000, dedupe email).
- `creaMailing` rifiuta cataloghi archiviati; `inviaABrevo` rifiuta campagne revocate; revoche idempotenti.
- Riusa `leggiContatti()`, `csvBrevo()`, `randomBytes(32).toString('base64url')`. Nessuna dipendenza nuova.

## Vincoli

- Italiano in tutta la UI; prezzi/IVA non pertinenti.
- Non modificare le rotte pubbliche `/c/:token` né i token già emessi.
- Non cambiare `AdminSidebar` (la voce esiste già) né aggiungere badge.
- Migrazione solo additiva; nessuna operazione distruttiva sul DB.
- Non introdurre `style={{…}}`, librerie di icone, date o xlsx lato client.
- Segui gli scostamenti dichiarati nel §9 della specifica: **non** reintrodurre canale email, click,
  "Copia link" campagna, "Prossimamente" per i clienti B2B, CSV contatti.
- Non committare né pushare: nessuna richiesta in tal senso.

## Ordine di lavoro

1. Backend: schema + migration, service, controller, DTO; type-check.
2. Frontend: CSS + AdminTopBar subtitle; poi elenco, wizard, dettaglio.
3. Stati, responsive, accessibilità.
4. Verifica completa.

## Verifica (obbligatoria prima di dichiarare finito)

```bash
cd frontend && npx tsc --noEmit && npx eslint components/ app/
cd backend  && npx tsc --noEmit -p tsconfig.json
cd backend  && npm run db:migrate
```

Poi, con backend (3001) e frontend (3000) in dev e sessione admin reale:

1. Elenco con 0, 1 e più campagne; skeleton e stato errore (backend spento) visibili.
2. Crea campagna da `.xlsx` con 3 contatti, selezionandone 2 → il dettaglio mostra 2 destinatari.
3. Crea campagna da Clienti B2B → link per i soli clienti scelti.
4. Apri un link in incognito, scarica un catalogo, verifica Aperture/Download e percentuali.
5. Copia link, revoca link, revoca campagna → link pubblico 410 e UI in sola lettura.
6. Esporta CSV Brevo (header e sole righe attive), invia a Brevo (o errore chiaro se non configurato).
7. Archivia e ripristina un catalogo; verifica che non sia selezionabile e che le campagne esistenti restino intatte.
8. Viewport 1440, 1024, 768, 375 px: nessuno scroll orizzontale, tabelle a card, azioni raggiungibili.
9. Console senza errori (favicon esclusa).

Consegna: elenco file toccati, comandi eseguiti con esito, risultati della verifica manuale. Se qualcosa
della specifica non è implementabile come scritto, **fermati e chiedi** invece di inventare.
