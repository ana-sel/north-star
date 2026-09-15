import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@styles/theme';
import { Icon, IconName } from './Icon';

export interface RitualItem {
  id: string;
  label: string;
  done: boolean;
}

interface RitualCardProps {
  variant: 'morning' | 'evening' | 'anytime';
  title: string;
  meta: string;
  items: RitualItem[];
  onToggleItem: (id: string) => void;
  onOpen?: () => void;
}

const BADGE: Record<'morning' | 'evening' | 'anytime', { color: string; icon: IconName }> = {
  morning: { color: colors.gold, icon: 'sun' },
  evening: { color: colors.steel, icon: 'moon' },
  anytime: { color: colors.olive, icon: 'leaf' },
};

export function RitualCard({ variant, title, meta, items, onToggleItem, onOpen }: RitualCardProps) {
  const badge = BADGE[variant];
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.top} onPress={onOpen} activeOpacity={onOpen ? 0.7 : 1} disabled={!onOpen}>
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Icon name={badge.icon} size={19} color={colors.onDark} />
        </View>
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        {onOpen ? <Icon name="chev" size={16} color={colors.inkMuted} /> : null}
      </TouchableOpacity>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        {items.map((item, index) => (
          <View key={item.id} style={styles.nodeWrap}>
            {index > 0 ? <View style={[styles.link, items[index - 1].done && styles.linkDone]} /> : null}
            <TouchableOpacity
              style={[styles.node, item.done && styles.nodeDone]}
              onPress={() => onToggleItem(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.done }}
              accessibilityLabel={item.label}
              activeOpacity={0.7}
            >
              {item.done ? <Icon name="check" size={14} color={colors.onDark} /> : null}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
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
  top: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: spacing.md, paddingHorizontal: spacing.lg },
  badge: { width: 40, height: 40, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center' },
  head: { flex: 1, minWidth: 0 },
  title: { fontSize: typography.sizes.md, fontWeight: '800', color: colors.ink, letterSpacing: -0.1 },
  meta: { fontSize: typography.sizes.xs, color: colors.inkMuted, marginTop: 2 },
  track: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: 15 },
  nodeWrap: { flexDirection: 'row', alignItems: 'center' },
  node: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  link: { width: 18, height: 2, backgroundColor: colors.border },
  linkDone: { backgroundColor: colors.accent },
});
