import type { Database, SqlJsStatic } from 'sql.js';
import type { SqlDriver, SqlValue, Statement } from './driver';
import { idbGet, idbSet } from '../lib/idb';

const IDB_KEY = 'planstudio.sqlite';

/** SQLite (WASM). Im Browser wird die Datenbank nach jedem Schreibvorgang in IndexedDB persistiert. */
export class SqlJsDriver implements SqlDriver {
  readonly kind: 'browser' | 'memory';
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persisting: Promise<void> = Promise.resolve();
  private dirty = false;

  private constructor(private db: Database, kind: 'browser' | 'memory') {
    this.kind = kind;
    db.run('PRAGMA foreign_keys = ON;');
  }

  static async create(SQL: SqlJsStatic, opts: { persist: boolean; data?: Uint8Array }) {
    let data = opts.data;
    if (opts.persist && !data) {
      const stored = await idbGet<Uint8Array>(IDB_KEY);
      if (stored) data = stored;
    }
    const db = data ? new SQL.Database(data) : new SQL.Database();
    return new SqlJsDriver(db, opts.persist ? 'browser' : 'memory');
  }

  async select<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      const out: T[] = [];
      while (stmt.step()) out.push(stmt.getAsObject() as T);
      return out;
    } finally {
      stmt.free();
    }
  }

  async batch(statements: Statement[]): Promise<void> {
    if (statements.length === 0) return;
    this.db.run('BEGIN');
    try {
      for (const s of statements) this.db.run(s.sql, s.params ?? []);
      this.db.run('COMMIT');
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }
    this.schedulePersist();
  }

  async script(sql: string): Promise<void> {
    this.db.run('BEGIN');
    try {
      this.db.exec(sql);
      this.db.run('COMMIT');
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }
    this.schedulePersist();
  }

  private schedulePersist() {
    if (this.kind !== 'browser') return;
    this.dirty = true;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => void this.flush(), 150);
  }

  async flush(): Promise<void> {
    if (this.kind !== 'browser') return;
    if (this.persistTimer) { clearTimeout(this.persistTimer); this.persistTimer = null; }
    if (!this.dirty) return this.persisting;
    this.dirty = false;
    const bytes = this.db.export();
    // sql.js export() setzt foreign_keys zurück
    this.db.run('PRAGMA foreign_keys = ON;');
    this.persisting = this.persisting.then(() => idbSet(IDB_KEY, bytes));
    return this.persisting;
  }

  exportBytes(): Uint8Array {
    const b = this.db.export();
    this.db.run('PRAGMA foreign_keys = ON;');
    return b;
  }

  location() {
    return this.kind === 'browser' ? 'Browser-Speicher (IndexedDB, Entwicklungsmodus)' : 'Arbeitsspeicher (Test)';
  }
}
