import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, shadows, spacing, typography } from '@styles/theme';

export interface SubNavOption {
  key: string;
  label: string;
}

interface SubNavProps {
  options: SubNavOption[];
  value: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
}

export function SubNav({ options, value, onChange, style }: SubNavProps) {
  return (
    <View style={[styles.wrap, style]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => onChange(option.key)}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 3,
    gap: 2,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  item: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 11 },
  itemActive: { backgroundColor: colors.surface, ...shadows.sm },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.3,
  },
  labelActive: { color: colors.ink },
});
