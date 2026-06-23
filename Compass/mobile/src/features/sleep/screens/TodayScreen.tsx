/**
 * TodayScreen — V1 Sleep Log
 * Lets the user log bed time + wake time for last night
 * Stores UTC in Supabase, always with the timezone it was logged in (GDPR: minimal data)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '@styles/theme';
import { useAuthStore, AuthStore } from '@hooks/useAuthStore';
import { SleepForm } from '../components/SleepForm';
import { localToUTC, calculateDuration, getDeviceTimezone } from '@lib/time';
import { saveSleepEntry } from '@data/sleep';
import { generateNote } from '@lib/ai';

interface TodayScreenProps {
  onSaved?: () => void; // navigate to Week tab after saving
}

export function TodayScreen({ onSaved }: TodayScreenProps) {
  const user = useAuthStore((s: AuthStore) => s.user);
  const profile = useAuthStore((s: AuthStore) => s.profile);

  const timezone = profile?.active_timezone ?? getDeviceTimezone();

  // Default: bed 23:00 yesterday, wake 07:00 today
  const [bedTime, setBedTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(23, 0, 0, 0);
    return d;
  });

  const [wakeTime, setWakeTime] = useState(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });

  const [isSaving, setIsSaving] = useState(false);

  // Live duration
  const { formatted: durationLabel } = calculateDuration(bedTime, wakeTime);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;

    if (wakeTime <= bedTime) {
      Alert.alert(
        'Check your times',
        'Wake time should be after bed time.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSaving(true);
    try {
      // Convert local times to UTC for storage
      const sleepStartUtc = bedTime.toISOString();
      const sleepEndUtc = wakeTime.toISOString();

      // Fetch last 7 nights for the AI note (before saving this one)
      // We'll let the Week screen handle the note after save

      // Save the entry (GDPR: only times + timezone, no personal content)
      await saveSleepEntry({
        user_id: user.id,
        sleep_start_utc: sleepStartUtc,
        sleep_end_utc: sleepEndUtc,
        timezone,
        duration_minutes: null,
        note: null,
        energy: null,
        mood: null,
      });

      onSaved?.();
    } catch (err) {
      Alert.alert(
        'Could not save',
        'Please check your connection and try again.',
        [{ text: 'OK' }]
      );
      console.error('Save sleep entry error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [user, bedTime, wakeTime, timezone, onSaved]);

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Compass</Text>
          <Text style={styles.date}>{today}</Text>
        </View>

        {/* Timezone pill */}
        <View style={styles.tzPill}>
          <View style={styles.tzDot} />
          <Text style={styles.tzText}>{timezone}</Text>
        </View>

        {/* Question */}
        <Text style={styles.question}>How did you sleep?</Text>

        {/* Sleep form (time pickers) */}
        <View style={styles.card}>
          <SleepForm
            bedTime={bedTime}
            wakeTime={wakeTime}
            durationLabel={durationLabel}
            timezone={timezone}
            onBedTimeChange={setBedTime}
            onWakeTimeChange={setWakeTime}
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
  header: {
    paddingTop: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: -0.5,
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
});
