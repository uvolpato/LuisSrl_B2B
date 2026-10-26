# Specifica — Admin "Cataloghi" (invio cataloghi via Brevo)

**Obiettivo:** sezione admin che permette di caricare cataloghi PDF, creare campagne mail con
destinatari presi da un file Excel **oppure** da un sottoinsieme dei clienti in anagrafica, e
tracciare chi apre e scarica ciascun catalogo. L'invio effettivo della mail avviene su Brevo; il
portale genera il **link personale** per ogni destinatario e registra gli eventi.

Contesto: `specifica-scambio-dati-integra.md` (catalogo), `brand-spec.md` (design system).

---

## 1. Concetto

L'admin commerciale carica i PDF dei cataloghi, sceglie i destinatari, crea la campagna. Ogni
destinatario riceve un **link unico** (`/c/<token>`); il token identifica chi scarica senza richiedere
login. Il portale registra:

- `VIEW` — il destinatario ha aperto la landing del catalogo;
- `DOWNLOAD` — ha scaricato un catalogo specifico;
- `DELIVERED` / `OPENED` / `CLICKED` — eventi dal webhook Brevo (coinvolgimento mail).

### 1.1 Flusso

```
Admin apre "Cataloghi" → elenco campagne
  ├→ "+ Nuova campagna" → wizard in 3 passi:
  │     1. Catalogo   → carica/PDF + seleziona cataloghi
  │     2. Destinatari → "Da file" (xlsx) OPPURE "Dai clienti" (ricerca + multi-selezione)
  │     3. Riepilogo  → nome campagna + conferma
  │     → crea mailing + importa destinatari (genera token per ciascuno)
  │
  └→ Dettaglio campagna → tabella destinatari (aperto/scaricato) + azioni:
        Copia link · Revoca · Esporta CSV · Invia a Brevo · Aggiungi da file
```

---

## 2. Modello dati

Migration additiva `20261025000000_cataloghi_brevo`:

```prisma
model Catalogo {
  id        Int      @id @default(autoincrement())
  nome      String
  pdfFile   String              // path relativo in backend/storage/cataloghi
  copertina String?
  createdAt DateTime @default(now())
  mailingCatalogo MailingCatalogo[]
  eventi    DownloadEvent[]
  @@map("cataloghi")
}

model Mailing {
  id        Int      @id @default(autoincrement())
  nome      String
  stato     String   @default("bozza")   // bozza | inviata
  createdAt DateTime @default(now())
  mailingCatalogo MailingCatalogo[]
  links     DownloadLink[]
  @@map("mailing")
}

model MailingCatalogo {
  mailingId  Int      @map("mailing_id")
  catalogoId Int      @map("catalogo_id")
  ordinamento Int     @default(0)
  mailing    Mailing  @relation(fields: [mailingId], references: [id], onDelete: Cascade)
  catalogo   Catalogo @relation(fields: [catalogoId], references: [id], onDelete: Cascade)
  @@id([mailingId, catalogoId])
  @@map("mailing_catalogo")
}

model DownloadLink {
  id        Int      @id @default(autoincrement())
  mailingId Int      @map("mailing_id")
  email     String
  nome      String?
  token     String   @unique        // 32 byte base64url (crypto.randomBytes)
  createdAt DateTime @default(now())
  expiresAt DateTime?
  revokedAt DateTime?
  mailing   Mailing  @relation(fields: [mailingId], references: [id], onDelete: Cascade)
  eventi    DownloadEvent[]
  @@index([mailingId, createdAt])
  @@map("download_links")
}

model DownloadEvent {
  id         Int      @id @default(autoincrement())
  linkId     Int      @map("link_id")
  catalogoId Int?     @map("catalogo_id")   // null per VIEW / eventi Brevo
  tipo       String                          // VIEW | DOWNLOAD | OPENED | CLICKED | DELIVERED
  at         DateTime @default(now())
  ipHash     String?  @map("ip_hash")        // SHA-256 (GDPR)
  userAgent  String?
  link       DownloadLink @relation(fields: [linkId], references: [id], onDelete: Cascade)
  catalogo   Catalogo?    @relation(fields: [catalogoId], references: [id], onDelete: SetNull)
  @@index([linkId, at])
  @@map("download_events")
}
```

I PDF sono in `backend/storage/cataloghi` (fuori da `public/`, gitignored, serviti solo a token valido).

---

## 3. API

### 3.1 Pubbliche (niente sessione, il token è l'autorizzazione)

| Metodo | Percorso | Descrizione |
|--------|----------|-------------|
| GET | `/api/cataloghi/:token` | Landing: nome mailing + elenco cataloghi (id, nome, copertina). Registra `VIEW`. |
| GET | `/api/cataloghi/:token/:catalogoId/pdf` | Stream del PDF (attachment, `no-store`). Registra `DOWNLOAD`. |
| POST | `/api/cataloghi/webhook/:secret` | Webhook Brevo: registra `DELIVERED/OPENED/CLICKED` per email. |

