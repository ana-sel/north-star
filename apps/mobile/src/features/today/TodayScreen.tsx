/**
 * TodayScreen (v1) — the orientation screen.
 *
 * Layout follows docs/design/wireframes-health/screens/today.html: practice →
 * Summary (sleep, pace, rituals) → From Trello → Compass note. On first run a
 * single Getting started list replaces the empty boxes. Local bands read real
 * local data and adapt around what actually exists.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, palette, radii, spacing } from '@styles/theme';
import { Button, CheckCircle, Icon, ListGroup, ListRow, LoadingState, PracticeCard, Ring, SectionHeader, Sheet, SummaryCard, SummaryValue, Tile } from '@ui';
import { DATA, STAGES } from '@features/paths/pathsContent';
import { journeyContent } from '@features/paths/journeyContent';
import { foundationForJourneyId } from '@features/foundations/foundationsContent';
import { getPref, setPref } from '@data/prefs';
import { habitsForDate } from '@data/habits';
import type { HabitDayStatus } from '@data/habits';
import { getTodaySleep } from '@data/sleep';
import type { TrelloCard, TrelloChecklist } from '@data/trello';
import { createTrelloClient } from '@data/trello';
import { listActiveJourneys, logReturn, recentReturns, subscribeToJourneyChanges } from '@data/paths';
import type { PathProgress } from '@data/paths';
import { getDeviceTimezone, localDateISO, localDateOffset } from '@lib/time';
import { PaceSelector } from './components/PaceSelector';
import { ArrivalCard } from './components/ArrivalCard';
import { WelcomeBackCard } from './components/WelcomeBackCard';
import { buildInsight, isBelowSleepTarget, paceNote, sectionsForPace, shouldWelcomeBack, sleepTargetMinutes } from './todayLogic';
import type { PaceMode, SleepTarget } from './todayLogic';
import {
  buildTodayAIContext,
  getTodayAIClient,
  readTodayAIInsight,
  shouldRequestAI,
  validateInsight,
  writeTodayAIInsight,
  type TodayAIInsight,
  type TodayAISource,
} from './ai';

interface TodayScreenProps {
  onOpenPaths: () => void;
  onOpenPathDetail: (pathId: string) => void;
  onOpenFoundationDetail: (foundationId: string) => void;
  onOpenSleep: () => void;
  onOpenHabits: () => void;
  trelloCards?: ReadonlyArray<{ id: string; title: string; url: string }>;
  trelloClient?: ReturnType<typeof createTrelloClient>;
}

const TRAIL_DAYS = 14;
const TRELLO_BOARD_URL = 'https://trello.com/b/ULAuklhQ/2-execution-today-next-up';

interface RitualGroups {
  morning: HabitDayStatus[];
  evening: HabitDayStatus[];
  anytime: HabitDayStatus[];
}

/** Every active daily habit lands in exactly one Today group; none disappear. */
function partitionRituals(all: HabitDayStatus[]): RitualGroups {
  return {
    morning: all.filter((h) => h.habit.ritual === 'morning'),
    evening: all.filter((h) => h.habit.ritual === 'evening'),
    anytime: all.filter((h) => h.habit.ritual !== 'morning' && h.habit.ritual !== 'evening'),
  };
}

function doneCount(items: HabitDayStatus[]): number {
  return items.filter((h) => h.completed).length;
}

function journeyTitle(journey: PathProgress): string {
  if (journey.journey_type === 'foundation') {
    return foundationForJourneyId(journey.path_id)?.title ?? 'Foundation';
  }
  return DATA[journey.path_id]?.quality ?? 'Path';
}

