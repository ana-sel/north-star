/**
 * App Entry Point
 * Root component and navigation setup
 */

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// TODO: Replace with actual navigation setup (Expo Router)
// For now, this is a placeholder

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* TODO: Add AuthGate and navigation here */}
        {/* Placeholder for now */}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
