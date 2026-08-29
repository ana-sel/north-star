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

CREATE TABLE IF NOT EXISTS energy_entries (
  id            TEXT PRIMARY KEY,
  logged_at_utc TEXT NOT NULL,
  timezone      TEXT NOT NULL,
  score         INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
  tag           TEXT,
  kind          TEXT NOT NULL CHECK (kind IN ('restore','cost','neutral')),
  source        TEXT NOT NULL CHECK (source IN ('sleep','checkin','manual')),
  note          TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_energy_entries_logged ON energy_entries(logged_at_utc DESC);

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

CREATE TABLE IF NOT EXISTS goals (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT REFERENCES goals(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  pillar      TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parent_id);

CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  goal_id      TEXT REFERENCES goals(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','done','skipped')),
  pillar       TEXT,
  due_date     TEXT,
  due_time     TEXT,
  done_when    TEXT,
  scope        TEXT CHECK (scope IN ('today','week','month','someday')),
  completed_at TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal ON tasks(goal_id);

CREATE TABLE IF NOT EXISTS path_progress (
  path_id       TEXT PRIMARY KEY,
  status        TEXT NOT NULL CHECK (status IN ('active','seeded','integrated','resting')),
  current_camp  INTEGER NOT NULL DEFAULT 1 CHECK (current_camp BETWEEN 1 AND 3),
  started_at    TEXT NOT NULL,
  camp1_closed_at TEXT,
  camp2_closed_at TEXT,
  camp3_closed_at TEXT,
  claimed_at    TEXT,
  notes         TEXT,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS path_returns (
  id          TEXT PRIMARY KEY,
  path_id     TEXT NOT NULL,
  local_date  TEXT NOT NULL,
  logged_at   TEXT NOT NULL,
  timezone    TEXT NOT NULL,
  camp_at_return INTEGER NOT NULL CHECK (camp_at_return BETWEEN 1 AND 3),
  note        TEXT,
  UNIQUE (path_id, local_date)
);
CREATE INDEX IF NOT EXISTS idx_path_returns_path ON path_returns(path_id, local_date DESC);

CREATE TABLE IF NOT EXISTS user_prefs (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_notes (
  id          TEXT PRIMARY KEY,
  local_date  TEXT NOT NULL,
  body        TEXT NOT NULL,
  source      TEXT CHECK (source IN ('sleep','checkin','discover','free')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_journal_notes_date ON journal_notes(local_date DESC);
`;
