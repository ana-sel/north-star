import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@styles/theme';
import { Icon, IconName } from './Icon';

export interface TopBarAction {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
}

interface TopBarProps {
  title: string;
  actions?: TopBarAction[];
  leading?: TopBarAction;
  style?: ViewStyle;
}

export function TopBar({ title, actions = [], leading, style }: TopBarProps) {
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
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.canvas,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  action: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  leadingSpacer: { width: ACTION_SIZE, height: ACTION_SIZE, marginRight: spacing.sm },
});
