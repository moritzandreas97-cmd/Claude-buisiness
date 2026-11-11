/* Test der nativen Desktop-App (Tauri, WebKitGTK) über WebDriver (tauri-driver).
 * Voraussetzungen: `cargo install tauri-driver`; Linux: webkit2gtk-driver + Xvfb; Windows: msedgedriver passend zu WebView2
 * (Pfad über NATIVE_DRIVER). Python 3 zum Prüfen der SQLite-Datei.
 * Aufruf: node tests/e2e/native-smoke.cjs <pfad-zur-binärdatei> [screenshot-ordner]
 * Prüft: Start, Projekt anlegen, Wand mit Maßeingabe, Aufgabe, PDF-Export, Projektbackup, Projektimport,
 *        Beenden, SQLite-Datei, Neustart, Datenbestand.
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BIN = process.argv[2];
const SHOTS = process.argv[3] || os.tmpdir();
const WD = 'http://127.0.0.1:4444';
const ELEM = 'element-6066-11e4-a52e-4f735466cecf';
const WIN = process.platform === 'win32';
const DATA = WIN ? path.join(process.env.APPDATA, 'de.lebenswerk.adorf.planstudio') : path.join(os.homedir(), '.local/share/de.lebenswerk.adorf.planstudio');
const EXPORT_DIRS = [path.join(os.homedir(), 'Documents/Lebenswerk PlanStudio/Exporte'), path.join(os.homedir(), 'Lebenswerk PlanStudio/Exporte'), path.join(DATA, 'exports')];
const newest = (ext) => { for (const d of EXPORT_DIRS) { if (!fs.existsSync(d)) continue; const f = fs.readdirSync(d).filter((x) => x.endsWith(ext)).map((x) => path.join(d, x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs); if (f.length) return f[0]; } return null; };
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
const sql = (q) => execFileSync(WIN ? 'python' : 'python3', ['-c', `import sqlite3,json,sys;c=sqlite3.connect(sys.argv[1]);print(json.dumps(c.execute(sys.argv[2]).fetchall()))`, path.join(DATA, 'planstudio.sqlite'), q]).toString();
const start = async () => { sid = (await wd('POST', '/session', { capabilities: { alwaysMatch: { 'tauri:options': { application: BIN } } } })).sessionId; await sleep(2500); };
const stop = async () => { await wd('DELETE', `/session/${sid}`); await sleep(1500); };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.rmSync(DATA, { recursive: true, force: true });
  const driverArgs = process.env.NATIVE_DRIVER ? ['--native-driver', process.env.NATIVE_DRIVER] : [];
  const driver = spawn(path.join(os.homedir(), '.cargo/bin/tauri-driver' + (WIN ? '.exe' : '')), driverArgs, { stdio: 'inherit' });
  await sleep(3000);
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
      const pdf = newest('.pdf');
      if (!pdf) throw new Error('Keine PDF in ' + EXPORT_DIRS.join(' | '));
      if (fs.readFileSync(pdf).subarray(0, 5).toString() !== '%PDF-') throw new Error('Datei ist keine PDF');
      console.log('   ', pdf);
    });
    await step('Projektbackup erstellen und als Projekt importieren', async () => {
      await click(xbtn('Projektbackup erstellen'), 'xpath');
      await sleep(2000);
      const file = newest('.json');
      if (!file) throw new Error('Keine Sicherungsdatei im Exportordner');
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (json.format !== 'lebenswerk-planstudio-backup' || json.tables.tasks.length !== 1) throw new Error('Sicherungsinhalt unerwartet');
      const input = await find('[data-testid=restore-input]');
      let method = 'WebDriver-Dateiübergabe';
      try { await wd('POST', `/session/${sid}/element/${input}/value`, { text: file }); }
      catch (e) {
        method = 'Dateiinhalt per Skript (Treiber verweigert Dateifeld: ' + e.message.slice(0, 60) + ')';
        await js(`const i = document.querySelector('[data-testid=restore-input]'); const dt = new DataTransfer(); dt.items.add(new File([arguments[0]], 'backup.json', { type: 'application/json' })); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true }));`, [fs.readFileSync(file, 'utf8')]);
      }
      await sleep(2500);
      const n = JSON.parse(sql('select count(*) from projects'))[0][0];
      if (n !== 2) throw new Error('Projekte nach Import: ' + n);
      const walls = JSON.parse(sql("select count(*) from components where type='wall'"))[0][0];
      if (walls !== 2) throw new Error('Wände nach Import (Original + Kopie): ' + walls);
      console.log('    Import über ' + method + ': ' + path.basename(file));
    });
    await step('App beenden → Daten in SQLite-Datei vorhanden', async () => {
      await stop();
      const p = JSON.parse(sql("select name from projects"));
      const w = JSON.parse(sql("select geometry from components where type='wall' limit 1"));
      const t = JSON.parse(sql('select title from tasks order by created_at limit 1'));
      if (!p.some((r) => r[0] === 'Lebenswerk Adorf')) throw new Error('Projekt fehlt: ' + JSON.stringify(p));
      const ic = sql('pragma integrity_check'); if (!ic.includes('ok')) throw new Error('integrity_check: ' + ic);
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
