/**
 * One journey page for Growth Paths and Foundations (docs/design/wireframes-health/journey-anatomy.html).
 * The practice and its action come first; progress is one route; history is one tap away.
 */

import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ACTIVE_JOURNEY_CAP } from '@data/paths';
import { normalizeHabitName, V1_HABIT_TEMPLATES } from '@features/habits/habitTemplates';
import { localDateISO } from '@lib/time';
import { colors, radii, spacing } from '@styles/theme';
import { Button, Icon, ListGroup, ListRow, NavBar, PracticeCard, Route, SectionHeader } from '@ui';
import { journeyContent } from './journeyContent';
import { journeyProgressLine, returnDayLabel } from './pathsLogic';
import { useJourney } from './useJourney';

interface JourneyScreenProps {
  journeyId: string;
  backLabel: string;
  onBack: () => void;
  onOpenReturns: () => void;
}

const CAMPS_NOTE =
  'The first three returns are only noticing. The practice deepens in Doing, and Under pressure asks whether it holds when something actually goes wrong. Steady is yours to claim, never awarded.';

export function JourneyScreen({ journeyId, backLabel, onBack, onOpenReturns }: JourneyScreenProps) {
  const content = journeyContent(journeyId);
  const journey = useJourney(journeyId);
  const [aboutOpen, setAboutOpen] = useState(false);

  if (!content) {
    return (
      <View style={styles.fill}>
        <NavBar backLabel={backLabel} onBack={onBack} />
        <Text style={styles.missing}>This journey is no longer available.</Text>
      </View>
    );
  }

  const { tone } = content;
  const { view } = journey;
  const noun = content.kind === 'path' ? 'path' : 'foundation';
  const started = view !== 'new';
  const lastReturn = journey.returnDates[0] ? `Last return ${returnDayLabel(journey.returnDates[0], localDateISO())}` : 'No returns yet';
  const meta = {
    new: journey.activeCount >= ACTIVE_JOURNEY_CAP
      ? 'All three slots are in use. Pause one first; nothing is lost.'
      : `Uses one of your three slots · ${journey.activeCount} of ${ACTIVE_JOURNEY_CAP} active`,
    walking: lastReturn,
    reflection: lastReturn,
    paused: `Paused · all ${journey.returns} returns kept`,
    steady: 'Steady · nothing to keep up',
  }[view];
  const habits = V1_HABIT_TEMPLATES.filter((t) => content.habitTemplateIds.includes(t.id));

  return (
    <View style={styles.fill}>
      <NavBar backLabel={backLabel} onBack={onBack} />
      {journey.loading ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.kicker}>
            <Icon name={content.icon} size={15} color={tone.deep} />
            <Text style={[styles.kickerText, { color: tone.deep }]}>
              {content.category} · {content.kind === 'path' ? 'Growth path' : 'Foundation'}
            </Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">{content.title}</Text>
          <Text style={styles.line}>{content.line}</Text>

          <View style={styles.gap} />
          <PracticeCard label="The practice" labelColor={tone.deep} freq={content.freq} practice={content.practice} counts={content.counts} meta={meta}>
            {view === 'new' ? (
              <Button label={`Start this ${noun}`} onPress={journey.start} loading={journey.busy} disabled={journey.activeCount >= ACTIVE_JOURNEY_CAP} />
            ) : null}
            {view === 'walking' || view === 'reflection' ? <Button label="I came back" onPress={journey.comeBack} loading={journey.busy} /> : null}
            {view === 'reflection' ? <Button label="Claim Steady" variant="secondary" onPress={journey.claimSteady} /> : null}
            {view === 'paused' ? (
              <Button label="Resume" onPress={journey.start} loading={journey.busy} disabled={journey.activeCount >= ACTIVE_JOURNEY_CAP} />
            ) : null}
          </PracticeCard>

          {view === 'reflection' ? (
            <View style={[styles.note, { backgroundColor: tone.soft }]}>
              <Text style={[styles.noteText, { color: tone.deep }]}>
                <Text style={styles.bold}>Reflection is open. </Text>
                Does this feel like yours now? Claim Steady only if it does. There is no rush, and returning still counts.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            disabled={!started}
            onPress={onOpenReturns}
            activeOpacity={0.7}
            style={styles.card}
            accessibilityRole={started ? 'button' : undefined}
            accessibilityLabel={started ? 'Progress. Open all returns' : undefined}
          >
            <View style={styles.cardHead}>
              <Text style={[styles.cardLabel, { color: tone.deep }]}>Progress</Text>
              {started ? (
                <View style={styles.row}>
                  <Text style={styles.when}>All returns</Text>
                  <Icon name="chev" size={14} color={colors.inkFaint} strokeWidth={2.4} />
                </View>
              ) : null}
            </View>
            <Route returns={journey.returns} tone={tone} steady={view === 'steady'} />
            <Text style={styles.sub}>{journeyProgressLine(view, journey.returns)}</Text>
          </TouchableOpacity>

          {content.examples?.length ? (
            <>
              <SectionHeader title={content.examplesTitle ?? 'In real life'} />
              <ListGroup>
                {content.examples.map((example) => <ListRow key={example} title={example} />)}
              </ListGroup>
            </>
          ) : null}

          {content.voice ? (
            <>
              <SectionHeader title="The sentence" />
              <View style={styles.card}>
                <Text style={styles.qLabel}>When it is tight</Text>
                <Text style={[styles.quote, styles.quoteTight]}>{content.voice.tight}</Text>
                <Text style={[styles.qLabel, styles.qLabelGap, { color: tone.deep }]}>The one you are practising</Text>
                <Text style={styles.quote}>{content.voice.open}</Text>
              </View>
            </>
          ) : null}

          {habits.length ? (
            <>
              <SectionHeader title="Daily habits" meta="Optional" />
              <ListGroup>
                {habits.map((t) => {
                  const added = journey.addedHabitNames.has(normalizeHabitName(t.name));
                  return (
                    <ListRow
                      key={t.id}
                      title={t.name}
                      subtitle={t.minimumVersion}
                      value={added ? 'Added' : undefined}
                      trailing={added ? null : (
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Add ${t.name} to Habits`} onPress={() => journey.addHabit(t.id)} hitSlop={10}>
                          <Icon name="plus" size={20} color={colors.accent} />
                        </TouchableOpacity>
                      )}
                    />
                  );
                })}
              </ListGroup>
              <Text style={styles.foot}>Habits live in Log · Habits and do not use a journey slot.</Text>
            </>
          ) : null}

          <SectionHeader title="About" />
          <View style={styles.card}>
            <Text style={styles.body} numberOfLines={aboutOpen ? undefined : 3}>
              {content.about} {CAMPS_NOTE}
            </Text>
            <TouchableOpacity onPress={() => setAboutOpen((open) => !open)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.more}>{aboutOpen ? 'Show less' : 'Show more'}</Text>
            </TouchableOpacity>
          </View>

          {view === 'walking' || view === 'reflection' ? (
            <>
              <ListGroup style={styles.gapTop}>
                <ListRow title="Pause for now" value="Keeps every return" onPress={journey.pause} />
              </ListGroup>
              <Text style={styles.foot}>{journey.activeCount} of {ACTIVE_JOURNEY_CAP} journeys active.</Text>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  loading: { marginTop: spacing.huge },
  missing: { margin: spacing.lg, color: colors.inkMuted, fontSize: 16 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  kickerText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.7, marginTop: 2 },
  line: { fontSize: 16, color: colors.inkMuted, marginTop: 6, lineHeight: 22 },
  gap: { height: spacing.lg },
  gapTop: { marginTop: spacing.xxl },
  note: { borderRadius: radii.card, padding: spacing.lg, marginBottom: spacing.sm },
  noteText: { fontSize: 15, lineHeight: 21 },
  bold: { fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, paddingTop: 14, marginBottom: spacing.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardLabel: { fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  when: { fontSize: 14, color: colors.inkMuted },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: spacing.sm, lineHeight: 20 },
  qLabel: { fontSize: 12, fontWeight: '600', color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.4 },
  qLabelGap: { marginTop: spacing.md },
  quote: { fontSize: 15, fontStyle: 'italic', color: colors.ink, lineHeight: 21, marginTop: 2 },
  quoteTight: { color: colors.inkMuted },
  foot: { fontSize: 13, color: colors.inkMuted, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, lineHeight: 18 },
  body: { fontSize: 16, color: colors.ink, lineHeight: 23 },
  more: { fontSize: 15, fontWeight: '600', color: colors.accent, marginTop: 6 },
});
