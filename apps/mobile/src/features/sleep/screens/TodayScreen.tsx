// Log · Sleep — log last night's bed and wake time, see the last 7 nights, edit history.
// Stores UTC + the timezone it was logged in (GDPR: minimal data).

import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, palette, radii, spacing } from '@styles/theme';
import { Button, Icon, ListGroup, ListRow, SectionHeader, Sheet, SummaryValue } from '@ui';
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';
import { SleepForm } from '../components/SleepForm';
import { SleepChart } from '../components/SleepChart';
import { averageNightMinutes, nightBars, nightRowLabels, nightWindow } from '../sleepNights';
import { formatSleepDuration } from '@features/today/todayLogic';
import { changeTimeInTimezone, getDeviceTimezone, getTimezoneOffset, localDateISO, localDateWindow, smartBedTime, smartWakeTime, utcToLocal, wakeAfterBedInTimezone } from '@lib/time';
import { deleteSleepEntry, getSleepHistory, getTodaySleep, saveSleepEntry, updateSleepEntry } from '@data/sleep';
import { getPref, setPref } from '@data/prefs';
import type { SleepEntry } from '../../../types';

interface TodayScreenProps {
  onSaved?: () => void; // jump to the Week tab after saving
}

interface SleepTarget {
  bed: { h: number; m: number };
  wake: { h: number; m: number };
}

