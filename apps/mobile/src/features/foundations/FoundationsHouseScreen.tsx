/**
 * Foundations as a house: steps = The Ground, columns = Inner World, beams = Other People,
 * frieze = Meeting Life, roof = Meaning. Each part is one foundation.
 * Visual target: docs/design/wireframes-health/screens/foundations-house.html.
 */

import { useCallback, useEffect, useState } from 'react';
import { AccessibilityActionEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { listAllProgress, subscribeToJourneyChanges } from '@data/paths';
import type { PathProgress } from '@data/paths';
import { FOUNDATION_TIER_NAMES, FOUNDATIONS, foundationJourneyId } from '@features/foundations/foundationsContent';
import type { FoundationDefinition } from '@features/foundations/foundationsContent';
import { colors, palette, radii, spacing } from '@styles/theme';
import { Icon, ListGroup, ListRow, NavBar, SectionHeader } from '@ui';

type Tier = FoundationDefinition['tier'];
type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; lines?: [string, string] }
  | { kind: 'column'; cx: number }
  | { kind: 'roof' };

const TIER_DESCRIPTIONS: Record<Tier, { part: string; desc: string }> = {
  1: { part: 'the steps', desc: 'Body, settling and attention. Everything else stands on these.' },
  2: { part: 'the columns', desc: 'Naming feelings, seeing clearly, a fairer inner voice, and knowing what you want.' },
  3: { part: 'the beams', desc: 'Saying it clearly, and staying connected without losing yourself.' },
  4: { part: 'the frieze', desc: 'Hard things, keeping your word, and the practical side of being an adult.' },
  5: { part: 'the roof', desc: 'Small, real expressions of what matters to you.' },
};

const COLUMNS = [67.75, 131.25, 194.75, 258.25];
/** Shapes in foundation order within each tier; steps run bottom-up. */
const SHAPES: Record<string, Shape> = {
  body: { kind: 'rect', x: 8, y: 320, w: 310, h: 20 },
  regulate: { kind: 'rect', x: 20, y: 298, w: 286, h: 20 },
  attention: { kind: 'rect', x: 32, y: 276, w: 262, h: 20 },
  feel: { kind: 'column', cx: COLUMNS[0] },
  clear: { kind: 'column', cx: COLUMNS[1] },
  self: { kind: 'column', cx: COLUMNS[2] },
  know: { kind: 'column', cx: COLUMNS[3] },
  communicate: { kind: 'rect', x: 36, y: 146, w: 125, h: 26 },
  relate: { kind: 'rect', x: 165, y: 146, w: 125, h: 26 },
  hard: { kind: 'rect', x: 36, y: 102, w: 82, h: 40, lines: ['Handle', 'Hard Things'] },
  word: { kind: 'rect', x: 122, y: 102, w: 82, h: 40, lines: ['Keep Your', 'Word'] },
  practical: { kind: 'rect', x: 208, y: 102, w: 82, h: 40, lines: ['Live', 'Practically'] },
  meaning: { kind: 'roof' },
};

const STATUS_TAG: Partial<Record<PathProgress['status'], string>> = { active: 'Walking', resting: 'Paused', integrated: 'Steady' };

interface FoundationsHouseScreenProps {
  backLabel: string;
  onBack: () => void;
  onOpenJourney: (journeyId: string) => void;
  onPreview: (journeyId: string) => void;
}

