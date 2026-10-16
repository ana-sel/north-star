import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '@styles/theme';
import { dialDurationMinutes, dialMinutesFromPoint, dialPoint } from './sleepDialMath';

const SIZE = 216;
const CENTER = SIZE / 2;
const RADIUS = 76;

interface SleepDialProps {
  bedMinutes: number;
  wakeMinutes: number;
  onBedChange: (minutes: number) => void;
  onWakeChange: (minutes: number) => void;
}

export function SleepDial({ bedMinutes, wakeMinutes, onBedChange, onWakeChange }: SleepDialProps) {
  const [dragging, setDragging] = useState<'bed' | 'wake' | null>(null);
  const bed = dialPoint(bedMinutes, CENTER, RADIUS);
  const wake = dialPoint(wakeMinutes, CENTER, RADIUS);
  const duration = dialDurationMinutes(bedMinutes, wakeMinutes);
  const arc = `M ${bed.x} ${bed.y} A ${RADIUS} ${RADIUS} 0 ${duration > 720 ? 1 : 0} 1 ${wake.x} ${wake.y}`;

  const pickHandle = (x: number, y: number): 'bed' | 'wake' | null => {
    const bedDistance = Math.hypot(x - bed.x, y - bed.y);
    const wakeDistance = Math.hypot(x - wake.x, y - wake.y);
    if (Math.min(bedDistance, wakeDistance) > 28) return null;
    return bedDistance <= wakeDistance ? 'bed' : 'wake';
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.face}
        onStartShouldSetResponder={(event) => pickHandle(event.nativeEvent.locationX, event.nativeEvent.locationY) !== null}
        onResponderGrant={(event) => setDragging(pickHandle(event.nativeEvent.locationX, event.nativeEvent.locationY))}
        onResponderMove={(event) => {
          if (!dragging) return;
          const minutes = dialMinutesFromPoint(event.nativeEvent.locationX, event.nativeEvent.locationY, CENTER);
          (dragging === 'bed' ? onBedChange : onWakeChange)(minutes);
        }}
        onResponderRelease={() => setDragging(null)}
        onResponderTerminate={() => setDragging(null)}
        accessible={false}
      >
        <Svg width={SIZE} height={SIZE} pointerEvents="none">
          <Circle cx={CENTER} cy={CENTER} r={98} fill={theme.colors.greige} />
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={theme.colors.line} strokeWidth={2} />
          {duration === 1440 ? (
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={theme.colors.olive} strokeWidth={6} />
          ) : (
            <Path d={arc} fill="none" stroke={theme.colors.olive} strokeWidth={6} strokeLinecap="round" />
          )}
          <Circle cx={bed.x} cy={bed.y} r={14} fill={theme.colors.ink} stroke={theme.colors.card} strokeWidth={3} />
          <Circle cx={wake.x} cy={wake.y} r={14} fill={theme.colors.olive} stroke={theme.colors.card} strokeWidth={3} />
        </Svg>
        <View pointerEvents="none" style={styles.centerLabel}>
          <Text style={styles.duration}>{Math.floor(duration / 60)}h {String(duration % 60).padStart(2, '0')}m</Text>
          <Text style={styles.caption}>Sleep window</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  face: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  centerLabel: { position: 'absolute', alignItems: 'center', gap: theme.spacing.xs },
  duration: { fontSize: theme.typography.xl, fontWeight: '700', color: theme.colors.ink },
  caption: { fontSize: theme.typography.xs, color: theme.colors.muted },
});