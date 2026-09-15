/**
 * Compass v1 · schema SQL loaded as a string.
 *
 * Metro / EAS builds can't `require` a .sql file directly, so we inline
 * the schema as a template string. Kept in sync with schema.sql (source
 * of truth) — edit schema.sql, then update this file.
 */

export const schemaSQL = /* sql */ `
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sleep_entries (
  id                TEXT PRIMARY KEY,
  sleep_start_utc   TEXT NOT NULL,
  sleep_end_utc     TEXT NOT NULL,
  timezone          TEXT NOT NULL,
  duration_minutes  INTEGER,
  note              TEXT,
  energy            INTEGER CHECK (energy IS NULL OR (energy BETWEEN 1 AND 10)),
  mood              INTEGER CHECK (mood   IS NULL OR (mood   BETWEEN 1 AND 10)),
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sleep_entries_start ON sleep_entries(sleep_start_utc DESC);

CREATE TABLE IF NOT EXISTS habits (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  ritual       TEXT NOT NULL CHECK (ritual IN ('morning','evening','none')),
  icon         TEXT,
  cadence      TEXT NOT NULL CHECK (cadence IN ('daily','weekdays','custom')),
  days_mask    INTEGER,
  duration_min INTEGER,
  active       INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  archived_at  TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id            TEXT PRIMARY KEY,
  habit_id      TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  local_date    TEXT NOT NULL,
  completed_at  TEXT NOT NULL,
  timezone      TEXT NOT NULL,
  UNIQUE (habit_id, local_date)
);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(local_date DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','done','skipped')),
  due_date     TEXT,
  completed_at TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE TABLE IF NOT EXISTS journey_progress (
  journey_type  TEXT NOT NULL CHECK (journey_type IN ('path','foundation')),
  journey_id    TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('active','seeded','integrated','resting')),
  current_camp  INTEGER NOT NULL DEFAULT 1 CHECK (current_camp BETWEEN 1 AND 3),
  started_at    TEXT NOT NULL,
  camp1_closed_at TEXT,
  camp2_closed_at TEXT,
  camp3_closed_at TEXT,
  claimed_at    TEXT,
  notes         TEXT,
  updated_at    TEXT NOT NULL,
  PRIMARY KEY (journey_type, journey_id)
);
CREATE INDEX IF NOT EXISTS idx_journey_progress_active ON journey_progress(status, started_at);

CREATE TABLE IF NOT EXISTS journey_returns (
  id            TEXT PRIMARY KEY,
  journey_type  TEXT NOT NULL CHECK (journey_type IN ('path','foundation')),
  journey_id    TEXT NOT NULL,
  local_date    TEXT NOT NULL,
  logged_at     TEXT NOT NULL,
  timezone      TEXT NOT NULL,
  camp_at_return INTEGER NOT NULL CHECK (camp_at_return BETWEEN 1 AND 3),
  note          TEXT,
  UNIQUE (journey_type, journey_id, local_date)
);
CREATE INDEX IF NOT EXISTS idx_journey_returns_journey ON journey_returns(journey_type, journey_id, local_date DESC);

CREATE TABLE IF NOT EXISTS user_prefs (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

`;
