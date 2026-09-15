import { useMemo } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing, typography } from '@styles/theme';
import { Icon } from '@ui';
import { localDateISO, localDateWindow } from '@lib/time';

export interface HeroDot {
  key: string;
  current: boolean;
  yesterday: boolean;
}

interface JourneyHeroProps {
  eyebrow: string;
  practice: string;
  countsWhen: string;
  ticked: boolean;
  freqText: string;
  returnDates: string[];
  trailDays: number;
  peekName: string | null;
  dots: HeroDot[];
  restMode: boolean;
  onTick: () => void;
  onOpenDetail: () => void;
  onCycle: (dir: 1 | -1) => void;
}

export function JourneyHero({
  eyebrow,
  practice,
  countsWhen,
  ticked,
  freqText,
  returnDates,
  trailDays,
  peekName,
  dots,
  restMode,
  onTick,
  onOpenDetail,
  onCycle,
}: JourneyHeroProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_evt, gesture) => {
          if (Math.abs(gesture.dx) > 60) onCycle(gesture.dx < 0 ? 1 : -1);
        },
      }),
    [onCycle],
  );

  return (
    <View style={styles.stage}>
      <View style={styles.heroWrap} {...panResponder.panHandlers}>
        <View style={[styles.hero, ticked && styles.heroDone]}>
          <TouchableOpacity style={styles.eyebrow} onPress={onOpenDetail} activeOpacity={0.7}>
            <Text style={styles.eyebrowText}>{eyebrow}</Text>
            <View style={styles.expand}>
              <Icon name="chev" size={14} color="rgba(241,237,230,0.72)" />
            </View>
          </TouchableOpacity>

          {restMode ? (
            <View style={styles.restRow}>
              <Icon name="leaf" size={16} color="rgba(241,237,230,0.5)" />
              <Text style={styles.restText}>Today is for rest. The practice holds — nothing is lost.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.practice}>{practice}</Text>
              <View style={styles.voice}>
                <Text style={styles.voiceText}>{countsWhen}</Text>
              </View>
              <View style={styles.bottom}>
                <TouchableOpacity
                  style={[styles.tick, ticked && styles.tickDone]}
                  onPress={onTick}
                  disabled={ticked}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="I practised this"
                  accessibilityState={{ disabled: ticked }}
                >
                  <Icon name="check" size={20} color={ticked ? colors.onDark : 'transparent'} />
                </TouchableOpacity>
                <View style={styles.pulse}>
                  <ReturnTrail returnDates={returnDates} trailDays={trailDays} tickedToday={ticked} />
                  <Text style={styles.freq}>{freqText}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {peekName && !restMode ? (
          <TouchableOpacity
            style={styles.peek}
            onPress={() => onCycle(1)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Show next quality: ${peekName}`}
          >
            <Text style={styles.peekName}>{peekName.toUpperCase()}</Text>
            <Icon name="chev" size={14} color="rgba(241,237,230,0.7)" />
          </TouchableOpacity>
        ) : null}
      </View>

      {dots.length > 1 ? (
        <View style={styles.dots}>
          {dots.map((dot) => (
            <View
              key={dot.key}
              style={[styles.dot, dot.current && styles.dotOn, dot.yesterday && styles.dotYesterday]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ReturnTrail({
  returnDates,
  trailDays,
  tickedToday,
}: {
  returnDates: string[];
  trailDays: number;
  tickedToday: boolean;
}) {
  const today = localDateISO();
  const days = localDateWindow(trailDays);
  const returnSet = new Set(returnDates);
  return (
    <View style={styles.trail}>
      {days.map((d) => {
        const isToday = d === today;
        if (isToday) {
          return <View key={d} style={[styles.trailDot, styles.trailToday, tickedToday && styles.trailTodayDone]} />;
        }
        return (
          <View key={d} style={[styles.trailDot, returnSet.has(d) ? styles.trailReturned : styles.trailBlank]} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { gap: spacing.xs },
  heroWrap: { position: 'relative' },
  hero: {
    backgroundColor: '#2d2b27',
    borderRadius: radii.feature,
    padding: spacing.lg,
    gap: spacing.md,
    marginRight: 14,
  },
  heroDone: {
    shadowColor: colors.olive,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1.5,
    borderColor: colors.olive,
  },
  eyebrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrowText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: 'rgba(241,237,230,0.62)' },
  expand: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  practice: { fontSize: 15, fontWeight: '700', color: '#F1EDE6', lineHeight: 22, letterSpacing: -0.1 },
  voice: { borderLeftWidth: 2, borderLeftColor: colors.olive, paddingLeft: 13, paddingVertical: 1 },
  voiceText: { fontSize: typography.sizes.sm, fontStyle: 'italic', color: 'rgba(241,237,230,0.86)', lineHeight: 21 },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  restText: { flex: 1, fontSize: typography.sizes.sm, fontStyle: 'italic', color: 'rgba(241,237,230,0.5)', lineHeight: 21 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  tick: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickDone: { backgroundColor: colors.olive, borderColor: colors.olive },
  pulse: { flex: 1, gap: 6 },
  trail: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 11 },
  trailDot: { width: 4, height: 4, borderRadius: 2 },
  trailReturned: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.olive },
  trailBlank: { backgroundColor: 'rgba(255,255,255,0.13)' },
  trailToday: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'transparent',
  },
  trailTodayDone: { backgroundColor: colors.olive, borderColor: colors.olive },
  freq: { fontSize: typography.sizes.xs, color: 'rgba(241,237,230,0.55)', lineHeight: 20 },
  peek: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    right: 0,
    width: 26,
    backgroundColor: '#3d3a37',
    borderTopRightRadius: radii.feature,
    borderBottomRightRadius: radii.feature,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  peekName: {
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: 'rgba(241,237,230,0.55)',
    transform: [{ rotate: '90deg' }],
    width: 120,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4, marginBottom: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { width: 20, backgroundColor: colors.olive },
  dotYesterday: { opacity: 0.35 },
});
