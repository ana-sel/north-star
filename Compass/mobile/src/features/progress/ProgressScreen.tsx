/**
 * ProgressScreen — You · Progress.
 * Four tiles: last-week sleep avg, week's habit %, active paths count, tasks done.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { theme } from '@styles/theme';
import { getSleepLastDays } from '@data/sleep';
import { listActivePaths } from '@data/paths';
import { query } from '@lib/db';

interface Tile { label: string; value: string; meta: string; }

async function loadTiles(): Promise<Tile[]> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  const [sleep, activePaths, habitStats, taskStats] = await Promise.all([
    getSleepLastDays(7),
    listActivePaths(),
    query<{ done: number; total: number }>(
      `SELECT
        (SELECT COUNT(*) FROM habit_completions WHERE local_date >= ?) as done,
        (SELECT COUNT(*) FROM habits WHERE active = 1) * 7 as total`,
      [weekAgoStr],
    ),
    query<{ done: number }>(
      `SELECT COUNT(*) as done FROM tasks
       WHERE status = 'done' AND substr(completed_at, 1, 10) >= ?`,
      [weekAgoStr],
    ),
  ]);

  const avgMinutes = sleep.length
    ? Math.round(sleep.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / sleep.length)
    : 0;
  const avgH = Math.floor(avgMinutes / 60);
  const avgM = avgMinutes % 60;

  const hDone = habitStats[0]?.done ?? 0;
  const hTotal = habitStats[0]?.total ?? 0;
  const hPct = hTotal > 0 ? Math.round((hDone / hTotal) * 100) : 0;

  return [
    {
      label: 'Sleep',
      value: sleep.length ? `${avgH}h ${avgM}m` : '—',
      meta: sleep.length ? `${sleep.length} of 7 nights` : 'no nights yet',
    },
    {
      label: 'Habits',
      value: hTotal > 0 ? `${hPct}%` : '—',
      meta: hTotal > 0 ? `${hDone} / ${hTotal} ticks this week` : 'no habits yet',
    },
    {
      label: 'Paths',
      value: `${activePaths.length}`,
      meta: activePaths.length === 1 ? '1 active' : `${activePaths.length} active`,
    },
    {
      label: 'Tasks',
      value: `${taskStats[0]?.done ?? 0}`,
      meta: 'done this week',
    },
  ];
}

export function ProgressScreen() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTiles(await loadTiles());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={theme.colors.olive} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.head}>This week</Text>
        <View style={styles.grid}>
          {tiles.map((t) => (
            <View key={t.label} style={styles.tile}>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileValue}>{t.value}</Text>
              <Text style={styles.tileMeta}>{t.meta}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>Numbers only. Insight lives in what you noticed, not what the app counted.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  scrollContent: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
  head: { fontSize: theme.typography.xs, fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  tile: {
    flexBasis: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.spacing.md,
    gap: 4,
  },
  tileLabel: { fontSize: theme.typography.xs, fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  tileValue: { fontSize: 24, fontWeight: '800', color: theme.colors.ink, letterSpacing: -1 },
  tileMeta: { fontSize: theme.typography.xs, color: theme.colors.muted },
  note: { fontSize: theme.typography.xs, color: theme.colors.muted, lineHeight: 20, fontStyle: 'italic', paddingHorizontal: theme.spacing.xs, marginTop: theme.spacing.md },
});
