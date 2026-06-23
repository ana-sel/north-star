/**
 * App Shell
 * Main app navigation (bottom tabs) after authentication
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { theme } from '@styles/theme';
import { useAuthStore } from '@hooks/useAuthStore';
import { supabase } from '@lib/supabase';

type TabName = 'today' | 'week' | 'history' | 'settings';

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabName>('today');
  const user = useAuthStore((s) => s.user);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      useAuthStore.getState().reset();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main content area */}
      <View style={styles.content}>
        {activeTab === 'today' && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>Today</Text>
            <Text style={styles.screenText}>Sleep log form coming soon</Text>
          </View>
        )}
        {activeTab === 'week' && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>This Week</Text>
            <Text style={styles.screenText}>Chart + AI note coming soon</Text>
          </View>
        )}
        {activeTab === 'history' && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>History</Text>
            <Text style={styles.screenText}>Past entries list coming soon</Text>
          </View>
        )}
        {activeTab === 'settings' && (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>Settings</Text>
            <Text style={styles.screenText}>Email: {user?.email}</Text>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom tab navigation */}
      <View style={styles.tabBar}>
        {(['today', 'week', 'history', 'settings'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
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
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  screenTitle: {
    fontSize: theme.typography.xl,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  screenText: {
    fontSize: theme.typography.md,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  signOutBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.error,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  signOutBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: theme.typography.md,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.card,
    paddingBottom: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.olive,
  },
  tabLabel: {
    fontSize: theme.typography.sm,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  tabLabelActive: {
    color: theme.colors.olive,
  },
});
