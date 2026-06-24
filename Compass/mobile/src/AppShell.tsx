/**
 * App Shell
 * Main app navigation (bottom tabs) after authentication
 */

import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@styles/theme';
import { TodayScreen, WeekScreen, HistoryScreen } from '@features/sleep';
import { SettingsScreen } from './features/settings/SettingsScreen';

type TabName = 'today' | 'week' | 'history' | 'settings';

const TABS: { key: TabName; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'history', label: 'History' },
  { key: 'settings', label: 'Settings' },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabName>('today');
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Main content area */}
      <View style={styles.content}>
        {activeTab === 'today' && (
          <TodayScreen onSaved={() => setActiveTab('week')} />
        )}
        {activeTab === 'week' && <WeekScreen />}
        {activeTab === 'history' && <HistoryScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </View>

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabButton, activeTab === key && styles.tabButtonActive]}
            onPress={() => setActiveTab(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === key && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.card,
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
