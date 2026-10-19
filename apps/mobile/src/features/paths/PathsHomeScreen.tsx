/**
 * You · Paths, one scroll: Walking now, What's next? (only while a slot is open), Browse.
 * Visual target: docs/design/wireframes-health/screens/you-paths.html.
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ACTIVE_JOURNEY_CAP, countReturns, listAllProgress, subscribeToJourneyChanges } from '@data/paths';
import type { PathProgress } from '@data/paths';
import { colors, palette, spacing } from '@styles/theme';
import { ListGroup, ListRow, LoadingState, Route, SectionHeader, Tile } from '@ui';
import type { IconName } from '@ui';
import { journeyContent } from './journeyContent';
import { groupJourneysForDisplay, journeyView, stageInfoForReturns } from './pathsLogic';

export type NextChoice = 'Inward' | 'Together' | 'Craft' | 'Frontier' | 'foundations';

export const NEXT_CHOICES: { key: NextChoice; label: string; icon: IconName; color: string }[] = [
  { key: 'Inward', label: 'Feeling steadier inside', icon: 'moon', color: palette.Inward.base },
  { key: 'Together', label: 'Being better with people', icon: 'users', color: palette.Together.base },
  { key: 'Craft', label: 'Getting the work done', icon: 'pen', color: palette.Craft.base },
  { key: 'Frontier', label: 'Trying something new', icon: 'compass', color: palette.Frontier.base },
  { key: 'foundations', label: 'The basics first', icon: 'layers', color: palette.foundation.base },
];

interface PathsHomeScreenProps {
  onOpenJourney: (journeyId: string) => void;
  onOpenChoice: (choice: NextChoice) => void;
  onOpenAreas: () => void;
  onOpenFoundations: () => void;
}

export function PathsHomeScreen({ onOpenJourney, onOpenChoice, onOpenAreas, onOpenFoundations }: PathsHomeScreenProps) {
  const [rows, setRows] = useState<PathProgress[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const all = await listAllProgress();
    const shown = all.filter((row) => row.status === 'active' || row.status === 'resting');
    const entries = await Promise.all(shown.map(async (row) => [row.path_id, await countReturns(row.path_id)] as const));
    setCounts(Object.fromEntries(entries));
    setRows(all);
  }, []);

  useEffect(() => {
    load();
    return subscribeToJourneyChanges(load);
  }, [load]);

  if (!rows) return <LoadingState />;

  const { active, resting } = groupJourneysForDisplay(rows);
  const open = ACTIVE_JOURNEY_CAP - active.length;

  const journeyRow = (row: PathProgress) => {
    const content = journeyContent(row.path_id);
    if (!content) return null;
    const returns = counts[row.path_id] ?? 0;
    const view = journeyView(row.status, returns);
    const subtitle = view === 'paused'
      ? `Paused · ${returns} ${returns === 1 ? 'return' : 'returns'} kept`
      : `${stageInfoForReturns(returns).stageLabel} · ${returns} ${returns === 1 ? 'return' : 'returns'}`;
    return (
      <ListRow
        key={row.path_id}
        title={content.title}
        subtitle={subtitle}
        leading={<Tile icon={content.icon} color={content.tone.base} />}
        trailing={view === 'paused' ? null : <Route returns={returns} tone={content.tone} size="small" />}
        chevron
        onPress={() => onOpenJourney(row.path_id)}
      />
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="Walking now" meta={`${active.length} of ${ACTIVE_JOURNEY_CAP}`} />
      {active.length ? (
        <ListGroup inset={58}>{active.map(journeyRow)}</ListGroup>
      ) : (
        <Text style={styles.empty}>Nothing yet. Choose one quality or one foundation below; nothing needs to be perfect.</Text>
      )}
      {open === 0 ? <Text style={styles.foot}>All three slots are in use. That is plenty. To start something new, pause one first.</Text> : null}

      {resting.length ? (
        <>
          <SectionHeader title="Paused" />
          <ListGroup inset={58}>{resting.map(journeyRow)}</ListGroup>
        </>
      ) : null}

      {open > 0 ? (
        <>
          <SectionHeader title="What’s next?" meta={`${open} ${open === 1 ? 'slot' : 'slots'} open`} />
          <Text style={styles.prompt}>What would help most right now?</Text>
          <ListGroup inset={58}>
            {NEXT_CHOICES.map((choice) => (
              <ListRow
                key={choice.key}
                title={choice.label}
                leading={<Tile icon={choice.icon} color={choice.color} />}
                chevron
                onPress={() => onOpenChoice(choice.key)}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      <SectionHeader title="Browse" />
      <ListGroup inset={58}>
        <ListRow title="Growth paths" subtitle="14 qualities in 4 areas" leading={<Tile icon="compass" color={colors.btn} />} chevron onPress={onOpenAreas} />
        <ListRow title="Foundations" subtitle="13 basics in 5 tiers" leading={<Tile icon="layers" color={palette.foundation.base} />} chevron onPress={onOpenFoundations} />
      </ListGroup>
      <View style={styles.bottom} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  empty: { fontSize: 15, color: colors.inkMuted, lineHeight: 21, marginBottom: spacing.sm },
  foot: { fontSize: 13, color: colors.inkMuted, paddingHorizontal: spacing.lg, lineHeight: 18 },
  prompt: { fontSize: 14, color: colors.inkMuted, marginTop: -2, marginBottom: spacing.sm },
  bottom: { height: spacing.huge },
});
