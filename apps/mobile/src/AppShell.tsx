/**
 * AppShell (v1) — three tabs (Today · Log · You), sub-nav where needed, an in-tab page stack
 * for drill-in pages, one shared preview sheet, and a settings sheet.
 * How things open: docs/design/wireframes-health/interactions.html.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Easing, Modal, StyleSheet, View } from 'react-native';
import { colors } from '@styles/theme';
import { Screen, SubNav, TabBar, TopBar } from '@ui';
import type { TabItem } from '@ui';

import { TodayScreen } from '@features/today/TodayScreen';
import { TodayScreen as LogSleepScreen } from '@features/sleep';
import { HabitsScreen } from '@features/habits/HabitsScreen';
import { ProgressScreen } from '@features/progress/ProgressScreen';
import { PathsHomeScreen } from '@features/paths/PathsHomeScreen';
import type { NextChoice } from '@features/paths/PathsHomeScreen';
import { JourneyScreen } from '@features/paths/JourneyScreen';
import { JourneyPreviewSheet } from '@features/paths/JourneyPreviewSheet';
import { ReturnsScreen } from '@features/paths/ReturnsScreen';
import { AreasScreen, PathListScreen } from '@features/paths/PathListScreen';
import { journeyContent } from '@features/paths/journeyContent';
import { DOMAINS } from '@features/paths/pathsContent';
import { FoundationsHouseScreen } from '@features/foundations/FoundationsHouseScreen';
import { foundationJourneyId } from '@features/foundations/foundationsContent';
import { SettingsScreen } from './features/settings/SettingsScreen';

type TabKey = 'today' | 'log' | 'you';
type LogSub = 'sleep' | 'habits';
type YouSub = 'progress' | 'paths';

type Page =
  | { name: 'journey'; id: string }
  | { name: 'returns'; id: string }
  | { name: 'areas' }
  | { name: 'area'; domain: string }
  | { name: 'suggest'; domain: string; heading: string }
  | { name: 'foundations' };

const TABS: TabItem[] = [
  { key: 'today', label: 'Today', icon: 'sun' },
  { key: 'log',   label: 'Log',   icon: 'activity' },
  { key: 'you',   label: 'You',   icon: 'user' },
];

const TITLES: Record<TabKey, string> = {
  today: 'Today',
  log: 'Log',
  you: 'You',
};

/** "Thursday 15 October" on the device's local date. */
function todayEyebrow(): string {
  const now = new Date();
  return `${now.toLocaleDateString('en-GB', { weekday: 'long' })} ${now.getDate()} ${now.toLocaleDateString('en-GB', { month: 'long' })}`;
}

const LOG_OPTIONS = [
  { key: 'sleep',        label: 'Sleep' },
  { key: 'habits',       label: 'Habits' },
];

const YOU_OPTIONS = [
  { key: 'progress', label: 'Progress' },
  { key: 'paths',    label: 'Paths' },
];

const SUGGEST_HEADINGS: Record<string, string> = {
  Inward: 'Feeling steadier inside',
  Together: 'Being better with people',
  Craft: 'Getting the work done',
  Frontier: 'Trying something new',
};

function pageTitle(page: Page): string {
  switch (page.name) {
    case 'journey': return journeyContent(page.id)?.title ?? 'Back';
    case 'returns': return 'All returns';
    case 'areas': return 'Growth paths';
    case 'area': return DOMAINS[page.domain]?.label ?? 'Back';
    case 'suggest': return 'Places to start';
    case 'foundations': return 'Foundations';
  }
}

