/**
 * Core domain types for Compass
 * These are the fundamental data structures shared across all features
 */

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

/**
 * V1 Feature: Sleep Tracking
 */
export interface SleepEntry {
  id: string;
  user_id: string;
  sleep_start_utc: string; // ISO 8601 UTC timestamp
  sleep_end_utc: string; // ISO 8601 UTC timestamp
  timezone: string; // IANA timezone (e.g., 'Europe/Vilnius')
  duration_minutes: number;
  note: string; // AI-generated or rule-based
  created_at: string;
  updated_at: string;
}

/**
 * V2 Feature: Energy & Mood Tracking
 * Both use nullable fields in sleep_entries to maintain schema compatibility
 */
export interface EnergyEntry {
  id: string;
  user_id: string;
  date_utc: string;
  value: number; // 1-10 scale
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  date_utc: string;
  value: number; // 1-10 scale
  note?: string;
  created_at: string;
  updated_at: string;
}

/**
 * V3 Feature: Planning & Goals
 */
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

/**
 * AI Note Generation Request/Response
 */
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

/**
 * App State & Navigation
 */
export type AuthState = 'loading' | 'signed-in' | 'signed-out';

export interface AppContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}
