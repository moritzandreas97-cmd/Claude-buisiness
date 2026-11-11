import { invoke } from '@tauri-apps/api/core';
import type { SqlDriver, SqlValue, Statement } from './driver';

/** Native SQLite über Rust (rusqlite). Jeder Batch läuft in einer Transaktion. */
export class TauriDriver implements SqlDriver {
  readonly kind = 'tauri' as const;
  constructor(private dbPath: string) {}

  select<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return invoke<T[]>('db_select', { sql, params });
  }
  batch(statements: Statement[]): Promise<void> {
    if (statements.length === 0) return Promise.resolve();
    return invoke('db_batch', { statements: statements.map((s) => ({ sql: s.sql, params: s.params ?? [] })) });
  }
  script(sql: string): Promise<void> {
    return invoke('db_script', { sql });
  }
  flush(): Promise<void> {
    return invoke('db_checkpoint');
  }
  location() {
    return this.dbPath;
  }
}
