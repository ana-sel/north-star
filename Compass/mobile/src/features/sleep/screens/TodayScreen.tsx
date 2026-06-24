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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@styles/theme';
import { useAuthStore, AuthStore } from '@hooks/useAuthStore';
import { SleepForm } from '../components/SleepForm';
import { calculateDuration, getDeviceTimezone, getTimezoneOffset, smartBedTime, smartWakeTime, utcToLocal } from '@lib/time';
import { saveSleepEntry } from '@data/sleep';

interface TodayScreenProps {
  onSaved?: () => void; // jump to the Week tab after saving
}

export function TodayScreen({ onSaved }: TodayScreenProps) {
  const user = useAuthStore((s: AuthStore) => s.user);
  const profile = useAuthStore((s: AuthStore) => s.profile);

  const timezone = profile?.active_timezone ?? getDeviceTimezone();
  const isHome = timezone === profile?.home_timezone;
  const offsetLabel = getTimezoneOffset(timezone);

  const [bedTime, setBedTime] = useState(() => smartBedTime((() => { const d = new Date(); d.setHours(23, 0, 0, 0); return d; })()));

  const [wakeTime, setWakeTime] = useState(() => {
    const d = new Date(); d.setHours(7, 0, 0, 0);
    return smartWakeTime(d, bedTime);
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    AsyncStorage.getItem('compass:sleep-target').then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as { bed: { h: number; m: number }; wake: { h: number; m: number } };
      const d1 = new Date(); d1.setHours(saved.bed.h, saved.bed.m, 0, 0);
      const d2 = new Date(); d2.setHours(saved.wake.h, saved.wake.m, 0, 0);
      setTargetBed(d1);
      setTargetWake(d2);
    });
  }, [])

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
    await AsyncStorage.setItem('compass:sleep-target', JSON.stringify({
      bed:  { h: draftBed.getHours(),  m: draftBed.getMinutes() },
      wake: { h: draftWake.getHours(), m: draftWake.getMinutes() },
    }));
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
    if (!user?.id) return;
    setErrorMsg(null);

    if (wakeTime <= bedTime) {
      setErrorMsg('Wake time should be after bed time — check your times.');
      return;
    }

    setIsSaving(true);
    try {
      await saveSleepEntry({
        user_id: user.id,
        sleep_start_utc: bedTime.toISOString(),
        sleep_end_utc: wakeTime.toISOString(),
        timezone,
        duration_minutes: null,
        note: null,
        energy: null,
        mood: null,
      });
      onSaved?.();
    } catch (err) {
      setErrorMsg('Could not save — please check your connection and try again.');
      console.error('Save sleep entry error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [user, bedTime, wakeTime, timezone, onSaved]);

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
            {timezone} · {offsetLabel}{isHome ? ' · home' : ''}
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
