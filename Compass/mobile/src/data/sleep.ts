/**
 * Sleep Data Access Layer
 * All read/write operations for sleep_entries table
 */

import { supabase } from '@lib/supabase';
import { SleepEntry } from '../types/index';

/**
 * Save a new sleep entry
 */
export async function saveSleepEntry(entry: Omit<SleepEntry, 'id' | 'created_at' | 'updated_at'>): Promise<SleepEntry> {
  const { data, error } = await supabase
    .from('sleep_entries')
    .insert([entry])
    .select()
    .single();

  if (error) throw error;
  return data as SleepEntry;
}

/**
 * Get sleep entries for the last N days
 */
export async function getSleepLastDays(userId: string, days: number = 7): Promise<SleepEntry[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('sleep_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('sleep_start_utc', startDate.toISOString())
    .order('sleep_start_utc', { ascending: false });

  if (error) throw error;
  return data as SleepEntry[];
}

/**
 * Get full history (paginated)
 */
export async function getSleepHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<SleepEntry[]> {
  const { data, error } = await supabase
    .from('sleep_entries')
    .select('*')
    .eq('user_id', userId)
    .order('sleep_start_utc', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data as SleepEntry[];
}

/**
 * Update an existing sleep entry
 */
export async function updateSleepEntry(id: string, updates: Partial<SleepEntry>): Promise<SleepEntry> {
  const { data, error } = await supabase
    .from('sleep_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SleepEntry;
}

/**
 * Delete a sleep entry
 */
export async function deleteSleepEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('sleep_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Subscribe to real-time sleep entry changes
 */
export function subscribeToSleepEntries(
  userId: string,
  callback: (entries: SleepEntry[]) => void
): () => void {
  const subscription = supabase
    .from(`sleep_entries:user_id=eq.${userId}`)
    .on('*', () => {
      // Fetch updated data
      getSleepLastDays(userId, 30).then(callback);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

export default {
  saveSleepEntry,
  getSleepLastDays,
  getSleepHistory,
  updateSleepEntry,
  deleteSleepEntry,
  subscribeToSleepEntries,
};
