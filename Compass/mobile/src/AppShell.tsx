// App Shell — shared top bar + 3 tabs. Settings opens as a modal.

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@styles/theme';
import { TodayScreen, WeekScreen, HistoryScreen } from '@features/sleep';
import { SettingsScreen } from './features/settings/SettingsScreen';

type TabName = 'today' | 'week' | 'history';

const TABS: { key: TabName; label: string; icon: string; title: string }[] = [
  { key: 'today',   label: 'Today',   icon: '☾', title: 'Compass'   },
  { key: 'week',    label: 'Week',    icon: '◔', title: 'This week' },
  { key: 'history', label: 'History', icon: '≡', title: 'History'   },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabName>('today');
  const [showSettings, setShowSettings] = useState(false);
  const insets = useSafeAreaInsets();

  const currentTitle = TABS.find(t => t.key === activeTab)!.title;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Shared top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{currentTitle}</Text>
        <TouchableOpacity
          style={styles.cog}
          onPress={() => setShowSettings(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.cogIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {activeTab === 'today'   && <TodayScreen onSaved={() => setActiveTab('week')} />}
        {activeTab === 'week'    && <WeekScreen />}
        {activeTab === 'history' && <HistoryScreen />}
      </View>

      {/* Bottom tabs */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        {TABS.map(({ key, label, icon }) => {
          const active = key === activeTab;
          return (
            <TouchableOpacity
              key={key}
              style={styles.tabButton}
              onPress={() => setActiveTab(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Settings modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <SettingsScreen onClose={() => setShowSettings(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  topTitle: {
    fontSize: theme.typography.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  cog: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  cogIcon: {
    fontSize: 18,
    color: theme.colors.muted,
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
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  tabIcon: {
    fontSize: theme.typography.lg,
    color: theme.colors.muted,
    opacity: 0.6,
  },
  tabIconActive: {
    color: theme.colors.ink,
    opacity: 1,
  },
  tabLabel: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.muted,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: theme.colors.ink,
  },
});
