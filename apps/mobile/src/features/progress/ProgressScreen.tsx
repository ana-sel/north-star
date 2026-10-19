import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatInTimeZone } from 'date-fns-tz';
import { listActiveHabits } from '@data/habits';
import { getSleepHistory } from '@data/sleep';
import { query } from '@lib/db';
import { localDateForInstant, localDateISO, localDateOffset } from '@lib/time';
import { colors, palette, radii, spacing } from '@styles/theme';
import { Icon, LoadingState, ReturnMarks, SubNav, SummaryCard, SummaryValue } from '@ui';
import { sleepTargetMinutes } from '@features/today/todayLogic';
import type { SleepTarget } from '@features/today/todayLogic';
import {
  asProgressPeriod,
  buildProgressSnapshot,
  progressHighlight,
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
    habits: habits.map((habit) => ({ ...habit, startLocalDate: localDateForInstant(new Date(habit.created_at)) })),
    habitCompletions,
    journeyReturns,
  };
}

interface ProgressScreenProps {
  onOpenSleep?: () => void;
  onOpenHabits?: () => void;
  onOpenPaths?: () => void;
}

export function ProgressScreen({ onOpenSleep, onOpenHabits, onOpenPaths }: ProgressScreenProps) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ProgressPeriod>('week');
  const [rawData, setRawData] = useState<ProgressRawData | null>(null);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);
  const [today] = useState(() => localDateISO());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [savedPeriod, raw, target] = await Promise.all([
        getPref<string>(PERIOD_PREF_KEY, 'week'),
        loadProgressRawData(localDateOffset(-(MAX_PERIOD_WINDOW_DAYS - 1))),
        getPref<SleepTarget | null>('sleep-target', null),
      ]);

      setPeriod(asProgressPeriod(savedPeriod));
      setRawData(raw);
      setTargetMinutes(sleepTargetMinutes(target));
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

  const { sleep, habits, journeys } = snapshot;
  const highlight = progressHighlight(sleep, targetMinutes);
  const firstDay = snapshot.localDates[0];
  const fromLabel = firstDay
    ? formatInTimeZone(new Date(`${firstDay}T12:00:00Z`), 'UTC', period === 'week' ? 'EEEE' : 'd MMM')
    : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.secRow}>
        <Text style={styles.secTitle} accessibilityRole="header">{snapshot.heading}</Text>
        <SubNav
          options={[
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
          ]}
          value={period}
          onChange={(key) => setPeriod(asProgressPeriod(key))}
          style={styles.period}
        />
      </View>

      {highlight ? (
        <View style={styles.card}>
          <View style={styles.cat}>
            <Icon name="bed" size={17} color={palette.sleep.deep} />
            <Text style={[styles.catText, { color: palette.sleep.deep }]}>Highlight</Text>
          </View>
          <Text style={styles.body}>{highlight}</Text>
        </View>
      ) : null}

      <SummaryCard label="Sleep" icon="bed" color={palette.sleep.deep} right={sleep.coverageLabel} onPress={onOpenSleep}>
        {sleep.averageMinutes != null ? (
          <SummaryValue parts={durationParts(sleep.averageMinutes)} />
        ) : (
          <Text style={styles.emptyValue}>No nights logged</Text>
        )}
        <Text style={styles.sub}>Average time asleep</Text>
        <Bars points={sleep.points} color={palette.sleep.base} soft={palette.sleep.soft} />
      </SummaryCard>

      <SummaryCard
        label="Rituals"
        icon="leaf"
        color={palette.habits.deep}
        right={habits.expectedTotal > 0 ? `${habits.doneTotal} of ${habits.expectedTotal} ticks` : undefined}
        onPress={onOpenHabits}
      >
        {habits.adherencePercent != null ? (
          <SummaryValue parts={[{ value: String(habits.adherencePercent), unit: '%' }]} />
        ) : (
          <Text style={styles.emptyValue}>No scheduled habits</Text>
        )}
        <Text style={styles.sub}>Of scheduled habits done</Text>
        <Bars points={habits.points} color={palette.habits.base} soft={palette.habits.soft} />
      </SummaryCard>

      <SummaryCard label="Returns" icon="compass" color={colors.btn} onPress={onOpenPaths}>
        <SummaryValue parts={[{ value: String(journeys.totalReturns), unit: journeys.totalReturns === 1 ? 'return' : 'returns' }]} />
        <Text style={styles.sub}>
          {journeys.distinctJourneys === 0
            ? 'No returns in this period yet'
            : `Across ${journeys.distinctJourneys} journey${journeys.distinctJourneys === 1 ? '' : 's'}`}
        </Text>
        <ReturnMarks marks={journeys.marks} color={colors.btn} from={fromLabel} to="Today" />
        <Text style={styles.small}>Paths are spaced practice. The gaps are rest.</Text>
      </SummaryCard>

      <Text style={styles.foot}>Counts, coverage and trends only. Gaps are normal: paths are practised a few times a week.</Text>
    </ScrollView>
  );
}

function durationParts(minutes: number): { value: string; unit: string }[] {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? [{ value: String(h), unit: 'hr' }, { value: String(m), unit: 'min' }] : [{ value: String(h), unit: 'hr' }];
}

/** Week or month columns; days without data get a short soft stub, not an empty cell. */
function Bars({ points, color, soft }: { points: TrendPoint[]; color: string; soft: string }) {
  const gap = points.length > 7 ? 2 : 6;
  return (
    <View style={styles.chart} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.bars, { gap }]}>
        {points.map((point) => (
          <View
            key={point.localDate}
            style={[
              styles.bar,
              point.hasData && (point.value ?? 0) > 0
                ? { height: `${Math.round(point.normalized * 100)}%`, backgroundColor: color }
                : { height: 4, backgroundColor: soft },
            ]}
          />
        ))}
      </View>
      <View style={[styles.days, { gap }]}>
        {points.map((point) => (
          <Text key={point.localDate} style={styles.day} numberOfLines={1}>{point.label}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  secTitle: { fontSize: 22, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  period: { width: 150, marginHorizontal: 0, marginBottom: 0 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, paddingTop: 14, marginBottom: spacing.sm },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  catText: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 16, color: colors.ink, lineHeight: 22 },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: 3 },
  small: { fontSize: 12, color: colors.inkMuted, marginTop: 6 },
  emptyValue: { fontSize: 17, fontWeight: '600', color: colors.ink },
  foot: { fontSize: 13, color: colors.inkMuted, lineHeight: 18, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  chart: { marginTop: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 56 },
  bar: { flex: 1, borderRadius: 4 },
  days: { flexDirection: 'row', marginTop: 6 },
  day: { flex: 1, textAlign: 'center', fontSize: 11, color: colors.inkFaint },
});
