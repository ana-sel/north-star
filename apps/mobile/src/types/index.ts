// Core domain types, shared across all features.

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  display_name: string;
  home_timezone: string;
  active_timezone: string;
  created_at: string;
  updated_at: string;
}

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

// V3: planning.
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  goal_id?: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

// AI note generation. Only numbers cross the wire — never personal data.
export interface AINoteRequest {
  nights: Array<{
    start_utc: string;
    end_utc: string;
    timezone: string;
    duration_minutes: number;
  }>;
  user_id?: string;
}

export interface AINoteResponse {
  note: string;
  generated_at: string;
}

