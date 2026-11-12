/* Test der installierten Windows-App (WebView2) über das DevTools-Protokoll.
 * Die App öffnet nur bei gesetzter Variable PLANSTUDIO_TEST_DEVTOOLS_PORT einen lokalen WebView2-DevTools-Port.
 * Aufruf: node tests/e2e/windows-smoke.cjs <pfad\zur\planstudio.exe> [ergebnis-ordner]
 * Prüft: Start, SQLite-Datei, Projekt/Wand/Aufgabe, PDF-Export, Projektbackup, Projektimport (echte Datei),
 *        hartes Beenden (Absturzsimulation) → Integrität der SQLite-Datei, Neustart ohne Datenverlust.
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXE = process.argv[2];
const OUT = path.resolve(process.argv[3] || 'windows-results');
const DATA = path.join(process.env.APPDATA, 'de.lebenswerk.adorf.planstudio');
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
fs.mkdirSync(OUT, { recursive: true });
const assert = (c, m) => { if (!c) throw new Error(m); };
const sql = (q) => JSON.parse(execFileSync('python', ['-c', 'import sqlite3,json,sys;c=sqlite3.connect(sys.argv[1]);print(json.dumps(c.execute(sys.argv[2]).fetchall()))', path.join(DATA, 'planstudio.sqlite'), q]).toString());

let proc, ws, seq = 0;
const pending = new Map();
async function launch() {
  proc = spawn(EXE, [], { env: { ...process.env, PLANSTUDIO_TEST_DEVTOOLS_PORT: String(PORT) }, stdio: 'ignore', detached: false });
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page' && !t.url.startsWith('devtools')); } catch { /* */ }
    if (!target) await sleep(1000);
  }
  assert(target, 'WebView2-DevTools nicht erreichbar (App nicht gestartet?)');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
}
async function stopHard() { try { ws.close(); } catch { /* */ } try { execFileSync('taskkill', ['/PID', String(proc.pid), '/T', '/F']); } catch { /* */ } await sleep(2500); }
const cdp = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq; pending.set(id, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
async function ev(expression) {
  const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
async function waitFor(expr, ms = 15000, what = expr) {
  const t0 = Date.now();
  for (;;) { if (await ev(expr).catch(() => false)) return; if (Date.now() - t0 > ms) throw new Error('Zeitüberschreitung: ' + what); await sleep(300); }
}
const q = (s) => JSON.stringify(s);
const sel = (s) => `document.querySelector(${q(s)})`;
const btn = (text, scope = 'document') => `[...${scope}.querySelectorAll('button')].find((b) => b.textContent.trim() === ${q(text)})`;
async function tapAt(x, y) { for (const type of ['mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); await sleep(250); }
async function rectOf(js) { const r = await ev(`(() => { const e = ${js}; if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`); assert(r, 'Element nicht gefunden: ' + js); return r; }
async function tap(js) { const r = await rectOf(js); await tapAt(r.x, r.y); }
async function setValue(s, v) {
  await ev(`(() => { const e = ${sel(s)}; const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, ${q(v)}); e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
}
const enter = (s) => ev(`${sel(s)}.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
const toasts = () => ev(`[...document.querySelectorAll('[role=status]')].map((t) => t.textContent).join(' | ')`);
async function lastSavedPath() { const t = await toasts(); const m = [...t.matchAll(/Gespeichert: ([^|]+)/g)].pop(); assert(m, 'Kein Speicherpfad: ' + t); return m[1].trim(); }
async function shot(name) { try { const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64')); } catch { /* */ } }
async function step(name, fn) {
  try { const note = await fn(); results.push({ name, ok: true, note }); console.log('✔', name, note ? `– ${note}` : ''); }
  catch (e) { results.push({ name, ok: false, error: e.message }); console.log('✘', name, '\n  ', e.message); await shot(`FAIL-${results.length}.png`); }
}

(async () => {
  fs.rmSync(DATA, { recursive: true, force: true });
  let backup = null;
  await step('Installierte App startet, SQLite-Datei wird angelegt', async () => {
    await launch();
    await waitFor(`!!${sel('[aria-label=Projektname]')}`, 30000, 'Startbildschirm');
    assert(fs.existsSync(path.join(DATA, 'planstudio.sqlite')), 'Datenbankdatei fehlt in ' + DATA);
    await shot('01-start.png');
    return `${await ev('navigator.userAgent.match(/Edg\\/[\\d.]+/)?.[0] ?? ""')} · ${DATA}`;
  });
  await step('Projekt „Lebenswerk Adorf“ anlegen', async () => {
    await setValue('[aria-label=Projektname]', 'Lebenswerk Adorf');
    await tap(btn('Projekt anlegen'));
    await waitFor(`${sel('[data-testid=project-name]')}?.textContent === 'Lebenswerk Adorf'`);
  });
  await step('Wand mit Längeneingabe 4,25 m', async () => {
    await tap(sel('[data-nav=plan]'));
    await tap(sel('[data-tool=wall]'));
    const c = await rectOf(sel('[data-testid=plan-canvas]'));
    await tapAt(c.x - 200, c.y);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x + 100, y: c.y });
    await waitFor(`!!${sel('[data-testid=wall-length]')}`);
    await setValue('[data-testid=wall-length]', '4,25m');
    await enter('[data-testid=wall-length]');
    await waitFor(`document.querySelectorAll('polygon[data-kind=components]').length === 1`, 8000, 'Wand im Plan');
    await shot('02-wall.png');
  });
  await step('Aufgabe anlegen', async () => {
    await tap(sel('[data-nav=tasks]'));
    await tap(btn('Aufgabe'));
    await setValue('[role=dialog] [aria-label=Titel]', 'Elektrik Bestand prüfen');
    await tap(btn('Speichern', sel('[role=dialog]')));
    await waitFor(`document.body.textContent.includes('Elektrik Bestand prüfen') && !document.querySelector('[role=dialog]')`);
  });
  await step('PDF-Export in den Exportordner', async () => {
    await tap(sel('[data-nav=reports]'));
    await tap(btn('PDF exportieren'));
    await waitFor(`[...document.querySelectorAll('[role=status]')].some((t) => t.textContent.includes('.pdf'))`, 20000, 'Exportmeldung');
    const p = await lastSavedPath();
    assert(fs.readFileSync(p).subarray(0, 5).toString() === '%PDF-', 'keine PDF: ' + p);
    return p;
  });
  await step('Projektbackup erstellen', async () => {
    await sleep(500);
    await tap(btn('Projektbackup erstellen'));
    await waitFor(`[...document.querySelectorAll('[role=status]')].some((t) => t.textContent.includes('.json'))`, 20000, 'Backupmeldung');
    backup = await lastSavedPath();
    const j = JSON.parse(fs.readFileSync(backup, 'utf8'));
    assert(j.format === 'lebenswerk-planstudio-backup' && j.tables.tasks.length === 1, 'Inhalt');
    return backup;
  });
  await step('Projektimport aus Sicherungsdatei (Dateifeld mit echtem Dateipfad)', async () => {
    const { root } = await cdp('DOM.getDocument', {});
    const { nodeId } = await cdp('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-testid=restore-input]' });
    await cdp('DOM.setFileInputFiles', { nodeId, files: [backup] });
    await waitFor(`[...document.querySelectorAll('[role=status]')].some((t) => t.textContent.includes('wiederhergestellt'))`, 20000, 'Importmeldung');
    const n = sql('select count(*) from projects')[0][0];
    assert(n === 2, 'Projekte nach Import: ' + n);
    return `${n} Projekte in SQLite`;
  });
  await step('Hartes Beenden (Absturzsimulation) → SQLite-Datei konsistent', async () => {
    await stopHard();
    const ic = sql('pragma integrity_check')[0][0];
    const walls = sql("select geometry from components where type='wall'");
    const tasks = sql('select title from tasks');
    assert(ic === 'ok', 'integrity_check: ' + ic);
    assert(walls.length === 2 && tasks.length === 2, `Wände ${walls.length}, Aufgaben ${tasks.length}`);
    const g = JSON.parse(walls[0][0]);
    assert(Math.abs(Math.hypot(g.x2 - g.x1, g.y2 - g.y1) - 4250) < 0.5, 'Wandlänge');
    return 'integrity_check ok · 2 Projekte · Daten vollständig';
  });
  await step('Neustart: letztes Projekt geöffnet, Daten vorhanden, Startsicherung angelegt', async () => {
    await launch();
    await waitFor(`${sel('[data-testid=project-name]')}?.textContent === 'Lebenswerk Adorf'`, 30000, 'Projekt nach Neustart');
    await tap(sel('[data-nav=tasks]'));
    await waitFor(`document.body.textContent.includes('Elektrik Bestand prüfen')`);
    await tap(sel('[data-nav=plan]'));
    await waitFor(`document.querySelectorAll('polygon[data-kind=components]').length === 1`, 8000, 'Wand nach Neustart');
    const b = fs.readdirSync(path.join(DATA, 'backups')).filter((f) => f.startsWith('planstudio-auto-'));
    assert(b.length >= 1, 'keine Startsicherung');
    await shot('03-restart.png');
    await stopHard();
  });
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} bestanden`);
  fs.writeFileSync(path.join(OUT, 'windows-results.json'), JSON.stringify(results, null, 2));
  process.exit(failed ? 1 : 0);
})();
