// WeekScreen — 7-day bar chart + a gentle note.
// GDPR: only duration numbers reach the AI, never the user id or personal data.

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { theme } from '@styles/theme';
import { useAuthStore, AuthStore } from '@hooks/useAuthStore';
import { SleepChart } from '../components/SleepChart';
import { AINoteCard } from '../components/AINoteCard';
import { getSleepLastDays } from '@data/sleep';
import { generateNote } from '@lib/ai';
import { SleepEntry } from '../../../types/index';

export function WeekScreen() {
  const user = useAuthStore((s: AuthStore) => s.user);

  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [isNoteAI, setIsNoteAI] = useState(true);

  const loadData = useCallback(async (refresh = false) => {
    if (!user?.id) return;

    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await getSleepLastDays(user.id, 7);
      setEntries(data);

      // Fetch AI note if there are entries
      if (data.length > 0) {
        setIsNoteLoading(true);
        try {
          const result = await generateNote(
            data.map((e) => ({
              sleep_start_utc: e.sleep_start_utc,
              sleep_end_utc: e.sleep_end_utc,
              timezone: e.timezone,
              duration_minutes: e.duration_minutes ?? 0,
            })),
            user.id
          );
          setNote(result.note);
          setIsNoteAI(result.isAI);
        } finally {
          setIsNoteLoading(false);
        }
      }
    } catch (err) {
      console.error('WeekScreen loadData error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  })();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={theme.colors.olive}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>This week</Text>
          <Text style={styles.subtitle}>Since {weekStart}</Text>
        </View>

        {/* Chart card */}
        <View style={styles.card}>
          {isLoading ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Loading…</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                No sleep logged yet.{'\n'}
                Go to Today to log your first night.
              </Text>
            </View>
          ) : (
            <SleepChart entries={entries} />
          )}
        </View>

        {/* AI note card */}
        {(entries.length > 0 || isNoteLoading) && (
          <AINoteCard
            note={note}
            isLoading={isNoteLoading}
            isAI={isNoteAI}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    paddingTop: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    fontWeight: '500',
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  placeholder: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: theme.typography.md,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
