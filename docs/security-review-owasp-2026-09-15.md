# Security review OWASP — Portale B2B Luis

**Data:** 2026-09-15 · **Target:** https://shop.luisbg.it (live) + codebase `backend/` (NestJS) e `frontend/` (Next.js)
**Metodo:** skill `owasp-security` (agamm/claude-code-owasp) — OWASP Top 10:2025, ASVS 5.0, LLM Top 10, Agentic AI 2026. Revisione del codice + probe passivi non intrusivi sul sito live (solo header/cookie/TLS, nessun brute-force, nessun payload).

Findings ordinati per sfruttabilità reale, non per pattern.

---

## 🔴 F1 — CORS: allowlist con `startsWith` → bypass cross-origin con credenziali (ALTA · A02/A05/A07)

`backend/src/main.ts:31` valida l'origine con `origin.startsWith(o)`. Con `credentials: true` e origine ammessa `https://shop.luisbg.it`, l'origine `https://shop.luisbg.it.attacker.com` **supera** il test di prefisso e riceve `Access-Control-Allow-Origin: <quell'origine>` + `Access-Control-Allow-Credentials: true`.

**Percorso:** un attaccante registra `shop.luisbg.it.attacker.com` → una pagina lì può fare richieste credenziali all'API e **leggere le risposte autenticate** della vittima loggata (ordini, dati cliente, ecc.). Confermato `Access-Control-Allow-Credentials: true` sull'API in produzione.

**Fix (1 riga):**
```ts
// da:  if (origin.startsWith(o)) return callback(null, true);
if (allowedOrigins.includes(origin)) return callback(null, true);
```
Mantenere invariato il branch LAN regex.

---

## 🟠 F2 — Pagine Next.js senza security header + leak `X-Powered-By` (MEDIA · A02)

Verificato live: `/` e `/login` rispondono **senza** CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, e con `X-Powered-By: Next.js`. L'API `/api/*` è invece indurita (Helmet: CSP, HSTS `includeSubDomains`, XFO SAMEORIGIN, nosniff, Referrer-Policy). L'hardening è solo sul layer NestJS, non sull'HTML servito da Next.js via Caddy.

**Impatto:** `/login` è inseribile in iframe → clickjacking; nessun HSTS sul primo HTML caricato dal browser; leak dello stack. `frontend/next.config.ts` non ha `headers()` né `poweredByHeader:false`.

**Fix:** aggiungere `headers()` in `next.config.ts` (o un blocco header globale in Caddy per le route frontend) + `poweredByHeader: false`.

---

## 🟡 F3 — IDOR in `impostaPredefinito`: scrittura cross-tenant (BASSA/MEDIA · A01)

`backend/src/checkout/checkout.service.ts:241-245`. A differenza dei metodi fratelli (`aggiornaIndirizzo`, `eliminaIndirizzo` usano `findFirst({ where:{ id, customerId } })`), qui l'`update` è `where: { id }` **senza filtro `customerId`**:

```ts
if (id > 0) {
  await this.prisma.indirizzoCliente.update({ where: { id }, data: { flagAbituale: true } });
}
```
Un cliente autenticato può passare l'`id` indirizzo di **un altro cliente** e settargli `flagAbituale=true`. Blast radius limitato (flag di indirizzo predefinito altrui), ma è una scrittura cross-tenant.

**Fix:** guardia di proprietà come i fratelli, prima dell'update:
```ts
const addr = await this.prisma.indirizzoCliente.findFirst({ where: { id, customerId: clienteId } });
if (!addr) throw new NotFoundException('Indirizzo non trovato');
```

---

## 🟡 F4 — Rate limit login allentato a 20/min (BASSA · A07)

`backend/src/auth/controller` login: `@Throttle({ default: { limit: 20, ttl: 60_000 } })`. Il baseline di sicurezza del progetto era 5/min. 20/min per chiave lascia più margine al credential stuffing. (Positivo già presente: dummy-hash a tempo costante che previene l'enumerazione utenti.)

**Fix:** riportare a ~5-10/min e confermare che la chiave del throttler sia per email+IP, non solo IP.

---

## 🟡 F5 — Verificare `NODE_ENV=production` nel container in produzione (BASSA · A02, deploy)

`main.ts` gate su `isProd = NODE_ENV === 'production'` per `cookie.secure` e comportamento prod. Se il container in produzione non imposta `NODE_ENV=production`, il cookie di sessione `luis.sid` viaggia **senza flag Secure** (il sito è HTTPS via Caddy, quindi l'esposizione è ridotta ma il flag va garantito). Voce già in checklist pre-pubblicazione di CLAUDE.md — verificarla ora che il sito è live.

---

## Note minori

- **CSRF exempt `/api/integrazione/sync`** (`main.ts`): l'endpoint è comunque protetto da `AuthenticatedGuard + RolesGuard + PermissionsGuard` (admin) e `SameSite=lax` smorza il POST cross-site. Rischio basso; documentare il perché dell'esenzione.
- **CORS branch LAN** (`192.168/10.x:3000`): accettabile in LAN; ora che il portale è raggiungibile via tunnel, tenerlo attivo solo se serve davvero l'accesso da IP privati.

---

## ✅ Controlli superati (verificati nel codice)

- **A05 Injection:** tutte le query dinamiche usano placeholder `$1..$n`; gli unici identificatori interpolati in SQL raw (`sync.service.ts`) sono **config statica** (mapping viste→tabelle), non input utente.
- **A01 Access control:** deny-by-default con `own(clienteId,id)` e `findFirst({ id, customerId })` su progetti/checkout/carrello/ordini; gli endpoint cliente derivano l'id dalla **sessione** (`req.user.id`), mai da parametri client (eccetto F3).
- **A04 Crypto / A07 Auth:** password con argon2, login a tempo costante (dummy hash → niente user enumeration), sessioni server-side su Postgres, `rolling`, invalidazione single-device via `sessionToken`, cookie `HttpOnly`/`SameSite=lax`.
- **A02 Misconfig (API):** Helmet completo sull'API, CSRF synchronizer token sulle richieste autenticate che modificano stato.
- **Path traversal (img):** `img.controller.ts` usa `resolve` + `startsWith(base + sep)` + rifiuto `..` — guardia corretta.
- **LLM Top 10:** nessun chatbot AI implementato ancora (solo spec); i prompt di insight/dashboard usano **aggregati**, non PII cliente grezza — coerente con la regola CLAUDE.md "nessun dato sensibile nei prompt AI".

---

---

## Stato patch (applicate 2026-09-15)

| # | Stato | Intervento |
|---|---|---|
| F1 | ✅ FATTO | `main.ts` CORS: `startsWith` → `allowedOrigins.includes(origin)` (match esatto) |
| F2 | ✅ FATTO (parziale) | `next.config.ts`: `poweredByHeader:false` + HSTS, X-Frame-Options, nosniff, Referrer-Policy, CSP `frame-ancestors 'self'` sulle pagine (escluso `/api/*`). **Rinviato:** CSP `script-src`/`style-src` stretta — richiede rollout con nonce testato per non rompere l'hydration Next |
| F3 | ✅ FATTO | `checkout.service.ts` `impostaPredefinito`: guardia `findFirst({ id, customerId })` prima dell'update |
| F4 | ✅ FATTO | login throttle `20` → `5`/min per IP |
| F5 | ⚠️ DEPLOY | Verificare `NODE_ENV=production` nel container (flag cookie Secure) — non è codice |

Type-check backend+frontend puliti; header verificati su dev server (`/`, `/login` con i nuovi header, `X-Powered-By` assente, `/api/*` escluso).

