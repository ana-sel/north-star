import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { colors, palette } from '@styles/theme';
import { Icon } from '@ui';
import { dialDurationMinutes, dialMinutesFromPoint, dialPoint } from './sleepDialMath';

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 88;
const TRACK = 22;
const HANDLE = 13;
const HOURS = [
  { label: '00', x: CENTER, y: 50 },
  { label: '06', x: 172, y: 114 },
  { label: '12', x: CENTER, y: 178 },
  { label: '18', x: 48, y: 114 },
];

interface SleepDialProps {
  bedMinutes: number;
  wakeMinutes: number;
  onBedChange: (minutes: number) => void;
  onWakeChange: (minutes: number) => void;
  caption?: string;
}

export function SleepDial({ bedMinutes, wakeMinutes, onBedChange, onWakeChange, caption = 'hr asleep' }: SleepDialProps) {
  const tone = palette.sleep;
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
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={tone.soft} strokeWidth={TRACK} />
          {duration === 1440 ? (
            <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={tone.base} strokeWidth={TRACK} />
          ) : (
            <Path d={arc} fill="none" stroke={tone.base} strokeWidth={TRACK} strokeLinecap="round" />
          )}
          {HOURS.map((h) => (
            <SvgText key={h.label} x={h.x} y={h.y} fontSize={11} fontWeight="600" fill={colors.inkFaint} textAnchor="middle">
              {h.label}
            </SvgText>
          ))}
          <Circle cx={bed.x} cy={bed.y} r={HANDLE} fill={colors.surface} stroke={tone.base} strokeWidth={2} />
          <Circle cx={wake.x} cy={wake.y} r={HANDLE} fill={colors.surface} stroke={tone.base} strokeWidth={2} />
        </Svg>
        <View pointerEvents="none" style={[styles.handleIcon, { left: bed.x - 7, top: bed.y - 7 }]}>
          <Icon name="moon" size={14} color={tone.base} strokeWidth={2.4} />
        </View>
        <View pointerEvents="none" style={[styles.handleIcon, { left: wake.x - 7, top: wake.y - 7 }]}>
          <Icon name="sun" size={14} color={tone.base} strokeWidth={2.4} />
        </View>
        <View pointerEvents="none" style={styles.centerLabel}>
          <Text style={styles.duration}>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</Text>
          <Text style={styles.caption}>{caption}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 4 },
  face: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  handleIcon: { position: 'absolute', width: 14, height: 14 },
  centerLabel: { position: 'absolute', alignItems: 'center' },
  duration: { fontSize: 26, fontWeight: '700', color: colors.ink },
  caption: { fontSize: 12, color: colors.inkMuted },
});