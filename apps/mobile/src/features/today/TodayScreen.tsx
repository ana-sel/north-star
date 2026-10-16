/**
 * TodayScreen (v1) — the orientation screen.
 *
 * Bands mirror the Today wireframe: welcome-back → journey hero → arrival
 * (sleep) → pace → daily rituals → plan items from Trello → signals (coach). Local bands
 * read real local data and adapt around what actually exists.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '@styles/theme';
import { EmptyState, Icon, InsightCard, LoadingState, RitualCard, SectionHeader } from '@ui';
import type { RitualItem } from '@ui';
import { DATA } from '@features/paths/pathsContent';
import { foundationForJourneyId } from '@features/foundations/foundationsContent';
import { getPref, setPref } from '@data/prefs';
import { habitsForDate, tickHabit, untickHabit } from '@data/habits';
import type { HabitDayStatus } from '@data/habits';
import { getTodaySleep } from '@data/sleep';
import type { TrelloCard, TrelloChecklist } from '@data/trello';
import { createTrelloClient } from '@data/trello';
import { listActiveJourneys, logReturn, recentReturns, subscribeToJourneyChanges } from '@data/paths';
import type { PathProgress } from '@data/paths';
import { getDeviceTimezone, localDateISO, localDateOffset } from '@lib/time';
import { JourneyHero } from './components/JourneyHero';
import { PaceSelector } from './components/PaceSelector';
import { ArrivalCard } from './components/ArrivalCard';
import { WelcomeBackCard } from './components/WelcomeBackCard';
import type { HeroDot } from './components/JourneyHero';
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

function ordinalReturns(count: number): string {
  return `${count} return${count === 1 ? '' : 's'} · 2 weeks`;
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
  const [returnDates, setReturnDates] = useState<string[]>([]);
  const [journeyTicked, setJourneyTicked] = useState(false);

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
    if (!currentId) { setReturnDates([]); setJourneyTicked(false); return; }
    const today = localDateISO();
    recentReturns(currentId, TRAIL_DAYS).then((rows) => {
      setReturnDates(rows.map((r) => r.local_date));
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
      const fresh = await recentReturns(currentId, TRAIL_DAYS);
      setReturnDates(fresh.map((r) => r.local_date));
      await setPref(`practicedOn:${localDateISO()}`, currentId);
    }
  }, [currentId, journeyTicked, active]);

  const toggleHabit = useCallback(async (id: string, done: boolean) => {
    const today = localDateISO();
    if (done) await untickHabit(id, today);
    else await tickHabit(id, today, getDeviceTimezone());
    const groups = partitionRituals(await habitsForDate(today));
    setMorning(groups.morning);
    setEvening(groups.evening);
    setAnytime(groups.anytime);
  }, []);

  const changePace = useCallback(async (mode: PaceMode) => {
    setPace(mode);
    await setPref(`pace:${localDateISO()}`, mode);
  }, []);

  if (loading) return <LoadingState />;

  const sections = sectionsForPace(pace);
  const note = paceNote(pace);

  const currentJourney = currentId ? active.find((j) => j.path_id === currentId) ?? null : null;
  const foundation = currentJourney?.journey_type === 'foundation' ? foundationForJourneyId(currentId!) : undefined;
  const path = currentJourney && !foundation ? DATA[currentId!] : undefined;

  const eyebrow = foundation
    ? `FOUNDATION · TIER ${foundation.tier}`
    : path
      ? `${path.domain.toUpperCase()} · ${path.quality.toUpperCase()}`
      : '';
  const practice = foundation?.practice ?? path?.practice.what ?? '';
  const countsWhen = foundation?.countsWhen ?? path?.practice.counts ?? '';
  const summary = foundation?.summary ?? path?.shows ?? '';
  const freqText = journeyTicked ? summary : ordinalReturns(returnDates.length);

  const nextEligible = eligible.length > 1 ? eligible[(currentIdx + 1) % eligible.length] : null;
  const dots: HeroDot[] = active.map((j) => ({
    key: j.path_id,
    current: j.path_id === currentId,
    yesterday: j.path_id === yesterdayId,
  }));

  const morningDone = doneCount(morning);
  const insight = buildInsight({
    hasJourney: !!currentJourney,
    journeyPractice: practice || null,
    journeyTicked,
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

  const now = new Date();
  const dateLabel = `${now.toLocaleDateString('en-GB', { weekday: 'long' })} · ${now.getDate()} ${now.toLocaleDateString('en-GB', { month: 'long' })}`;

  const openJourneyDetail = () => {
    if (foundation) onOpenFoundationDetail(foundation.id);
    else if (currentId) onOpenPathDetail(currentId);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {welcome ? (
        <WelcomeBackCard onDismiss={() => setWelcome(false)} onStart={() => setWelcome(false)} />
      ) : null}

      {currentJourney ? (
        <JourneyHero
          eyebrow={eyebrow}
          practice={practice}
          countsWhen={countsWhen}
          ticked={journeyTicked}
          freqText={freqText}
          returnDates={returnDates}
          trailDays={TRAIL_DAYS}
          peekName={nextEligible ? journeyTitle(nextEligible) : null}
          dots={dots}
          restMode={pace === 'rest'}
          onTick={handleJourneyTick}
          onOpenDetail={openJourneyDetail}
          onCycle={cycleJourney}
        />
      ) : (
        <TouchableOpacity style={styles.journeyEmpty} onPress={onOpenPaths} activeOpacity={0.85}>
          <Text style={styles.journeyEmptyTitle}>Choose a quality to grow</Text>
          <Text style={styles.journeyEmptyBody}>Today's practice lives here once you start a path or foundation.</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.date}>{dateLabel}</Text>

      <ArrivalCard
        durationMinutes={durationMinutes}
        targetMinutes={targetMinutes}
        energy={sleepEnergy}
        mood={sleepMood}
        onOpen={onOpenSleep}
      />

      <PaceSelector value={pace} onChange={changePace} />
      {note ? (
        <View style={styles.paceNote}>
          <Icon name="compass" size={18} color={colors.steel} />
          <Text style={styles.paceNoteText}>{note}</Text>
        </View>
      ) : null}

      <SectionHeader title="Daily rituals" icon="sun" />
      {morning.length === 0 && evening.length === 0 && anytime.length === 0 ? (
        <TouchableOpacity style={styles.ritualEmpty} onPress={onOpenHabits} activeOpacity={0.85}>
          <Text style={styles.ritualEmptyText}>No rituals yet. Add daily habits in Log · Habits.</Text>
        </TouchableOpacity>
      ) : (
        <>
          {morning.length > 0 ? (
            <RitualCard
              variant="morning"
              title="Morning ritual"
              meta={`Right after waking · ${morningDone} of ${morning.length} done`}
              items={toItems(morning)}
              onToggleItem={(id) => toggleHabit(id, isDone(morning, id))}
              onOpen={onOpenHabits}
            />
          ) : null}
          {evening.length > 0 ? (
            <RitualCard
              variant="evening"
              title="Evening ritual"
              meta={`Before sleep · ${doneCount(evening)} of ${evening.length} done`}
              items={toItems(evening)}
              onToggleItem={(id) => toggleHabit(id, isDone(evening, id))}
              onOpen={onOpenHabits}
            />
          ) : null}
          {anytime.length > 0 ? (
            <RitualCard
              variant="anytime"
              title="Anytime"
              meta={`${doneCount(anytime)} of ${anytime.length} done`}
              items={toItems(anytime)}
              onToggleItem={(id) => toggleHabit(id, isDone(anytime, id))}
              onOpen={onOpenHabits}
            />
          ) : null}
        </>
      )}

      <View style={pace === 'lighter' ? styles.dimmed : undefined}>
        <SectionHeader title="From the plan" icon="target" />
        <View style={styles.planCard}>
          <View style={styles.planHead}>
            <Text style={styles.planHeadText}>Today · Trello</Text>
          </View>
          {trelloError ? (
            <TouchableOpacity onPress={() => selectedCard ? void showCard(selectedCard) : void refreshTrello()} accessibilityRole="button">
              <Text style={styles.planGuidance}>{trelloError} Tap to retry.</Text>
            </TouchableOpacity>
          ) : null}
          {trelloLoading ? <Text style={styles.planGuidance}>Refreshing Trello…</Text> : null}
          {!trelloClient && visibleTrelloCards.length === 0 ? (
            <TouchableOpacity style={styles.planRow} onPress={() => Linking.openURL(TRELLO_BOARD_URL)} accessibilityRole="link">
              <Text style={styles.planRowText}>Cards aren't connected yet. Open your Today list in Trello.</Text>
              <Icon name="chev" size={14} color={colors.accent} />
            </TouchableOpacity>
          ) : (
            <>
              {visibleTrelloCards.length > 3 ? (
                <Text style={styles.planGuidance}>There is a lot on Today. You can move things when it suits you.</Text>
              ) : null}
              {trelloClient && visibleTrelloCards.length === 0 && !trelloLoading ? <Text style={styles.planGuidance}>No cards on Today.</Text> : null}
              {visibleTrelloCards.map((card, index) => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.planRow, index < visibleTrelloCards.length - 1 && styles.planRowBorder]}
                  onPress={() => trelloClient ? void showCard(todayCards[index]) : Linking.openURL(card.url)}
                  accessibilityRole={trelloClient ? 'button' : 'link'}
                  accessibilityLabel={`${trelloClient ? 'View' : 'Open'} ${card.title}${trelloClient ? '' : ' in Trello'}`}
                >
                  <View style={styles.planMarker} />
                  <Text style={styles.planRowText} numberOfLines={2}>{card.title}</Text>
                </TouchableOpacity>
              ))}
              {trelloClient && doneCards.length > 0 ? (
                <>
                  <Text style={styles.planGuidance}>Done</Text>
                  {doneCards.map((card) => (
                    <TouchableOpacity key={card.id} style={styles.planRow} onPress={() => void showCard(card)} accessibilityRole="button" accessibilityLabel={`View completed card ${card.name}`}>
                      <Icon name="check" size={18} color={colors.accent} />
                      <Text style={styles.planRowText}>{card.name}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : null}
              {selectedCard && trelloClient ? (
                <View style={styles.planDetails}>
                  <Text style={styles.planDetailTitle}>{selectedCard.name}</Text>
                  {selectedCard.desc ? <Text style={styles.planDetailText}>{selectedCard.desc}</Text> : null}
                  {cardLoading ? <Text style={styles.planDetailText}>Loading details…</Text> : checklists.map((checklist) => (
                    <View key={checklist.id} style={styles.planChecklist}>
                      <Text style={styles.planDetailTitle}>{checklist.name}</Text>
                      {checklist.checkItems.map((item) => (
                        <TouchableOpacity key={item.id} style={styles.planRow} onPress={() => void changeCheckItem(item.id, item.state !== 'complete')} disabled={trelloBusy || !!trelloError} accessibilityRole="checkbox" accessibilityState={{ checked: item.state === 'complete', disabled: trelloBusy || !!trelloError }}>
                          <Icon name="check" size={18} color={item.state === 'complete' ? colors.accent : colors.inkMuted} />
                          <Text style={styles.planRowText}>{item.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                  <TouchableOpacity style={styles.planMore} onPress={() => void changeCard(selectedCard.idList === todayListId)} disabled={trelloBusy || cardLoading || !!trelloError || !todayListId} accessibilityRole="button">
                    <Text style={styles.planMoreText}>{selectedCard.idList === todayListId ? 'Move to Done' : 'Return to Today'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.planMore} onPress={() => setSelectedCard(null)} accessibilityRole="button"><Text style={styles.planMoreText}>Close details</Text></TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity style={styles.planMore} onPress={() => Linking.openURL(TRELLO_BOARD_URL)} accessibilityRole="link">
                <Text style={styles.planMoreText}>Open in Trello</Text>
                <Icon name="chev" size={12} color={colors.accent} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {sections.showSignals && displayInsight && !coachDismissed ? (
        <>
          <SectionHeader title="Signals" icon="sparkle" />
          <InsightCard
            insight={displayInsight}
            title={`Coach · ${displayInsight.tag}`}
            meta="A gentle nudge from today"
            onDismiss={() => setCoachDismissed(true)}
          />
        </>
      ) : null}

      {active.length === 0 && morning.length === 0 && evening.length === 0 && anytime.length === 0 ? (
        <EmptyState
          title="A calm, empty day"
          body="Start a path or add a habit. Your Trello tasks stay in Trello."
          action={{ label: 'Find a quality to grow', onPress: onOpenPaths }}
        />
      ) : null}
    </ScrollView>
  );
}

function toItems(statuses: HabitDayStatus[]): RitualItem[] {
  return statuses.map((s) => ({ id: s.habit.id, label: s.habit.name, done: s.completed }));
}

function isDone(statuses: HabitDayStatus[], id: string): boolean {
  return statuses.find((s) => s.habit.id === id)?.completed ?? false;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  date: { fontSize: typography.sizes.sm, color: colors.inkMuted, fontWeight: '500', marginTop: spacing.xs },

  journeyEmpty: {
    backgroundColor: '#2d2b27',
    borderRadius: 20,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  journeyEmptyTitle: { fontSize: typography.sizes.lg, fontWeight: '800', color: '#F1EDE6' },
  journeyEmptyBody: { fontSize: typography.sizes.sm, color: 'rgba(241,237,230,0.6)', lineHeight: 20 },

  paceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.canvasDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 13,
  },
  paceNoteText: { flex: 1, fontSize: typography.sizes.sm, color: colors.inkMuted, lineHeight: 20 },

  ritualEmpty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.lg,
  },
  ritualEmptyText: { fontSize: typography.sizes.sm, color: colors.inkMuted },

  dimmed: { opacity: 0.5 },
  planCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: 'hidden',
  },
  planHead: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  planHeadText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.inkMuted },
  planGuidance: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, color: colors.inkMuted, fontSize: typography.sizes.sm },
  planDetails: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  planDetailTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: colors.ink },
  planDetailText: { fontSize: typography.sizes.sm, color: colors.inkMuted },
  planChecklist: { gap: spacing.xs },
  planRow: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  planMarker: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.canvas },
  planRowText: { flex: 1, fontSize: typography.sizes.md, color: colors.ink },
  planMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.border },
  planMoreText: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.accent },
});
