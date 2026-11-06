import { StyleSheet, Text, View } from 'react-native';
import { colors, palette } from '@styles/theme';
import { SummaryCard, SummaryValue } from '@ui';
import { sleepVsTarget } from '../todayLogic';

interface ArrivalCardProps {
  durationMinutes: number | null;
  targetMinutes: number | null;
  energy: number | null;
  mood: number | null;
  /** Local wake time of last night, "07:00". */
  wokeAt: string | null;
  /** Minutes asleep for the last 7 nights, oldest first; null where nothing was logged. */
  week: (number | null)[];
  onOpen: () => void;
}

/** Today's Sleep summary: last night against the person's own target. */
export function ArrivalCard({ durationMinutes, targetMinutes, energy, mood, wokeAt, week, onOpen }: ArrivalCardProps) {
  const tone = palette.sleep;
  if (durationMinutes == null) {
    return (
      <SummaryCard label="Sleep" icon="bed" color={tone.deep} onPress={onOpen} accessibilityLabel="Sleep. Log last night">
        <Text style={styles.prompt}>How did you sleep?</Text>
        <Text style={styles.sub}>Tap to log last night</Text>
      </SummaryCard>
    );
  }
  const h = Math.floor(durationMinutes / 60);
  const m = durationMinutes % 60;
  const compare = sleepVsTarget(durationMinutes, targetMinutes);
  const extras = [energy != null ? `Energy ${energy}/10` : null, mood != null ? `Mood ${mood}/10` : null].filter(Boolean).join(' · ');
  const longest = Math.max(...week.map((n) => n ?? 0), 1);
  return (
    <SummaryCard label="Sleep" icon="bed" color={tone.deep} right={wokeAt ? `Woke ${wokeAt}` : 'Last night'} onPress={onOpen}>
      <View style={styles.split}>
        <View style={styles.flex}>
          <SummaryValue parts={m ? [{ value: String(h), unit: 'hr' }, { value: String(m), unit: 'min' }] : [{ value: String(h), unit: 'hr' }]} />
          {compare ? <Text style={styles.sub}>{compare}</Text> : null}
          {extras ? <Text style={styles.sub}>{extras}</Text> : null}
        </View>
        <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {week.map((minutes, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                minutes == null
                  ? { height: 4, backgroundColor: tone.soft }
                  : { height: `${Math.round((minutes / longest) * 100)}%`, backgroundColor: i === week.length - 1 ? tone.base : tone.soft },
              ]}
            />
          ))}
        </View>
      </View>
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  prompt: { fontSize: 17, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: 3 },
  split: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  flex: { flex: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 44 },
  bar: { width: 7, borderRadius: 3 },
});
