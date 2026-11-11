import type { SqlDriver } from './driver';
import { MIGRATIONS } from './migrations';

export async function migrate(db: SqlDriver): Promise<number> {
  await db.script(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT NOT NULL);`);
  const rows = await db.select<{ v: number | null }>('SELECT MAX(version) AS v FROM schema_migrations');
  let current = rows[0]?.v ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    const sql = `${m.sql}\nINSERT INTO schema_migrations(version, name, applied_at) VALUES (${m.version}, '${m.name.replace(/'/g, "''")}', '${new Date().toISOString()}');`;
    await db.script(sql);
    current = m.version;
  }
  return current;
}
