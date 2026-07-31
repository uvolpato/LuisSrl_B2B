/**
 * Verifica UI — ArticoloEditModal: tendina tab compatta vs tab a bottoni.
 *
 * La tendina (`<select>` in `.modal-tabs-bar`) deve essere forzata a viewport
 * <= 768px (matchMedia) e restare il fallback quando i tab a bottoni non
 * stanno nella barra. Vincoli verificati:
 *
 *  1. 375px : select presente, con le 6 voci (Generale, Immagini, Varianti,
 *             Descrizione AI, Famiglia, Raccolte), nessun bottone; selezionare
 *             "Immagini" cambia tab.
 *  2. 768px : select presente, stesse 6 voci.
 *  3. 1280px: nessun select, 6 bottoni.
 *  4. Banda 769-879px: stato DETERMINISTICO (nessuna oscillazione
 *     select<->bottoni frame per frame) e, se sono renderizzati i bottoni,
 *     tutti e 6 devono stare nella barra (nessun tab tagliato). [Regressione
 *     sul fallback overflow: la check del ResizeObserver deve avere isteresi,
 *     altrimenti select/bottoni si alternano a ogni frame.]
 *  5. Nessun errore console.
 *
 * Prerequisiti:
 *  - backend :3001 e frontend dev :3000 attivi (vedi avvia.bat)
 *  - playwright-core (globale di n8n o in node_modules) + Chrome installato
 *  - DB con almeno un articolo (seed: 10060 "rotolo rete cotone h50")
 *
 * Uso:
 *     node scripts/verify/articolo-edit-tabs-check.js
 * Exit code 0 = ok, 1 = verifica fallita, 2 = errore di esecuzione.
 */
const fs = require("fs");
const path = require("path");

const N8N_PW = "C:/Users/uvolp/AppData/Roaming/npm/node_modules/n8n/node_modules/playwright-core";
let pw = null;
for (const cand of [N8N_PW, "playwright-core"]) {
  try { pw = require(cand); break; } catch { /* prossimo candidato */ }
}
if (!pw) {
  console.error("ERRORE: playwright-core non trovato. Installa con: cd frontend && npm i -D playwright-core");
  process.exit(2);
}

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@luissrl.it";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "LuisAdmin2026!";
const ARTICOLO = process.env.ARTICOLO ?? "rotolo rete cotone h50";
const SHOT_DIR = process.env.SHOT_DIR ?? path.join(process.env.TEMP || "C:/Users/uvolp/AppData/Local/Temp", "opencode", "articolo-tabs-check");
const BANDA = [880, 850, 820, 800, 780, 769]; // larghezze viewport critiche

const OPZIONI = ["Generale", "Immagini", "Varianti", "Descrizione AI", "Famiglia", "Raccolte"];

