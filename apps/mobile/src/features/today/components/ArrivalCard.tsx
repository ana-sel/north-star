import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@styles/theme';
import { Icon, Ring } from '@ui';

interface ArrivalCardProps {
  durationMinutes: number | null;
  targetMinutes: number | null;
  energy: number | null;
  mood: number | null;
  onOpen: () => void;
}

function fmt(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function ArrivalCard({ durationMinutes, targetMinutes, energy, mood, onOpen }: ArrivalCardProps) {
  if (durationMinutes == null) {
    return (
      <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.8}>
        <View style={styles.prompt}>
          <Icon name="moon" size={24} color={colors.inkMuted} />
          <View style={styles.promptCol}>
            <Text style={styles.promptQ}>How did you sleep?</Text>
            <Text style={styles.promptSub}>Tap to log last night</Text>
          </View>
          <Icon name="chev" size={16} color={colors.inkMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.8}>
      <View style={styles.logged}>
        {targetMinutes ? (
          <Ring value={durationMinutes / targetMinutes} size={88} color={colors.pillar.inner} label={fmt(durationMinutes)} sublabel="slept" />
        ) : (
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{fmt(durationMinutes)}</Text>
            <Text style={styles.metricLabel}>slept</Text>
          </View>
        )}
        <View style={styles.legend}>
          <Stat dotColor={colors.pillar.inner} name="Sleep" value={fmt(durationMinutes)} />
          {energy != null ? <Stat dotColor={colors.pillar.health} name="Energy" value={`${energy}/10`} /> : null}
          {mood != null ? <Stat dotColor={colors.pillar.joy} name="Mood" value={`${mood}/10`} /> : null}
        </View>
        <Icon name="chev" size={16} color={colors.inkMuted} />
      </View>
    </TouchableOpacity>
  );
}

function Stat({ dotColor, name, value }: { dotColor: string; name: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.statName}>{name}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    overflow: 'hidden',
    ...shadows.sm,
  },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  promptCol: { flex: 1 },
  promptQ: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.ink },
  promptSub: { fontSize: typography.sizes.xs, color: colors.inkMuted, marginTop: 3 },
  logged: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  metric: { width: 88, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: typography.sizes.xl, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  metricLabel: { fontSize: 9, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  legend: { flex: 1, gap: spacing.sm },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statName: { flex: 1, fontSize: typography.sizes.sm, fontWeight: '700', color: colors.ink },
  statValue: { fontSize: typography.sizes.sm, color: colors.inkMuted, fontWeight: '600' },
});
