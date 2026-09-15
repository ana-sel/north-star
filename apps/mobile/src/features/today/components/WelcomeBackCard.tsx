import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '@styles/theme';
import { Icon } from '@ui';

interface WelcomeBackCardProps {
  onDismiss: () => void;
  onStart: () => void;
}

export function WelcomeBackCard({ onDismiss, onStart }: WelcomeBackCardProps) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.dismiss}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        hitSlop={8}
      >
        <Icon name="x" size={16} color={colors.inkMuted} />
      </TouchableOpacity>
      <Icon name="leaf" size={26} color={colors.olive} />
      <Text style={styles.greeting}>Welcome back. Nothing's lost.</Text>
      <Text style={styles.sub}>Life happened. Your path is still here, exactly where you left it.</Text>
      <TouchableOpacity style={styles.action} onPress={onStart} activeOpacity={0.85}>
        <Text style={styles.actionText}>Just do today's practice</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvasDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.olive,
    borderRadius: radii.feature,
    padding: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dismiss: { position: 'absolute', top: spacing.md, right: spacing.md, padding: spacing.xs },
  greeting: { fontSize: typography.sizes.lg, fontWeight: '800', color: colors.ink, letterSpacing: -0.1 },
  sub: { fontSize: typography.sizes.sm, color: colors.inkMuted, lineHeight: typography.sizes.sm * 1.55 },
  action: {
    marginTop: spacing.sm,
    backgroundColor: colors.olive,
    borderRadius: radii.control,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionText: { color: colors.onDark, fontSize: typography.sizes.sm, fontWeight: '700' },
});
