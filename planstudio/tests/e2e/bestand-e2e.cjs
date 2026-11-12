/* E2E: Import der Adorf-Bestandsrekonstruktion und Rekonstruktionswerkzeuge (Browser, Dev-Server auf :1420).
 * Aufruf: node tests/e2e/bestand-e2e.cjs [ergebnis-ordner]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'bestand-e2e');
fs.mkdirSync(OUT, { recursive: true });
// Projektdatei (nicht im Repository) als 3. Argument oder Standardpfad
const FILE = path.resolve(process.argv[3] || path.join(__dirname, '../../data/Lebenswerk-Adorf-Bestandsrekonstruktion.lapb.json'));
const results = [];
let page;
let expectedRooms = 0, expectedLinks = 0;
const assert = (c, m) => { if (!c) throw new Error(m); };
async function step(name, fn) {
  try { const n = await fn(); results.push({ name, ok: true }); console.log('✔', name, n ? '– ' + n : ''); }
  catch (e) { results.push({ name, ok: false, error: e.message }); console.log('✘', name, '\n  ', e.message); await page.screenshot({ path: path.join(OUT, `FAIL-${results.length}.png`) }); }
}
const st = () => page.evaluate(() => {
  const d = window.__planstudio.useProject.getState().data;
  return { rooms: Object.values(d.rooms), links: Object.values(d.room_links), refs: Object.values(d.source_refs), floors: Object.values(d.floors) };
});

(async () => {
  const b = await chromium.launch();
  page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto('http://localhost:1420');
  await page.waitForFunction(() => window.__planstudio);

  await step('Importdatei über „Sicherung laden“', async () => {
    await page.setInputFiles('[data-testid=restore-input]', FILE);
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Öffnen' }).first().click();
    await page.waitForSelector('[data-testid=project-name]');
    const s = await st();
    assert(s.rooms.length > 0 && s.rooms.every((r) => !r.polygon), `${s.rooms.length} Räume, ${s.links.length} Verbindungen`);
    expectedRooms = s.rooms.length; expectedLinks = s.links.length;
    return page.textContent('[data-testid=project-name]');
  });

  await step('Bestandsaufnahme: Übersicht, Quellen, Raumkarten, Verbindungen, Graph', async () => {
    await page.click('[data-nav=bestand]'); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'b1-uebersicht.png') });
    await page.getByRole('tab', { name: 'Quellen' }).click(); await page.waitForTimeout(200);
    assert(await page.locator('tbody tr').count() > 0, 'Quellenliste leer');
    await page.screenshot({ path: path.join(OUT, 'b2-quellen.png'), fullPage: true });
    await page.getByRole('tab', { name: 'Raumkarten' }).click(); await page.waitForTimeout(200);
    await page.locator('tbody tr').first().click(); await page.waitForTimeout(200);
    assert(await page.locator('[data-testid=evidence] .font-medium').count() >= 1, 'Quellenverweis in Raumdetails fehlt');
    await page.screenshot({ path: path.join(OUT, 'b3-raumkarten.png'), fullPage: true });
    await page.getByRole('tab', { name: 'Verbindungen' }).click(); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, 'b4-verbindungen.png'), fullPage: true });
    await page.getByRole('tab', { name: 'Graph' }).click(); await page.waitForTimeout(300);
    assert((await page.locator('[data-testid=link-graph] path').count()) + (await page.locator('[data-testid=link-graph] [data-ext-link]').count()) === expectedLinks, 'Graph-Kanten');
    await page.screenshot({ path: path.join(OUT, 'b5-graph.png'), fullPage: true });
  });

  await step('Planungsstudio: unplatzierte Karten, „Flur 1“ einzeichnen', async () => {
    await page.click('[data-nav=plan]');
    await page.selectOption('[data-testid=floor-select]', { label: 'OG' }); await page.waitForTimeout(400);
    const n = await page.locator('[data-testid=unplaced-card]').count();
    assert(n === expectedRooms, 'Karten ' + n);
    await page.locator('[data-testid=unplaced-card]', { hasText: 'Flur 1' }).getByRole('button').click();
    await page.waitForSelector('[data-testid=place-banner]');
    const box = await page.locator('[data-testid=plan-canvas]').boundingBox();
    for (const [x, y] of [[0.3, 0.4], [0.6, 0.5]]) { await page.mouse.click(box.x + box.width * x, box.y + box.height * y); await page.waitForTimeout(250); }
    const s = await st();
    const f = s.rooms.find((r) => r.name === 'Flur 1');
    assert(f.polygon && f.polygon.length === 4 && f.certainty === 'nutzerangabe' && s.rooms.length === expectedRooms, 'Raum nicht platziert / neue Karte entstanden');
    assert(await page.locator('[data-testid=unplaced-card]').count() === expectedRooms - 1, 'Karte noch in Liste');
    await page.screenshot({ path: path.join(OUT, 'b6-plan.png') });
    return `${f.area_m2} m² (gezeichnet, nicht vermessen)`;
  });

  await step('Hintergrundbild für „Außenübersicht A–F“ importieren', async () => {
    await page.selectOption('[data-testid=floor-select]', { label: 'Außenübersicht A–F' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const png = path.join(OUT, 'luftbild-test.png');
    await page.screenshot({ path: png, clip: { x: 300, y: 200, width: 600, height: 380 } });
    await page.setInputFiles('[data-testid=background-input]', png); await page.waitForTimeout(800);
    const s = await st();
    const fl = s.floors.find((f) => f.name.startsWith('Außenübersicht'));
    assert(fl.background && fl.background.visible, 'Hintergrund nicht gesetzt');
    await page.getByRole('button', { name: 'Alles zeigen' }).click(); await page.waitForTimeout(500);
    assert(await page.locator('[data-testid=plan-canvas] image').count() === 1, 'Bild nicht im Plan');
    await page.screenshot({ path: path.join(OUT, 'b7-hintergrund.png') });
  });

  await step('Status im Eigenschaftenfenster ändern, Undo', async () => {
    await page.selectOption('[data-testid=floor-select]', { label: 'OG' }); await page.waitForTimeout(400);
    const f = (await st()).rooms.find((r) => r.name === 'Flur 1');
    await page.evaluate((id) => window.__planstudio.useUi.getState().select([{ table: 'rooms', id }]), f.id); await page.waitForTimeout(300);
    await page.selectOption('[data-testid=properties] [aria-label="Status / Sicherheit"]', 'bestaetigt'); await page.waitForTimeout(300);
    assert((await st()).rooms.find((r) => r.id === f.id).certainty === 'bestaetigt', 'Status nicht gesetzt');
    await page.getByRole('button', { name: 'Rückgängig' }).click(); await page.waitForTimeout(300);
    assert((await st()).rooms.find((r) => r.id === f.id).certainty === 'nutzerangabe', 'Undo wirkungslos');
    await page.screenshot({ path: path.join(OUT, 'b8-props.png') });
  });

  await step('Neustart: Platzierung und Hintergrund bleiben erhalten', async () => {
    await page.click('header [aria-label=Speichern]'); await page.waitForTimeout(800);
    await page.reload();
    await page.waitForFunction(() => window.__planstudio && window.__planstudio.useProject.getState().project);
    const s = await st();
    assert(s.rooms.find((r) => r.name === 'Flur 1').polygon, 'Polygon verloren');
    assert(s.floors.some((f) => f.background), 'Hintergrund verloren');
  });

  results.push({ name: 'Keine JS-Fehler', ok: errors.length === 0, error: errors.join(' | ') });
  await b.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} bestanden`, failed.length ? JSON.stringify(failed) : '');
  process.exit(failed.length ? 1 : 0);
})();
