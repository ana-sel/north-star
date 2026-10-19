import { StyleSheet, Text, View } from 'react-native';
import { ACTIVE_JOURNEY_CAP } from '@data/paths';
import { colors, radii, spacing } from '@styles/theme';
import { Button, PracticeCard, Route, Sheet, Tile } from '@ui';
import { journeyContent } from './journeyContent';
import { journeyProgressLine } from './pathsLogic';
import { useJourney } from './useJourney';

interface JourneyPreviewSheetProps {
  journeyId: string | null;
  onClose: () => void;
  onOpenFull: (journeyId: string) => void;
}

/** Look before committing: what it is, what it gives you, the practice, where it starts, and Start. */
export function JourneyPreviewSheet({ journeyId, onClose, onOpenFull }: JourneyPreviewSheetProps) {
  const content = journeyId ? journeyContent(journeyId) : null;
  return (
    <Sheet
      visible={journeyId !== null}
      onClose={onClose}
      title={content?.title}
      leading={content ? <Tile icon={content.icon} color={content.tone.base} /> : undefined}
    >
      {journeyId ? <PreviewBody journeyId={journeyId} onClose={onClose} onOpenFull={onOpenFull} /> : <View />}
    </Sheet>
  );
}

function PreviewBody({ journeyId, onClose, onOpenFull }: { journeyId: string; onClose: () => void; onOpenFull: (id: string) => void }) {
  const content = journeyContent(journeyId);
  const journey = useJourney(journeyId);
  if (!content) return null;
  const full = journey.activeCount >= ACTIVE_JOURNEY_CAP;
  const resumable = journey.view === 'paused';
  const canStart = journey.view === 'new' || resumable;

  const handleStart = async () => {
    if (await journey.start()) onClose();
  };

  return (
    <View>
      <Text style={styles.line}>{content.line}</Text>
      {content.givesYou?.length ? (
        <View style={styles.chips}>
          {content.givesYou.map((value) => (
            <Text key={value} style={[styles.chip, { backgroundColor: content.tone.soft, color: content.tone.deep }]}>{value}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.gap} />
      <PracticeCard label="The practice" labelColor={content.tone.deep} freq={content.freq} practice={content.practice} counts={content.counts} />
      <View style={styles.card}>
        <Route returns={journey.returns} tone={content.tone} steady={journey.view === 'steady'} />
        <Text style={styles.sub}>{journeyProgressLine(journey.view, journey.returns)}</Text>
      </View>

      {canStart ? (
        <Button
          label={full ? 'All three slots are in use' : resumable ? 'Resume' : `Start this ${content.kind === 'path' ? 'path' : 'foundation'}`}
          onPress={handleStart}
          disabled={full}
          loading={journey.busy}
          style={styles.gapTop}
        />
      ) : null}
      <Button label="See full page" variant="ghost" onPress={() => onOpenFull(journeyId)} />
      <Text style={styles.meta}>
        {full ? 'Pause one from Walking now first; nothing is lost.' : `${journey.activeCount} of ${ACTIVE_JOURNEY_CAP} journeys active`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 16, color: colors.inkMuted, marginTop: spacing.xs, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  chip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: radii.pill, fontSize: 14, fontWeight: '600', overflow: 'hidden' },
  gap: { height: spacing.md },
  gapTop: { marginTop: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, marginBottom: spacing.sm },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: spacing.sm, lineHeight: 20 },
  meta: { fontSize: 13, color: colors.inkMuted, textAlign: 'center' },
});