export function TodayScreen({ onSaved }: TodayScreenProps) {
  const timezone = getDeviceTimezone();
  const offsetLabel = getTimezoneOffset(timezone);

  const [bedTime, setBedTime] = useState(() => smartBedTime((() => { const d = new Date(); d.setHours(23, 0, 0, 0); return d; })()));

  const [wakeTime, setWakeTime] = useState(() => {
    const d = new Date(); d.setHours(7, 0, 0, 0);
    return smartWakeTime(d, bedTime);
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<SleepEntry[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [lastNight, setLastNight] = useState<SleepEntry | null>(null);
  const [editing, setEditing] = useState<SleepEntry | null>(null);
  const [editBed, setEditBed] = useState<Date>(new Date());
  const [editWake, setEditWake] = useState<Date>(new Date());

  // Target sleep times (persisted locally)
  const [hasTarget, setHasTarget] = useState(false);
  const [targetBed, setTargetBed] = useState<Date>(() => {
    const d = new Date(); d.setHours(23, 0, 0, 0); return d;
  });
  const [targetWake, setTargetWake] = useState<Date>(() => {
    const d = new Date(); d.setHours(7, 0, 0, 0); return d;
  });
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [draftBed, setDraftBed] = useState<Date>(targetBed);
  const [draftWake, setDraftWake] = useState<Date>(targetWake);

  useEffect(() => {
    const loadTarget = async () => {
      const saved = await getPref<SleepTarget | null>('sleep-target', null);
      if (!saved) return;
      const d1 = new Date(); d1.setHours(saved.bed.h, saved.bed.m, 0, 0);
      const d2 = new Date(); d2.setHours(saved.wake.h, saved.wake.m, 0, 0);
      setTargetBed(d1);
      setTargetWake(d2);
      setHasTarget(true);
    };
    loadTarget();
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const [rows, today] = await Promise.all([getSleepHistory(), getTodaySleep(localDateISO())]);
      setHistory(rows);
      // A night already saved for today opens in the dial, so saving again updates it.
      setLastNight(today);
      if (today) {
        setBedTime(new Date(today.sleep_start_utc));
        setWakeTime(new Date(today.sleep_end_utc));
      }
      setHistoryError(false);
    } catch {
      setHistoryError(true);
    }
  }, []);

  useEffect(() => { void refreshHistory(); }, [refreshHistory]);

  const startEditing = (entry: SleepEntry) => {
    setEditing(entry);
    setEditBed(new Date(entry.sleep_start_utc));
    setEditWake(new Date(entry.sleep_end_utc));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setIsSaving(true);
    try {
      await updateSleepEntry(editing.id, {
        sleep_start_utc: editBed.toISOString(),
        sleep_end_utc: editWake.toISOString(),
      });
      setEditing(null);
      await refreshHistory();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    const id = editing.id;
    Alert.alert('Delete sleep entry?', 'This entry will be removed from your history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteSleepEntry(id);
          setEditing(null);
          await refreshHistory();
        } catch {
          Alert.alert('Could not delete', 'Please try again.');
        }
      } },
    ]);
  };

  const targetMinutes = useMemo(() => {
    const diff = (targetWake.getHours() * 60 + targetWake.getMinutes()) -
                 (targetBed.getHours() * 60 + targetBed.getMinutes());
    return diff <= 0 ? diff + 24 * 60 : diff;
  }, [targetBed, targetWake]);

  const openTargetModal = useCallback(() => {
    setDraftBed(targetBed);
    setDraftWake(targetWake);
    setShowTargetModal(true);
  }, [targetBed, targetWake]);

  const handleSaveTarget = useCallback(async () => {
    setTargetBed(draftBed);
    setTargetWake(draftWake);
    await setPref('sleep-target', {
      bed:  { h: draftBed.getHours(),  m: draftBed.getMinutes() },
      wake: { h: draftWake.getHours(), m: draftWake.getMinutes() },
    });
    setHasTarget(true);
    setShowTargetModal(false);
  }, [draftBed, draftWake]);

  const dayName = (d: Date, tz: string): string => formatInTimeZone(d, tz, 'EEEE');

  const handleSave = useCallback(async () => {
    setErrorMsg(null);

    if (wakeTime <= bedTime) {
      setErrorMsg('Wake time should be after bed time \u2014 check your times.');
      return;
    }

    setIsSaving(true);
    try {
      if (lastNight) {
        await updateSleepEntry(lastNight.id, {
          sleep_start_utc: bedTime.toISOString(),
          sleep_end_utc: wakeTime.toISOString(),
          timezone,
        });
      } else {
        await saveSleepEntry({
          sleep_start_utc: bedTime.toISOString(),
          sleep_end_utc: wakeTime.toISOString(),
          timezone,
          duration_minutes: null,
          note: null,
          energy: null,
          mood: null,
        });
      }
      await refreshHistory();
      onSaved?.();
    } catch (err) {
      setErrorMsg('Could not save \u2014 please try again.');
      console.error('Save sleep entry error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [bedTime, wakeTime, timezone, onSaved, refreshHistory, lastNight]);

  const handleBedChange = useCallback((date: Date) => {
    const smart = smartBedTime(date);
    setBedTime(smart);
    setErrorMsg(null);
    // Keep wake time consistent — must stay after bed
    setWakeTime(prev => smartWakeTime(prev, smart));
  }, []);

  const handleWakeChange = useCallback((date: Date) => {
    setWakeTime(smartWakeTime(date, bedTime));
    setErrorMsg(null);
  }, [bedTime]);

  const dates = localDateWindow(7);
  const bars = nightBars(history, dates);
  const targetClock = hasTarget
    ? { bed: targetBed.getHours() * 60 + targetBed.getMinutes(), wake: targetWake.getHours() * 60 + targetWake.getMinutes() }
    : null;
  const average = averageNightMinutes(bars);
  const shownHistory = showAll ? history : history.slice(0, 7);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.head}>
            <View style={styles.cat}>
              <Icon name="bed" size={17} color={palette.sleep.deep} />
              <Text style={[styles.catText, { color: palette.sleep.deep }]}>Last night</Text>
            </View>
            {lastNight ? <Text style={styles.tag}>Saved</Text> : null}
          </View>
          <SleepForm
            bedTime={bedTime}
            wakeTime={wakeTime}
            timezone={timezone}
            bedHint={dayName(bedTime, timezone)}
            wakeHint={dayName(wakeTime, timezone)}
            onBedTimeChange={handleBedChange}
            onWakeTimeChange={handleWakeChange}
          />
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
          <Button
            label={lastNight ? 'Update night' : 'Save night'}
            variant={lastNight ? 'secondary' : 'primary'}
            onPress={() => void handleSave()}
            loading={isSaving}
            style={styles.save}
          />
        </View>
        <Text style={styles.foot}>
          Drag the handles in 10-minute steps, or tap a time to type it. Times in {timezone} ({offsetLabel}).
        </Text>

        <SectionHeader title="Last 7 nights" />
        <View style={styles.card}>
          <Text style={styles.sub}>Average time asleep</Text>
          {average != null ? (
            <SummaryValue parts={durationParts(average)} />
          ) : (
            <Text style={styles.empty}>No nights logged this week yet.</Text>
          )}
          <SleepChart dates={dates} bars={bars} window={nightWindow(bars, targetClock)} color={palette.sleep.base} target={targetClock} />
        </View>

        <ListGroup>
          <ListRow
            title="Sleep target"
            value={hasTarget ? `${utcToLocal(targetBed, timezone)} – ${utcToLocal(targetWake, timezone)} · ${formatSleepDuration(targetMinutes)}` : 'Not set'}
            chevron
            onPress={openTargetModal}
          />
        </ListGroup>

        <SectionHeader
          title="History"
          action={history.length > 7 ? { label: showAll ? 'Show less' : 'Show all', onPress: () => setShowAll((v) => !v) } : undefined}
        />
        {historyError ? (
          <ListGroup>
            <ListRow title="History is unavailable" subtitle="Tap to try again" onPress={() => void refreshHistory()} />
          </ListGroup>
        ) : history.length === 0 ? (
          <Text style={styles.foot}>Your logged nights will appear here.</Text>
        ) : (
          <ListGroup>
            {shownHistory.map((entry) => {
              const labels = nightRowLabels(entry);
              return (
                <ListRow
                  key={entry.id}
                  title={labels.title}
                  subtitle={labels.times}
                  value={formatSleepDuration(entry.duration_minutes ?? 0)}
                  chevron
                  onPress={() => startEditing(entry)}
                  accessibilityLabel={`Edit night of ${labels.title}, ${labels.times}`}
                />
              );
            })}
          </ListGroup>
        )}
      </ScrollView>

      <Sheet visible={showTargetModal} onClose={() => setShowTargetModal(false)} title="Sleep target">
        <View style={styles.sheetBody}>
          <SleepForm
            bedTime={draftBed}
            wakeTime={draftWake}
            timezone={timezone}
            bedHint=""
            wakeHint=""
            bedLabel="Target bed"
            wakeLabel="Target wake"
            durationSuffix="hr target"
            onBedTimeChange={(d) => setDraftBed(d)}
            onWakeTimeChange={(d) => setDraftWake(d)}
          />
          <Button label="Save target" onPress={() => void handleSaveTarget()} />
        </View>
      </Sheet>

      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title="Edit night">
        {editing ? (
          <View style={styles.sheetBody}>
            <SleepForm
              bedTime={editBed}
              wakeTime={editWake}
              timezone={editing.timezone}
              bedHint={dayName(editBed, editing.timezone)}
              wakeHint={dayName(editWake, editing.timezone)}
              onBedTimeChange={(date) => {
                const next = changeTimeInTimezone(editBed, date, editing.timezone);
                setEditBed(next);
                setEditWake(wakeAfterBedInTimezone(utcToZonedTime(editWake, editing.timezone), next, editing.timezone));
              }}
              onWakeTimeChange={(date) => setEditWake(wakeAfterBedInTimezone(date, editBed, editing.timezone))}
            />
            <Button label="Save changes" onPress={() => void saveEdit()} loading={isSaving} />
            <ListGroup>
              <ListRow title="Delete this night" tone="destructive" onPress={confirmDelete} />
            </ListGroup>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function durationParts(minutes: number): { value: string; unit: string }[] {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? [{ value: String(h), unit: 'hr' }, { value: String(m), unit: 'min' }] : [{ value: String(h), unit: 'hr' }];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, paddingTop: 14, marginBottom: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catText: { fontSize: 15, fontWeight: '600' },
  tag: { fontSize: 12, fontWeight: '600', color: colors.inkMuted, backgroundColor: colors.canvasDark, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  error: { fontSize: 14, color: colors.error, marginTop: spacing.md },
  save: { marginTop: 14 },
  foot: { fontSize: 13, color: colors.inkMuted, lineHeight: 18, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sub: { fontSize: 14, color: colors.inkMuted, marginBottom: 2 },
  empty: { fontSize: 16, color: colors.ink, marginTop: 2 },
  sheetBody: { gap: spacing.md, paddingTop: spacing.sm },
});
