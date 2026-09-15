import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '@styles/theme';
import { Icon, IconName } from './Icon';

interface SectionHeaderProps {
  title: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, icon, action }: SectionHeaderProps) {
  return (
    <View style={styles.head}>
      {icon ? <Icon name={icon} size={14} color={colors.inkMuted} /> : null}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.rule} />
      {action ? (
        <TouchableOpacity accessibilityRole="button" onPress={action.onPress}>
          <Text style={styles.action}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.2,
  },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  action: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.accent,
  },
});
