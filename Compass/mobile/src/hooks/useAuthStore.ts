/**
 * Auth Store (Zustand)
 * Global state for authentication and onboarding
 */

import { create } from 'zustand';
import { User, Profile } from '@types/index';

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsLoading: (loading: boolean) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  hasCompletedOnboarding: false,
  error: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
  setError: (error) => set({ error }),
  reset: () => set({
    user: null,
    profile: null,
    isLoading: false,
    hasCompletedOnboarding: false,
    error: null,
  }),
}));
