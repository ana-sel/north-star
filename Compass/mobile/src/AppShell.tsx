/**
 * AppShell (v1) — four bottom tabs, sub-nav where needed, a settings modal,
 * and a full-screen Path detail modal that can be opened from Today or Paths.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@styles/theme';

import { TodayScreen } from '@features/today/TodayScreen';
import { TodayScreen as LogSleepScreen, WeekScreen, HistoryScreen } from '@features/sleep';
import { HabitsScreen } from '@features/habits/HabitsScreen';
import { PlanFlowScreen } from '@features/plan/PlanFlowScreen';
import { ProgressScreen } from '@features/progress/ProgressScreen';
import { PathsListScreen } from '@features/paths/PathsListScreen';
import { PathDetailScreen } from '@features/paths/PathDetailScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';

type TabKey = 'today' | 'log' | 'plan' | 'you';
type LogSub = 'sleep' | 'sleepWeek' | 'sleepHistory' | 'habits';
type YouSub = 'progress' | 'paths';

const TABS: { key: TabKey; label: string; icon: string; title: string }[] = [
  { key: 'today', label: 'Today', icon: '☀', title: 'Today' },
  { key: 'log',   label: 'Log',   icon: '≡', title: 'Log'   },
  { key: 'plan',  label: 'Plan',  icon: '◎', title: 'Plan'  },
  { key: 'you',   label: 'You',   icon: '•', title: 'You'   },
];

export function AppShell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('today');
  const [logSub, setLogSub] = useState<LogSub>('sleep');
  const [youSub, setYouSub] = useState<YouSub>('progress');
  const [showSettings, setShowSettings] = useState(false);
  const [openPathId, setOpenPathId] = useState<string | null>(null);

  const openPathDetail = (pathId: string) => setOpenPathId(pathId);

  const activeTitle = TABS.find((t) => t.key === tab)!.title;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{activeTitle}</Text>
        <TouchableOpacity style={styles.cog} onPress={() => setShowSettings(true)}>
          <Text style={styles.cogIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Sub-nav (Log + You) */}
      {tab === 'log' && (
        <SubNav
          options={[
            { key: 'sleep',        label: 'Sleep' },
            { key: 'sleepWeek',    label: 'Week' },
            { key: 'sleepHistory', label: 'History' },
            { key: 'habits',       label: 'Habits' },
          ]}
          value={logSub}
          onChange={(v) => setLogSub(v as LogSub)}
        />
      )}
      {tab === 'you' && (
        <SubNav
          options={[
            { key: 'progress', label: 'Progress' },
            { key: 'paths',    label: 'Paths' },
          ]}
          value={youSub}
          onChange={(v) => setYouSub(v as YouSub)}
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {tab === 'today' && (
          <TodayScreen
            onOpenPaths={() => { setTab('you'); setYouSub('paths'); }}
            onOpenPathDetail={openPathDetail}
          />
        )}
        {tab === 'log' && logSub === 'sleep'        && <LogSleepScreen onSaved={() => setLogSub('sleepWeek')} />}
        {tab === 'log' && logSub === 'sleepWeek'    && <WeekScreen />}
        {tab === 'log' && logSub === 'sleepHistory' && <HistoryScreen />}
        {tab === 'log' && logSub === 'habits'       && <HabitsScreen />}
        {tab === 'plan' && <PlanFlowScreen />}
        {tab === 'you' && youSub === 'progress' && <ProgressScreen />}
        {tab === 'you' && youSub === 'paths'    && <PathsListScreen onOpenDetail={openPathDetail} />}
      </View>

      {/* Bottom tabs */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        {TABS.map(({ key, label, icon }) => {
          const active = key === tab;
          return (
            <TouchableOpacity key={key} style={styles.tabButton} onPress={() => setTab(key)} activeOpacity={0.7}>
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Settings modal */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <SettingsScreen onClose={() => setShowSettings(false)} />
      </Modal>

      {/* Path detail modal */}
      <Modal visible={openPathId !== null} animationType="slide" onRequestClose={() => setOpenPathId(null)}>
        {openPathId && <PathDetailScreen pathId={openPathId} onClose={() => setOpenPathId(null)} />}
      </Modal>
    </View>
  );
}

function SubNav({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.subNav}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.key}
          style={[styles.subBtn, value === o.key && styles.subBtnActive]}
          onPress={() => onChange(o.key)}
        >
          <Text style={[styles.subBtnText, value === o.key && styles.subBtnTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  topTitle: { fontSize: theme.typography.xl, fontWeight: '800', color: theme.colors.ink, letterSpacing: -0.5 },
  cog: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.line,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.sm,
  },
  cogIcon: { fontSize: 18, color: theme.colors.muted },
  subNav: {
    flexDirection: 'row',
    backgroundColor: theme.colors.greige,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    padding: 3,
    gap: 2,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.input,
  },
  subBtn: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: 11 },
  subBtnActive: { backgroundColor: theme.colors.card },
  subBtnText: { fontSize: theme.typography.xs, fontWeight: '700', color: theme.colors.muted },
  subBtnTextActive: { color: theme.colors.ink },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.card,
  },
  tabButton: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', gap: 4 },
  tabIcon: { fontSize: theme.typography.lg, color: theme.colors.muted, opacity: 0.6 },
  tabIconActive: { color: theme.colors.ink, opacity: 1 },
  tabLabel: { fontSize: theme.typography.xs, fontWeight: '600', color: theme.colors.muted, letterSpacing: 0.3 },
  tabLabelActive: { color: theme.colors.ink },
});
