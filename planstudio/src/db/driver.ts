export type SqlValue = string | number | null;
export interface Statement { sql: string; params?: SqlValue[] }

/**
 * Plattformunabhängige SQLite-Schnittstelle.
 * - TauriDriver: native SQLite (rusqlite) in der Desktop-/Android-App
 * - SqlJsDriver: SQLite als WebAssembly (Browser-Entwicklungsmodus, Tests)
 * `batch` ist atomar: entweder alle Anweisungen oder keine.
 */
export interface SqlDriver {
  readonly kind: 'tauri' | 'browser' | 'memory';
  select<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  batch(statements: Statement[]): Promise<void>;
  /** Mehrere Anweisungen als Skript in einer Transaktion (Migrationen). */
  script(sql: string): Promise<void>;
  /** Sicherstellen, dass alles auf dem Datenträger liegt. */
  flush(): Promise<void>;
  /** Beschreibung des Speicherorts für die Anzeige. */
  location(): string;
}
