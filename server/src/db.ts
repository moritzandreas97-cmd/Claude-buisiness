import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "realones.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Minimal schema per PRODUCTSPEC section 18.
// Business logic (endpoints) is added in later phases; this only
// establishes the data foundation so later phases don't need schema churn.
db.exec(`
  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_token TEXT NOT NULL UNIQUE,
    owner_token TEXT NOT NULL UNIQUE,
    creator_name TEXT NOT NULL,
    parent_test_id INTEGER REFERENCES tests(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS test_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    correct_option TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    participant_name TEXT,
    score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER REFERENCES tests(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    referrer_test_id INTEGER REFERENCES tests(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tests_public_token ON tests(public_token);
  CREATE INDEX IF NOT EXISTS idx_tests_owner_token ON tests(owner_token);
  CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON attempts(test_id);
  CREATE INDEX IF NOT EXISTS idx_events_test_id ON events(test_id);
`);
