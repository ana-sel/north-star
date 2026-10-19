import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, spacing } from '@styles/theme';

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
    backgroundColor: colors.canvasDark,
    borderRadius: 9,
    padding: 2,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  item: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 7 },
  itemActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink },
  labelActive: { color: colors.ink },
});
