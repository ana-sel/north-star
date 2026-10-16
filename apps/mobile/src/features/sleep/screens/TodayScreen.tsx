// TodayScreen — log last night's bed and wake time.
// Stores UTC + the timezone it was logged in (GDPR: minimal data).

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { theme } from '@styles/theme';
import { utcToZonedTime } from 'date-fns-tz';
import { SleepForm } from '../components/SleepForm';
import { calculateDuration, changeTimeInTimezone, getDeviceTimezone, getTimezoneOffset, smartBedTime, smartWakeTime, utcToLocal, wakeAfterBedInTimezone } from '@lib/time';
import { deleteSleepEntry, getSleepHistory, saveSleepEntry, updateSleepEntry } from '@data/sleep';
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
  const [editing, setEditing] = useState<SleepEntry | null>(null);
  const [editBed, setEditBed] = useState<Date>(new Date());
  const [editWake, setEditWake] = useState<Date>(new Date());

  // Target sleep times (persisted locally)
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
    };
    loadTarget();
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await getSleepHistory());
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

  const targetDurationLabel = useMemo(() => {
    let diff = (targetWake.getHours() * 60 + targetWake.getMinutes()) -
               (targetBed.getHours() * 60 + targetBed.getMinutes());
    if (diff <= 0) diff += 24 * 60;
    return `${Math.floor(diff / 60)}h ${diff % 60 === 0 ? '00' : diff % 60}m`;
  }, [targetBed, targetWake]);

  const draftDurationLabel = useMemo(() => {
    let diff = (draftWake.getHours() * 60 + draftWake.getMinutes()) -
               (draftBed.getHours() * 60 + draftBed.getMinutes());
    if (diff <= 0) diff += 24 * 60;
    return `${Math.floor(diff / 60)}h ${diff % 60 === 0 ? '00' : diff % 60}m`;
  }, [draftBed, draftWake]);

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
    setShowTargetModal(false);
  }, [draftBed, draftWake]);

  // Day hint shown next to each time: "↩ yesterday" / "↩ today"
  const dayHint = (d: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return '↩ today';
    if (d.toDateString() === yesterday.toDateString()) return '↩ yesterday';
    return `↩ ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}`;
  };

  const { formatted: durationLabel } = calculateDuration(bedTime, wakeTime);

  const handleSave = useCallback(async () => {
    setErrorMsg(null);

    if (wakeTime <= bedTime) {
      setErrorMsg('Wake time should be after bed time \u2014 check your times.');
      return;
    }

    setIsSaving(true);
    try {
      await saveSleepEntry({
        sleep_start_utc: bedTime.toISOString(),
        sleep_end_utc: wakeTime.toISOString(),
        timezone,
        duration_minutes: null,
        note: null,
        energy: null,
        mood: null,
      });
      await refreshHistory();
      onSaved?.();
    } catch (err) {
      setErrorMsg('Could not save \u2014 please try again.');
      console.error('Save sleep entry error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [bedTime, wakeTime, timezone, onSaved, refreshHistory]);

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

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date */}
        <Text style={styles.date}>{today}</Text>

        {/* Timezone pill */}
        <View style={styles.tzPill}>
          <View style={styles.tzDot} />
          <Text style={styles.tzText}>
            {timezone} · {offsetLabel}
          </Text>
        </View>

        {/* Error banner */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Target sleep card */}
        <TouchableOpacity style={styles.targetCard} onPress={openTargetModal} activeOpacity={0.8}>
          <Text style={styles.targetHeading}>Target</Text>
          <View style={styles.targetRow}>
            <View style={styles.targetTime}>
              <Text style={styles.targetIcon}>🌙</Text>
              <Text style={styles.targetTimeValue}>{utcToLocal(targetBed, timezone)}</Text>
            </View>
            <Text style={styles.targetSep}>→</Text>
            <View style={styles.targetTime}>
              <Text style={styles.targetIcon}>☀</Text>
              <Text style={styles.targetTimeValue}>{utcToLocal(targetWake, timezone)}</Text>
            </View>
            <Text style={styles.targetDur}>{targetDurationLabel}</Text>
          </View>
        </TouchableOpacity>

        {/* Question */}
        <Text style={styles.question}>How did you sleep?</Text>

        {/* Sleep form (time pickers) */}
        <View style={styles.card}>
          <SleepForm
            bedTime={bedTime}
            wakeTime={wakeTime}
            durationLabel={durationLabel}
            timezone={timezone}
            bedHint={dayHint(bedTime)}
            wakeHint={dayHint(wakeTime)}
            onBedTimeChange={handleBedChange}
            onWakeTimeChange={handleWakeChange}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color={theme.colors.card} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save night</Text>
          )}
        </TouchableOpacity>

        <View style={styles.history}>
          <Text style={styles.question}>Sleep history</Text>
          {historyError ? (
            <TouchableOpacity onPress={() => void refreshHistory()} accessibilityRole="button">
              <Text style={styles.historyDetail}>History is unavailable. Tap to try again.</Text>
            </TouchableOpacity>
          ) : history.length === 0 ? (
            <Text style={styles.historyDetail}>Your logged nights will appear here.</Text>
          ) : history.map((entry) => (
            <TouchableOpacity key={entry.id} style={styles.historyRow} onPress={() => startEditing(entry)} accessibilityRole="button" accessibilityLabel={`Edit sleep from ${new Date(entry.sleep_start_utc).toLocaleDateString()}`}>
              <Text style={styles.historyTitle}>{new Date(entry.sleep_start_utc).toLocaleDateString()}</Text>
              <Text style={styles.historyDetail}>{utcToLocal(new Date(entry.sleep_start_utc), entry.timezone)} to {utcToLocal(new Date(entry.sleep_end_utc), entry.timezone)} · {Math.floor((entry.duration_minutes ?? 0) / 60)}h {String((entry.duration_minutes ?? 0) % 60).padStart(2, '0')}m</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Target setter modal */}
      <Modal
        visible={showTargetModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTargetModal(false)}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sleep target</Text>
              <TouchableOpacity
                onPress={() => setShowTargetModal(false)}
                style={styles.modalDone}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDoneText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.question}>What's your target?</Text>

            {/* Reuse the same card + SleepForm layout */}
            <View style={styles.card}>
              <SleepForm
                bedTime={draftBed}
                wakeTime={draftWake}
                durationLabel={draftDurationLabel}
                timezone={timezone}
                bedHint=""
                wakeHint=""
                bedLabel="Target bed"
                wakeLabel="Target wake"
                durationSuffix="target"
                onBedTimeChange={(d) => setDraftBed(d)}
                onWakeTimeChange={(d) => setDraftWake(d)}
              />
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveTarget}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Save target</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={editing !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit night</Text>
              <TouchableOpacity onPress={() => setEditing(null)} style={styles.modalDone} accessibilityRole="button">
                <Text style={styles.modalDoneText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            {editing && (
              <View style={styles.card}>
                <SleepForm
                  bedTime={editBed}
                  wakeTime={editWake}
                  durationLabel={calculateDuration(editBed, editWake).formatted}
                  timezone={editing.timezone}
                  bedHint=""
                  wakeHint=""
                  onBedTimeChange={(date) => {
                    const next = changeTimeInTimezone(editBed, date, editing.timezone);
                    setEditBed(next);
                    setEditWake(wakeAfterBedInTimezone(utcToZonedTime(editWake, editing.timezone), next, editing.timezone));
                  }}
                  onWakeTimeChange={(date) => setEditWake(wakeAfterBedInTimezone(date, editBed, editing.timezone))}
                />
              </View>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={isSaving} accessibilityRole="button">
              <Text style={styles.saveBtnText}>Save changes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmDelete} accessibilityRole="button">
              <Text style={styles.deleteText}>Delete entry</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  date: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    fontWeight: '500',
    marginTop: 4,
  },
  tzPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.greige,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  tzDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.olive,
  },
  tzText: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  question: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  history: { gap: theme.spacing.sm },
  historyRow: { padding: theme.spacing.md, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.input, gap: theme.spacing.xs },
  historyTitle: { fontSize: theme.typography.md, fontWeight: '600', color: theme.colors.ink },
  historyDetail: { fontSize: theme.typography.sm, color: theme.colors.muted },
  deleteText: { textAlign: 'center', color: theme.colors.error, fontSize: theme.typography.md },
  saveBtn: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.card,
  },
  errorBanner: {
    backgroundColor: '#FDF4F3',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.sm,
    color: theme.colors.error,
    fontWeight: '500',
    lineHeight: 20,
  },
  targetCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  targetHeading: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  targetTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  targetIcon: {
    fontSize: theme.typography.md,
  },
  targetTimeValue: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  targetSep: {
    fontSize: theme.typography.md,
    color: theme.colors.muted,
  },
  targetDur: {
    marginLeft: 'auto',
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.typography.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  modalDone: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  modalDoneText: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.muted,
  },
});
