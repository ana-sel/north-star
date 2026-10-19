import { StyleSheet, Text } from 'react-native';
import { colors, palette } from '@styles/theme';
import { SummaryCard, SummaryValue } from '@ui';
import { sleepVsTarget } from '../todayLogic';

interface ArrivalCardProps {
  durationMinutes: number | null;
  targetMinutes: number | null;
  energy: number | null;
  mood: number | null;
  onOpen: () => void;
}

/** Today's Sleep summary: last night against the person's own target. */
export function ArrivalCard({ durationMinutes, targetMinutes, energy, mood, onOpen }: ArrivalCardProps) {
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
  return (
    <SummaryCard label="Sleep" icon="bed" color={tone.deep} right="Last night" onPress={onOpen}>
      <SummaryValue parts={m ? [{ value: String(h), unit: 'hr' }, { value: String(m), unit: 'min' }] : [{ value: String(h), unit: 'hr' }]} />
      {compare ? <Text style={styles.sub}>{compare}</Text> : null}
      {extras ? <Text style={styles.sub}>{extras}</Text> : null}
    </SummaryCard>
  );
}

const styles = StyleSheet.create({
  prompt: { fontSize: 17, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: 3 },
});
