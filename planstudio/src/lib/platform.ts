import type { SqlDriver } from '../db/driver';
import { idbDelete, idbGet, idbSet } from './idb';

export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface AppPaths { db_path: string; data_dir: string; backup_dir: string; export_dir: string; files_dir: string; platform: string }

/** Ablage für importierte Dateien (Fotos, Dokumente). */
export interface FileStore {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  remove(key: string): Promise<void>;
}

export interface Platform {
  db: SqlDriver;
  files: FileStore;
  paths: AppPaths;
  /** Speichert eine Exportdatei. Liefert den Speicherort (Pfad oder „Download“). */
  saveExport(fileName: string, data: Uint8Array | string, mime: string): Promise<string>;
  /** Legt eine Kopie der gesamten Datenbank im Backup-Ordner ab (nur nativ). */
  backupDatabase?(): Promise<string>;
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}
export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const enc = (d: Uint8Array | string) => (typeof d === 'string' ? new TextEncoder().encode(d) : d);

async function createTauriPlatform(): Promise<Platform> {
  const { invoke } = await import('@tauri-apps/api/core');
  const { TauriDriver } = await import('../db/tauriDriver');
  const paths = await invoke<AppPaths>('app_paths');
  return {
    db: new TauriDriver(paths.db_path),
    paths,
    files: {
      put: (key, bytes) => invoke('file_put', { key, data: toBase64(bytes) }),
      get: async (key) => { const b = await invoke<string | null>('file_get', { key }); return b ? fromBase64(b) : null; },
      remove: (key) => invoke('file_remove', { key }),
    },
    saveExport: (fileName, data, _mime) => invoke<string>('export_file', { name: fileName, data: toBase64(enc(data)) }),
    backupDatabase: () => invoke<string>('db_backup'),
  };
}

async function createBrowserPlatform(): Promise<Platform> {
  const initSqlJs = (await import('sql.js')).default;
  const wasmUrl = (await import('sql.js/dist/sql-wasm.wasm?url')).default;
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const { SqlJsDriver } = await import('../db/sqljsDriver');
  const db = await SqlJsDriver.create(SQL, { persist: true });
  window.addEventListener('beforeunload', () => void db.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void db.flush(); });
  return {
    db,
    paths: { db_path: db.location(), data_dir: 'IndexedDB', backup_dir: 'Download-Ordner', export_dir: 'Download-Ordner', files_dir: 'IndexedDB', platform: 'browser' },
    files: {
      put: (key, bytes) => idbSet('file:' + key, bytes),
      get: async (key) => (await idbGet<Uint8Array>('file:' + key)) ?? null,
      remove: (key) => idbDelete('file:' + key),
    },
    saveExport: async (fileName, data, mime) => {
      const blob = new Blob([enc(data) as BlobPart], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return `Download: ${fileName}`;
    },
  };
}

export const createPlatform = () => (isTauri() ? createTauriPlatform() : createBrowserPlatform());
