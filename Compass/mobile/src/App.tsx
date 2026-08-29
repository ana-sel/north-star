/**
 * App Entry Point — v1 is single-user, local-only.
 *
 * First run shows a short onboarding, then the main shell. The gate
 * uses the `onboarded` pref stored in the local DB.
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppShell } from './AppShell';
import { OnboardingScreen } from '@features/onboarding/OnboardingScreen';
import { getPref } from '@data/prefs';
import { theme } from '@styles/theme';

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    getPref<boolean>('onboarded', false).then(setOnboarded);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {onboarded === null ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
            <ActivityIndicator color={theme.colors.olive} />
          </View>
        ) : onboarded ? (
          <AppShell />
        ) : (
          <OnboardingScreen onDone={() => setOnboarded(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
