import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '@styles/theme';
import { Icon } from './Icon';

interface NavBarProps {
  /** Title of the page this one was opened from. */
  backLabel: string;
  onBack: () => void;
  right?: ReactNode;
}

/** Bar for pushed pages: back chevron labelled with the previous page, as in Health. */
export function NavBar({ backLabel, onBack, right }: NavBarProps) {
  return (
    <View style={styles.bar}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Back to ${backLabel}`} onPress={onBack} style={styles.back} hitSlop={8}>
        <Icon name="back" size={22} color={colors.accent} />
        <Text style={styles.label} numberOfLines={1}>{backLabel}</Text>
      </TouchableOpacity>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, maxWidth: '70%' },
  label: { fontSize: 17, color: colors.accent },
});
