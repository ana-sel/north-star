/**
 * AuthGate
 * Routes between LoginScreen, Onboarding, and App based on auth state
 */

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '@lib/supabase';
import { theme } from '@styles/theme';
import { useAuthStore } from '@hooks/useAuthStore';
import * as profileData from '@data/profile';
import { LoginScreen } from './LoginScreen';
import { Onboarding } from './Onboarding';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);

  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setIsLoading = useAuthStore((s) => s.setIsLoading);
  const setHasCompletedOnboarding = useAuthStore((s) => s.setHasCompletedOnboarding);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session?.user) {
          // User is authenticated
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
            created_at: data.session.user.created_at,
            updated_at: data.session.user.updated_at || '',
          });

          // Check if profile exists
          try {
            const profile = await profileData.getProfile(data.session.user.id);
            setProfile(profile);
            setHasCompletedOnboarding(true);
          } catch {
            // Profile doesn't exist, user needs onboarding
            setHasCompletedOnboarding(false);
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || '',
        });

        // Check profile on auth state change
        profileData.getProfile(session.user.id)
          .then((profile) => {
            setProfile(profile);
            setHasCompletedOnboarding(true);
          })
          .catch(() => {
            setHasCompletedOnboarding(false);
          });
      } else {
        setUser(null);
        setProfile(null);
        setHasCompletedOnboarding(false);
      }
    });

    return () => {
      data.subscription?.unsubscribe();
    };
  }, [setUser, setProfile, setIsLoading, setHasCompletedOnboarding]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.ink} />
      </View>
    );
  }

  // Not authenticated → LoginScreen
  if (!user) {
    return <LoginScreen />;
  }

  // Authenticated but not onboarded → Onboarding
  if (!hasCompletedOnboarding) {
    return <Onboarding />;
  }

  // Authenticated and onboarded → App
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
