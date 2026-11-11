/* Test der nativen Desktop-App (Tauri, WebKitGTK) über WebDriver (tauri-driver).
 * Voraussetzungen (Linux): webkit2gtk-driver, `cargo install tauri-driver`, Xvfb, Release-Build.
 * Aufruf: DISPLAY=:99 node tests/e2e/native-smoke.cjs <pfad-zur-binärdatei> [screenshot-ordner]
 * Prüft: Start, Projekt anlegen, Wand mit Maßeingabe, Aufgabe, Beenden, Neustart, Datenbestand, PDF-Export.
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BIN = process.argv[2];
const SHOTS = process.argv[3] || os.tmpdir();
const WD = 'http://127.0.0.1:4444';
const ELEM = 'element-6066-11e4-a52e-4f735466cecf';
const DATA = path.join(os.homedir(), '.local/share/de.lebenswerk.adorf.planstudio');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

async function wd(method, url, body) {
  const r = await fetch(WD + url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (j.value && j.value.error) throw new Error(`${j.value.error}: ${j.value.message}`);
  return j.value;
}
let sid;
const find = async (sel, using = 'css selector', timeout = 10000) => {
  const t0 = Date.now();
  for (;;) {
    try { return (await wd('POST', `/session/${sid}/element`, { using, value: sel }))[ELEM]; }
    catch (e) { if (Date.now() - t0 > timeout) throw new Error(`Element nicht gefunden: ${sel}`); await sleep(250); }
  }
};
const click = async (sel, using) => wd('POST', `/session/${sid}/element/${await find(sel, using)}/click`, {});
const type = async (sel, text) => { const id = await find(sel); await wd('POST', `/session/${sid}/element/${id}/clear`, {}); await wd('POST', `/session/${sid}/element/${id}/value`, { text }); };
const js = (script, args = []) => wd('POST', `/session/${sid}/execute/sync`, { script, args });
const shot = async (name) => fs.writeFileSync(path.join(SHOTS, name), Buffer.from(await wd('GET', `/session/${sid}/screenshot`), 'base64'));
const xbtn = (text) => `//button[normalize-space(.)='${text}']`;
async function step(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log('✔', name); }
  catch (e) { results.push({ name, ok: false, error: e.message }); console.log('✘', name, '\n  ', e.message); try { await shot(`native-FAIL-${results.length}.png`); } catch { /* */ } }
}
const sql = (q) => execFileSync('python3', ['-c', `import sqlite3,json,sys;c=sqlite3.connect(sys.argv[1]);print(json.dumps(c.execute(sys.argv[2]).fetchall()))`, path.join(DATA, 'planstudio.sqlite'), q]).toString();
const start = async () => { sid = (await wd('POST', '/session', { capabilities: { alwaysMatch: { 'tauri:options': { application: BIN } } } })).sessionId; await sleep(2500); };
const stop = async () => { await wd('DELETE', `/session/${sid}`); await sleep(1500); };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.rmSync(DATA, { recursive: true, force: true });
  const driver = spawn(path.join(os.homedir(), '.cargo/bin/tauri-driver'), [], { stdio: 'ignore' });
  await sleep(1500);
  try {
    await step('Native App startet (SQLite wird angelegt)', async () => {
      await start();
      await find('[aria-label=Projektname]');
      if (!fs.existsSync(path.join(DATA, 'planstudio.sqlite'))) throw new Error('Datenbankdatei fehlt');
      await shot('native-01-start.png');
    });
    await step('Projekt „Lebenswerk Adorf“ anlegen', async () => {
      await type('[aria-label=Projektname]', 'Lebenswerk Adorf');
      await click(xbtn('Projekt anlegen'), 'xpath');
      await find('[data-testid=project-name]');
    });
    await step('Wand mit numerischer Länge 4,25 m zeichnen', async () => {
      await click('[data-nav=plan]');
      await click('[data-tool=wall]');
      const canvas = await find('[data-testid=plan-canvas]');
      await wd('POST', `/session/${sid}/actions`, { actions: [{ type: 'pointer', id: 'm', parameters: { pointerType: 'mouse' }, actions: [
        { type: 'pointerMove', origin: { [ELEM]: canvas }, x: -200, y: 0 }, { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 },
        { type: 'pointerMove', origin: { [ELEM]: canvas }, x: 100, y: 0 }] }] });
      await type('[data-testid=wall-length]', '4,25m');
      await wd('POST', `/session/${sid}/element/${await find('[data-testid=wall-length]')}/value`, { text: '' });
      await sleep(800);
      await shot('native-02-wall.png');
    });
    await step('Aufgabe anlegen', async () => {
      await click('[data-nav=tasks]');
      await click(xbtn('Aufgabe'), 'xpath');
      await type('[role=dialog] [aria-label=Titel]', 'Elektrik Bestand prüfen');
      await click("//div[@role='dialog']//button[normalize-space(.)='Speichern']", 'xpath');
      await sleep(600);
    });
    await step('PDF-Export im nativen Exportordner', async () => {
      await click('[data-nav=reports]');
      await click(xbtn('PDF exportieren'), 'xpath');
      await sleep(3000);
      const dir = [path.join(os.homedir(), 'Documents/Lebenswerk PlanStudio/Exporte'), path.join(os.homedir(), 'Lebenswerk PlanStudio/Exporte')].find((d) => fs.existsSync(d)) || 'kein Exportordner';
      const pdfs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.pdf')) : [];
      if (!pdfs.length) throw new Error('Keine PDF in ' + dir);
      const head = fs.readFileSync(path.join(dir, pdfs[pdfs.length - 1])).subarray(0, 5).toString();
      if (head !== '%PDF-') throw new Error('Datei ist keine PDF');
      console.log('   ', path.join(dir, pdfs[pdfs.length - 1]));
    });
    await step('App beenden → Daten in SQLite-Datei vorhanden', async () => {
      await stop();
      const p = JSON.parse(sql("select name from projects"));
      const w = JSON.parse(sql("select geometry from components where type='wall'"));
      const t = JSON.parse(sql('select title from tasks'));
      if (p[0][0] !== 'Lebenswerk Adorf') throw new Error('Projekt fehlt: ' + JSON.stringify(p));
      const g = JSON.parse(w[0][0]); const L = Math.hypot(g.x2 - g.x1, g.y2 - g.y1);
      if (Math.abs(L - 4250) > 0.5) throw new Error('Wandlänge ' + L);
      if (t[0][0] !== 'Elektrik Bestand prüfen') throw new Error('Aufgabe fehlt');
    });
    await step('Neustart: Projekt wird automatisch wieder geöffnet, Daten vollständig, Startsicherung angelegt', async () => {
      await start();
      await find('[data-testid=project-name]');
      await click('[data-nav=tasks]');
      await find("//*[contains(text(),'Elektrik Bestand prüfen')]", 'xpath');
      const backups = fs.readdirSync(path.join(DATA, 'backups')).filter((f) => f.startsWith('planstudio-auto-'));
      if (!backups.length) throw new Error('Keine automatische Startsicherung');
      await shot('native-03-restart.png');
      await stop();
    });
  } finally {
    driver.kill();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} bestanden`);
  fs.writeFileSync(path.join(SHOTS, 'native-results.json'), JSON.stringify(results, null, 2));
  process.exit(failed ? 1 : 0);
})();
