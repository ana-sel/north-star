import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radii, shadows, spacing } from '@styles/theme';

interface CardProps extends ViewProps {
  tone?: 'surface' | 'muted';
  padded?: boolean;
}

export function Card({ tone = 'surface', padded = true, style, children, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.card,
        tone === 'muted' ? styles.cardMuted : styles.cardSurface,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, borderWidth: 1, ...shadows.sm },
  cardSurface: { backgroundColor: colors.surface, borderColor: colors.border },
  cardMuted: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  padded: { padding: spacing.md, paddingHorizontal: spacing.lg },
});
