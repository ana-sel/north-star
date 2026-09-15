import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@styles/theme';

interface ScreenProps {
  children: React.ReactNode;
  padTop?: boolean;
  padBottom?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, padTop = true, padBottom = true, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        { paddingTop: padTop ? insets.top : 0, paddingBottom: padBottom ? insets.bottom : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
});
