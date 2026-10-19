import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, palette, radii, spacing } from '@styles/theme';
import { Button, Icon } from '@ui';

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
        <Icon name="x" size={14} color={colors.inkMuted} strokeWidth={2.6} />
      </TouchableOpacity>
      <View style={styles.label}>
        <Icon name="leaf" size={17} color={palette.habits.deep} />
        <Text style={[styles.labelText, { color: palette.habits.deep }]}>Welcome back</Text>
      </View>
      <Text style={styles.greeting}>Welcome back. Nothing's lost.</Text>
      <Text style={styles.sub}>Life happened. Your path is still here, exactly where you left it.</Text>
      <Button label="Just do today's practice" onPress={onStart} style={styles.action} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, paddingTop: 14, marginBottom: spacing.sm },
  dismiss: { position: 'absolute', top: spacing.md, right: spacing.md, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.canvasDark, alignItems: 'center', justifyContent: 'center' },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  labelText: { fontSize: 15, fontWeight: '600' },
  greeting: { fontSize: 19, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  sub: { fontSize: 15, color: colors.inkMuted, lineHeight: 21, marginTop: 4 },
  action: { marginTop: spacing.md },
});
