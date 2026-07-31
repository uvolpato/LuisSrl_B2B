/**
 * Verifica UI — Wizard "Descrizione AI": larghezze dei 3 bottoni di navigazione
 * (Indietro / Cancella / Avanti) dopo lo spostamento del blocco
 * `@media (max-width: 768px)` di `app/admin/admin.css` DENTRO `@scope (.admin-page)`.
 *
 * Controlla (la modale resta aperta, si cambia solo il viewport):
 *  - 768px : i 3 bottoni su una sola riga con la STESSA larghezza (diff <= 1px),
 *            zero sforo orizzontale; le regole `.modal-tabs-bar` (padding 0 8px)
 *            e `.modal-body-edit` (padding 16px) continuano ad applicarsi.
 *  - 375px : invariato (stessa riga, larghezze uguali, zero sforo).
 *  - 1280px: desktop invariato (nessuna regola mobile attiva, zero sforo,
 *            modale non fullscreen).
 *
 * Prerequisiti:
 *  - backend :3001 e frontend dev :3000 attivi (vedi avvia.bat)
 *  - Chrome installato e `playwright-core` disponibile (si prova a risolvere
 *    quello della globale di n8n, poi il node_modules di frontend)
 *  - DB con almeno un articolo con foto (seed: "rotolo rete cotone h50")
 *
 * Uso:
 *     node scripts/verify/wizard-nav-buttons-check.js
 * Exit code 0 = tutto ok, 1 = almeno una verifica fallita, 2 = errore di esecuzione.
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
const SHOT_DIR = process.env.SHOT_DIR ?? path.join(process.env.TEMP || "C:/Users/uvolp/AppData/Local/Temp", "opencode", "wizard-nav-check");
const WIDTHS = [768, 375, 1280];

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
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  await Promise.all([
    page.waitForURL("**/admin", { timeout: 15000 }).catch(() => {}),
    page.locator("form button.primary").click(),
  ]);
  await page.waitForTimeout(2500);
  assert(page.url().includes("/admin"), "login admin e redirect /admin");

  // ── Apro l'articolo e il wizard (vista passi) ──
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1500);
  const grid = page.locator('.view-toggle button[title="Vista griglia"]');
  if (await grid.count()) await grid.click();
  await page.waitForTimeout(500);
  const search = page.locator('input[placeholder*="Cerca articolo"]');
  if (await search.count()) { await search.fill(ARTICOLO); await page.waitForTimeout(800); }
  const card = page.locator('.article-card:has-text("' + ARTICOLO.replace(/"/g, '\\"') + '")');
  assert(await card.count() > 0, "articolo trovato in griglia: " + ARTICOLO);
  const modBtn = card.locator('button:has-text("Modifica")');
  if (await modBtn.count()) await modBtn.first().click();
  await page.waitForSelector(".modal-tabs-bar", { timeout: 10000 });

  const tab = page.locator(".modal-tab-btn:has-text('Descrizione AI')");
  if (await tab.count()) await tab.click();
  else {
    const sel = page.locator(".modal-tabs-bar select");
    if (await sel.count()) await sel.selectOption("descrizione-ai");
  }
  // Il root e' .wizard (vista passi) o .wizard-result (vista risultato, quando
  // l'articolo ha gia' una descrizione generata)
  await page.waitForSelector(".wizard, .wizard-result", { timeout: 15000 });

  // Se il wizard si apre in vista risultato, entro nella vista passi (passo 1)
  const resultView = page.locator(".wizard-result");
  if (await resultView.count()) {
    const editBtn = resultView.locator(".wizard-result-footer button").filter({ hasText: /Modifica|Continua modifica/ });
    if (await editBtn.count()) { await editBtn.first().click(); await page.waitForTimeout(500); }
  }
  await page.waitForSelector(".wizard-nav", { timeout: 8000 });
  assert(await page.locator(".wizard-nav .btn").count() === 3, "wizard-nav con 3 bottoni in vista passi");

  // ── Misurazioni ai 3 viewport ──
  const measure = () => page.evaluate(() => {
    const vw = window.innerWidth;
    const btnEls = [...document.querySelectorAll(".wizard-nav .btn")];
    const buttons = btnEls.map((b) => {
      const r = b.getBoundingClientRect();
      return {
        text: (b.textContent || "").trim().slice(0, 24),
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), right: +r.right.toFixed(1),
        flex: getComputedStyle(b).flex,
      };
    });
    const nav = document.querySelector(".wizard-nav");
    const navCs = nav ? getComputedStyle(nav) : null;
    const innerDiv = nav ? nav.firstElementChild : null;
    const tabsBar = document.querySelector(".modal-tabs-bar");
    const tbc = tabsBar ? getComputedStyle(tabsBar) : null;
    const bodyEdit = document.querySelector(".modal-body-edit");
    const bec = bodyEdit ? getComputedStyle(bodyEdit) : null;
    const modalRoot = document.querySelector(".modal-root");
    const mr = modalRoot ? modalRoot.getBoundingClientRect() : null;
    const overflowEls = [...document.querySelectorAll("body *")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > vw + 0.5;
    }).slice(0, 10).map((el) => ({
      cls: (typeof el.className === "string" ? el.className : el.tagName).slice(0, 50),
      right: Math.round(el.getBoundingClientRect().right),
    }));
    return {
      vw,
      docScrollW: document.documentElement.scrollWidth,
      bodyScrollW: document.body.scrollWidth,
      buttons,
      nav: navCs ? { gap: navCs.gap, flexDir: navCs.flexDirection, wrap: navCs.flexWrap } : null,
      innerDivDisplay: innerDiv ? getComputedStyle(innerDiv).display : null,
      tabsBar: tbc ? { padL: tbc.paddingLeft, padR: tbc.paddingRight, minH: tbc.minHeight } : null,
      bodyEdit: bec ? { padT: bec.paddingTop, padL: bec.paddingLeft } : null,
      modalRoot: mr ? { x: Math.round(mr.x), w: Math.round(mr.width) } : null,
      overflowEls,
    };
  });

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(700); // media query + layout
    const m = await measure();
    await page.screenshot({ path: path.join(SHOT_DIR, `wizard-nav-${w}px.png`), fullPage: false });

    const ws = m.buttons.map((b) => b.w);
    const ys = m.buttons.map((b) => b.y);
    const wMax = Math.max(...ws), wMin = Math.min(...ws);
    const yMax = Math.max(...ys), yMin = Math.min(...ys);
    const widths = m.buttons.map((b) => `${b.text}=${b.w}px`).join(", ");
    const gap = m.nav ? m.nav.gap : "?";
    console.log(`\n── Viewport ${w}px ──`);
    console.log("   bottoni: " + widths + " | riga(y): " + ys.map((y) => y.toFixed(0)).join("/") + " | nav gap=" + gap + " | innerDiv=" + m.innerDivDisplay);

    if (w === 768 || w === 375) {
      assert(m.buttons.length === 3, `${w}px: 3 bottoni presenti`, m.buttons.length + " trovati");
      assert(yMax - yMin <= 1, `${w}px: bottoni sulla stessa riga`, `dy=${(yMax - yMin).toFixed(1)}px`);
      assert(wMax - wMin <= 1, `${w}px: larghezze uguali (diff<=1px)`, `max=${wMax}px min=${wMin}px diff=${(wMax - wMin).toFixed(1)}px`);
      assert(m.docScrollW <= m.vw && m.bodyScrollW <= m.vw, `${w}px: zero sforo orizzontale (document)`, `doc=${m.docScrollW} body=${m.bodyScrollW} vw=${m.vw}`);
      assert(m.overflowEls.length === 0, `${w}px: nessun elemento oltre il bordo destro`, m.overflowEls.length ? JSON.stringify(m.overflowEls) : "");
    }
    if (w === 768) {
      assert(m.modalRoot && Math.abs(m.modalRoot.x) <= 1 && Math.abs(m.modalRoot.w - m.vw) <= 1, "768px: modale fullscreen (inset 0)", m.modalRoot ? `x=${m.modalRoot.x} w=${m.modalRoot.w} vw=${m.vw}` : "no .modal-root");
      assert(m.tabsBar && m.tabsBar.padL === "8px" && m.tabsBar.padR === "8px", "768px: .modal-tabs-bar padding 0 8px applicato", m.tabsBar ? `${m.tabsBar.padL}/${m.tabsBar.padR}` : "no .modal-tabs-bar");
      assert(m.tabsBar && m.tabsBar.minH === "44px", "768px: .modal-tabs-bar min-height 44px (base intatta)", m.tabsBar ? m.tabsBar.minH : "");
      assert(m.bodyEdit && m.bodyEdit.padT === "16px" && m.bodyEdit.padL === "16px", "768px: .modal-body-edit padding 16px applicato", m.bodyEdit ? `T=${m.bodyEdit.padT} L=${m.bodyEdit.padL}` : "no .modal-body-edit");
    }
    if (w === 375) {
      // 640px + 768px media coincidono su questi valori: invariato rispetto a prima
      assert(m.tabsBar && m.tabsBar.padL === "8px", "375px: .modal-tabs-bar padding 8px (invariato)", m.tabsBar ? m.tabsBar.padL : "");
    }
    if (w === 1280) {
      assert(m.docScrollW <= m.vw && m.bodyScrollW <= m.vw, "1280px: zero sforo orizzontale", `doc=${m.docScrollW} body=${m.bodyScrollW} vw=${m.vw}`);
      assert(m.overflowEls.length === 0, "1280px: nessun elemento oltre il bordo destro", m.overflowEls.length ? JSON.stringify(m.overflowEls) : "");
      assert(m.tabsBar && m.tabsBar.padL === "28px", "1280px: .modal-tabs-bar padding base 28px (media non attiva)", m.tabsBar ? m.tabsBar.padL : "");
      assert(m.modalRoot && m.modalRoot.x > 0, "1280px: modale NON fullscreen (desktop invariato)", m.modalRoot ? `x=${m.modalRoot.x}` : "no .modal-root");
      assert(yMax - yMin <= 1, "1280px: bottoni su una riga (layout base)", `dy=${(yMax - yMin).toFixed(1)}px`);
    }
  }

  if (consoleErrors.length) {
    assert(false, "nessun errore console durante la sessione", consoleErrors.join(" | ").slice(0, 300));
  } else {
    assert(true, "nessun errore console durante la sessione");
  }

  await browser.close();
  console.log("\n" + log.join("\n"));
  console.log(failures === 0 ? "\nOK: tutte le verifiche passate." : `\nFAIL: ${failures} verifica/e fallite.`);
  console.log("Screenshot: " + SHOT_DIR);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRORE: " + e.stack || e.message);
  process.exit(2);
});
