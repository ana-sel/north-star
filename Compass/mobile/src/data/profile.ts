/**
 * Profile Data Access Layer
 * User profile operations (timezone, preferences)
 */

import { supabase } from '@lib/supabase';
import { Profile } from '../types/index';

/**
 * Get user's profile
 */
export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Create initial profile (called after first sign-in)
 */
export async function createProfile(userId: string, timezone: string = 'UTC'): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        user_id: userId,
        home_timezone: timezone,
        active_timezone: timezone,
        display_name: '',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Update user's active timezone (for travel)
 */
export async function updateActiveTimezone(userId: string, timezone: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ active_timezone: timezone, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Update home timezone (set once during onboarding)
 */
export async function updateHomeTimezone(userId: string, timezone: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ home_timezone: timezone, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Update display name
 */
export async function updateDisplayName(userId: string, displayName: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export default {
  getProfile,
  createProfile,
  updateActiveTimezone,
  updateHomeTimezone,
  updateDisplayName,
};
