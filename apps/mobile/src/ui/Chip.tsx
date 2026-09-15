import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@styles/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  disabled?: boolean;
}

export function Chip({ label, selected = false, onPress, color, disabled }: ChipProps) {
  const isPressable = typeof onPress === 'function';
  return isPressable ? (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, selected && styles.chipOn, disabled && styles.chipDisabled]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.label, selected && styles.labelOn, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </TouchableOpacity>
  ) : (
    <View
      accessibilityState={{ selected, disabled }}
      style={[styles.chip, selected && styles.chipOn, disabled && styles.chipDisabled]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.label, selected && styles.labelOn, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipDisabled: { opacity: 0.5 },
  dot: { width: 7, height: 7, borderRadius: 999 },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.2,
  },
  labelOn: { color: colors.onDark },
  labelDisabled: { color: colors.inkFaint },
});
