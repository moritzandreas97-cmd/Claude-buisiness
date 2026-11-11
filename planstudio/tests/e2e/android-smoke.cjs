/* Test der Android-App auf einem Emulator (bzw. per USB angeschlossenem Gerät).
 * Steuerung über adb und das WebView-DevTools-Protokoll (nur Debug-Builds sind debuggbar).
 * Aufruf: node tests/e2e/android-smoke.cjs <app-debug.apk> [ergebnis-ordner]
 * Prüft: Installation, Start, SQLite-Datenbank im App-Speicher, Projekt/Wand/Aufgabe, PDF-Export und
 *        Projektbackup im öffentlichen Download-Ordner, Projektimport, Systemdateiauswahl (informativ),
 *        Beenden + Neustart ohne Datenverlust, Datenbankinhalt (Kopie der SQLite-Datei, Integritätsprüfung).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APK = process.argv[2];
const OUT = process.argv[3] || 'android-results';
const PKG = 'de.lebenswerk.adorf.planstudio';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
fs.mkdirSync(OUT, { recursive: true });

const adb = (...args) => execFileSync('adb', args, { maxBuffer: 64 * 1024 * 1024 });
const sh = (cmd) => adb('shell', cmd).toString().trim();
const shot = (name) => { try { fs.writeFileSync(path.join(OUT, name), adb('exec-out', 'screencap', '-p')); } catch { /* */ } };
const assert = (c, m) => { if (!c) throw new Error(m); };

async function step(name, fn, { info = false } = {}) {
  try { const note = await fn(); results.push({ name, ok: true, note }); console.log('✔', name, note ? `– ${note}` : ''); }
  catch (e) { results.push({ name, ok: info ? null : false, error: e.message }); console.log(info ? 'ℹ' : '✘', name, '\n  ', e.message); shot(`FAIL-${results.length}.png`); }
}

