import { Children, Fragment, isValidElement, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@styles/theme';
import { Icon, IconName } from './Icon';

interface TileProps {
  icon: IconName;
  color: string;
  size?: number;
}

/** Coloured rounded square with a white icon, as in Health's category rows. */
export function Tile({ icon, color, size = 30 }: TileProps) {
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: color }]}>
      <Icon name={icon} size={Math.round(size * 0.6)} color={colors.onDark} />
    </View>
  );
}

interface ListGroupProps {
  children: ReactNode;
  /** Left inset of the separators; 58 lines them up with text after a Tile. */
  inset?: number;
  style?: ViewStyle;
}

export function ListGroup({ children, inset = spacing.lg, style }: ListGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.group, style]}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 ? <View style={[styles.separator, { marginLeft: inset }]} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  tone?: 'default' | 'action' | 'destructive';
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function ListRow({
  title,
  subtitle,
  value,
  leading,
  trailing,
  chevron = false,
  tone = 'default',
  onPress,
  accessibilityLabel,
}: ListRowProps) {
  const body = (
    <>
      {leading}
      <View style={styles.text}>
        <Text style={[styles.title, tone === 'action' && styles.titleAction, tone === 'destructive' && styles.titleDestructive]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {trailing}
      {chevron ? <Icon name="chev" size={16} color={colors.inkFaint} strokeWidth={2.4} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
      onPress={onPress}
      activeOpacity={0.6}
      style={styles.row}
    >
      {body}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  group: { backgroundColor: colors.surface, borderRadius: radii.card, overflow: 'hidden', marginBottom: spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, color: colors.ink },
  titleAction: { color: colors.accent, fontWeight: '500' },
  titleDestructive: { color: colors.error },
  subtitle: { fontSize: 13, color: colors.inkMuted, marginTop: 1, lineHeight: 18 },
  value: { fontSize: 15, color: colors.inkMuted },
});
