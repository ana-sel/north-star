// SettingsScreen — profile info + sign out.

import { useState } from 'react';
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

interface SettingsScreenProps {
  onClose?: () => void;
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const user = useAuthStore((s: AuthStore) => s.user);
  const profile = useAuthStore((s: AuthStore) => s.profile);
  const reset = useAuthStore((s: AuthStore) => s.reset);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Profile</Text>
          <View style={styles.card}>
            {!!profile?.display_name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{profile.display_name}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Privacy section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Privacy</Text>
          <View style={styles.card}>
            <Text style={styles.privacyText}>
              Compass stores only your sleep times.{'\n\n'}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  sectionLabel: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: theme.typography.md,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  privacyText: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  closeBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  closeBtnText: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.olive,
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
