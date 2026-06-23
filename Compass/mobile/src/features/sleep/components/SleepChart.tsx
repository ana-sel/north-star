/**
 * SleepChart Component
 * 7-day bar chart using pure React Native (no heavy chart library)
 * Matches the wireframe design exactly
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@styles/theme';
import { SleepEntry } from '../../../types/index';
import { utcToLocal } from '@lib/time';

interface SleepChartProps {
  entries: SleepEntry[];
  timezone: string;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX_HOURS = 10; // Chart ceiling

export function SleepChart({ entries, timezone }: SleepChartProps) {
  // Build last 7 days array (today = rightmost bar)
  const days = buildLast7Days(entries, timezone);

  const averageMinutes =
    days.filter((d) => d.minutes > 0).reduce((sum, d) => sum + d.minutes, 0) /
    (days.filter((d) => d.minutes > 0).length || 1);

  const avgHours = Math.floor(averageMinutes / 60);
  const avgMins = Math.round(averageMinutes % 60);

  return (
    <View style={styles.container}>
      {/* Average label */}
      <View style={styles.avgRow}>
        <Text style={styles.avgLabel}>Avg sleep</Text>
        <Text style={styles.avgValue}>
          {averageMinutes > 0 ? `${avgHours}h ${avgMins}m` : '—'}
        </Text>
      </View>

      {/* Chart */}
      <View style={styles.chart}>
        {/* Y axis labels */}
        <View style={styles.yAxis}>
          {[MAX_HOURS, Math.floor(MAX_HOURS / 2)].map((h) => (
            <Text key={h} style={styles.yLabel}>
              {h}h
            </Text>
          ))}
        </View>

        {/* Bars */}
        <View style={styles.bars}>
          {days.map((day, i) => {
            const fillFraction = Math.min(day.minutes / (MAX_HOURS * 60), 1);
            const isToday = i === 6;

            return (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  {day.minutes > 0 ? (
                    <View
                      style={[
                        styles.barFill,
                        { height: `${Math.round(fillFraction * 100)}%` as any },
                        isToday && styles.barFillToday,
                      ]}
                    />
                  ) : null}
                </View>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {DAY_LABELS[i]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface DayBar {
  minutes: number;
  label: string;
}

function buildLast7Days(entries: SleepEntry[], timezone: string): DayBar[] {
  const days: DayBar[] = Array(7)
    .fill(null)
    .map(() => ({ minutes: 0, label: '' }));

  // Map entries to day slots (0 = 6 days ago, 6 = today)
  entries.forEach((entry) => {
    const entryDate = new Date(entry.sleep_start_utc);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays >= 0 && diffDays < 7) {
      const slot = 6 - diffDays;
      days[slot].minutes = entry.duration_minutes ?? 0;
    }
  });

  return days;
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  avgLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avgValue: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  chart: {
    flexDirection: 'row',
    height: 120,
    gap: theme.spacing.xs,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingBottom: 22,
    alignItems: 'flex-end',
  },
  yLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.greige,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: theme.colors.steel,
    borderRadius: 6,
  },
  barFillToday: {
    backgroundColor: theme.colors.olive,
  },
  dayLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  dayLabelToday: {
    color: theme.colors.olive,
    fontWeight: '700',
  },
});
