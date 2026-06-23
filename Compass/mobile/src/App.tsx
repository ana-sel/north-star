/**
 * App Entry Point
 * Root component with authentication and navigation
 */

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthGate } from '@auth/AuthGate';
import { AppShell } from './AppShell';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthGate>
          <AppShell />
        </AuthGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
