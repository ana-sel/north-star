import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing } from '@styles/theme';
import { Icon, IconName } from './Icon';

interface SummaryCardProps {
  label: string;
  icon: IconName;
  /** Deep tone of the category; colours the label only. */
  color: string;
  right?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  children: ReactNode;
}

/** Health-style summary: coloured category label, then a value and a small chart. */
export function SummaryCard({ label, icon, color, right, onPress, accessibilityLabel, children }: SummaryCardProps) {
  const head = (
    <View style={styles.head}>
      <View style={styles.label}>
        <Icon name={icon} size={17} color={color} />
        <Text style={[styles.labelText, { color }]}>{label}</Text>
      </View>
      <View style={styles.label}>
        {right ? <Text style={styles.right}>{right}</Text> : null}
        {onPress ? <Icon name="chev" size={14} color={colors.inkFaint} strokeWidth={2.4} /> : null}
      </View>
    </View>
  );
  if (!onPress) {
    return <View style={styles.card}>{head}{children}</View>;
  }
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}>
      {head}
      {children}
    </TouchableOpacity>
  );
}

interface ValueProps {
  parts: { value: string; unit?: string }[];
}

/** Big number with small grey units: "7 hr 50 min". */
export function SummaryValue({ parts }: ValueProps) {
  return (
    <Text style={styles.value}>
      {parts.map((p, i) => (
        <Text key={i}>
          {p.value}
          {p.unit ? <Text style={styles.unit}>{` ${p.unit} `}</Text> : null}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, paddingTop: 14, marginBottom: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelText: { fontSize: 15, fontWeight: '600' },
  right: { fontSize: 14, color: colors.inkMuted },
  value: { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 },
  unit: { fontSize: 15, fontWeight: '600', color: colors.inkMuted },
});
