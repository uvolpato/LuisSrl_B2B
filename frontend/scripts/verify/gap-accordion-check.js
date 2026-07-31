/**
 * Verifica UI — Bug footer sticky + accordion "Riepilogo dimensioni sensoriali"
 * (vista risultato "Descrizione AI" della modale di modifica articolo).
 *
 * Sintomo riportato: aprendo l'accordion, tra la pulsantiera sticky
 * (`.wizard-col-side .wizard-result-footer`, `position: sticky; bottom: 0`
 * dentro `@media (max-width: 768px)`) e il footer della modale
 * (`.modal-root-footer`) compare una zona in cui si intravedono i contenuti
 * dell'accordion (le dimensioni sensoriali).
 *
 * Causa misurata: il footer sticky viene ancorato al bordo del CONTENT box
 * dello scroll container `.modal-body-edit` (bordo box 743 - padding-bottom 16
 * = 727), mentre il ritaglio del contenuto scrollato arriva al bordo del
 * PADDING box (743): la striscia di padding-bottom (16px) resta trasparente e
 * lascia vedere l'ultimo `.wizard-dim-item` che scorre sotto.
 *
 * Questo check fallisce (exit 1) finche' il bug e' presente, e passa (exit 0)
 * quando il gap non mostra contenuto dell'accordion.
 *
 * Prerequisiti:
 *  - backend :3001 e frontend dev :3000 attivi (vedi avvia.bat)
 *  - Chrome installato e `playwright-core` disponibile (si prova a risolvere
 *    quello della globale di n8n, poi il node_modules di frontend)
 *  - DB con l'articolo 10060 ("rotolo rete cotone h50") con descrizione
 *    dettagliata salvata (vista risultato immediata nel wizard)
 *
 * Uso:
 *     node scripts/verify/gap-accordion-check.js
 * Exit code 0 = tutto ok, 1 = bug presente (almeno una verifica fallita),
 *               2 = errore di esecuzione.
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
const ARTICOLO = process.env.ARTICOLO ?? "10060";
const SHOT_DIR = process.env.SHOT_DIR ?? path.join(process.env.TEMP || "C:/Users/uvolp/AppData/Local/Temp", "opencode", "gap-accordion-check");

let failures = 0;
const log = [];
function assert(cond, label, detail = "") {
  log.push((cond ? "PASS | " : "FAIL | ") + label + (detail ? " | " + detail : ""));
  if (!cond) failures++;
}

// Misura gap e contenuto visibile al suo interno
const MEASURE = `(() => {
  const round = (n) => Math.round(n * 10) / 10;
  const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: round(b.top), bottom: round(b.bottom), height: round(b.height), left: round(b.left), width: round(b.width) }; };

  const footer = document.querySelector(".wizard-col-side .wizard-result-footer");
  const modalFooter = document.querySelector(".modal-root-footer");
  const bodyEdit = document.querySelector(".modal-body-edit");
  const details = document.querySelector(".wizard-dim-section");
  if (!footer || !modalFooter || !bodyEdit) return { missing: true };

  const fr = rect(footer), mfr = rect(modalFooter), br = rect(bodyEdit);
  const gap = round(mfr.top - fr.bottom);
  const gapProbes = [];
  if (gap > 0.5) {
    const xs = [br.left + br.width * 0.25, br.left + br.width * 0.5, br.left + br.width * 0.75];
    const ys = [fr.bottom + gap * 0.25, fr.bottom + gap * 0.5, fr.bottom + gap * 0.75];
    for (const x of xs) {
      for (const y of ys) {
        const t = document.elementFromPoint(x, y);
        if (!t) continue;
        let inAccordion = false;
        let n = t;
        while (n && n !== document.documentElement) {
          if (n.classList && (n.classList.contains("wizard-dim-item") || n.classList.contains("wizard-dimensions-scroll") || (n.tagName === "DETAILS" && n.classList.contains("wizard-dim-section")))) inAccordion = true;
          n = n.parentElement;
        }
        gapProbes.push({ x: round(x), y: round(y), cls: (t.className && t.className.baseVal !== undefined ? t.className.baseVal : t.className) || "", inAccordion });
      }
    }
  }

  let scrollEl = null;
  let el = footer;
  while (el && el !== document.body) {
    if (/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY)) { scrollEl = el; break; }
    el = el.parentElement;
  }
  const fcs = getComputedStyle(footer);
  const sEl = scrollEl || bodyEdit;
  return {
    viewportW: innerWidth,
    footer: { rect: fr, position: fcs.position, zIndex: fcs.zIndex },
    modalFooterTop: mfr.top,
    gapPx: gap,
    accordionContentInGap: gapProbes.some((p) => p.inAccordion),
    probes: gapProbes,
    detailsOpen: details ? details.open : null,
    hasDetailsTag: details ? details.tagName === "DETAILS" : false,
    scroll: { el: sEl.className || sEl.tagName, scrollTop: round(sEl.scrollTop), maxScroll: round(sEl.scrollHeight - sEl.clientHeight) },
    horizontalOverflowBody: bodyEdit.scrollWidth > bodyEdit.clientWidth ? { scrollWidth: bodyEdit.scrollWidth, clientWidth: bodyEdit.clientWidth } : null,
  };
})()`;

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await pw.chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-first-run", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 200)));

  // ── Login admin (attende l'idratazione: prefill dev in useEffect) ──
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForFunction((email) => document.querySelector("#login-email")?.value === email, EMAIL, { timeout: 15000 });
  await page.fill("#login-email", EMAIL);
  await page.fill("#login-password", PASSWORD);
  await page.click("form button.primary");
  await page.waitForURL("**/admin", { timeout: 20000 });
  await page.waitForTimeout(1500);

  // ── Apro la modale di modifica articolo 10060, tab Descrizione AI ──
  // Ricerca: input React controllato, fill via native setter (funziona anche
  // con le top-actions chiuse su mobile)
  await page.evaluate((v) => {
    const input = document.querySelector(".top-actions .admin-search input");
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, ARTICOLO);
  await page.waitForTimeout(800);
  const card = page.locator(".article-card", { has: page.locator(".article-card-id", { hasText: new RegExp(ARTICOLO) }) }).first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  await card.locator("button", { hasText: "Modifica" }).first().click();
  await page.waitForSelector(".modal-body-edit", { timeout: 15000 });

  const tabSelect = page.locator(".modal-tabs-bar select");
  if (await tabSelect.count()) await tabSelect.selectOption("descrizione-ai");
  else await page.locator(".modal-tab-btn", { hasText: "Descrizione AI" }).first().click();
  await page.waitForSelector(".wizard-result", { timeout: 20000 });
  await page.waitForTimeout(600);

  const details = page.locator(".wizard-dim-section");
  assert((await details.count()) > 0, "accordion .wizard-dim-section presente in vista risultato");
  const isDetailsTag = await details.evaluate((d) => d.tagName === "DETAILS").catch(() => false);
  assert(isDetailsTag, "375px: e' un <details> (useCompactSteps attivo)");

  // ── Apro l'accordion ──
  await details.locator("summary").click();
  await page.waitForTimeout(200);
  assert(await details.evaluate((d) => d.open), "accordion aperto dopo click su summary");

  // ── Misura a 375px in 2 posizioni di scroll ──
  for (const frac of [0, 0.5]) {
    await page.evaluate((f) => {
      const el = document.querySelector(".modal-body-edit");
      el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) * f);
    }, frac);
    await page.waitForTimeout(200);
    const m = await page.evaluate(MEASURE);
    await page.screenshot({ path: path.join(SHOT_DIR, `375-scroll-${frac}-${m.accordionContentInGap ? "BUG" : "ok"}.png`) });

    assert(!m.missing, `375px scroll ${frac}: elementi misurati presenti`);
    if (m.missing) continue;
    assert(m.footer.position === "sticky", `375px scroll ${frac}: footer sticky`, m.footer.position);
    assert(m.detailsOpen === true, `375px scroll ${frac}: accordion aperto durante la misura`);
    assert(m.gapPx <= 1, `375px scroll ${frac}: NESSUN gap tra footer sticky e footer modale (attuale: ${m.gapPx}px)`, `gap=${m.gapPx}px, footer.bottom=${m.footer.rect.bottom}, modalFooter.top=${m.modalFooterTop}`);
    assert(!m.accordionContentInGap, `375px scroll ${frac}: nessun contenuto dell'accordion visibile nel gap`, JSON.stringify(m.probes.filter((p) => p.inAccordion)).slice(0, 200));
  }

  // ── Boundary: 769px (media query non attiva) ──
  await page.setViewportSize({ width: 769, height: 812 });
  await page.waitForTimeout(800); // matchMedia -> re-render
  const m769 = await page.evaluate(MEASURE);
  await page.screenshot({ path: path.join(SHOT_DIR, `769-${m769.accordionContentInGap ? "BUG" : "ok"}.png`) });
  assert(m769.footer.position === "static", "769px: footer NON sticky (media query <=768px non attiva)", m769.footer.position);
  assert(m769.hasDetailsTag === false, "769px: niente <details> (sezione sempre visibile)");
  assert(!m769.accordionContentInGap, "769px: nessun contenuto nel gap sotto il footer", `gap=${m769.gapPx}px`);

  if (consoleErrors.length) {
    assert(false, "nessun errore console durante la sessione", consoleErrors.join(" | ").slice(0, 300));
  } else {
    assert(true, "nessun errore console durante la sessione");
  }

  await browser.close();
  console.log("\n" + log.join("\n"));
  console.log(failures === 0 ? "\nOK: tutte le verifiche passate." : `\nFAIL: ${failures} verifica/e fallite (bug presente).`);
  console.log("Screenshot: " + SHOT_DIR);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRORE: " + (e.stack || e.message));
  process.exit(2);
});
