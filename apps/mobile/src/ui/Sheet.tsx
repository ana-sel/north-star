import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '@styles/theme';
import { Icon } from './Icon';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  leading?: ReactNode;
  children: ReactNode;
}

/** Bottom sheet for previews and short edits. Closes with ×, the scrim, Android back, or dragging the top down. */
export function Sheet({ visible, onClose, title, leading, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const offset = useRef(new Animated.Value(480)).current;

  useEffect(() => {
    if (!visible) return;
    offset.setValue(480);
    Animated.timing(offset, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, offset]);

  // Only the grabber and header drag, so content scrolling and the sleep dial keep their gestures.
  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => offset.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 120 || g.vy > 0.8) {
            Animated.timing(offset, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => onClose());
          } else {
            Animated.spring(offset, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
          }
        },
        onPanResponderTerminate: () => Animated.spring(offset, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(),
      }),
    [offset, onClose],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <Animated.View
        accessibilityViewIsModal
        style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl, transform: [{ translateY: offset }] }]}
      >
        <View {...drag.panHandlers}>
          <View style={styles.grabber} />
          {title ? (
            <View style={styles.head}>
              {leading}
              <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
                {title}
              </Text>
              <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close} hitSlop={8}>
                <Icon name="x" size={14} color={colors.inkMuted} strokeWidth={2.6} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,28,30,0.32)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    ...shadows.lg,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.inkFaint, opacity: 0.6, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.canvasDark, alignItems: 'center', justifyContent: 'center' },
});
