import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '@styles/theme';
import { Icon } from './Icon';

interface TaskRowProps {
  title: string;
  done: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  meta?: string;
  tag?: { label: string; color: string };
  showBorder?: boolean;
}

export function TaskRow({ title, done, onToggle, onEdit, meta, tag, showBorder = true }: TaskRowProps) {
  return (
    <View style={[styles.row, showBorder && styles.rowBorder]}>
      <TouchableOpacity
        style={[styles.check, done && styles.checkDone]}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={title}
      >
        {done ? <Icon name="check" size={12} color={colors.onDark} /> : null}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.main}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={title}
      >
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {title}
        </Text>
        {meta ? <Text style={[styles.meta, done && styles.metaDone]}>{meta}</Text> : null}
      </TouchableOpacity>
      {tag ? (
        <View style={[styles.tag, { backgroundColor: tag.color + '22' }]}>
          <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
        </View>
      ) : null}
      {onEdit ? (
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEdit}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
        >
          <Icon name="pen" size={14} color={colors.inkMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  main: { flex: 1, minWidth: 0 },
  check: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  title: { fontSize: typography.sizes.md, color: colors.ink },
  titleDone: { color: colors.inkMuted, textDecorationLine: 'line-through', textDecorationColor: colors.border },
  meta: { marginTop: 2, fontSize: typography.sizes.xs, color: colors.inkMuted },
  metaDone: { color: colors.inkFaint },
  tag: { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: radii.pill },
  tagText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
});
