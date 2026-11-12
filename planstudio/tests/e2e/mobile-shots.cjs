/* Bildschirmfotos und Prüfungen in Smartphone-Größe (360×800 CSS-px, Touch) – Dev-Server auf :1420.
 * Aufruf: node tests/e2e/mobile-shots.cjs <ergebnis-ordner> [projektdatei.lapb.json]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'mobile');
const FILE = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const assert = (c, m) => { if (!c) throw new Error(m); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
  const noHScroll = async (where) => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert(w[0] <= w[1] + 1, `${where}: Seite breiter als Bildschirm (${w[0]} > ${w[1]})`);
  };
  async function step(name, fn) {
    try { await fn(); results.push({ name, ok: true }); console.log('✔', name); }
    catch (e) { results.push({ name, ok: false, error: e.message }); console.log('✘', name, '\n  ', e.message); await shot(`FAIL-${results.length}.png`); }
  }
  const nav = async (id) => {
    await page.click('[aria-label="Menü öffnen"]');
    await page.click(`[data-nav=${id}]`);
    await page.waitForTimeout(350);
  };

  await page.goto('http://localhost:1420');
  await page.waitForFunction(() => window.__planstudio);
  await step('Startseite', async () => { await shot('m01-start.png'); await noHScroll('Start'); });
  await step('Projekt laden/anlegen', async () => {
    if (FILE) { await page.setInputFiles('[data-testid=restore-input]', FILE); await page.waitForTimeout(1200); await page.getByRole('button', { name: 'Öffnen' }).first().click(); }
    else { await page.fill('[aria-label=Projektname]', 'Lebenswerk Adorf'); await page.getByRole('button', { name: 'Projekt anlegen' }).click(); }
    await page.waitForSelector('[data-testid=project-name]');
    await shot('m02-dashboard.png'); await noHScroll('Dashboard');
    assert(!(await page.locator('nav[aria-label=Module]').isVisible()), 'Navigation belegt dauerhaft Platz');
  });
  await step('Menü (ausklappbar)', async () => {
    await page.click('[aria-label="Menü öffnen"]'); await page.waitForTimeout(250);
    await shot('m03-menu.png');
    await page.click('[data-nav=bestand]'); await page.waitForTimeout(300);
    await shot('m04-bestand.png'); await noHScroll('Bestandsaufnahme');
  });
  for (const tab of ['Raumkarten', 'Verbindungen', 'Graph', 'Quellen']) {
    await step('Bestandsaufnahme: ' + tab, async () => { await page.getByRole('tab', { name: tab }).click(); await page.waitForTimeout(300); await shot(`m05-${tab}.png`); if (tab !== 'Graph') await noHScroll(tab); });
  }
  await step('Planungsstudio: Plan + Werkzeuge', async () => {
    await nav('plan');
    await shot('m06-plan.png');
    const canvas = await page.locator('[data-testid=plan-canvas]').boundingBox();
    assert(canvas.width >= 280, 'Zeichenfläche zu schmal: ' + canvas.width);
    await noHScroll('Plan');
  });
  await step('Planungsstudio: Eigenschaften als Bottom-Sheet', async () => {
    await page.click('[aria-label="Eigenschaften anzeigen"]'); await page.waitForTimeout(300);
    await shot('m07-sheet.png');
    const sheet = await page.locator('[data-testid=properties]').boundingBox();
    assert(sheet && sheet.width >= 350, 'Eigenschaften nicht in voller Breite');
    await page.click('[aria-label="Eigenschaften schließen"]'); await page.waitForTimeout(250);
  });
  await step('Elektro-Symbolleiste einzeilig', async () => {
    await nav('electrical');
    await page.click('[data-tool=symbol]'); await page.waitForTimeout(250);
    await shot('m08-elektro.png');
  });
  await step('Aufgaben, Materialien, Kosten', async () => {
    for (const m of ['tasks', 'materials', 'costs']) { await nav(m); await shot(`m09-${m}.png`); await noHScroll(m); }
  });
  results.push({ name: 'Keine JS-Fehler', ok: errors.length === 0, error: errors.join(' | ') });
  await b.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} bestanden`, failed.length ? JSON.stringify(failed) : '');
  process.exit(failed.length ? 1 : 0);
})();