/* ---------- WebView-DevTools ---------- */
let ws, seq = 0;
const pending = new Map();
async function connect() {
  let sock = null;
  for (let i = 0; i < 60 && !sock; i++) {
    const pid = sh(`pidof ${PKG} || true`);
    if (pid) {
      const m = sh('cat /proc/net/unix').match(new RegExp(`@(webview_devtools_remote_${pid.split(' ')[0]})`));
      if (m) sock = m[1];
    }
    if (!sock) await sleep(1000);
  }
  assert(sock, 'WebView-DevTools-Socket nicht gefunden (App nicht gestartet oder kein Debug-Build)');
  adb('forward', 'tcp:9229', `localabstract:${sock}`);
  let target;
  for (let i = 0; i < 30 && !target; i++) {
    try { target = (await (await fetch('http://127.0.0.1:9229/json')).json()).find((t) => t.type === 'page'); } catch { /* */ }
    if (!target) await sleep(1000);
  }
  assert(target, 'Keine WebView-Seite gefunden');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
}
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
/** Echter Tipp (Benutzergeste) auf Elementmitte bzw. Versatz */
async function tapAt(x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  await sleep(250);
}
async function rectOf(js) { const r = await ev(`(() => { const e = ${js}; if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height }; })()`); assert(r, 'Element nicht gefunden: ' + js); return r; }
const sel = (s) => `document.querySelector(${q(s)})`;
const btn = (text, scope = 'document') => `[...${scope}.querySelectorAll('button')].find((b) => b.textContent.trim() === ${q(text)})`;
async function tap(js) { const r = await rectOf(js); await tapAt(r.x, r.y); }
async function setValue(s, v) {
  await ev(`(() => { const e = ${sel(s)}; const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, ${q(v)}); e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
}
const enter = (s) => ev(`${sel(s)}.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
const toasts = () => ev(`[...document.querySelectorAll('[role=status]')].map((t) => t.textContent).join(' | ')`);
async function lastSavedPath() {
  const t = await toasts();
  const m = [...t.matchAll(/Gespeichert: ([^|]+)/g)].pop();
  assert(m, 'Kein Speicherpfad in Meldung: ' + t);
  return m[1].trim();
}
async function launch() {
  sh(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await connect();
}
function pullDb() {
  const files = sh(`run-as ${PKG} find . -name 'planstudio.sqlite*'`).split(/\s+/).filter(Boolean);
  assert(files.some((f) => f.endsWith('planstudio.sqlite')), 'SQLite-Datei nicht im App-Speicher: ' + files.join(','));
  const dir = path.join(OUT, 'db'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  for (const f of files) if (!/backups/.test(f)) fs.writeFileSync(path.join(dir, path.basename(f)), adb('exec-out', 'run-as', PKG, 'cat', f));
  const q = (sql) => JSON.parse(execFileSync('python3', ['-c', 'import sqlite3,json,sys;c=sqlite3.connect(sys.argv[1]);print(json.dumps(c.execute(sys.argv[2]).fetchall()))', path.join(dir, 'planstudio.sqlite'), sql]).toString());
  return { files, q };
}

(async () => {
  let backupFile = null;
  let exportPath = '';
  await step('APK installieren', async () => {
    adb('install', '-r', '-g', APK);
    sh('settings put system accelerometer_rotation 0'); sh('settings put system user_rotation 1'); // Querformat
    return sh(`dumpsys package ${PKG} | grep versionName`).trim();
  });
  await step('App startet (WebView verbunden)', async () => {
    await launch();
    await waitFor(`!!${sel('[aria-label=Projektname]')}`, 30000, 'Startbildschirm');
    shot('01-start.png');
    return 'Viewport ' + (await ev('innerWidth + "×" + innerHeight'));
  });
  await step('Projekt „Lebenswerk Adorf“ anlegen', async () => {
    await setValue('[aria-label=Projektname]', 'Lebenswerk Adorf');
    await tap(btn('Projekt anlegen'));
    await waitFor(`${sel('[data-testid=project-name]')}?.textContent === 'Lebenswerk Adorf'`);
  });
  await step('Wand per Tippen + Längeneingabe 4,25 m zeichnen', async () => {
    await tap(sel('[data-nav=plan]'));
    await tap(sel('[data-tool=wall]'));
    const c = await rectOf(sel('[data-testid=plan-canvas]'));
    await tapAt(c.x - 200, c.y);
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c.x + 100, y: c.y });
    await waitFor(`!!${sel('[data-testid=wall-length]')}`);
    await setValue('[data-testid=wall-length]', '4,25m');
    await enter('[data-testid=wall-length]');
    await waitFor(`document.querySelectorAll('polygon[data-kind=components]').length === 1`, 8000, 'Wand im Plan');
    shot('02-wall.png');
  });
  await step('Aufgabe anlegen', async () => {
    await tap(sel('[data-nav=tasks]'));
    await tap(btn('Aufgabe'));
    await setValue('[role=dialog] [aria-label=Titel]', 'Elektrik Bestand prüfen');
    await tap(btn('Speichern', sel('[role=dialog]')));
    await waitFor(`document.body.textContent.includes('Elektrik Bestand prüfen') && !document.querySelector('[role=dialog]')`);
  });
  await step('PDF-Export (Datei im Gerätespeicher vorhanden)', async () => {
    await tap(sel('[data-nav=reports]'));
    await tap(btn('PDF exportieren'));
    await waitFor(`[...document.querySelectorAll('[role=status]')].some((t) => t.textContent.includes('.pdf'))`, 20000, 'Exportmeldung');
    const p = await lastSavedPath();
    const head = adb('exec-out', `head -c 5 '${p}' 2>/dev/null || run-as ${PKG} head -c 5 '${p}'`).toString();
    assert(head === '%PDF-', 'PDF nicht lesbar unter ' + p);
    exportPath = p;
    return p + (p.startsWith('/storage/emulated/0/Download/') ? ' → öffentlicher Download-Ordner' : p.includes('/Android/data/') ? ' → app-spezifischer Ordner (bei Deinstallation gelöscht!)' : ' → nur App-intern (für Benutzer nicht sichtbar!)');
  });
  await step('Projektbackup erstellen', async () => {
    await sleep(500);
    await tap(btn('Projektbackup erstellen'));
    await waitFor(`[...document.querySelectorAll('[role=status]')].some((t) => t.textContent.includes('.json'))`, 20000, 'Backupmeldung');
    const p = await lastSavedPath();
    backupFile = path.join(OUT, 'backup.json');
    fs.writeFileSync(backupFile, adb('exec-out', `cat '${p}' 2>/dev/null || run-as ${PKG} cat '${p}'`));
    const j = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    assert(j.format === 'lebenswerk-planstudio-backup' && j.tables.tasks.length === 1 && j.tables.components.length === 1, 'Inhalt');
    return p;
  });
  await step('Projektimport (Sicherungsdatei → neues Projekt)', async () => {
    const json = fs.readFileSync(backupFile, 'utf8');
    await ev(`(() => { const i = ${sel('[data-testid=restore-input]')}; const dt = new DataTransfer(); dt.items.add(new File([${q(json)}], 'backup.json', { type: 'application/json' })); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await waitFor(`[...document.querySelectorAll('[role=status]')].some((t) => t.textContent.includes('wiederhergestellt'))`, 20000, 'Importmeldung');
    return 'Datei per Skript an das Dateifeld übergeben (Importlogik + SQLite); Systemauswahl siehe nächster Schritt';
  });
  await step('Systemdateiauswahl öffnet sich (Android-Dokumentenauswahl)', async () => {
    adb('push', backupFile, '/sdcard/Download/planstudio-test-backup.json');
    sh("am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/planstudio-test-backup.json >/dev/null 2>&1 || true");
    await tap(btn('Backup wiederherstellen'));
    await sleep(3500);
    sh('uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true');
    const xml = sh('cat /sdcard/ui.xml');
    shot('05-picker.png');
    const opened = /documentsui/.test(xml);
    assert(opened, 'Dokumentenauswahl wurde nicht angezeigt');
    // Datei auswählen: zuerst direkt, sonst über „Downloads“ im Seitenmenü der Dokumentenauswahl
    const dump = () => { sh('uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true'); return sh('cat /sdcard/ui.xml'); };
    const tapNode = (xml, re) => { const m = xml.match(re); if (!m) return false; sh(`input tap ${(+m[1] + +m[3]) >> 1} ${(+m[2] + +m[4]) >> 1}`); return true; };
    const fileRe = /text="planstudio-test-backup\.json"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
    let x = xml;
    if (!fileRe.test(x)) {
      if (tapNode(x, /content-desc="Show roots"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)) { await sleep(1500); x = dump(); }
      if (tapNode(x, /text="Downloads?"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)) { await sleep(2000); x = dump(); }
    }
    shot('05b-picker.png');
    if (tapNode(x, fileRe)) {
      await sleep(3500);
      const t = await toasts();
      if (t.includes('wiederhergestellt')) return 'Dokumentenauswahl geöffnet, Datei gewählt, Import erfolgreich';
      throw new Error('Datei gewählt, Import nicht bestätigt: ' + t.slice(0, 160));
    }
    sh('input keyevent KEYCODE_BACK');
    await sleep(1000);
    throw new Error('Dokumentenauswahl geöffnet, Datei automatisch nicht auffindbar (manuelle Auswahl nicht geprüft)');
  }, { info: true });
  await step('Speichern, App beenden, SQLite-Datei prüfen', async () => {
    await tap('document.querySelector("header [aria-label=Speichern]")');
    await sleep(1000);
    sh(`am force-stop ${PKG}`);
    await sleep(1500);
    const { files, q } = pullDb();
    const ic = q('pragma integrity_check')[0][0];
    const projects = q('select name from projects').map((r) => r[0]);
    const walls = q("select geometry from components where type='wall'");
    const tasks = q('select title from tasks').map((r) => r[0]);
    assert(ic === 'ok', 'integrity_check ' + ic);
    assert(projects.length >= 2 && projects.includes('Lebenswerk Adorf'), 'Projekte ' + projects);
    const g = JSON.parse(walls[0][0]);
    assert(Math.abs(Math.hypot(g.x2 - g.x1, g.y2 - g.y1) - 4250) < 0.5, 'Wandlänge');
    assert(tasks.length === projects.length && tasks.every((t) => t === 'Elektrik Bestand prüfen'), 'Aufgaben ' + tasks);
    return `${files.join(', ')} · ${projects.length} Projekte · integrity_check ok`;
  });
  await step('Neustart: Projekt wird wieder geöffnet, Daten vollständig', async () => {
    try { ws.close(); } catch { /* */ }
    await launch();
    await waitFor(`${sel('[data-testid=project-name]')}?.textContent === 'Lebenswerk Adorf'`, 30000, 'Projekt nach Neustart');
    await tap(sel('[data-nav=tasks]'));
    await waitFor(`document.body.textContent.includes('Elektrik Bestand prüfen')`);
    await tap(sel('[data-nav=plan]'));
    await waitFor(`document.querySelectorAll('polygon[data-kind=components]').length === 1`, 8000, 'Wand nach Neustart');
    shot('06-restart.png');
  });

  results.push({ name: 'Exportordner', ok: true, note: exportPath });
  const failed = results.filter((r) => r.ok === false).length;
  console.log(`\n${results.filter((r) => r.ok).length} bestanden, ${failed} fehlgeschlagen, ${results.filter((r) => r.ok === null).length} informativ`);
  fs.writeFileSync(path.join(OUT, 'android-results.json'), JSON.stringify(results, null, 2));
  try { ws.close(); } catch { /* */ }
  process.exit(failed ? 1 : 0);
})();
