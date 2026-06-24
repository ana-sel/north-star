// TodayScreen — log last night's bed and wake time.
// Stores UTC + the timezone it was logged in (GDPR: minimal data).

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@styles/theme';
import { useAuthStore, AuthStore } from '@hooks/useAuthStore';
import { SleepForm } from '../components/SleepForm';
import { calculateDuration, getDeviceTimezone, getTimezoneOffset, smartBedTime, smartWakeTime } from '@lib/time';
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
});
