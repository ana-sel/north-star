import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@styles/theme';
import { Icon, IconName } from './Icon';

export interface TopBarAction {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
}

interface TopBarProps {
  title: string;
  /** Small line above the large title (Today shows the date). */
  eyebrow?: string;
  actions?: TopBarAction[];
  leading?: TopBarAction;
  style?: ViewStyle;
}

export function TopBar({ title, eyebrow, actions = [], leading, style }: TopBarProps) {
  return (
    <View style={[styles.bar, style]}>
      {leading ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={leading.label}
          onPress={leading.onPress}
          style={styles.action}
        >
          <Icon name={leading.icon} size={16} color={colors.inkMuted} />
        </TouchableOpacity>
      ) : (
        <View style={styles.leadingSpacer} />
      )}
      <View style={styles.titleWrap}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <View style={styles.actions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={styles.action}
          >
            <Icon name={action.icon} size={16} color={colors.inkMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const ACTION_SIZE = 36;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.canvas,
  },
  titleWrap: { flex: 1 },
  eyebrow: { fontSize: 13, fontWeight: '600', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  title: {
    fontSize: typography.sizes.hero,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.7,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  action: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingSpacer: { width: 0, height: ACTION_SIZE },
});