Errori: `404` token inesistente, `410` revocato o scaduto, `403` webhook con segreto errato.

### 3.2 Admin (permesso `marketing.cataloghi.*`)

| Metodo | Percorso | Descrizione |
|--------|----------|-------------|
| POST | `/api/admin/cataloghi` | Carica PDF (multipart `file` + `nome`) → crea Catalogo. |
| GET | `/api/admin/cataloghi` | Elenco cataloghi. |
| POST | `/api/admin/cataloghi/mailing` | Crea mailing (`nome`, `cataloghi[]`). |
| GET | `/api/admin/cataloghi/mailing` | Elenco campagne con statistiche (inviati/aperti/scaricati). |
| GET | `/api/admin/cataloghi/mailing/:id` | Dettaglio: cataloghi + destinatari (link, aperto, scaricati, revocato). |
| POST | `/api/admin/cataloghi/mailing/:id/import` | Importa destinatari da **file xlsx** (multipart `file`). Ritorna `creati` + CSV Brevo. |
| POST | `/api/admin/cataloghi/mailing/:id/import-clienti` | Importa destinatari da **sottoinsieme clienti** (`customerIds[]`). |
| GET | `/api/admin/cataloghi/mailing/:id/export` | CSV di analisi (nome, email, aperto, scaricato). |
| POST | `/api/admin/cataloghi/mailing/:id/brevo` | Spinge i contatti a Brevo (attributo `CATALOGO_LINK`). |
| POST | `/api/admin/cataloghi/link/:id/revoca` | Revoca un link (definitivo). |

### 3.3 Import da file vs da clienti

- **File xlsx**: colonne `email` (obbligatoria) e `nome` (opzionale). L'email è riconosciuta dalla
  cella che contiene `@`; la riga d'intestazione è saltata automaticamente.
- **Clienti**: `import-clienti` prende i clienti `ATTIVO` dai `customerIds`, usa `ragioneSociale ?? nome`
  come nome e l'`email` dell'anagrafica.

---

## 4. Brevo

Config in `.env`:

```ini
BREVO_API_KEY=            # chiave v3 da https://app.brevo.com/settings/keys/api
BREVO_LIST_ID=            # (opzionale) lista a cui aggiungere i contatti
CATALOGHI_WEBHOOK_SECRET= # segreto per /api/cataloghi/webhook/<secret>
```

- **Import contatti**: `POST /v3/contacts/import` con CSV base64 `EMAIL;NOME;CATALOGO_LINK`
  (`updateExistingContacts=true`). Brevo crea automaticamente l'attributo `CATALOGO_LINK`.
- **Campagna mail**: si crea **manualmente** su Brevo; sul bottone si usa il segnaposto
  `{{ contact.CATALOGO_LINK }}` (ed eventualmente `{{ contact.NOME }}`).
- **Webhook**: registrare su Brevo gli eventi `delivered`, `opened`, `click` verso
  `https://<dominio>/api/cataloghi/webhook/<CATALOGHI_WEBHOOK_SECRET>`.

Nota: l'evento Brevo arriva con la sola `email` (senza il `mailingId`), quindi viene registrato su
tutti i link con quella email. Raffinare se serve precisione per campagna.

---

## 5. Frontend (Admin → "Cataloghi")

- **Elenco campagne**: tabella `Campagna | Cataloghi | Inviati | Aperti | Scaricati | Stato | Dettaglio`
  + bottone "+ Nuova campagna".
- **Wizard** con stepper (1 Catalogo, 2 Destinatari, 3 Riepilogo):
  1. **Catalogo** — upload PDF + nome, elenco cataloghi con checkbox.
  2. **Destinatari** — toggle "Da file | Dai clienti": dropzone xlsx oppure ricerca clienti con
     checkbox e "Tutti (n)".
  3. **Riepilogo** — nome campagna + riepilogo → "Crea campagna" (crea mailing + importa).
- **Dettaglio** — tabella destinatari con `Copia link`, `Revoca`, `Esporta CSV`, `Invia a Brevo`,
  `Aggiungi da file`.

Permessi: `marketing.cataloghi.view` (lettura) e `marketing.cataloghi.edit` (mutazioni). Aggiunti a
`prisma/seed.js`.

---

## 6. Note di sicurezza / privacy

- Token opaco (32 byte) mai derivato dall'email; scadenza e revoca; `Cache-Control: no-store` sul PDF.
- IP hashato (SHA-256) negli eventi; niente IP in chiaro.
- Segreto webhook confrontato a tempo costante (hash SHA-256 per evitare il problema di
  `timingSafeEqual` con buffer di lunghezza diversa).
- Anti path-traversal sul `pdfFile` (il path deve restare dentro `CATALOGHI_DIR`).

---

*Stato: implementato (backend + frontend), da validare con `BREVO_API_KEY` reale e un invio di prova.*
