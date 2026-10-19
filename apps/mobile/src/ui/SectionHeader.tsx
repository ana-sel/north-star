import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '@styles/theme';

interface SectionHeaderProps {
  title: string;
  meta?: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, meta, action }: SectionHeaderProps) {
  return (
    <View style={styles.head}>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <TouchableOpacity accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <Text style={styles.action}>{action.label}</Text>
        </TouchableOpacity>
      ) : meta ? (
        <Text style={styles.meta}>{meta}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  action: { fontSize: 15, color: colors.accent },
  meta: { fontSize: 15, color: colors.inkMuted },
});
