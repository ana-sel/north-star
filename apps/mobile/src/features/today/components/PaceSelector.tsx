import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@styles/theme';
import type { PaceMode } from '../todayLogic';

interface PaceSelectorProps {
  value: PaceMode;
  onChange: (mode: PaceMode) => void;
}

const OPTIONS: { key: PaceMode; label: string }[] = [
  { key: 'full', label: 'Full' },
  { key: 'lighter', label: 'Lighter' },
  { key: 'rest', label: 'Rest' },
];

export function PaceSelector({ value, onChange }: PaceSelectorProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Today's pace</Text>
      <View style={styles.seg}>
        {OPTIONS.map((option) => {
          const active = option.key === value;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.btn, active && styles.btnOn]}
              onPress={() => onChange(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, active && styles.btnTextOn]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.inkMuted },
  seg: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.control,
    padding: 3,
    gap: 2,
  },
  btn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 9, alignItems: 'center' },
  btnOn: { backgroundColor: colors.surface, ...shadows.sm },
  btnText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.inkMuted },
  btnTextOn: { color: colors.ink },
});
