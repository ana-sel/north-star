/**
 * SettingsScreen
 * Timezone management + sign out
 * GDPR: user can see what data is stored and sign out (right to access/erasure shown as roadmap)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@styles/theme';
import { useAuthStore, AuthStore } from '@hooks/useAuthStore';
import { supabase } from '@lib/supabase';
import { COMMON_TIMEZONES } from '@lib/time';
import { updateActiveTimezone } from '@data/profile';

export function SettingsScreen() {
  const user = useAuthStore((s: AuthStore) => s.user);
  const profile = useAuthStore((s: AuthStore) => s.profile);
  const setProfile = useAuthStore((s: AuthStore) => s.setProfile);
  const reset = useAuthStore((s: AuthStore) => s.reset);

  const [isChangingTz, setIsChangingTz] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await supabase.auth.signOut();
            reset();
          } catch (err) {
            console.error('Sign out error:', err);
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleTimezoneChange = async (tz: string) => {
    if (!user?.id || tz === profile?.active_timezone) return;
    setIsChangingTz(true);
    try {
      const updated = await updateActiveTimezone(user.id, tz);
      setProfile(updated);
    } catch (err) {
      Alert.alert('Error', 'Could not update timezone. Please try again.');
      console.error('Timezone update error:', err);
    } finally {
      setIsChangingTz(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <Text style={styles.infoLabel}>Signed in as</Text>
            <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
          </View>
        </View>

        {/* Timezone section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Active timezone</Text>
            {isChangingTz && (
              <ActivityIndicator size="small" color={theme.colors.steel} />
            )}
          </View>
          <Text style={styles.sectionHint}>
            Change this when you travel so sleep times stay accurate.
          </Text>
          <View style={styles.tzList}>
            {COMMON_TIMEZONES.map((tz) => {
              const isActive = tz === (profile?.active_timezone ?? 'UTC');
              const isHome = tz === profile?.home_timezone;
              return (
                <TouchableOpacity
                  key={tz}
                  style={[styles.tzOption, isActive && styles.tzOptionActive]}
                  onPress={() => handleTimezoneChange(tz)}
                  disabled={isChangingTz}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tzOptionText,
                      isActive && styles.tzOptionTextActive,
                    ]}
                  >
                    {tz}
                  </Text>
                  {isHome && (
                    <Text style={styles.homeTag}>home</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Privacy section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Privacy</Text>
          <View style={styles.card}>
            <Text style={styles.privacyText}>
              Compass stores only your sleep times and timezone.{'\n\n'}
              We never share your data. Only anonymous duration numbers are
              sent to generate your weekly note — never your identity.
            </Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOutBtn, isSigningOut && styles.signOutBtnDisabled]}
          onPress={handleSignOut}
          disabled={isSigningOut}
          activeOpacity={0.7}
        >
          {isSigningOut ? (
            <ActivityIndicator color={theme.colors.error} size="small" />
          ) : (
            <Text style={styles.signOutBtnText}>Sign out</Text>
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
  section: {
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
  },
  infoLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: theme.typography.md,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  tzList: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.card,
    overflow: 'hidden',
  },
  tzOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  tzOptionActive: {
    backgroundColor: theme.colors.greige,
  },
  tzOptionText: {
    fontSize: theme.typography.sm,
    color: theme.colors.ink,
  },
  tzOptionTextActive: {
    fontWeight: '700',
  },
  homeTag: {
    fontSize: theme.typography.xs,
    color: theme.colors.olive,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  privacyText: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  signOutBtnDisabled: {
    opacity: 0.5,
  },
  signOutBtnText: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.error,
  },
});
