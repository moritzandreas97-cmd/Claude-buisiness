/* End-to-End-Test des MVP-Workflows im echten Browser (Chromium/Playwright).
 * Voraussetzung: Dev-Server läuft (npm run dev, Port 1420).
 * Aufruf: node tests/e2e/run-e2e.cjs [--shots <dir>]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const URL = process.env.PLANSTUDIO_URL || 'http://localhost:1420';
const shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const results = [];
let page;

async function step(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log(`✔ ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message }); console.log(`✘ ${name}\n   ${e.message}`); if (shotDir) await page.screenshot({ path: path.join(shotDir, `FAIL-${results.length}.png`) }); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const state = () => page.evaluate(() => {
  const s = window.__planstudio.useProject.getState();
  const d = s.data; const count = (t) => Object.keys(d[t]).length;
  return { project: s.project && s.project.name, floors: Object.values(d.floors).map((f) => f.name), walls: Object.values(d.components).filter((c) => c.type === 'wall').map((c) => c.geometry),
    doors: Object.values(d.components).filter((c) => c.type === 'door').length, windows: Object.values(d.components).filter((c) => c.type === 'window').length,
    rooms: Object.values(d.rooms).map((r) => ({ name: r.name, area: r.area_m2 })), objects: Object.values(d.plan_objects).map((o) => ({ type: o.type, circuit: o.circuit_id, room: o.room_id, label: o.label })),
    lines: Object.values(d.lines).map((l) => ({ t: l.line_type, len: l.length_mm, s: l.start_object_id, e: l.end_object_id })), circuits: Object.values(d.circuits).map((c) => c.designation),
    materials: Object.values(d.materials).map((m) => ({ name: m.name, qty: m.required_qty, src: m.source })), tasks: Object.values(d.tasks).map((t) => t.title),
    expenses: count('expenses'), symbols: count('schematic_symbols'), wires: count('schematic_wires'), undo: s.undoStack.length };
});
async function view() { return JSON.parse(await page.getAttribute('[data-testid=plan-canvas]', 'data-view')); }
async function toScreen(x, y) {
  const v = await view(); const box = await page.locator('[data-testid=plan-canvas]').boundingBox();
  return { x: box.x + v.ox + x * v.scale, y: box.y + v.oy - y * v.scale };
}
async function clickModel(x, y) { const p = await toScreen(x, y); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(120); }
async function moveModel(x, y) { const p = await toScreen(x, y); await page.mouse.move(p.x, p.y, { steps: 3 }); await page.waitForTimeout(60); }
async function tool(t) { await page.click(`[data-tool="${t}"]`); await page.waitForTimeout(80); }
async function download(trigger) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), trigger()]);
  const p = path.join(shotDir || '/tmp', dl.suggestedFilename()); await dl.saveAs(p); return { name: dl.suggestedFilename(), size: fs.statSync(p).size, path: p };
}

(async () => {
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(URL);
  await page.waitForFunction(() => window.__planstudio, null, { timeout: 15000 });

  await step('01 Projekt „Lebenswerk Adorf“ erstellen', async () => {
    await page.fill('[aria-label=Projektname]', 'Lebenswerk Adorf');
    await page.getByRole('button', { name: 'Projekt anlegen' }).click();
    await page.waitForSelector('[data-testid=project-name]');
    assert((await state()).project === 'Lebenswerk Adorf', 'Projektname falsch');
  });
  await step('02 Gebäude/Geschoss vorhanden + Geschoss anlegen', async () => {
    await page.click('[data-nav=building]');
    await page.getByRole('button', { name: 'Geschoss' }).first().click();
    await page.waitForTimeout(300);
    const s = await state();
    assert(s.floors.includes('Erdgeschoss') && s.floors.length === 2, 'Geschosse: ' + s.floors.join(','));
  });
  await step('03 Wände mit numerischer Länge zeichnen (5,00 × 4,00 m)', async () => {
    await page.click('[data-nav=plan]');
    await page.selectOption('[data-testid=floor-select]', { label: 'Erdgeschoss' });
    await page.waitForTimeout(300);
    await tool('wall');
    await clickModel(0, 0);
    await moveModel(3000, 0); await page.fill('[data-testid=wall-length]', '5000'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    await moveModel(5000, 2000); await page.fill('[data-testid=wall-length]', '4m'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    await moveModel(2000, 4000); await page.fill('[data-testid=wall-length]', '500cm'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    await moveModel(0, 2000); await clickModel(0, 0); // schließt am Startpunkt
    await page.waitForTimeout(300);
    const s = await state();
    assert(s.walls.length === 4, 'Anzahl Wände ' + s.walls.length);
    const lens = s.walls.map((g) => Math.round(Math.hypot(g.x2 - g.x1, g.y2 - g.y1))).sort();
    assert(JSON.stringify(lens) === JSON.stringify([4000, 4000, 5000, 5000]), 'Längen ' + lens);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, '03-walls.png') });
  });
  await step('04 Raum anlegen (Rechteck) – Fläche korrekt', async () => {
    await tool('room_rect');
    await clickModel(300, 300); await clickModel(4700, 3700);
    await page.waitForTimeout(300);
    const s = await state();
    assert(s.rooms.length === 1 && Math.abs(s.rooms[0].area - 14.96) < 0.01, 'Raum ' + JSON.stringify(s.rooms));
    await page.fill('[data-testid=properties] [aria-label=Name]', 'Küche'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    assert((await state()).rooms[0].name === 'Küche', 'Raumname nicht übernommen');
  });
  await step('05 Wand auswählen und Länge numerisch ändern (5000 → 5500)', async () => {
    await tool('select');
    await page.keyboard.press('Escape');
    await clickModel(2500, 0);
    await page.waitForSelector('text=Wand');
    await page.fill('[aria-label=Länge]', '5500'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const s = await state();
    const lens = s.walls.map((g) => Math.round(Math.hypot(g.x2 - g.x1, g.y2 - g.y1))).sort((a, b) => a - b);
    assert(lens.includes(5500), 'Länge nicht geändert: ' + lens);
    // angeschlossene Wand folgt: Ecke (5500,0) muss Endpunkt einer weiteren Wand sein
    assert(s.walls.filter((g) => (Math.abs(g.x1 - 5500) < 1 && Math.abs(g.y1) < 1) || (Math.abs(g.x2 - 5500) < 1 && Math.abs(g.y2) < 1)).length === 2, 'Anschlusswand folgt nicht');
  });
  await step('06 Undo/Redo der Längenänderung', async () => {
    await page.getByRole('button', { name: 'Rückgängig' }).click(); await page.waitForTimeout(300);
    let lens = (await state()).walls.map((g) => Math.round(Math.hypot(g.x2 - g.x1, g.y2 - g.y1)));
    assert(!lens.includes(5500), 'Undo wirkungslos: ' + lens);
    await page.getByRole('button', { name: 'Wiederholen' }).click(); await page.waitForTimeout(300);
    lens = (await state()).walls.map((g) => Math.round(Math.hypot(g.x2 - g.x1, g.y2 - g.y1)));
    assert(lens.includes(5500), 'Redo wirkungslos: ' + lens);
  });
  await step('07 Tür und Fenster platzieren', async () => {
    await tool('door'); await moveModel(1500, 0); await clickModel(1500, 0);
    await tool('window'); await moveModel(2750, 4000); await clickModel(2750, 4000);
    await page.waitForTimeout(300);
    const s = await state();
    assert(s.doors === 1 && s.windows === 1, `Türen ${s.doors}, Fenster ${s.windows}`);
  });
  await step('08 Tür bearbeiten (Breite 1010) + ungültige Breite wird abgelehnt', async () => {
    await tool('select'); await clickModel(1500, 0);
    await page.fill('[aria-label=Breite]', '1010'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const w = await page.evaluate(() => Object.values(window.__planstudio.useProject.getState().data.components).find((c) => c.type === 'door').geometry.width);
    assert(w === 1010, 'Breite ' + w);
    await page.fill('[aria-label=Breite]', '99999'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const w2 = await page.evaluate(() => Object.values(window.__planstudio.useProject.getState().data.components).find((c) => c.type === 'door').geometry.width);
    assert(w2 === 1010, 'Ungültige Breite übernommen: ' + w2);
    assert(await page.locator('[role=status]', { hasText: 'passt' }).count() > 0, 'Keine Fehlermeldung angezeigt');
  });
  await step('09 Stromkreis anlegen', async () => {
    await page.click('[data-nav=electrical]');
    await page.getByRole('tab', { name: 'Stromkreise' }).click();
    await page.getByRole('button', { name: 'Stromkreis' }).click(); await page.waitForTimeout(300);
    assert((await state()).circuits.includes('-F1'), 'Kein -F1');
  });
  await step('10 Elektroobjekte platzieren + Stromkreis zuordnen', async () => {
    await page.getByRole('tab', { name: 'Installationsplan' }).click(); await page.waitForTimeout(300);
    await tool('symbol');
    await page.selectOption('[aria-label="Aktiver Stromkreis"]', { label: '-F1 ' });
    await page.click('[data-symbol=socket]'); await clickModel(1000, 400); await clickModel(3000, 400);
    await page.click('[data-symbol=switch]'); await clickModel(2300, 600);
    await page.click('[data-symbol=light]'); await clickModel(2700, 2000);
    await page.waitForTimeout(300);
    const s = await state();
    const el = s.objects.filter((o) => ['socket', 'switch', 'light'].includes(o.type));
    assert(el.length === 4, 'Objekte ' + el.length);
    assert(el.every((o) => o.circuit && o.room), 'Stromkreis/Raum nicht zugeordnet: ' + JSON.stringify(el));
    assert(el.filter((o) => o.type === 'switch').length === 1 && el.filter((o) => o.type === 'light').length === 1, 'Typen ' + JSON.stringify(el));
    assert(el.filter((o) => o.type === 'socket').map((o) => o.label).sort().join() === '-XD1,-XD2', 'BMK ' + JSON.stringify(el));
  });
  await step('11 Elektroleitung zeichnen (Länge aus Weg)', async () => {
    await tool('line');
    await clickModel(1000, 400); await clickModel(3000, 400); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const l = (await state()).lines.find((x) => x.t === 'cable');
    assert(l && l.len === 2000 && l.s && l.e, 'Leitung ' + JSON.stringify(l));
  });
  await step('12 Sanitärobjekt + Kaltwasserleitung zeichnen', async () => {
    await page.click('[data-nav=sanitary]'); await page.waitForTimeout(300);
    await tool('symbol'); await page.click('[data-symbol=washbasin]'); await clickModel(4000, 3500);
    await tool('line'); await page.getByRole('button', { name: /Kaltwasser/ }).click();
    await clickModel(4000, 3500); await clickModel(4000, 2000); await clickModel(5000, 2000); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    const l = (await state()).lines.find((x) => x.t === 'cold');
    assert(l && l.len === 2500 && l.s, 'Kaltwasser ' + JSON.stringify(l));
    if (shotDir) await page.screenshot({ path: path.join(shotDir, '12-sanitary.png') });
  });
  await step('13 Stromlaufplan: Symbole + Verbindung speichern', async () => {
    await page.click('[data-nav=electrical]'); await page.getByRole('tab', { name: 'Stromlaufplan' }).click(); await page.waitForTimeout(400);
    const box = await page.locator('[data-testid=schematic-canvas]').boundingBox();
    await page.click('[data-schem-symbol=mcb]'); await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.click('[data-schem-symbol=light]'); await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.55);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Verbinden' }).click(); await page.waitForTimeout(200);
    const ports = page.locator('[data-port]');
    const ids = await ports.evaluateAll((els) => els.map((e) => e.getAttribute('data-port')));
    const syms = await page.evaluate(() => Object.values(window.__planstudio.useProject.getState().data.schematic_symbols).map((s) => ({ id: s.id, type: s.type })));
    const mcb = syms.find((s) => s.type === 'mcb').id, light = syms.find((s) => s.type === 'light').id;
    await page.locator(`[data-port="${mcb}:2"] circle`).click(); await page.locator(`[data-port="${light}:1"] circle`).click();
    await page.waitForTimeout(300);
    const s = await state();
    assert(s.symbols === 2 && s.wires === 1, `Symbole ${s.symbols}, Verbindungen ${s.wires} (Ports ${ids.length})`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, '13-schematic.png') });
  });
  await step('14 Materialbedarf aus Planung erzeugen (ohne Doppelzählung)', async () => {
    await page.click('[data-nav=materials]');
    await page.getByRole('button', { name: 'Bedarf aus Planung' }).click(); await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Bedarf aus Planung' }).click(); await page.waitForTimeout(300);
    const m = (await state()).materials;
    const sockets = m.filter((x) => x.name === 'Schutzkontaktsteckdose (Einsatz)');
    assert(sockets.length === 1 && sockets[0].qty === 2, 'Steckdosen ' + JSON.stringify(sockets));
    const cable = m.find((x) => x.name.startsWith('Elektroleitung'));
    assert(cable && cable.qty === 2, 'Kabel ' + JSON.stringify(cable));
    const cold = m.find((x) => x.name.startsWith('Kaltwasser'));
    assert(cold && cold.qty === 2.5, 'Kaltwasser ' + JSON.stringify(cold));
    await page.getByRole('button', { name: 'Material', exact: true }).click(); await page.waitForTimeout(300);
    assert((await state()).materials.length === m.length + 1, 'Manuelles Material nicht angelegt');
  });
  await step('15 Aufgabe erstellen', async () => {
    await page.click('[data-nav=tasks]');
    await page.getByRole('button', { name: 'Aufgabe', exact: true }).click();
    await page.fill('[role=dialog] [aria-label=Titel]', 'Steckdosen Küche setzen');
    await page.selectOption('[role=dialog] [aria-label=Raum]', { label: 'Erdgeschoss · Küche' });
    await page.locator('[role=dialog]').getByRole('button', { name: 'Speichern', exact: true }).click(); await page.waitForTimeout(300);
    assert((await state()).tasks.includes('Steckdosen Küche setzen'), 'Aufgabe fehlt');
  });
  await step('16 Kosten erfassen', async () => {
    await page.click('[data-nav=costs]');
    await page.fill('[aria-label="Ausgabe Beschreibung"]', 'Baumarkt Rechnung');
    await page.fill('[aria-label="Ausgabe Betrag"]', '123,45');
    await page.getByRole('button', { name: 'Erfassen' }).click(); await page.waitForTimeout(300);
    assert((await state()).expenses === 1, 'Ausgabe fehlt');
  });
  let before;
  await step('17 Speichern, Neustart (Reload), Datenbestand identisch', async () => {
    await page.click('header [aria-label=Speichern]'); await page.waitForTimeout(800);
    before = await state(); delete before.undo;
    await page.reload(); await page.waitForFunction(() => window.__planstudio && window.__planstudio.useProject.getState().project, null, { timeout: 15000 });
    const after = await state(); delete after.undo;
    const a = JSON.stringify(before), b = JSON.stringify(after);
    assert(a === b, 'Abweichung nach Neustart:\n' + a.slice(0, 400) + '\n' + b.slice(0, 400));
  });
  await step('18 Grundriss als PDF und SVG exportieren', async () => {
    await page.click('[data-nav=reports]'); await page.waitForTimeout(300);
    const pdf = await download(() => page.getByRole('button', { name: 'PDF exportieren' }).click());
    const head = fs.readFileSync(pdf.path).subarray(0, 5).toString();
    assert(head === '%PDF-' && pdf.size > 3000, `PDF ungültig ${pdf.name} ${pdf.size}`);
    const svg = await download(() => page.getByRole('button', { name: 'SVG exportieren' }).click());
    const txt = fs.readFileSync(svg.path, 'utf8');
    assert(txt.includes('M 1:') && txt.includes('width="297mm"'), 'SVG ohne Maßstab/Papiermaß');
    console.log(`   ${pdf.name} (${pdf.size} B), ${svg.name}`);
  });
  await step('19 Materialliste und Aufgabenliste als CSV exportieren', async () => {
    const m = await download(() => page.getByRole('button', { name: 'Materialliste' }).click());
    const txt = fs.readFileSync(m.path, 'utf8');
    assert(txt.includes('Schutzkontaktsteckdose (Einsatz)') && txt.includes('PREIS FEHLT'), 'CSV-Inhalt');
    const t = await download(() => page.getByRole('button', { name: 'Aufgabenliste' }).click());
    assert(fs.readFileSync(t.path, 'utf8').includes('Steckdosen Küche setzen'), 'Aufgaben-CSV');
  });
  await step('20 Projektbackup erstellen und als Kopie wiederherstellen', async () => {
    const b = await download(() => page.getByRole('button', { name: 'Projektbackup erstellen' }).click());
    const json = JSON.parse(fs.readFileSync(b.path, 'utf8'));
    assert(json.format === 'lebenswerk-planstudio-backup' && json.tables.components.length === 6, 'Backupinhalt');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Backup wiederherstellen' }).click()]);
    await chooser.setFiles(b.path); await page.waitForTimeout(800);
    const n = await page.evaluate(() => window.__planstudio.useProject.getState().projects.length);
    assert(n === 2, 'Projekte nach Wiederherstellung: ' + n);
  });
  await step('21 Touch-Viewport (Tablet quer) rendert Editor', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.click('[data-nav=plan]'); await page.waitForTimeout(300);
    assert(await page.locator('[data-testid=plan-canvas]').isVisible(), 'Canvas nicht sichtbar');
    if (shotDir) await page.screenshot({ path: path.join(shotDir, '21-tablet.png') });
  });
  if (errors.length) results.push({ name: 'Keine JavaScript-Laufzeitfehler', ok: false, error: errors.join(' | ') });
  else results.push({ name: 'Keine JavaScript-Laufzeitfehler', ok: true });
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} bestanden`);
  fs.writeFileSync(path.join(shotDir || '/tmp', 'e2e-results.json'), JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
