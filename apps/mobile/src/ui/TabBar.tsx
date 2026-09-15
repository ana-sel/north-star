import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@styles/theme';
import { Icon, IconName } from './Icon';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
}

interface TabBarProps {
  tabs: TabItem[];
  value: string;
  onChange: (key: string) => void;
}

export function TabBar({ tabs, value, onChange }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.xs) + 4 }]}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Icon name={tab.icon} size={20} color={active ? colors.ink : colors.inkMuted} />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: { flex: 1, paddingTop: spacing.sm, alignItems: 'center', gap: 4 },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.inkMuted,
    letterSpacing: 0.3,
  },
  labelActive: { color: colors.ink },
});