export function FoundationsHouseScreen({ backLabel, onBack, onOpenJourney, onPreview }: FoundationsHouseScreenProps) {
  const [tier, setTier] = useState<Tier>(1);
  const [status, setStatus] = useState<Map<string, PathProgress['status']>>(new Map());

  const load = useCallback(async () => {
    const rows = await listAllProgress();
    setStatus(new Map(rows.filter((r) => r.journey_type === 'foundation').map((r) => [r.path_id, r.status])));
  }, []);

  useEffect(() => {
    load();
    return subscribeToJourneyChanges(load);
  }, [load]);

  const stone = palette.foundation;
  const fillFor = (f: FoundationDefinition) => {
    if (status.get(foundationJourneyId(f.id)) === 'active') return { bg: stone.base, fg: '#fff' };
    if (f.tier === tier) return { bg: '#DCD0C2', fg: stone.deep };
    return { bg: stone.soft, fg: stone.deep };
  };

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') setTier((t) => (Math.min(5, t + 1) as Tier));
    if (event.nativeEvent.actionName === 'decrement') setTier((t) => (Math.max(1, t - 1) as Tier));
  };

  const items = FOUNDATIONS.filter((f) => f.tier === tier);

  return (
    <View style={styles.fill}>
      <NavBar backLabel={backLabel} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kicker}>
          <Icon name="layers" size={15} color={stone.deep} />
          <Text style={[styles.kickerText, { color: stone.deep }]}>{FOUNDATIONS.length} basics</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">Foundations</Text>
        <Text style={styles.line}>What holds everything else up. Each part of the house is one foundation.</Text>

        <View
          style={styles.card}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Foundations house. Showing ${FOUNDATION_TIER_NAMES[tier]}, tier ${tier} of 5.`}
          accessibilityHint="Swipe up or down to change tier."
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
        >
          <View style={styles.hint}>
            <Icon name="target" size={14} color={stone.deep} />
            <Text style={[styles.hintText, { color: stone.deep }]}>Tap any part of the house</Text>
          </View>
          <View style={styles.svg}>
          <Svg width="100%" height="100%" viewBox="0 0 326 344">
            {FOUNDATIONS.map((f) => {
              const shape = SHAPES[f.id];
              if (!shape) return null;
              const { bg, fg } = fillFor(f);
              const selected = f.tier === tier;
              const line = selected ? stone.deep : '#fff';
              const weight = selected ? '700' : '600';
              const press = () => setTier(f.tier);
              if (shape.kind === 'roof') {
                return (
                  <G key={f.id} onPress={press}>
                    <Polygon points="163,16 26,98 300,98" fill="#E3DACD" />
                    <Polygon points="163,14 26,96 300,96" fill={bg} stroke={line} strokeWidth={selected ? 1.5 : 2} strokeLinejoin="round" />
                    <SvgText x={163} y={78} textAnchor="middle" fontSize={13} fontWeight={weight} fill={fg}>{f.title}</SvgText>
                  </G>
                );
              }
              if (shape.kind === 'column') {
                const c = shape.cx;
                return (
                  <G key={f.id} onPress={press}>
                    <Rect x={c - 17} y={185} width={34} height={84} fill="#E3DACD" />
                    <Rect x={c - 24} y={176} width={48} height={7} rx={2} fill={bg} stroke={line} strokeWidth={selected ? 1.5 : 2} />
                    <Rect x={c - 17} y={183} width={34} height={84} fill={bg} stroke={line} strokeWidth={selected ? 1.5 : 2} />
                    <Rect x={c - 24} y={267} width={48} height={7} rx={2} fill={bg} stroke={line} strokeWidth={selected ? 1.5 : 2} />
                    <SvgText x={c + 4} y={225} rotation={-90} origin={`${c + 4}, 225`} textAnchor="middle" fontSize={10} fontWeight={weight} fill={fg}>{f.title}</SvgText>
                  </G>
                );
              }
              return (
                <G key={f.id} onPress={press}>
                  <Rect x={shape.x} y={shape.y + 2} width={shape.w} height={shape.h} rx={4} fill="#E3DACD" />
                  <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={4} fill={bg} stroke={line} strokeWidth={selected ? 1.5 : 2} />
                  {shape.lines ? (
                    <>
                      <SvgText x={shape.x + shape.w / 2} y={shape.y + 17} textAnchor="middle" fontSize={11} fontWeight={weight} fill={fg}>{shape.lines[0]}</SvgText>
                      <SvgText x={shape.x + shape.w / 2} y={shape.y + 31} textAnchor="middle" fontSize={11} fontWeight={weight} fill={fg}>{shape.lines[1]}</SvgText>
                    </>
                  ) : (
                    <SvgText x={shape.x + shape.w / 2} y={shape.y + shape.h / 2 + 4} textAnchor="middle" fontSize={12} fontWeight={weight} fill={fg}>{f.title}</SvgText>
                  )}
                </G>
              );
            })}
          </Svg>
          </View>
          <View style={styles.legend}>
            <View style={[styles.swatch, { backgroundColor: stone.base }]} />
            <Text style={styles.legendText}>Walking</Text>
            <View style={[styles.swatch, styles.swatchGap, { backgroundColor: '#DCD0C2' }]} />
            <Text style={styles.legendText}>Selected tier</Text>
          </View>
        </View>

        <SectionHeader title={FOUNDATION_TIER_NAMES[tier]} meta={`Tier ${tier} · ${TIER_DESCRIPTIONS[tier].part}`} />
        <Text style={styles.desc}>{TIER_DESCRIPTIONS[tier].desc}</Text>
        <ListGroup>
          {items.map((f) => {
            const id = foundationJourneyId(f.id);
            const state = status.get(id);
            const inUse = state === 'active' || state === 'resting' || state === 'integrated';
            return (
              <ListRow
                key={f.id}
                title={f.title}
                subtitle={f.summary}
                value={state ? STATUS_TAG[state] : undefined}
                chevron
                onPress={() => (inUse ? onOpenJourney(id) : onPreview(id))}
              />
            );
          })}
        </ListGroup>
        <Text style={styles.foot}>The house is an order of support, not a gate. Any foundation can be started.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  kickerText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.7, marginTop: 2 },
  line: { fontSize: 16, color: colors.inkMuted, marginTop: 6, lineHeight: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, paddingVertical: spacing.md, marginTop: spacing.lg },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: spacing.sm },
  hintText: { fontSize: 13, fontWeight: '600' },
  svg: { aspectRatio: 326 / 344, alignSelf: 'stretch' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: 3, marginRight: 5 },
  swatchGap: { marginLeft: spacing.md },
  legendText: { fontSize: 12, color: colors.inkMuted },
  desc: { fontSize: 14, color: colors.inkMuted, marginTop: -2, marginBottom: spacing.sm, lineHeight: 20 },
  foot: { fontSize: 13, color: colors.inkMuted, paddingHorizontal: spacing.lg, lineHeight: 18 },
});
