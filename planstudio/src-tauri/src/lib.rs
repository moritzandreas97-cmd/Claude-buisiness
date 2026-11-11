//! Lebenswerk Adorf PlanStudio – nativer Kern.
//! Stellt dem Frontend eine transaktionale SQLite-Datenbank (rusqlite), eine lokale
//! Dateiablage für Fotos/Dokumente, Exporte und Datenbanksicherungen bereit.

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rusqlite::{types::Value as SqlValue, types::ValueRef, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use tauri::{Manager, State};

struct Db(Mutex<Connection>);

#[derive(Serialize, Clone)]
struct AppPaths {
    db_path: String,
    data_dir: String,
    backup_dir: String,
    export_dir: String,
    files_dir: String,
    platform: String,
}

#[derive(Deserialize)]
struct Stmt {
    sql: String,
    params: Vec<Value>,
}

fn to_sql(v: &Value) -> SqlValue {
    match v {
        Value::Null => SqlValue::Null,
        Value::Bool(b) => SqlValue::Integer(*b as i64),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                SqlValue::Integer(i)
            } else {
                SqlValue::Real(n.as_f64().unwrap_or(0.0))
            }
        }
        Value::String(s) => SqlValue::Text(s.clone()),
        other => SqlValue::Text(other.to_string()),
    }
}

fn from_sql(v: ValueRef) -> Value {
    match v {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(i) => Value::from(i),
        ValueRef::Real(f) => serde_json::Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null),
        ValueRef::Text(t) => Value::String(String::from_utf8_lossy(t).into_owned()),
        ValueRef::Blob(b) => Value::String(B64.encode(b)),
    }
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

#[tauri::command]
fn app_paths(paths: State<AppPaths>) -> AppPaths {
    paths.inner().clone()
}

#[tauri::command]
fn db_select(db: State<Db>, sql: String, params: Vec<Value>) -> Result<Vec<Map<String, Value>>, String> {
    let conn = db.0.lock().map_err(err)?;
    let mut stmt = conn.prepare(&sql).map_err(err)?;
    let names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let p: Vec<SqlValue> = params.iter().map(to_sql).collect();
    let mut rows = stmt.query(rusqlite::params_from_iter(p.iter())).map_err(err)?;
    let mut out = Vec::new();
    while let Some(row) = rows.next().map_err(err)? {
        let mut m = Map::new();
        for (i, n) in names.iter().enumerate() {
            m.insert(n.clone(), from_sql(row.get_ref(i).map_err(err)?));
        }
        out.push(m);
    }
    Ok(out)
}

/// Führt alle Anweisungen in genau einer Transaktion aus (alles oder nichts).
#[tauri::command]
fn db_batch(db: State<Db>, statements: Vec<Stmt>) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(err)?;
    let tx = conn.transaction().map_err(err)?;
    for s in &statements {
        let p: Vec<SqlValue> = s.params.iter().map(to_sql).collect();
        tx.execute(&s.sql, rusqlite::params_from_iter(p.iter())).map_err(|e| format!("{e} [{}]", s.sql.chars().take(80).collect::<String>()))?;
    }
    tx.commit().map_err(err)
}

#[tauri::command]
fn db_script(db: State<Db>, sql: String) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(err)?;
    let tx = conn.transaction().map_err(err)?;
    tx.execute_batch(&sql).map_err(err)?;
    tx.commit().map_err(err)
}

/// Schreibt das WAL-Journal in die Hauptdatenbank (expliziter Speicherpunkt).
#[tauri::command]
fn db_checkpoint(db: State<Db>) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    conn.query_row("PRAGMA wal_checkpoint(FULL)", [], |_| Ok(())).map_err(err)
}

fn backup_to(conn: &Connection, dir: &Path, tag: &str) -> Result<PathBuf, String> {
    fs::create_dir_all(dir).map_err(err)?;
    let name = format!("planstudio-{}-{}.sqlite", tag, chrono::Local::now().format("%Y%m%d-%H%M%S"));
    let target = dir.join(name);
    conn.execute("VACUUM INTO ?1", [target.to_string_lossy().to_string()]).map_err(err)?;
    Ok(target)
}

