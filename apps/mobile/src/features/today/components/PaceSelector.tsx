import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing } from '@styles/theme';
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
      <Text style={styles.label}>Pace</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  label: { fontSize: 16, color: colors.ink, flex: 1 },
  seg: {
    width: 200,
    flexDirection: 'row',
    backgroundColor: colors.canvasDark,
    borderRadius: 9,
    padding: 2,
  },
  btn: { flex: 1, paddingVertical: 6, borderRadius: 7, alignItems: 'center' },
  btnOn: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  btnText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  btnTextOn: { color: colors.ink },
});
