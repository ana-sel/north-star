/**
 * AppShell (v1) — four bottom tabs, sub-nav where needed, a settings modal,
 * and a full-screen Path detail modal that can be opened from Today or Paths.
 * Uses shared UI primitives so the shell owns no local visual literals.
 */

import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { colors } from '@styles/theme';
import { Screen, SubNav, TabBar, TopBar } from '@ui';
import type { TabItem } from '@ui';

import { TodayScreen } from '@features/today/TodayScreen';
import { TodayScreen as LogSleepScreen } from '@features/sleep';
import { HabitsScreen } from '@features/habits/HabitsScreen';
import { PlanFlowScreen } from '@features/plan/PlanFlowScreen';
import { ProgressScreen } from '@features/progress/ProgressScreen';
import { PathsListScreen } from '@features/paths/PathsListScreen';
import { PathDetailScreen } from '@features/paths/PathDetailScreen';
import { FoundationDetailScreen } from '@features/foundations/FoundationDetailScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';

type TabKey = 'today' | 'log' | 'plan' | 'you';
type LogSub = 'sleep' | 'habits';
type YouSub = 'progress' | 'paths';

const TABS: TabItem[] = [
  { key: 'today', label: 'Today', icon: 'sun' },
  { key: 'log',   label: 'Log',   icon: 'activity' },
  { key: 'plan',  label: 'Plan',  icon: 'target' },
  { key: 'you',   label: 'You',   icon: 'user' },
];

const TITLES: Record<TabKey, string> = {
  today: 'Today',
  log: 'Log',
  plan: 'Plan',
  you: 'You',
};

const LOG_OPTIONS = [
  { key: 'sleep',        label: 'Sleep' },
  { key: 'habits',       label: 'Habits' },
];

const YOU_OPTIONS = [
  { key: 'progress', label: 'Progress' },
  { key: 'paths',    label: 'Paths' },
];

export function AppShell() {
  const [tab, setTab] = useState<TabKey>('today');
  const [logSub, setLogSub] = useState<LogSub>('sleep');
  const [youSub, setYouSub] = useState<YouSub>('progress');
  const [showSettings, setShowSettings] = useState(false);
  const [openPathId, setOpenPathId] = useState<string | null>(null);
  const [openFoundationId, setOpenFoundationId] = useState<string | null>(null);

  const openPathDetail = (pathId: string) => setOpenPathId(pathId);

  return (
    <Screen padBottom={false}>
      <TopBar
        title={TITLES[tab]}
        actions={[{ key: 'settings', icon: 'sliders', label: 'Settings', onPress: () => setShowSettings(true) }]}
      />

      {tab === 'log' && (
        <SubNav options={LOG_OPTIONS} value={logSub} onChange={(key) => setLogSub(key as LogSub)} />
      )}
      {tab === 'you' && (
        <SubNav options={YOU_OPTIONS} value={youSub} onChange={(key) => setYouSub(key as YouSub)} />
      )}

      <View style={styles.content}>
        {tab === 'today' && (
          <TodayScreen
            onOpenPaths={() => { setTab('you'); setYouSub('paths'); }}
            onOpenPathDetail={openPathDetail}
            onOpenFoundationDetail={setOpenFoundationId}
            onOpenSleep={() => { setTab('log'); setLogSub('sleep'); }}
            onOpenHabits={() => { setTab('log'); setLogSub('habits'); }}
            onOpenPlan={() => setTab('plan')}
          />
        )}
        {tab === 'log' && logSub === 'sleep'        && <LogSleepScreen />}
        {tab === 'log' && logSub === 'habits'       && <HabitsScreen />}
        {tab === 'plan' && <PlanFlowScreen />}
        {tab === 'you' && youSub === 'progress' && <ProgressScreen />}
        {tab === 'you' && youSub === 'paths'    && <PathsListScreen onOpenPathDetail={openPathDetail} onOpenFoundationDetail={setOpenFoundationId} />}
      </View>

      <TabBar tabs={TABS} value={tab} onChange={(key) => setTab(key as TabKey)} />

      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <SettingsScreen onClose={() => setShowSettings(false)} />
      </Modal>

      <Modal visible={openPathId !== null} animationType="slide" onRequestClose={() => setOpenPathId(null)}>
        {openPathId && <PathDetailScreen pathId={openPathId} onClose={() => setOpenPathId(null)} />}
      </Modal>

      <Modal visible={openFoundationId !== null} animationType="slide" onRequestClose={() => setOpenFoundationId(null)}>
        {openFoundationId && <FoundationDetailScreen foundationId={openFoundationId} onClose={() => setOpenFoundationId(null)} />}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, backgroundColor: colors.canvas },
});