/** Slides a pushed page in from the right, as in Health. */
function Pushed({ children }: { children: React.ReactNode }) {
  const x = useRef(new Animated.Value(Dimensions.get('window').width * 0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [x, opacity]);
  return <Animated.View style={[styles.content, { opacity, transform: [{ translateX: x }] }]}>{children}</Animated.View>;
}

export function AppShell() {
  const [tab, setTab] = useState<TabKey>('today');
  const [logSub, setLogSub] = useState<LogSub>('sleep');
  const [youSub, setYouSub] = useState<YouSub>('progress');
  const [stack, setStack] = useState<Page[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const push = (page: Page) => setStack((s) => [...s, page]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const goTab = (next: TabKey) => {
    setStack([]);
    setTab(next);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length === 0) return false;
      setStack((s) => s.slice(0, -1));
      return true;
    });
    return () => sub.remove();
  }, [stack.length]);

  const rootTitle = tab === 'you' ? (youSub === 'paths' ? 'Paths' : 'Progress') : TITLES[tab];
  const backLabel = stack.length > 1 ? pageTitle(stack[stack.length - 2]) : rootTitle;
  const openJourney = (id: string) => push({ name: 'journey', id });
  const openChoice = (choice: NextChoice) =>
    choice === 'foundations' ? push({ name: 'foundations' }) : push({ name: 'suggest', domain: choice, heading: SUGGEST_HEADINGS[choice] });

  const renderPage = (page: Page) => {
    switch (page.name) {
      case 'journey':
        return <JourneyScreen journeyId={page.id} backLabel={backLabel} onBack={pop} onOpenReturns={() => push({ name: 'returns', id: page.id })} />;
      case 'returns':
        return <ReturnsScreen journeyId={page.id} onBack={pop} />;
      case 'areas':
        return <AreasScreen backLabel={backLabel} onBack={pop} onOpenArea={(domain) => push({ name: 'area', domain })} />;
      case 'area':
        return <PathListScreen mode="area" domain={page.domain} backLabel={backLabel} onBack={pop} onOpenJourney={openJourney} onPreview={setPreviewId} />;
      case 'suggest':
        return (
          <PathListScreen
            mode="suggest"
            domain={page.domain}
            heading={page.heading}
            backLabel={backLabel}
            onBack={pop}
            onOpenJourney={openJourney}
            onPreview={setPreviewId}
            onOpenArea={(domain) => push({ name: 'area', domain })}
          />
        );
      case 'foundations':
        return <FoundationsHouseScreen backLabel={backLabel} onBack={pop} onOpenJourney={openJourney} onPreview={setPreviewId} />;
    }
  };

  const top = stack[stack.length - 1];

  return (
    <Screen padBottom={false}>
      {top ? (
        <Pushed key={stack.length}>{renderPage(top)}</Pushed>
      ) : (
        <>
          <TopBar
            title={TITLES[tab]}
            eyebrow={tab === 'today' ? todayEyebrow() : undefined}
            actions={[{ key: 'settings', icon: 'sliders', label: 'Settings', onPress: () => setShowSettings(true) }]}
          />
          {tab === 'log' && <SubNav options={LOG_OPTIONS} value={logSub} onChange={(key) => setLogSub(key as LogSub)} />}
          {tab === 'you' && <SubNav options={YOU_OPTIONS} value={youSub} onChange={(key) => setYouSub(key as YouSub)} />}

          <View style={styles.content}>
            {tab === 'today' && (
              <TodayScreen
                onOpenPaths={() => { goTab('you'); setYouSub('paths'); }}
                onOpenPathDetail={openJourney}
                onOpenFoundationDetail={(foundationId) => openJourney(foundationJourneyId(foundationId))}
                onOpenSleep={() => { goTab('log'); setLogSub('sleep'); }}
                onOpenHabits={() => { goTab('log'); setLogSub('habits'); }}
              />
            )}
            {tab === 'log' && logSub === 'sleep' && <LogSleepScreen />}
            {tab === 'log' && logSub === 'habits' && <HabitsScreen />}
            {tab === 'you' && youSub === 'progress' && (
              <ProgressScreen
                onOpenSleep={() => { goTab('log'); setLogSub('sleep'); }}
                onOpenHabits={() => { goTab('log'); setLogSub('habits'); }}
                onOpenPaths={() => setYouSub('paths')}
              />
            )}
            {tab === 'you' && youSub === 'paths' && (
              <PathsHomeScreen
                onOpenJourney={openJourney}
                onOpenChoice={openChoice}
                onOpenAreas={() => push({ name: 'areas' })}
                onOpenFoundations={() => push({ name: 'foundations' })}
              />
            )}
          </View>
        </>
      )}

      <TabBar tabs={TABS} value={tab} onChange={(key) => goTab(key as TabKey)} />

      <JourneyPreviewSheet
        journeyId={previewId}
        onClose={() => setPreviewId(null)}
        onOpenFull={(id) => { setPreviewId(null); openJourney(id); }}
      />

      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <SettingsScreen onClose={() => setShowSettings(false)} />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, backgroundColor: colors.canvas },
});
