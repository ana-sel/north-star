/**
 * LoginScreen
 * Google OAuth sign-in for Compass
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import { supabase } from '@lib/supabase';
import { theme } from '@styles/theme';
import { useAuthStore } from '@hooks/useAuthStore';

export function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setError: () => void = useAuthStore((s) => s.setError);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initiate Google OAuth via Supabase
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'compass://auth-callback',
        },
      });

      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setError(msg);
      console.error('Google sign-in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo + intro */}
        <View style={styles.heroSection}>
          <Text style={styles.logo}>🧭</Text>
          <Text style={styles.title}>Compass</Text>
          <Text style={styles.subtitle}>
            A private space to understand your sleep,{'\n'}
            energy, and what matters to you.
          </Text>
        </View>

        {/* Google button */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.googleBtn, isLoading && styles.googleBtnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.card} size="small" />
            ) : (
              <>
                <Text style={styles.googleBtnEmoji}>🔑</Text>
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            We don't track you.{'\n'}
            Your data stays private.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: theme.spacing.xxxl,
  },
  logo: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.hero,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.typography.lg,
    lineHeight: 28,
    color: theme.colors.muted,
    textAlign: 'center',
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  googleBtnDisabled: {
    opacity: 0.6,
  },
  googleBtnEmoji: {
    fontSize: 20,
  },
  googleBtnText: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.card,
  },
  errorText: {
    fontSize: theme.typography.sm,
    color: '#ad665e',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
