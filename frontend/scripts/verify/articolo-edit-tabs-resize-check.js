/**
 * Verifica UI — ArticoloEditModal: resize continuo 1280→768→1280 senza
 * oscillazione select<->bottoni (isteresi fullTabsWidthRef nel fallback
 * overflow). Complementa articolo-edit-tabs-check.js (che campiona solo
 * larghezze fisse): qui lo sweep è continuo in passi di 4px, con doppio
 * campione a ogni larghezza per intercettare transitori FLIP.
 *
 * Verifiche:
 *  1. Partenza a 1280px: bottoni (stato iniziale).
 *  2. Sweep in discesa 1280→768: una sola transizione bottoni→select,
 *     nessun ritorno ai bottoni sotto la larghezza di flip.
 *  3. Sweep in salita 768→1280: una sola transizione select→bottoni,
 *     nessun ritorno al select sopra la larghezza di flip.
 *  4. Isteresi: larghezza di flip in salita > larghezza di flip in discesa
 *     (la banda tra i due valori è stabile in base alla direzione).
 *  5. Campionamento 20 frame ESATTAMENTE alle due larghezze di flip:
 *     stato stabile, nessuna oscillazione.
 *  6. A ogni larghezza con bottoni: 6 bottoni, nessuno tagliato, no overflow.
 *  7. Zero errori console.
 *
 * Prerequisiti come articolo-edit-tabs-check.js (backend :3001, frontend :3000,
 * playwright-core + Chrome, DB con "rotolo rete cotone h50").
 *
 * Uso:
 *     node scripts/verify/articolo-edit-tabs-resize-check.js
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
const SHOT_DIR = process.env.SHOT_DIR ?? path.join(process.env.TEMP || "C:/Users/uvolp/AppData/Local/Temp", "opencode", "articolo-tabs-resize-check");
const STEP = 4; // px per step dello sweep continuo

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
      allVisible: [...bar.querySelectorAll("button.modal-tab-btn")].every((b) => {
        const r = b.getBoundingClientRect();
        return r.right <= bar.getBoundingClientRect().right + 0.5;
      }),
    };
  });

  // ── Stato iniziale 1280px ──
  let s = await stato();
  assert(!s.hasSelect && s.btns === 6, "1. 1280px iniziale: bottoni (no select)", "btns=" + s.btns);

  // ── Sweep con doppio campione per larghezza (intercetta FLIP transitori) ──
  const flips = []; // { phase, w, detail }
  async function sweep(from, to, phase) {
    const hist = [];
    const ws = [];
    for (let w = from; phase === "down" ? w >= to : w <= to; w += phase === "down" ? -STEP : STEP) ws.push(w);
    for (const w of ws) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(140);
      const s1 = await stato();
      await page.waitForTimeout(110);
      const s2 = await stato();
      let st;
      if (s1.hasSelect === s2.hasSelect) {
        st = s1.hasSelect ? "select" : "buttons";
      } else {
        st = "FLIP:" + (s1.hasSelect ? "select" : "buttons") + "->" + (s2.hasSelect ? "select" : "buttons");
        flips.push({ phase, w, st });
      }
      hist.push({ w, st, s: s2 });
    }
    return hist;
  }

  const down = await sweep(1280, 768, "down");
  const up = await sweep(768, 1280, "up");

  // ── 2. Discesa: una sola transizione bottoni→select, mai ritorno ──
  const iDown = down.findIndex((h) => h.st.startsWith("select"));
  const flipDownW = iDown >= 0 ? down[iDown].w : null;
  assert(iDown >= 0, "2. Discesa: transizione bottoni→select trovata", flipDownW ? "a " + flipDownW + "px" : "mai avvenuta");
  if (iDown >= 0) {
    const pre = down.slice(0, iDown);
    const post = down.slice(iDown);
    const preOk = pre.every((h) => h.st === "buttons");
    const postOk = post.every((h) => h.st.startsWith("select"));
    assert(preOk && postOk, "2. Discesa: nessuna oscillazione (bottoni sopra, select sotto, mai ritorno)",
      `prima del flip: ${preOk ? "tutti bottoni" : "MISMATCH " + pre.filter((h) => h.st !== "buttons").map((h) => h.w + "px:" + h.st).join(",")} | sotto: ${postOk ? "tutto select" : "MISMATCH " + post.filter((h) => !h.st.startsWith("select")).map((h) => h.w + "px:" + h.st).join(",")}`);
    const optsOk = post.every((h) => !h.s.hasSelect || JSON.stringify(h.s.options) === JSON.stringify(OPZIONI));
    assert(optsOk, "2. Discesa: opzioni select corrette in tutto il tratto select", down[down.length - 1].s.options ? down[down.length - 1].s.options.join(", ") : "n/d");
    // bottoni mai tagliati nei tratti a bottoni
    const clip = pre.filter((h) => h.s.overflow || !h.s.allVisible);
    assert(clip.length === 0, "2. Discesa: bottoni mai tagliati nei tratti a bottoni", clip.length ? clip.map((h) => h.w + "px").join(",") : "ok");
  }

  // ── 3. Salita: una sola transizione select→bottoni, mai ritorno ──
  const iUp = up.findIndex((h) => h.st === "buttons");
  const flipUpW = iUp >= 0 ? up[iUp].w : null;
  assert(iUp >= 0, "3. Salita: transizione select→bottoni trovata", flipUpW ? "a " + flipUpW + "px" : "mai avvenuta");
  if (iUp >= 0) {
    const pre = up.slice(0, iUp);
    const post = up.slice(iUp);
    const preOk = pre.every((h) => h.st.startsWith("select"));
    const postOk = post.every((h) => h.st === "buttons");
    assert(preOk && postOk, "3. Salita: nessuna oscillazione (select sotto, bottoni sopra, mai ritorno)",
      `prima del flip: ${preOk ? "tutto select" : "MISMATCH " + pre.filter((h) => !h.st.startsWith("select")).map((h) => h.w + "px:" + h.st).join(",")} | sopra: ${postOk ? "tutti bottoni" : "MISMATCH " + post.filter((h) => h.st !== "buttons").map((h) => h.w + "px:" + h.st).join(",")}`);
    const clip = post.filter((h) => h.s.overflow || !h.s.allVisible);
    assert(clip.length === 0, "3. Salita: bottoni mai tagliati nei tratti a bottoni", clip.length ? clip.map((h) => h.w + "px").join(",") : "ok");
  }

  // ── 4. Isteresi: flip in salita a larghezza maggiore del flip in discesa ──
  if (flipDownW != null && flipUpW != null) {
    assert(flipUpW > flipDownW, "4. Isteresi presente (banda stabile per direzione)",
      `flip down=${flipDownW}px, flip up=${flipUpW}px, banda=${flipUpW - flipDownW}px`);
  }

  // ── 5. 20 frame esattamente alle larghezze di flip: nessuna oscillazione ──
  const campiona20 = async (w) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(500);
    const visti = new Set();
    for (let i = 0; i < 20; i++) {
      const st = await stato();
      visti.add(st.hasSelect ? "select" : "buttons");
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    }
    return { visti: [...visti], finale: await stato() };
  };
  if (flipDownW != null) {
    const c = await campiona20(flipDownW);
    assert(c.visti.length === 1 && c.visti[0] === "select", "5. 20 frame a " + flipDownW + "px (flip down): stabile su select", "stati visti: " + c.visti.join(", "));
    await page.screenshot({ path: path.join(SHOT_DIR, `flip-down-${flipDownW}px.png`) });
  }
  if (flipUpW != null) {
    const c = await campiona20(flipUpW);
    const finaleOk = c.finale.hasSelect ? "select" : "buttons";
    assert(c.visti.length === 1 && c.visti[0] === finaleOk && finaleOk === "buttons", "5. 20 frame a " + flipUpW + "px (flip up): stabile su bottoni", "stati visti: " + c.visti.join(", "));
    await page.screenshot({ path: path.join(SHOT_DIR, `flip-up-${flipUpW}px.png`) });
  }

  // ── 6/7. Errori console ──
  const relevant = consoleErrors.filter((e) => !e.includes("favicon"));
  assert(relevant.length === 0, "6. Nessun errore console", relevant.join(" || "));

  await browser.close();

  console.log(log.join("\n"));
  if (flipDownW != null && flipUpW != null) {
    console.log(`\nMISURE: flip down (bottoni→select) a ${flipDownW}px · flip up (select→bottoni) a ${flipUpW}px · banda isteresi ${flipUpW - flipDownW}px`);
  }
  console.log(failures === 0 ? "\nTUTTE LE VERIFICHE OK" : `\n${failures} verifica/e fallita/e`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error("ERRORE SCRIPT:", e); process.exit(2); });
