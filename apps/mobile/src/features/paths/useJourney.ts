import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { createHabit, listActiveHabits } from '@data/habits';
import {
  ACTIVE_JOURNEY_CAP,
  claimIntegrated,
  countReturns,
  getProgress,
  listActiveJourneys,
  logReturn,
  pauseJourney,
  recentReturns,
  startPath,
  subscribeToJourneyChanges,
} from '@data/paths';
import type { PathProgress } from '@data/paths';
import { normalizeHabitName, TEMPLATE_ICON_BY_ID, V1_HABIT_TEMPLATES } from '@features/habits/habitTemplates';
import { getDeviceTimezone, localDateISO } from '@lib/time';
import { journeyView, JourneyView } from './pathsLogic';

/** Every return a person has made is kept; ten years is "all" for this window. */
const ALL_RETURNS_DAYS = 3650;

export interface JourneyState {
  loading: boolean;
  busy: boolean;
  progress: PathProgress | null;
  returns: number;
  returnDates: string[];
  activeCount: number;
  view: JourneyView;
  addedHabitNames: Set<string>;
  start: () => Promise<boolean>;
  pause: () => Promise<void>;
  comeBack: () => Promise<void>;
  claimSteady: () => void;
  addHabit: (templateId: string) => Promise<void>;
}

/** Load and act on one Growth Path or Foundation journey. */
export function useJourney(journeyId: string): JourneyState {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<PathProgress | null>(null);
  const [returns, setReturns] = useState(0);
  const [returnDates, setReturnDates] = useState<string[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [addedHabitNames, setAddedHabitNames] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const [nextProgress, count, dated, active, habits] = await Promise.all([
      getProgress(journeyId),
      countReturns(journeyId),
      recentReturns(journeyId, ALL_RETURNS_DAYS),
      listActiveJourneys(),
      listActiveHabits(),
    ]);
    setProgress(nextProgress);
    setReturns(count);
    setReturnDates(dated.map((r) => r.local_date));
    setActiveCount(active.length);
    setAddedHabitNames(new Set(habits.map((h) => normalizeHabitName(h.name))));
    setLoading(false);
  }, [journeyId]);

  useEffect(() => {
    load();
    return subscribeToJourneyChanges(load);
  }, [load]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  const start = useCallback(async () => {
    try {
      await run(() => startPath(journeyId));
      return true;
    } catch (error) {
      Alert.alert(
        'All three slots are in use',
        error instanceof Error ? error.message : `You can walk up to ${ACTIVE_JOURNEY_CAP} journeys at once. Pause one first; nothing is lost.`,
      );
      return false;
    }
  }, [journeyId, run]);

  const pause = useCallback(() => run(() => pauseJourney(journeyId)), [journeyId, run]);

  const comeBack = useCallback(async () => {
    if (!progress) return;
    await run(async () => {
      const logged = await logReturn(journeyId, localDateISO(), getDeviceTimezone(), progress.current_camp);
      if (!logged) Alert.alert('Already counted today', 'You already came back today. One return a day is all that counts.');
    });
  }, [journeyId, progress, run]);

  const claimSteady = useCallback(() => {
    Alert.alert('Claim Steady?', 'Steady is yours to claim. Claim it only if this feels like yours across real situations.', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Claim Steady', onPress: () => run(() => claimIntegrated(journeyId)) },
    ]);
  }, [journeyId, run]);

  const addHabit = useCallback(async (templateId: string) => {
    const template = V1_HABIT_TEMPLATES.find((t) => t.id === templateId);
    if (!template || addedHabitNames.has(normalizeHabitName(template.name))) return;
    await run(() => createHabit({
      name: template.name,
      ritual: template.ritual,
      icon: TEMPLATE_ICON_BY_ID[template.id] ?? null,
      cadence: 'daily',
      days_mask: null,
      duration_min: null,
    }));
  }, [addedHabitNames, run]);

  return {
    loading,
    busy,
    progress,
    returns,
    returnDates,
    activeCount,
    view: journeyView(progress?.status ?? null, returns),
    addedHabitNames,
    start,
    pause,
    comeBack,
    claimSteady,
    addHabit,
  };
}
