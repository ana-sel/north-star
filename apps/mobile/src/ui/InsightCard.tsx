import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@styles/theme';
import { Icon } from './Icon';

export interface InsightContent {
  tag: string;
  body: string;
}

interface InsightCardProps {
  insight: InsightContent;
  title?: string;
  meta?: string;
  onAccept?: { label: string; onPress: () => void };
  onDismiss?: () => void;
}

/**
 * Coach / insight surface. The `insight` prop is the boundary future
 * Cloudflare Workers AI output will populate; today it renders a
 * deterministic local fallback.
 */
export function InsightCard({ insight, title, meta, onAccept, onDismiss }: InsightCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.badge}>
          <Icon name="compass" size={18} color={colors.onDark} />
        </View>
        <View style={styles.head}>
          <Text style={styles.title}>{title ?? insight.tag}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
      </View>
      <Text style={styles.body}>{insight.body}</Text>
      {onAccept || onDismiss ? (
        <View style={styles.actions}>
          {onAccept ? (
            <TouchableOpacity style={[styles.btn, styles.accept]} onPress={onAccept.onPress} activeOpacity={0.8}>
              <Text style={[styles.btnText, styles.acceptText]}>{onAccept.label}</Text>
            </TouchableOpacity>
          ) : null}
          {onDismiss ? (
            <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={styles.btnText}>Not now</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.feature,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    backgroundColor: colors.olive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: { flex: 1, minWidth: 0 },
  title: { fontSize: typography.sizes.md, fontWeight: '800', color: colors.ink, letterSpacing: -0.1 },
  meta: { fontSize: typography.sizes.xs, color: colors.inkMuted, marginTop: 2 },
  body: {
    fontSize: typography.sizes.sm,
    color: colors.ink,
    lineHeight: typography.sizes.sm * 1.55,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: 15 },
  btn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  accept: { borderColor: colors.olive },
  btnText: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.inkMuted },
  acceptText: { color: colors.olive },
});
