/**
 * Onboarding Screen
 * User picks their home timezone on first login
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@lib/supabase';
import { theme } from '@styles/theme';
import { COMMON_TIMEZONES, getDeviceTimezone, isValidTimezone } from '@lib/time';
import * as profileData from '@data/profile';
import { useAuthStore } from '@hooks/useAuthStore';

export function Onboarding() {
  const [selectedTz, setSelectedTz] = useState(() => {
    const device = getDeviceTimezone();
    return isValidTimezone(device) ? device : 'UTC';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setHasCompletedOnboarding = useAuthStore((s) => s.setHasCompletedOnboarding);

  const handleContinue = async () => {
    if (!user?.id) {
      setError('User not found');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create profile with home timezone
      const profile = await profileData.createProfile(user.id, selectedTz);

      // Update store
      setProfile(profile);
      setHasCompletedOnboarding(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save timezone';
      setError(msg);
      console.error('Onboarding error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Compass</Text>
          <Text style={styles.subtitle}>
            First, let's set your home timezone.{'\n'}
            You can always change it if you travel.
          </Text>
        </View>

        {/* Timezone picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Your home timezone</Text>
          <ScrollView
            style={styles.tzList}
            showsVerticalScrollIndicator={false}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <TouchableOpacity
                key={tz}
                style={[
                  styles.tzOption,
                  selectedTz === tz && styles.tzOptionSelected,
                ]}
                onPress={() => setSelectedTz(tz)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tzOptionText,
                    selectedTz === tz && styles.tzOptionTextSelected,
                  ]}
                >
                  {tz}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Error */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.continueBtn, isLoading && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.card} size="small" />
          ) : (
            <Text style={styles.continueBtnText}>Continue</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.md,
    lineHeight: 24,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  pickerContainer: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.sm,
    fontWeight: '600',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tzList: {
    maxHeight: 400,
    borderRadius: theme.radii.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
  },
  tzOption: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  tzOptionSelected: {
    backgroundColor: theme.colors.greige,
  },
  tzOptionText: {
    fontSize: theme.typography.md,
    color: theme.colors.ink,
  },
  tzOptionTextSelected: {
    fontWeight: '600',
    color: theme.colors.ink,
  },
  errorText: {
    fontSize: theme.typography.sm,
    color: '#ad665e',
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnText: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.card,
  },
});