let failures = 0;
const log = [];
function assert(cond, label, detail = "") {
  log.push((cond ? "PASS | " : "FAIL | ") + label + (detail ? " | " + detail : ""));
  if (!cond) failures++;
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await pw.chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-first-run", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 200)));

  // ── Login admin ──
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("#login-email")?.value === "admin@luissrl.it", null, { timeout: 15000 });
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  await page.locator("form button.primary").click();
  await page.waitForFunction(() => location.pathname === "/admin", null, { timeout: 15000 });
  assert(true, "login admin e redirect /admin");

  // ── Apro l'articolo in vista griglia ──
  await page.waitForSelector(".view-toggle", { timeout: 20000 });
  const grid = page.locator('.view-toggle button[title="Vista griglia"]');
  if (await grid.count()) await grid.click();
  await page.waitForSelector(".article-card", { timeout: 20000 });
  const search = page.locator('input[placeholder*="Cerca articolo"]');
  if (await search.count()) { await search.fill(ARTICOLO); await page.waitForTimeout(800); }
  const card = page.locator('.article-card:has-text("' + ARTICOLO.replace(/"/g, '\\"') + '")');
  assert(await card.count() > 0, "articolo trovato in griglia: " + ARTICOLO);
  const modBtn = card.locator('button:has-text("Modifica")');
  if (await modBtn.count()) await modBtn.first().click();
  await page.waitForSelector(".modal-tabs-bar", { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector(".modal-tabs-bar")?.parentElement?.textContent?.includes("Caricamento…"), { timeout: 15000 });

  const stato = () => page.evaluate(() => {
    const bar = document.querySelector(".modal-tabs-bar");
    return {
      hasSelect: !!bar.querySelector("select"),
      btns: bar.querySelectorAll("button.modal-tab-btn").length,
      options: bar.querySelector("select") ? [...bar.querySelectorAll("select option")].map((o) => o.textContent) : null,
      scroll: bar.scrollWidth,
      client: bar.clientWidth,
      overflow: bar.scrollWidth > bar.clientWidth + 2,
      // tutti i bottoni dentro la barra (non tagliati)?
      allVisible: [...bar.querySelectorAll("button.modal-tab-btn")].every((b) => {
        const r = b.getBoundingClientRect();
        return r.right <= bar.getBoundingClientRect().right + 0.5;
      }),
    };
  });

  // Campiona ~20 frame: se lo stato cambia tra select e bottoni => OSCILLAZIONE
  const campiona = async (w) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(600);
    const visti = new Set();
    for (let i = 0; i < 20; i++) {
      const s = await stato();
      visti.add(s.hasSelect ? "select" : "buttons");
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    }
    return { visti: [...visti], finale: await stato() };
  };

  // ── 1. 375px: select, 6 opzioni, cambio tab ──
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(400);
  let s = await stato();
  assert(s.hasSelect, "1. 375px: select presente", "trovato: " + (s.btns ? s.btns + " bottoni" : "nulla"));
  assert(s.options && JSON.stringify(s.options) === JSON.stringify(OPZIONI), "1. 375px: opzioni corrette", s.options ? s.options.join(", ") : "n/d");
  assert(s.btns === 0, "1. 375px: nessun bottone tab");
  if (s.hasSelect) {
    await page.locator(".modal-tabs-bar select").selectOption("immagini");
    await page.waitForTimeout(300);
    const body = await page.locator(".modal-body-edit").innerText();
    assert(body.includes("Tutte le immagini dell'articolo"), "1. 375px: selezionare 'Immagini' cambia tab");
    await page.locator(".modal-tabs-bar select").selectOption("generale");
  }
  await page.screenshot({ path: path.join(SHOT_DIR, "articolo-tabs-375.png") });

  // ── 2. 768px: select presente ──
  await page.setViewportSize({ width: 768, height: 800 });
  await page.waitForTimeout(400);
  s = await stato();
  assert(s.hasSelect, "2. 768px: select presente", s.btns ? s.btns + " bottoni" : "nessuno dei due");
  assert(s.options && JSON.stringify(s.options) === JSON.stringify(OPZIONI), "2. 768px: opzioni corrette", s.options ? s.options.join(", ") : "n/d");
  await page.screenshot({ path: path.join(SHOT_DIR, "articolo-tabs-768.png") });

  // ── 3. 1280px: bottoni, nessun select ──
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(400);
  s = await stato();
  assert(!s.hasSelect, "3. 1280px: nessun select");
  assert(s.btns === 6, "3. 1280px: 6 bottoni tab", "trovati " + s.btns);
  assert(s.allVisible, "3. 1280px: tutti i bottoni visibili (nessuno tagliato)");
  await page.screenshot({ path: path.join(SHOT_DIR, "articolo-tabs-1280.png") });

  // ── 4. Banda 769-879px: stato deterministico (nessuna oscillazione) ──
  for (const w of BANDA) {
    const c = await campiona(w);
    const stabile = c.visti.length === 1;
    assert(stabile, `4. ${w}px: stato stabile (no oscillazione select/bottoni)`, "stati visti: " + c.visti.join(", "));
    if (c.finale.hasSelect) {
      assert(JSON.stringify(c.finale.options) === JSON.stringify(OPZIONI), `4. ${w}px: opzioni corrette nel select`, c.finale.options ? c.finale.options.join(", ") : "n/d");
    } else if (c.finale.btns === 6) {
      assert(!c.finale.overflow && c.finale.allVisible, `4. ${w}px: bottoni non tagliati (no overflow)`, `scroll=${c.finale.scroll} client=${c.finale.client} allVisible=${c.finale.allVisible}`);
    }
    await page.screenshot({ path: path.join(SHOT_DIR, `articolo-tabs-${w}px.png`) });
  }

  // ── 5. Errori console ──
  const relevant = consoleErrors.filter((e) => !e.includes("favicon"));
  assert(relevant.length === 0, "5. Nessun errore console", relevant.join(" || "));

  await browser.close();

  console.log(log.join("\n"));
  console.log(failures === 0 ? "\nTUTTE LE VERIFICHE OK" : `\n${failures} verifica/e fallita/e`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error("ERRORE SCRIPT:", e); process.exit(2); });
