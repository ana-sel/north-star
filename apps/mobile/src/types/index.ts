// Core domain types, shared across all features.

// V1: sleep. energy & mood are V2 columns — nullable from day one so the
// schema never needs migrating when those features arrive.
export interface SleepEntry {
  id: string;
  user_id: string;
  sleep_start_utc: string;
  sleep_end_utc: string;
  timezone: string; // IANA, e.g. 'Europe/Vilnius'
  duration_minutes: number | null; // computed by the database
  note: string | null;
  energy: number | null; // V2, 1–10
  mood: number | null; // V2, 1–10
  created_at: string;
  updated_at: string;
}

