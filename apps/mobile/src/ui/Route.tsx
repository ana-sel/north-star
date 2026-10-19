import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { DOING_RETURNS, REFLECTION_RETURNS, WATCHING_RETURNS } from '@data/journeyRules';
import { colors, Tone } from '@styles/theme';

const STAGES = ['Watching', 'Doing', 'Under pressure'] as const;
const CAMP_AT = [0, WATCHING_RETURNS, DOING_RETURNS];

interface RouteProps {
  returns: number;
  tone: Tone;
  size?: 'big' | 'small';
  steady?: boolean;
}

/** Camps at their frozen thresholds; the walker only moves forward; Steady is the self-claimed end. */
export function Route({ returns, tone, size = 'big', steady = false }: RouteProps) {
  const [measured, setMeasured] = useState(0);
  const big = size === 'big';
  const W = big ? measured : 150;
  const H = big ? 76 : 16;
  const y = big ? 36 : 8;
  const x0 = big ? 14 : 5;
  const x1 = W - x0;
  const X = (r: number) => x0 + (Math.min(r, REFLECTION_RETURNS) / REFLECTION_RETURNS) * (x1 - x0);
  const faint = tone.soft;
  const wx = X(returns);
  const stage = returns >= DOING_RETURNS ? 2 : returns >= WATCHING_RETURNS ? 1 : 0;
  const label = steady ? `${returns} returns, Steady` : `${returns} returns, ${STAGES[stage]}`;

  const onLayout = (e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width);

  return (
    <View onLayout={big ? onLayout : undefined} style={big ? styles.big : { width: W, height: H }} accessible accessibilityLabel={label}>
      {W > 0 ? (
        <Svg width={W} height={H}>
          <Line x1={x0} y1={y} x2={x1} y2={y} stroke={faint} strokeWidth={big ? 3 : 2} strokeDasharray={big ? '4 5' : '3 3'} strokeLinecap="round" />
          <Line x1={x0} y1={y} x2={wx} y2={y} stroke={tone.base} strokeWidth={big ? 4 : 3} strokeLinecap="round" />
          {CAMP_AT.map((t) => {
            const reached = returns >= t;
            return (
              <Circle key={t} cx={X(t)} cy={y} r={big ? 6 : 3.5} fill={reached ? tone.base : '#fff'} stroke={reached ? '#fff' : faint} strokeWidth={big ? 2.5 : 1.5} />
            );
          })}
          {steady ? (
            <Circle cx={x1} cy={y} r={big ? 9 : 4.5} fill={tone.base} stroke="#fff" strokeWidth={2} />
          ) : (
            <>
              <Circle cx={x1} cy={y} r={big ? 8 : 4} fill="#fff" stroke={colors.inkFaint} strokeWidth={1.5} strokeDasharray={big ? '2.5 2.5' : '1.5 1.5'} />
              {big ? <Circle cx={wx} cy={y} r={13} fill={tone.soft} /> : null}
              <Circle cx={wx} cy={y} r={big ? 7 : 5} fill={tone.base} stroke="#fff" strokeWidth={big ? 3 : 2} />
            </>
          )}
          {big ? (
            <>
              {!steady ? (
                <SvgText
                  x={Math.min(Math.max(wx, x0 + 22), x1 - 22)}
                  y={12}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="700"
                  fill={tone.deep}
                >{`You · ${returns}`}</SvgText>
              ) : null}
              {STAGES.map((name, i) => {
                const ends = [0, WATCHING_RETURNS, DOING_RETURNS, REFLECTION_RETURNS];
                const on = !steady && i === stage;
                return (
                  <SvgText key={name} x={(X(ends[i]) + X(ends[i + 1])) / 2} y={H - 4} textAnchor="middle" fontSize={11} fontWeight={on ? '700' : '500'} fill={on ? colors.ink : colors.inkMuted}>
                    {name}
                  </SvgText>
                );
              })}
              {steady || returns < REFLECTION_RETURNS - 2 ? (
                <SvgText x={x1} y={12} textAnchor="end" fontSize={11} fontWeight={steady ? '700' : '400'} fill={steady ? tone.deep : colors.inkMuted}>
                  Steady
                </SvgText>
              ) : null}
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

interface ReturnMarksProps {
  /** Positions from 0 to 1 along the period, one per return. */
  marks: number[];
  color: string;
  from: string;
  to: string;
}

/** Only days with a return get a mark; the gaps are rest, never empty cells. */
export function ReturnMarks({ marks, color, from, to }: ReturnMarksProps) {
  return (
    <View accessible accessibilityLabel={`${marks.length} returns between ${from} and ${to}`}>
      <View style={styles.marks}>
        <View style={styles.line} />
        {marks.map((m, i) => (
          <View key={i} style={[styles.mark, { left: `${Math.min(Math.max(m, 0.02), 0.98) * 100}%`, backgroundColor: color }]} />
        ))}
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>{from}</Text>
        <Text style={styles.label}>{to}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { height: 76, alignSelf: 'stretch' },
  marks: { height: 16, marginTop: 12 },
  line: { position: 'absolute', left: 0, right: 0, top: 7, height: 1.5, backgroundColor: colors.border },
  mark: { position: 'absolute', top: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff', marginLeft: -6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { fontSize: 11, color: colors.inkFaint },
});
