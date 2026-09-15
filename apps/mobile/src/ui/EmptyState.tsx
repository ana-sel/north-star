import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@styles/theme';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? <Button label={action.label} onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: typography.sizes.md,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: typography.sizes.md * 1.5,
    maxWidth: 320,
  },
  action: { marginTop: spacing.sm, alignSelf: 'stretch', maxWidth: 320 },
});
