/**
 * TodayScreen (v1) — the orientation screen.
 *
 * Bands mirror the Today wireframe: welcome-back → journey hero → arrival
 * (sleep) → pace → daily rituals → from the plan → signals (coach). Every
 * band reads real local data and adapts around what actually exists.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '@styles/theme';
import { EmptyState, Icon, InsightCard, LoadingState, RitualCard, SectionHeader, TaskRow } from '@ui';
import type { RitualItem } from '@ui';
import { DATA } from '@features/paths/pathsContent';
import { foundationForJourneyId } from '@features/foundations/foundationsContent';
import { getPref, setPref } from '@data/prefs';
import { habitsForDate, tickHabit, untickHabit } from '@data/habits';
import type { HabitDayStatus } from '@data/habits';
import { tasksForDate, toggleTask } from '@data/tasks';
import type { Task } from '@data/tasks';
import { getTodaySleep } from '@data/sleep';
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
  onOpenPlan: () => void;
}

const TRAIL_DAYS = 14;
const PLAN_PREVIEW = 3;

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
  onOpenPlan,
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
  const [tasks, setTasks] = useState<Task[]>([]);

  const [pace, setPace] = useState<PaceMode>('full');
  const [welcome, setWelcome] = useState(false);
  const [coachDismissed, setCoachDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [aiInsight, setAiInsight] = useState<TodayAIInsight | null>(null);
  const aiClient = useMemo(() => getTodayAIClient(), []);
  const aiAttemptedRef = useRef(false);

  const hydrate = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const today = localDateISO();
    try {
      const [journeys, yest, sleep, todayTasks, allHabits, savedPace, savedTarget, lastActive] =
        await Promise.all([
          listActiveJourneys(),
          getPref<string | null>(`practicedOn:${localDateOffset(-1)}`, null),
          getTodaySleep(today),
          tasksForDate(today),
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

      setTasks(todayTasks);
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
        planDueToday: tasks.length,
        planCompletedToday: tasks.filter((task) => task.status === 'done').length,
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
  }, [loading, pace, active, currentId, morning, evening, anytime, tasks, durationMinutes, targetMinutes, aiClient]);

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

  const toggleTaskRow = useCallback(async (task: Task) => {
    await toggleTask(task);
    setTasks(await tasksForDate(localDateISO()));
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

  const now = new Date();
  const dateLabel = `${now.toLocaleDateString('en-GB', { weekday: 'long' })} · ${now.getDate()} ${now.toLocaleDateString('en-GB', { month: 'long' })}`;

  const previewTasks = tasks.slice(0, PLAN_PREVIEW);
  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const moreTasks = tasks.length - previewTasks.length;

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

      {sections.showPlan ? (
        <View style={sections.dimPlan ? styles.dimmed : undefined}>
          <SectionHeader title="From the plan" icon="target" />
          <View style={styles.planCard}>
            {previewTasks.length === 0 ? (
              <TouchableOpacity style={styles.planEmpty} onPress={onOpenPlan} activeOpacity={0.85}>
                <Text style={styles.planEmptyText}>Nothing due today. Open Plan to add something.</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.planHead}>
                  <Text style={styles.planHeadText}>{tasksDone} of {tasks.length} done</Text>
                </View>
                {previewTasks.map((task, index) => (
                  <TaskRow
                    key={task.id}
                    title={task.title}
                    done={task.status === 'done'}
                    onToggle={() => toggleTaskRow(task)}
                    showBorder={index < previewTasks.length - 1 || moreTasks > 0}
                  />
                ))}
                {moreTasks > 0 ? (
                  <TouchableOpacity style={styles.planMore} onPress={onOpenPlan} activeOpacity={0.7}>
                    <Text style={styles.planMoreText}>{moreTasks} more in Plan</Text>
                    <Icon name="chev" size={12} color={colors.accent} />
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </View>
      ) : null}

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

      {active.length === 0 && morning.length === 0 && evening.length === 0 && anytime.length === 0 && tasks.length === 0 ? (
        <EmptyState
          title="A calm, empty day"
          body="Start a path, add a habit, or plan a task — Today will orient around it."
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
  planHead: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  planHeadText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  planEmpty: { padding: spacing.lg },
  planEmptyText: { fontSize: typography.sizes.sm, color: colors.inkMuted },
  planMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  planMoreText: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.accent },
});
