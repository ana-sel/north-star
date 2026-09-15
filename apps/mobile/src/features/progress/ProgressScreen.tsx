import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { listActiveHabits } from '@data/habits';
import { getSleepHistory } from '@data/sleep';
import { query } from '@lib/db';
import { localDateISO, localDateOffset } from '@lib/time';
import { colors, radii, spacing, typography } from '@styles/theme';
import { Card, Icon, LoadingState, SubNav } from '@ui';
import {
  asProgressPeriod,
  buildProgressSnapshot,
  type HabitCompletionLike,
  type HabitLike,
  type JourneyReturnLike,
  type ProgressPeriod,
  type SleepEntryLike,
  type TrendPoint,
} from './progressLogic';
import { getPref, setPref } from '@data/prefs';

const MAX_PERIOD_WINDOW_DAYS = 30;
const PERIOD_PREF_KEY = 'progress.period.v1';

interface ProgressRawData {
  sleepEntries: SleepEntryLike[];
  habits: HabitLike[];
  habitCompletions: HabitCompletionLike[];
  journeyReturns: JourneyReturnLike[];
}

async function loadProgressRawData(cutoffDate: string): Promise<ProgressRawData> {
  const [sleepEntries, habits, habitCompletions, journeyReturns] = await Promise.all([
    getSleepHistory(240, 0),
    listActiveHabits(),
    query<HabitCompletionLike>(
      `SELECT habit_id, local_date
       FROM habit_completions
       WHERE local_date >= ?`,
      [cutoffDate],
    ),
    query<JourneyReturnLike>(
      `SELECT journey_type, journey_id, local_date
       FROM journey_returns
       WHERE local_date >= ?`,
      [cutoffDate],
    ),
  ]);

  return {
    sleepEntries,
    habits,
    habitCompletions,
    journeyReturns,
  };
}

export function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ProgressPeriod>('week');
  const [rawData, setRawData] = useState<ProgressRawData | null>(null);
  const [today] = useState(() => localDateISO());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [savedPeriod, raw] = await Promise.all([
        getPref<string>(PERIOD_PREF_KEY, 'week'),
        loadProgressRawData(localDateOffset(-(MAX_PERIOD_WINDOW_DAYS - 1))),
      ]);

      setPeriod(asProgressPeriod(savedPeriod));
      setRawData(raw);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    setPref(PERIOD_PREF_KEY, period).catch(() => {
      // Preferences are best-effort; progress data still renders without persistence.
    });
  }, [loading, period]);

  const snapshot = useMemo(() => {
    if (!rawData) return null;
    return buildProgressSnapshot({
      period,
      today,
      sleepEntries: rawData.sleepEntries,
      habits: rawData.habits,
      habitCompletions: rawData.habitCompletions,
      journeyReturns: rawData.journeyReturns,
    });
  }, [period, rawData, today]);

  if (loading || !snapshot) return <LoadingState />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.lens}>
          <View style={styles.lensBadge}>
            <Icon name="activity" size={18} color={colors.onDark} />
          </View>
          <View style={styles.lensTextWrap}>
            <Text style={styles.lensTitle}>Progress</Text>
            <Text style={styles.lensSub}>What the numbers say</Text>
          </View>
        </View>

        <SubNav
          options={[
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
          ]}
          value={period}
          onChange={(key) => setPeriod(asProgressPeriod(key))}
          style={styles.periodTabs}
        />

        <Text style={styles.sectionLabel}>{snapshot.heading}</Text>
        <View style={styles.tileGrid}>
          {snapshot.tiles.map((tile, index) => (
            <Card
              key={tile.key}
              style={[styles.tile, index === 2 && styles.tileWide]}
            >
              <Text style={styles.tileLabel}>{tile.label}</Text>
              <Text style={styles.tileValue}>{tile.value}</Text>
              <Text style={styles.tileMeta}>{tile.meta}</Text>
            </Card>
          ))}
        </View>

        <TrendCard
          title="Sleep trend"
          value={snapshot.sleep.averageLabel}
          subtitle="Average of logged nights"
          coverage={snapshot.sleep.coverageLabel}
          points={snapshot.sleep.points}
          color={colors.mauve}
          emptyHint="No sleep entries recorded in this period."
        />

        <TrendCard
          title="Habits trend"
          value={snapshot.habits.adherenceLabel}
          subtitle={
            snapshot.habits.expectedTotal > 0
              ? `${snapshot.habits.doneTotal} of ${snapshot.habits.expectedTotal} scheduled ticks`
              : 'No scheduled ticks in this period'
          }
          coverage={snapshot.habits.coverageLabel}
          points={snapshot.habits.points}
          color={colors.olive}
          emptyHint="No scheduled habit days in this period."
        />

        <TrendCard
          title="Journey returns"
          value={String(snapshot.journeys.totalReturns)}
          subtitle={`${snapshot.journeys.distinctJourneys} journeys touched`}
          coverage={snapshot.journeys.coverageLabel}
          points={snapshot.journeys.points}
          color={colors.steel}
          emptyHint="No journey returns logged in this period."
        />

        <Text style={styles.note}>
          This view stays factual: counts, coverage, and trend lines only.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

interface TrendCardProps {
  title: string;
  value: string;
  subtitle: string;
  coverage: string;
  points: TrendPoint[];
  color: string;
  emptyHint: string;
}

function TrendCard({ title, value, subtitle, coverage, points, color, emptyHint }: TrendCardProps) {
  const hasAnyData = points.some((point) => point.hasData);
  const chartWidth = Math.max(points.length * 12, 260);

  return (
    <Card style={styles.trendCard}>
      <View style={styles.trendTop}>
        <View style={styles.trendCopy}>
          <Text style={styles.trendTitle}>{title}</Text>
          <Text style={styles.trendValue}>{value}</Text>
          <Text style={styles.trendSub}>{subtitle}</Text>
        </View>
        <View style={styles.coveragePill}>
          <Text style={styles.coverageText}>{coverage}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chart, { width: chartWidth }]}>
        {points.map((point) => (
          <View key={point.localDate} style={styles.dayCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: point.hasData ? Math.max(6, point.normalized * 74) : 2,
                    backgroundColor: point.hasData ? color : colors.border,
                    opacity: point.hasData ? 1 : 0.45,
                  },
                ]}
              />
            </View>
            <Text style={styles.dayLabel}>{point.label}</Text>
          </View>
        ))}
      </ScrollView>

      {!hasAnyData ? <Text style={styles.emptyHint}>{emptyHint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  lens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  lensBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensTextWrap: {
    gap: 2,
  },
  lensTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  lensSub: {
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
  },
  periodTabs: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '48%',
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 3,
  },
  tileWide: {
    flexBasis: '100%',
  },
  tileLabel: {
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.inkMuted,
    fontWeight: '700',
  },
  tileValue: {
    fontSize: 24,
    color: colors.ink,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  tileMeta: {
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
  },
  trendCard: {
    gap: spacing.sm,
  },
  trendTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  trendCopy: {
    flexShrink: 1,
    gap: 1,
  },
  trendTitle: {
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.inkMuted,
    fontWeight: '700',
  },
  trendValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.7,
  },
  trendSub: {
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  coveragePill: {
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  coverageText: {
    fontSize: typography.sizes.xs,
    color: colors.accent,
    fontWeight: '700',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    minHeight: 98,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayCol: {
    width: 10,
    alignItems: 'center',
    gap: 3,
  },
  barTrack: {
    width: 8,
    height: 78,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 9,
    color: colors.inkMuted,
    minHeight: 11,
  },
  emptyHint: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
  },
  note: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    lineHeight: 18,
  },
});