fn prune_backups(dir: &Path, prefix: &str, keep: usize) {
    if let Ok(entries) = fs::read_dir(dir) {
        let mut files: Vec<PathBuf> = entries
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| p.file_name().and_then(|n| n.to_str()).map(|n| n.starts_with(prefix)).unwrap_or(false))
            .collect();
        files.sort();
        while files.len() > keep {
            let _ = fs::remove_file(files.remove(0));
        }
    }
}

#[tauri::command]
fn db_backup(db: State<Db>, paths: State<AppPaths>) -> Result<String, String> {
    let conn = db.0.lock().map_err(err)?;
    let p = backup_to(&conn, Path::new(&paths.backup_dir), "manuell")?;
    Ok(p.to_string_lossy().to_string())
}

/// Nur relative Schlüssel ohne „..“ zulassen (Schutz vor Pfadmanipulation).
fn safe_join(base: &str, key: &str) -> Result<PathBuf, String> {
    let rel = Path::new(key);
    if rel.is_absolute() || rel.components().any(|c| !matches!(c, Component::Normal(_))) {
        return Err(format!("Ungültiger Dateischlüssel: {key}"));
    }
    Ok(Path::new(base).join(rel))
}

#[tauri::command]
fn file_put(paths: State<AppPaths>, key: String, data: String) -> Result<(), String> {
    let p = safe_join(&paths.files_dir, &key)?;
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(err)?;
    }
    let bytes = B64.decode(data).map_err(err)?;
    let tmp = p.with_extension("tmp-write");
    fs::write(&tmp, bytes).map_err(err)?;
    fs::rename(&tmp, &p).map_err(err)
}

