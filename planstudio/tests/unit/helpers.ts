import initSqlJs from 'sql.js';
import { SqlJsDriver } from '../../src/db/sqljsDriver';
import { migrate } from '../../src/db/migrate';
import type { Platform } from '../../src/lib/platform';

export async function memoryPlatform(data?: Uint8Array): Promise<Platform & { db: SqlJsDriver }> {
  const SQL = await initSqlJs();
  const db = await SqlJsDriver.create(SQL, { persist: false, data });
  await migrate(db);
  const files = new Map<string, Uint8Array>();
  return {
    db,
    paths: { db_path: 'memory', data_dir: '', backup_dir: '', export_dir: '', files_dir: '', platform: 'test' },
    files: { put: async (k, b) => { files.set(k, b); }, get: async (k) => files.get(k) ?? null, remove: async (k) => { files.delete(k); } },
    saveExport: async (n) => n,
  };
}
