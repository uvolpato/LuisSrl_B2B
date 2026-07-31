/**
 * Verifica UI — Wizard "Descrizione AI" (pannello admin): box flottante .wizard-prompt.
 *
 * Scopo: intercetta il bug per cui, a box aperto, il bottone rotondo con l'icona
 * della sezione (sotto il microfono) è coperto dal box stesso e non è cliccabile
 * per chiudere il box (il click finisce sul box, che non ha handler).
 *
 * Prerequisiti:
 * - backend su :3001 e frontend dev su :3000 attivi (vedi avvia.bat)
 * - Chrome installato e `playwright-core` disponibile:
 *     cd frontend && npm i -D playwright-core
 * - DB con almeno un articolo con foto e descrizione già generata (il wizard
 *   si apre in vista risultato; si entra nella vista passi con "Modifica").
 *   Con i dati di seed l'articolo 10060 "rotolo rete cotone h50" va bene.
 *
 * Uso:
 *     node scripts/verify/wizard-prompt-check.js
 * Exit code 0 = tutto ok, 1 = bug riprodotto.
 */
const { chromium } = require("playwright-core");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@luissrl.it";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "LuisAdmin2026!";
// articolo usato per il test: con foto e descrizione già generata (vista risultato)
const ARTICOLO = process.env.ARTICOLO ?? "rotolo rete cotone h50";

let failures = 0;
function assert(cond, label, detail = "") {
  if (cond) {
    console.log("PASS | " + label);
  } else {
    failures++;
    console.log("FAIL | " + label + (detail ? " | " + detail : ""));
  }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-first-run", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login admin
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

  // Apro l'articolo col wizard
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(1500);
  const grid = page.locator('.view-toggle button[title="Vista griglia"]');
  if (await grid.count()) await grid.click();
  await page.waitForTimeout(500);
  const search = page.locator('input[placeholder*="Cerca articolo"]');
  if (await search.count()) { await search.fill(ARTICOLO); await page.waitForTimeout(800); }
  const modBtn = page.locator('.article-card:has-text("' + ARTICOLO.replace(/"/g, '\\"') + '") button:has-text("Modifica")');
  if (await modBtn.count()) await modBtn.first().click();
  await page.waitForTimeout(1500);
  const tab = page.locator(".modal-tab-btn:has-text('Descrizione AI')");
  if (await tab.count()) await tab.click();
  else await page.locator(".modal-tabs-bar select").selectOption("descrizione-ai");
  await page.waitForSelector(".wizard, .wizard-result", { timeout: 12000 });

  // Vista passi: se l'articolo ha già una descrizione, il wizard si apre in vista
  // risultato — clicco "Modifica" nel footer (stato locale, nessun salvataggio).
  const resultView = page.locator(".wizard-result");
  if (await resultView.count()) {
    const editBtn = resultView.locator(".wizard-result-footer button").filter({ hasText: /^Modifica$/ });
    if (await editBtn.count()) { await editBtn.first().click(); await page.waitForTimeout(400); }
  }
  await page.waitForSelector(".wizard-prompt", { timeout: 5000 });
  const prompt = page.locator(".wizard-prompt");
  const toggle = page.locator('.wizard-mic-btn[title="Spiegazione del passo"]');

  // attendo l'auto-hide iniziale (~8s dal mount) per avere il box chiuso
  await page.waitForTimeout(8500);
  assert(!(await prompt.isVisible()), "box chiuso dopo auto-hide (~8s)");

  // BUG CHECK: a box APERTO il bottone deve restare cliccabile e chiudere il box
  await toggle.click();
  await page.waitForTimeout(500);
  assert(await prompt.isVisible(), "toggle riapre il box");

  const geo = await page.evaluate(() => {
    const p = document.querySelector(".wizard-prompt");
    const t = document.querySelector('.wizard-mic-btn[title="Spiegazione del passo"]');
    const pb = p.getBoundingClientRect();
    const tb = t.getBoundingClientRect();
    const cx = tb.x + tb.width / 2, cy = tb.y + tb.height / 2;
    const el = document.elementFromPoint(cx, cy);
    return {
      promptBottom: pb.y + pb.height,
      toggleTop: tb.y,
      covered: pb.y <= cy && cy <= pb.y + pb.height && pb.x <= cx && cx <= pb.x + pb.width,
      topmost: el ? el.className.split(" ")[0] : "null",
    };
  });
  assert(
    !geo.covered || geo.topmost.includes("wizard-mic-btn"),
    "a box aperto il bottone NON è coperto dal box (clickabile)",
    `boxBottom=${Math.round(geo.promptBottom)} toggleTop=${Math.round(geo.toggleTop)} topmost=${geo.topmost}`,
  );

  await toggle.click();
  await page.waitForTimeout(500);
  assert(!(await prompt.isVisible()), "toggle chiude il box subito (senza attendere 8s)");

  await browser.close();
  console.log(failures === 0 ? "\nOK: nessun problema rilevato." : `\nBUG RIPRODOTTO: ${failures} verifica/e fallite.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRORE: " + e.message);
  process.exit(2);
});