#[tauri::command]
fn file_get(paths: State<AppPaths>, key: String) -> Result<Option<String>, String> {
    let p = safe_join(&paths.files_dir, &key)?;
    match fs::read(&p) {
        Ok(b) => Ok(Some(B64.encode(b))),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn file_remove(paths: State<AppPaths>, key: String) -> Result<(), String> {
    let p = safe_join(&paths.files_dir, &key)?;
    match fs::remove_file(p) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
        _ => Ok(()),
    }
}

/// Legt eine Exportdatei im Exportordner ab; vorhandene Dateien werden nie überschrieben.
#[tauri::command]
fn export_file(paths: State<AppPaths>, name: String, data: String) -> Result<String, String> {
    let clean: String = name.chars().map(|c| if "/\\:*?\"<>|".contains(c) || c.is_control() { '_' } else { c }).collect();
    let dir = Path::new(&paths.export_dir);
    fs::create_dir_all(dir).map_err(err)?;
    let mut target = dir.join(&clean);
    let stem = Path::new(&clean).file_stem().and_then(|s| s.to_str()).unwrap_or("export").to_string();
    let ext = Path::new(&clean).extension().and_then(|s| s.to_str()).map(|e| format!(".{e}")).unwrap_or_default();
    let mut i = 2;
    while target.exists() {
        target = dir.join(format!("{stem} ({i}){ext}"));
        i += 1;
    }
    fs::write(&target, B64.decode(data).map_err(err)?).map_err(err)?;
    Ok(target.to_string_lossy().to_string())
}

/// Prüft, ob in einem Ordner tatsächlich geschrieben werden kann (legt ihn ggf. an).
fn writable(dir: &Path) -> bool {
    if fs::create_dir_all(dir).is_err() {
        return false;
    }
    let probe = dir.join(".planstudio-schreibtest");
    let ok = fs::write(&probe, b"ok").is_ok();
    let _ = fs::remove_file(&probe);
    ok
}

/// Exportordner: für den Benutzer sichtbar, falls beschreibbar.
/// Desktop: Dokumente → Benutzerordner. Android: öffentlicher „Download“-Ordner.
/// Rückfall jeweils: App-Datenordner/exports.
fn choose_export_dir<R: tauri::Runtime>(app: &tauri::App<R>, data_dir: &Path) -> PathBuf {
    let p = app.path();
    let candidates: Vec<PathBuf> = if cfg!(mobile) {
        // Zuerst der öffentliche Download-Ordner (bleibt bei Deinstallation erhalten, im Dateimanager sichtbar),
        // dann der app-spezifische Ordner (Android/data/<paket>/files/Download – wird bei Deinstallation gelöscht).
        let mut v = vec![PathBuf::from("/storage/emulated/0/Download")];
        v.extend(p.download_dir().ok());
        v.into_iter().map(|d| d.join("Lebenswerk PlanStudio")).collect()
    } else {
        [p.document_dir(), p.home_dir()]
            .into_iter()
            .filter_map(|d| d.ok())
            .filter(|d| d.is_dir())
            .map(|d| d.join("Lebenswerk PlanStudio").join("Exporte"))
            .collect()
    };
    candidates
        .into_iter()
        .find(|d| writable(d))
        .unwrap_or_else(|| data_dir.join("exports"))
}

fn open_db(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(err)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;").map_err(err)?;
    let ok: String = conn.query_row("PRAGMA quick_check", [], |r| r.get(0)).map_err(err)?;
    if ok != "ok" {
        return Err(format!("Datenbank beschädigt (quick_check: {ok}). Bitte Sicherung aus dem Backup-Ordner wiederherstellen."));
    }
    Ok(conn)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir)?;
            let export_dir = choose_export_dir(app, &data_dir);
            let backup_dir = data_dir.join("backups");
            let files_dir = data_dir.join("files");
            let db_path = data_dir.join("planstudio.sqlite");
            let existed = db_path.exists();
            let conn = open_db(&db_path).map_err(|e| Box::<dyn std::error::Error>::from(e))?;
            // Automatische Sicherung bei jedem Start (die letzten 10 bleiben erhalten)
            if existed {
                if backup_to(&conn, &backup_dir, "auto").is_ok() {
                    prune_backups(&backup_dir, "planstudio-auto-", 10);
                }
            }
            app.manage(Db(Mutex::new(conn)));
            app.manage(AppPaths {
                db_path: db_path.to_string_lossy().into(),
                data_dir: data_dir.to_string_lossy().into(),
                backup_dir: backup_dir.to_string_lossy().into(),
                export_dir: export_dir.to_string_lossy().into(),
                files_dir: files_dir.to_string_lossy().into(),
                platform: std::env::consts::OS.into(),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_paths, db_select, db_batch, db_script, db_checkpoint, db_backup, file_put, file_get, file_remove, export_file
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten von PlanStudio");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_join_rejects_traversal() {
        assert!(safe_join("/base", "../etc/passwd").is_err());
        assert!(safe_join("/base", "/abs").is_err());
        assert!(safe_join("/base", "projects/a/b.jpg").is_ok());
    }

    #[test]
    fn transaction_rolls_back_on_error() {
        let mut conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON; CREATE TABLE p(id TEXT PRIMARY KEY); CREATE TABLE c(id TEXT PRIMARY KEY, p TEXT NOT NULL REFERENCES p(id));").unwrap();
        let tx = conn.transaction().unwrap();
        tx.execute("INSERT INTO p VALUES ('a')", []).unwrap();
        assert!(tx.execute("INSERT INTO c VALUES ('x','missing')", []).is_err());
        drop(tx); // Rollback
        let n: i64 = conn.query_row("SELECT COUNT(*) FROM p", [], |r| r.get(0)).unwrap();
        assert_eq!(n, 0);
    }

    #[test]
    fn json_roundtrip_values() {
        assert_eq!(to_sql(&Value::from(3)), SqlValue::Integer(3));
        assert_eq!(to_sql(&Value::from(2.5)), SqlValue::Real(2.5));
        assert_eq!(from_sql(ValueRef::Text(b"x")), Value::String("x".into()));
    }
}
