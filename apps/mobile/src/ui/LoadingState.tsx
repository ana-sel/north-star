import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@styles/theme';

export function LoadingState() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.olive} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
});