export function TodayScreen({
  onOpenPaths,
  onOpenPathDetail,
  onOpenFoundationDetail,
  onOpenSleep,
  onOpenHabits,
  trelloCards = [],
  trelloClient,
}: TodayScreenProps) {
  const [active, setActive] = useState<PathProgress[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [yesterdayId, setYesterdayId] = useState<string | null>(null);
  const [journeyTicked, setJourneyTicked] = useState(false);
  /** Journeys set aside with "Not today" in this session; nothing is stored. */
  const [skipped, setSkipped] = useState<string[]>([]);

  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [sleepEnergy, setSleepEnergy] = useState<number | null>(null);
  const [sleepMood, setSleepMood] = useState<number | null>(null);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);

  const [morning, setMorning] = useState<HabitDayStatus[]>([]);
  const [evening, setEvening] = useState<HabitDayStatus[]>([]);
  const [anytime, setAnytime] = useState<HabitDayStatus[]>([]);

  const [pace, setPace] = useState<PaceMode>('full');
  const [welcome, setWelcome] = useState(false);
  const [coachDismissed, setCoachDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayCards, setTodayCards] = useState<TrelloCard[]>([]);
  const [doneCards, setDoneCards] = useState<TrelloCard[]>([]);
  const [todayListId, setTodayListId] = useState<string | null>(null);
  const [trelloLoading, setTrelloLoading] = useState(false);
  const [trelloError, setTrelloError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<TrelloCard | null>(null);
  const [checklists, setChecklists] = useState<TrelloChecklist[]>([]);
  const [cardLoading, setCardLoading] = useState(false);
  const [trelloBusy, setTrelloBusy] = useState(false);

  const [aiInsight, setAiInsight] = useState<TodayAIInsight | null>(null);
  const aiClient = useMemo(() => getTodayAIClient(), []);
  const aiAttemptedRef = useRef(false);

  const hydrate = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const today = localDateISO();
    try {
      const [journeys, yest, sleep, allHabits, savedPace, savedTarget, lastActive] =
        await Promise.all([
          listActiveJourneys(),
          getPref<string | null>(`practicedOn:${localDateOffset(-1)}`, null),
          getTodaySleep(today),
          habitsForDate(today),
          getPref<PaceMode>(`pace:${today}`, 'full'),
          getPref<SleepTarget | null>('sleep-target', null),
          getPref<string | null>('lastActiveDate', null),
        ]);

      setActive(journeys);
      setYesterdayId(yest);
      setCurrentId((prev) => {
        if (prev && journeys.some((j) => j.path_id === prev)) return prev;
        const eligible = journeys.filter((j) => j.path_id !== yest);
        return (eligible[0] ?? journeys[0] ?? null)?.path_id ?? null;
      });

      setDurationMinutes(sleep?.duration_minutes ?? null);
      setSleepEnergy(sleep?.energy ?? null);
      setSleepMood(sleep?.mood ?? null);
      setTargetMinutes(sleepTargetMinutes(savedTarget));

      const groups = partitionRituals(allHabits);
      setMorning(groups.morning);
      setEvening(groups.evening);
      setAnytime(groups.anytime);
      setPace(savedPace);

      if (!silent) {
        setWelcome(shouldWelcomeBack(lastActive, today));
        await setPref('lastActiveDate', today);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => subscribeToJourneyChanges(() => hydrate(true)), [hydrate]);

  const refreshTrello = useCallback(async () => {
    if (!trelloClient) return;
    setTrelloLoading(true);
    try {
      const { today, done } = await trelloClient.lists();
      const [current, finished] = await Promise.all([trelloClient.listCards(today.id), trelloClient.listCards(done.id)]);
      setTodayListId(today.id);
      setTodayCards(current);
      setDoneCards(finished);
      setTrelloError(null);
    } catch {
      setTrelloError('Trello could not refresh. Check the connection or reconnect your account.');
    } finally {
      setTrelloLoading(false);
    }
  }, [trelloClient]);

  useEffect(() => {
    void refreshTrello();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshTrello();
    });
    return () => subscription.remove();
  }, [refreshTrello]);

  const showCard = async (card: TrelloCard) => {
    if (!trelloClient) return;
    setTrelloError(null);
    setSelectedCard(card);
    setChecklists([]);
    setCardLoading(true);
    try {
      const detail = await trelloClient.cardDetails(card.id);
      setSelectedCard(detail.card);
      setChecklists(detail.checklists);
      setTrelloError(null);
    } catch {
      setTrelloError('Card details could not refresh. Try again when connected.');
    } finally {
      setCardLoading(false);
    }
  };

  const changeCard = async (completed: boolean) => {
    if (!trelloClient || !selectedCard || trelloBusy) return;
    setTrelloBusy(true);
    try {
      await trelloClient.moveCard(selectedCard.id, completed);
      setSelectedCard(null);
      await refreshTrello();
    } catch {
      setTrelloError('Trello could not move this card. Try again when connected.');
    } finally {
      setTrelloBusy(false);
    }
  };

  const changeCheckItem = async (itemId: string, completed: boolean) => {
    if (!trelloClient || !selectedCard || trelloBusy) return;
    setTrelloBusy(true);
    try {
      await trelloClient.setCheckItem(selectedCard.id, itemId, completed);
      const detail = await trelloClient.cardDetails(selectedCard.id);
      setChecklists(detail.checklists);
      setTrelloError(null);
    } catch {
      setTrelloError('Trello could not update this checklist item. Try again when connected.');
    } finally {
      setTrelloBusy(false);
    }
  };

  // Refresh the journey return trail whenever the selected journey changes.
  useEffect(() => {
    if (!currentId) { setJourneyTicked(false); return; }
    const today = localDateISO();
    recentReturns(currentId, TRAIL_DAYS).then((rows) => {
      setJourneyTicked(rows.some((r) => r.local_date === today));
    });
  }, [currentId]);

  // One AI attempt per load: cached same-day insight wins; otherwise gate on
  // eligibility and generate once. Never regenerates on later state changes.
  useEffect(() => {
    if (loading || aiAttemptedRef.current) return;
    aiAttemptedRef.current = true;
    let cancelled = false;

    (async () => {
      const today = localDateISO();
      const cached = await readTodayAIInsight(today);
      if (cancelled) return;
      if (cached) { setAiInsight(cached); return; }

      // No production provider yet (null) → deterministic Coach remains.
      if (!aiClient) return;

      const journey = currentId ? active.find((j) => j.path_id === currentId) ?? null : null;
      const journeyFoundation = journey?.journey_type === 'foundation'
        ? foundationForJourneyId(journey.path_id)
        : undefined;
      const journeyPath = journey && !journeyFoundation ? DATA[journey.path_id] : undefined;

      const source: TodayAISource = {
        localDate: today,
        pace,
        sleepDurationMinutes: durationMinutes,
        sleepTargetMinutes: targetMinutes,
        habits: [...morning, ...evening, ...anytime].map((row) => ({
          id: row.habit.id,
          ritual: row.habit.ritual,
          cadence: row.habit.cadence,
          days_mask: row.habit.days_mask,
          completed: row.completed,
        })),
        journey: journey
          ? {
              pathId: journey.path_id,
              type: journey.journey_type,
              title: journeyTitle(journey),
              camp: journey.current_camp,
              practice: journeyFoundation?.practice ?? journeyPath?.practice.what ?? '',
            }
          : null,
      };

      const context = buildTodayAIContext(source);
      if (!shouldRequestAI(context, { hasCacheForToday: false })) return;

      try {
        const validated = validateInsight(await aiClient.generate(context));
        if (!validated || cancelled) return;
        await writeTodayAIInsight(today, validated);
        if (!cancelled) setAiInsight(validated);
      } catch {
        // Silent: the deterministic Coach remains authoritative.
      }
    })();

    return () => { cancelled = true; };
  }, [loading, pace, active, currentId, morning, evening, anytime, durationMinutes, targetMinutes, aiClient]);

  const eligible = useMemo(
    () => active.filter((j) => j.path_id !== yesterdayId),
    [active, yesterdayId],
  );
  const currentIdx = currentId ? eligible.findIndex((j) => j.path_id === currentId) : -1;

  const cycleJourney = useCallback(
    (direction: 1 | -1) => {
      if (eligible.length < 2) return;
      const nextIdx = (currentIdx + direction + eligible.length) % eligible.length;
      setCurrentId(eligible[nextIdx].path_id);
    },
    [eligible, currentIdx],
  );

  const handleJourneyTick = useCallback(async () => {
    if (!currentId || journeyTicked) return;
    const progress = active.find((j) => j.path_id === currentId);
    if (!progress) return;
    const done = await logReturn(currentId, localDateISO(), getDeviceTimezone(), progress.current_camp);
    if (done) {
      setJourneyTicked(true);
      await setPref(`practicedOn:${localDateISO()}`, currentId);
    }
  }, [currentId, journeyTicked, active]);

  const skipToday = useCallback(() => {
    if (!currentId) return;
    const next = [...skipped, currentId];
    setSkipped(next);
    const other = eligible.find((j) => !next.includes(j.path_id));
    if (other) setCurrentId(other.path_id);
  }, [currentId, skipped, eligible]);

  const changePace = useCallback(async (mode: PaceMode) => {
    setPace(mode);
    await setPref(`pace:${localDateISO()}`, mode);
  }, []);

  if (loading) return <LoadingState />;

  const sections = sectionsForPace(pace);
  const note = paceNote(pace);

  const currentJourney = currentId ? active.find((j) => j.path_id === currentId) ?? null : null;
  const foundation = currentJourney?.journey_type === 'foundation' ? foundationForJourneyId(currentId!) : undefined;
  const content = currentJourney ? journeyContent(currentId!) : null;
  const campLabel = currentJourney
    ? foundation
      ? content?.category ?? 'Foundation'
      : `Camp ${currentJourney.current_camp} · ${STAGES[currentJourney.current_camp - 1]}`
    : '';

  const nextEligible = eligible.length > 1 ? eligible[(currentIdx + 1) % eligible.length] : null;

  const allHabits = [...morning, ...evening, ...anytime];
  const nextHabit = allHabits.find((h) => !h.completed);
  const ritualBreakdown = [
    morning.length ? `Morning ${doneCount(morning)} of ${morning.length}` : null,
    evening.length ? `Evening ${doneCount(evening)} of ${evening.length}` : null,
    anytime.length ? `Anytime ${doneCount(anytime)} of ${anytime.length}` : null,
  ].filter(Boolean).join(' · ');

  const setupRows = [
    active.length === 0
      ? { key: 'path', title: 'Choose a quality to grow', subtitle: 'Stillness is a quiet place to start', icon: 'moon' as const, color: palette.Inward.base, onPress: onOpenPaths }
      : null,
    durationMinutes == null
      ? { key: 'sleep', title: 'Log last night', subtitle: 'Two times on a dial', icon: 'bed' as const, color: palette.sleep.base, onPress: onOpenSleep }
      : null,
    allHabits.length === 0
      ? { key: 'habit', title: 'Add a morning habit', subtitle: 'Templates are optional', icon: 'leaf' as const, color: palette.habits.base, onPress: onOpenHabits }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);
  const firstRun = active.length === 0;
  const showSleepCard = !firstRun || durationMinutes != null;

  const morningDone = doneCount(morning);
  const insight = buildInsight({
    morningTotal: morning.length,
    morningDone,
    sleptBelowTarget: isBelowSleepTarget(durationMinutes, targetMinutes),
  });

  // AI insight, when present, replaces the deterministic Coach in the same slot.
  const aiContent = aiInsight
    ? {
        tag: 'Orientation',
        body: aiInsight.orientation
          ? `${aiInsight.observation}\n\n${aiInsight.orientation}`
          : aiInsight.observation,
      }
    : null;
  const displayInsight = aiContent ?? insight;
  const visibleTrelloCards = trelloClient
    ? todayCards.map((card) => ({ id: card.id, title: card.name, url: card.url }))
    : trelloCards;

  const openJourneyDetail = () => {
    if (foundation) onOpenFoundationDetail(foundation.id);
    else if (currentId) onOpenPathDetail(currentId);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {welcome ? (
        <WelcomeBackCard onDismiss={() => setWelcome(false)} onStart={() => setWelcome(false)} />
      ) : null}

      {currentJourney && content ? (
        <>
          <PracticeCard
            label={content.title}
            labelColor={content.tone.deep}
            labelIcon={content.icon}
            headerAction={{ label: campLabel, onPress: openJourneyDetail }}
            practice={content.practice}
            counts={content.counts}
          >
            {pace === 'rest' ? (
              <Text style={styles.quiet}>Today is for rest. The practice holds — nothing is lost.</Text>
            ) : journeyTicked ? (
              <View style={[styles.doneBand, { backgroundColor: content.tone.soft }]}>
                <Icon name="check" size={18} color={content.tone.deep} strokeWidth={2.6} />
                <Text style={[styles.doneText, { color: content.tone.deep }]}>Done for today. You came back.</Text>
              </View>
            ) : skipped.includes(currentJourney.path_id) ? (
              <Text style={styles.quiet}>Not today. It will be here tomorrow — nothing is lost.</Text>
            ) : (
              <View style={styles.btnRow}>
                <Button label="Done" onPress={() => void handleJourneyTick()} style={styles.flex} />
                <Button label="Not today" variant="secondary" onPress={skipToday} style={styles.flex} />
              </View>
            )}
          </PracticeCard>
          {nextEligible && nextEligible.path_id !== currentId ? (
            <TouchableOpacity
              style={styles.also}
              onPress={() => cycleJourney(1)}
              accessibilityRole="button"
              accessibilityLabel={`Also walking: ${journeyTitle(nextEligible)}. Show it`}
            >
              <Text style={styles.alsoText}>
                Also walking · <Text style={styles.alsoName}>{journeyTitle(nextEligible)}</Text>
              </Text>
              <Icon name="chev" size={14} color={colors.inkFaint} strokeWidth={2.4} />
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}

      {firstRun && setupRows.length > 0 ? (
        <>
          <SummaryCard label="Getting started" icon="compass" color={colors.btn} right={`${3 - setupRows.length} of 3`}>
            <Text style={styles.body}>Nothing here is a target. Do any of these, in any order.</Text>
          </SummaryCard>
          <ListGroup inset={58}>
            {setupRows.map((row) => (
              <ListRow
                key={row.key}
                title={row.title}
                subtitle={row.subtitle}
                leading={<Tile icon={row.icon} color={row.color} />}
                chevron
                onPress={row.onPress}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {showSleepCard || allHabits.length > 0 ? <SectionHeader title="Summary" /> : null}

      {showSleepCard ? (
        <ArrivalCard
          durationMinutes={durationMinutes}
          targetMinutes={targetMinutes}
          energy={sleepEnergy}
          mood={sleepMood}
          onOpen={onOpenSleep}
        />
      ) : null}

      <PaceSelector value={pace} onChange={changePace} />
      <Text style={styles.foot}>{note ?? 'You choose the pace. A lighter day asks for less, and nothing is lost.'}</Text>

      {allHabits.length > 0 ? (
        <SummaryCard label="Rituals" icon="leaf" color={palette.habits.deep} onPress={onOpenHabits}>
          <View style={styles.split}>
            <View style={styles.flex}>
              <SummaryValue parts={[{ value: String(doneCount(allHabits)), unit: `of ${allHabits.length} done` }]} />
              {ritualBreakdown ? <Text style={styles.sub}>{ritualBreakdown}</Text> : null}
              <Text style={styles.sub}>{nextHabit ? `Next · ${nextHabit.habit.name}` : 'All done for today'}</Text>
            </View>
            <Ring
              value={doneCount(allHabits) / allHabits.length}
              size={52}
              stroke={7}
              color={palette.habits.base}
              trackColor={palette.habits.soft}
            />
          </View>
        </SummaryCard>
      ) : null}

      <View style={pace === 'lighter' ? styles.dimmed : undefined}>
        <SectionHeader title="From Trello" action={{ label: 'Open', onPress: () => void Linking.openURL(TRELLO_BOARD_URL) }} />
        {trelloError && !selectedCard ? (
          <ListGroup>
            <ListRow title={trelloError} subtitle="Tap to retry" onPress={() => void refreshTrello()} />
          </ListGroup>
        ) : null}
        {!trelloClient && visibleTrelloCards.length === 0 ? (
          <ListGroup inset={58}>
            <ListRow
              leading={<Tile icon="board" color={colors.btn} />}
              title="Cards aren't connected yet"
              subtitle="Open your Today list in Trello"
              chevron
              onPress={() => void Linking.openURL(TRELLO_BOARD_URL)}
            />
          </ListGroup>
        ) : (
          <>
            {visibleTrelloCards.length > 0 || (trelloClient && doneCards.length > 0) ? (
              <ListGroup inset={52}>
                {visibleTrelloCards.map((card, index) => (
                  <ListRow
                    key={card.id}
                    title={card.title}
                    leading={<CheckCircle done={false} />}
                    chevron
                    onPress={() => (trelloClient ? void showCard(todayCards[index]) : void Linking.openURL(card.url))}
                    accessibilityLabel={`${trelloClient ? 'View' : 'Open'} ${card.title}${trelloClient ? '' : ' in Trello'}`}
                  />
                ))}
                {trelloClient
                  ? doneCards.map((card) => (
                      <ListRow
                        key={card.id}
                        title={card.name}
                        leading={<CheckCircle done />}
                        onPress={() => void showCard(card)}
                        accessibilityLabel={`View completed card ${card.name}`}
                      />
                    ))
                  : null}
              </ListGroup>
            ) : null}
            <Text style={styles.foot}>
              {trelloLoading
                ? 'Refreshing Trello…'
                : trelloClient && visibleTrelloCards.length === 0
                  ? 'No cards on Today.'
                  : visibleTrelloCards.length > 3
                    ? 'There is a lot on Today. You can move things when it suits you.'
                    : 'Your Today list, in Trello order.'}
            </Text>
          </>
        )}
      </View>

      {sections.showSignals && displayInsight && !coachDismissed ? (
        <>
          <SectionHeader title="Compass note" action={{ label: 'Hide', onPress: () => setCoachDismissed(true) }} />
          <View style={styles.card}>
            <View style={styles.cat}>
              <Icon name="compass" size={17} color={colors.btn} />
              <Text style={[styles.catText, { color: colors.btn }]}>{displayInsight.tag}</Text>
            </View>
            <Text style={styles.body}>{displayInsight.body}</Text>
          </View>
        </>
      ) : null}

      <Sheet visible={!!selectedCard && !!trelloClient} onClose={() => setSelectedCard(null)} title={selectedCard?.name}>
        {selectedCard ? (
          <View style={styles.sheetBody}>
            {selectedCard.desc ? <Text style={styles.body}>{selectedCard.desc}</Text> : null}
            {trelloError ? (
              <TouchableOpacity onPress={() => void showCard(selectedCard)} accessibilityRole="button">
                <Text style={styles.sub}>{trelloError} Tap to retry.</Text>
              </TouchableOpacity>
            ) : null}
            {cardLoading ? (
              <Text style={styles.sub}>Loading details…</Text>
            ) : (
              checklists.map((checklist) => (
                <View key={checklist.id}>
                  <SectionHeader title={checklist.name} />
                  <ListGroup inset={52}>
                    {checklist.checkItems.map((item) => {
                      const checked = item.state === 'complete';
                      const disabled = trelloBusy || !!trelloError;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.checkRow}
                          onPress={() => void changeCheckItem(item.id, !checked)}
                          disabled={disabled}
                          accessibilityRole="checkbox"
                          accessibilityLabel={item.name}
                          accessibilityState={{ checked, disabled }}
                        >
                          <CheckCircle done={checked} />
                          <Text style={styles.checkText}>{item.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ListGroup>
                </View>
              ))
            )}
            <Button
              label={selectedCard.idList === todayListId ? 'Move to Done' : 'Return to Today'}
              onPress={() => void changeCard(selectedCard.idList === todayListId)}
              disabled={trelloBusy || cardLoading || !!trelloError || !todayListId}
              loading={trelloBusy}
            />
            <Button label="Open in Trello" variant="secondary" onPress={() => void Linking.openURL(selectedCard.url)} />
          </View>
        ) : null}
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  flex: { flex: 1 },

  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, paddingTop: 14, marginBottom: spacing.sm },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  catText: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 16, color: colors.ink, lineHeight: 22 },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: 3 },
  foot: { fontSize: 13, color: colors.inkMuted, lineHeight: 18, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  split: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },

  btnRow: { flexDirection: 'row', gap: spacing.sm },
  quiet: { fontSize: 15, color: colors.inkMuted, lineHeight: 21 },
  doneBand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.control, paddingVertical: 12, paddingHorizontal: spacing.md },
  doneText: { fontSize: 16, fontWeight: '600' },
  also: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginBottom: spacing.xs },
  alsoText: { fontSize: 15, color: colors.inkMuted },
  alsoName: { color: colors.ink, fontWeight: '600' },

  dimmed: { opacity: 0.5 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingVertical: 11, paddingHorizontal: spacing.lg },
  checkText: { flex: 1, fontSize: 16, color: colors.ink },
  sheetBody: { gap: spacing.md, paddingTop: spacing.sm },
});
