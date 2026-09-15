import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@styles/theme';

interface RingProps {
  /** 0..1 completion. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}

export function Ring({
  value,
  size = 88,
  stroke = 9,
  color = colors.olive,
  trackColor = colors.surfaceMuted,
  label,
  sublabel,
}: RingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {label ? (
        <View style={styles.center}>
          <Text style={styles.label}>{label}</Text>
          {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  sublabel: { fontSize: 9, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
