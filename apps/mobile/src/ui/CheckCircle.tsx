import { StyleSheet, View } from 'react-native';
import { colors } from '@styles/theme';
import { Icon } from './Icon';

interface CheckCircleProps {
  done: boolean;
  /** Fill when done; done is warmer, never greyed. */
  color?: string;
}

export function CheckCircle({ done, color = colors.btn }: CheckCircleProps) {
  return (
    <View style={[styles.check, done && { backgroundColor: color, borderColor: color }]}>
      {done ? <Icon name="check" size={14} color={colors.onDark} strokeWidth={3} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.inkFaint, alignItems: 'center', justifyContent: 'center' },
});
