// SleepChart — Health-style range chart: one bar per night from bedtime to wake (no chart library).

import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@styles/theme';
import { dayLetterFor, minutesFromNoon } from '../sleepNights';
import type { NightBar, NightWindow } from '../sleepNights';

interface SleepChartProps {
  dates: string[];
  bars: (NightBar | null)[];
  window: NightWindow;
  color: string;
  /** Saved target as clock minutes; drawn as dashed reference lines. */
  target?: { bed: number; wake: number } | null;
}

const HEIGHT = 120;

function clockLabel(clockMinutes: number): string {
  return `${String(Math.floor(clockMinutes / 60)).padStart(2, '0')}:${String(clockMinutes % 60).padStart(2, '0')}`;
}

export function SleepChart({ dates, bars, window, color, target }: SleepChartProps) {
  const span = window.hi - window.lo;
  const y = (rel: number) => ((rel - window.lo) / span) * HEIGHT;
  const refs = target ? [target.bed, target.wake] : [];

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Sleep, last ${dates.length} nights`}>
      {refs.map((clock) => (
        <View key={clock} style={[styles.ref, { top: y(minutesFromNoon(clock)) }]}>
          <Text style={styles.refText}>{clockLabel(clock)}</Text>
        </View>
      ))}
      <View style={styles.chart}>
        {dates.map((date, i) => {
          const bar = bars[i];
          return (
            <View key={date} style={styles.col}>
              <View style={styles.lane}>
                {bar ? (
                  <View
                    style={[
                      styles.bar,
                      { backgroundColor: color, top: Math.max(0, y(bar.startRel)), height: Math.max(4, y(bar.endRel) - y(bar.startRel)) },
                    ]}
                  />
                ) : null}
              </View>
              <Text style={styles.day}>{dayLetterFor(date)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  chart: { flexDirection: 'row', gap: 10, paddingRight: 44 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  lane: { width: '100%', height: HEIGHT },
  bar: { position: 'absolute', left: '50%', marginLeft: -7, width: 14, borderRadius: 7 },
  day: { fontSize: 12, color: colors.inkMuted },
  ref: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.inkFaint },
  refText: { position: 'absolute', right: 0, top: -8, paddingLeft: 4, backgroundColor: colors.surface, fontSize: 11, color: colors.inkFaint },
});

