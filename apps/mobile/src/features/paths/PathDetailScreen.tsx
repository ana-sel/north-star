import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ACTIVE_JOURNEY_CAP,
  claimIntegrated,
  countReturns,
  getProgress,
  listActiveJourneys,
  logReturn,
  pauseJourney,
  recentReturns,
  REFLECTION_RETURNS,
  startPath,
} from '@data/paths';
import type { PathProgress } from '@data/paths';
import { DATA, DOMAINS, STAGES } from '@features/paths/pathsContent';
import { getDeviceTimezone, localDateISO } from '@lib/time';
import { colors, radii, spacing, typography } from '@styles/theme';
import { Button, Card, Icon } from '@ui';
import { stageInfoForReturns } from './pathsLogic';

interface PathDetailScreenProps {
  pathId: string;
  onClose: () => void;
}

export function PathDetailScreen({ pathId, onClose }: PathDetailScreenProps) {
  const [progress, setProgress] = useState<PathProgress | null>(null);
  const [returns, setReturns] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [lastReturnDate, setLastReturnDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const path = DATA[pathId];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextProgress, returnCount, activeJourneys, recent] = await Promise.all([
        getProgress(pathId),
        countReturns(pathId),
        listActiveJourneys(),
        recentReturns(pathId, 120),
      ]);
      setProgress(nextProgress);
      setReturns(returnCount);
      setActiveCount(activeJourneys.length);
      setLastReturnDate(recent[0]?.local_date ?? null);
    } finally {
      setLoading(false);
    }
  }, [pathId]);

  useEffect(() => {
    load();
  }, [load]);

  const stage = useMemo(() => stageInfoForReturns(returns), [returns]);

  if (!path) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.muted}>Path not found.</Text>
        <Button label="Back" onPress={onClose} fullWidth={false} />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const domain = DOMAINS[path.domain];
  const state = progress?.status ?? 'not-started';
  const isActive = state === 'active';
  const isResting = state === 'resting';
  const isIntegrated = state === 'integrated';
  const canClaim = isActive && stage.reflectionOpen;
  const canLogReturn = isActive;
  const canStart = state === 'not-started' || state === 'seeded' || state === 'resting';

  const handleStartOrResume = async () => {
    setBusy(true);
    try {
      await startPath(pathId);
      await load();
    } catch (error) {
      Alert.alert(
        'Active focus is full',
        error instanceof Error
          ? error.message
          : `You can walk up to ${ACTIVE_JOURNEY_CAP} journeys at once. Pause one and come back.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePause = async () => {
    if (!isActive) return;
    setBusy(true);
    try {
      await pauseJourney(pathId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleLogReturn = async () => {
    if (!progress || !isActive) return;
    setBusy(true);
    try {
      const logged = await logReturn(pathId, localDateISO(), getDeviceTimezone(), progress.current_camp);
      if (!logged) {
        Alert.alert('Already logged today', 'You already came back today. Nothing is lost.');
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = async () => {
    if (!canClaim) return;
    Alert.alert(
      'Claim Steady?',
      'This is self-claimed. If it feels true across real situations, you can claim it now.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Claim Steady',
          onPress: async () => {
            setBusy(true);
            try {
              await claimIntegrated(pathId);
              await load();
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.75}>
          <Icon name="chev" size={14} color={colors.inkMuted} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: firstBgColor(path.bg) }]}>
          <Text style={styles.heroType}>{path.domain} · Growth path</Text>
          <Text style={styles.heroTitle}>{path.quality}</Text>
          <Text style={styles.heroShows}>{path.shows}</Text>
          <Text style={styles.heroIdentity}>{path.identity.replace(/^"|"$/g, '')}</Text>

          <View style={styles.stateRow}>
            <View style={[styles.statePill, { borderColor: domain.colour }]}>
              <Text style={styles.statePillText}>{stateLabel(state)}</Text>
            </View>
            <Text style={styles.stateMeta}>{returns} returns</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Recent returns</Text>
        <Card tone="muted" style={styles.sectionCard}>
          <Text style={styles.bodyText}>Returns are deliberate check-ins, not daily streaks.</Text>
          <View style={styles.progressTrackLarge}>
            <View style={[styles.progressFillLarge, { width: `${Math.round(stage.totalProgress * 100)}%`, backgroundColor: domain.colour }]} />
          </View>
          <Text style={styles.metaText}>
            {stage.reflectionOpen
              ? 'Reflection is open. Claim Steady when it genuinely feels yours.'
              : `Camp ${stage.stage} · ${stage.stageLabel}${stage.nextThreshold ? ` · next gate at ${stage.nextThreshold}` : ''}`}
          </Text>
          <Text style={styles.metaText}>{lastReturnDate ? `Last return: ${formatDate(lastReturnDate)}` : 'No returns logged yet.'}</Text>
        </Card>

        <Text style={styles.sectionLabel}>The practice</Text>
        <Card tone="muted" style={styles.sectionCard}>
          <View style={styles.practiceHead}>
            <Text style={styles.practiceWhat}>{path.practice.what}</Text>
            <Text style={styles.practiceFreq}>{path.practice.freq}</Text>
          </View>
          <Text style={styles.subLabel}>Do this</Text>
          <Text style={styles.bodyText}>{stripHtml(path.practice.do)}</Text>
          <Text style={styles.countsText}>{stripHtml(path.practice.counts)}</Text>
          <View style={styles.ritualRow}>
            <Text style={styles.subLabel}>Habit tool</Text>
            <Text style={styles.metaText}>
              {path.ritual
                ? `${path.ritual.v} in Log · Habits`
                : 'None attached. This path stays situational.'}
            </Text>
          </View>
        </Card>

        <Text style={styles.sectionLabel}>The sentence</Text>
        <Card style={styles.voiceCard}>
          <Text style={styles.voiceLabel}>When it is tight</Text>
          <Text style={styles.voiceTextMuted}>{path.voice.tight}</Text>
          <View style={[styles.voiceAccent, { backgroundColor: domain.colour }]} />
          <Text style={styles.voiceLabel}>The one you are practising</Text>
          <Text style={styles.voiceText}>{path.voice.open}</Text>
        </Card>

        <Text style={styles.sectionLabel}>How it unfolds</Text>
        <Text style={styles.note}>Three camps. Returns open stages; dates do not.</Text>
        {path.camps.map((camp, index) => {
          const n = index + 1;
          const campState = campVisualState(n, stage.stage, isIntegrated);
          return (
            <View key={index} style={styles.campRow}>
              <View style={[styles.campDot, campState === 'done' && styles.campDotDone, campState === 'active' && styles.campDotActive]}>
                <Text style={[styles.campDotText, (campState === 'done' || campState === 'active') && styles.campDotTextOn]}>
                  {n}
                </Text>
              </View>
              <View style={styles.campBody}>
                <Text style={styles.campTitle}>Camp {n} · {STAGES[index]}</Text>
                <Text style={styles.metaText}>{camp.effort}</Text>
                {camp.layers.map((layer, layerIndex) => (
                  <Text key={layerIndex} style={styles.layerText}>• {layer.s}{layer.r}</Text>
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.actions}>
          {canLogReturn ? (
            <Button label="I came back" onPress={handleLogReturn} disabled={busy} />
          ) : null}

          {canStart ? (
            <Button
              label={isResting ? 'Resume this path' : 'Start this path'}
              onPress={handleStartOrResume}
              disabled={busy}
            />
          ) : null}

          {isActive ? (
            <Button label="Pause for now" variant="secondary" onPress={handlePause} disabled={busy} />
          ) : null}

          {canClaim ? (
            <Button label="Claim Steady" onPress={handleClaim} disabled={busy} />
          ) : null}

          {isActive && !canClaim ? (
            <Button
              label={`Reflection opens at ${REFLECTION_RETURNS} returns`}
              variant="ghost"
              onPress={() => {}}
              disabled
            />
          ) : null}

          {isIntegrated ? (
            <Card tone="muted" style={styles.steadyCard}>
              <Text style={styles.steadyText}>Steady is self-claimed and kept. Nothing to maintain daily.</Text>
            </Card>
          ) : null}

          <Text style={styles.metaText}>Active journeys right now: {activeCount} of {ACTIVE_JOURNEY_CAP}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function stateLabel(status: PathProgress['status'] | 'not-started'): string {
  if (status === 'active') return 'Practising';
  if (status === 'resting') return 'Resting';
  if (status === 'integrated') return 'Steady';
  if (status === 'seeded') return 'Saved';
  return 'Not started';
}

function campVisualState(index: number, currentStage: 1 | 2 | 3, integrated: boolean): 'done' | 'active' | 'locked' {
  if (integrated) return 'done';
  if (index < currentStage) return 'done';
  if (index === currentStage) return 'active';
  return 'locked';
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

function firstBgColor(bg: string): string {
  const match = bg.match(/(#[0-9A-Fa-f]{3,6}|rgba?\([^)]+\))/);
  return match ? match[0] : '#2d2b27';
}

function formatDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  centered: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  muted: { color: colors.inkMuted, fontSize: typography.sizes.md },

  topBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', padding: spacing.xs },
  backText: { color: colors.inkMuted, fontSize: typography.sizes.sm, fontWeight: '600' },

  content: { paddingBottom: spacing.xxxl },
  hero: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.xs },
  heroType: { fontSize: typography.sizes.xs, color: 'rgba(251,250,248,0.65)', fontWeight: '700', letterSpacing: 0.8 },
  heroTitle: { color: colors.onDark, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  heroShows: { color: 'rgba(251,250,248,0.88)', fontSize: typography.sizes.sm, lineHeight: 19 },
  heroIdentity: { color: 'rgba(251,250,248,0.72)', fontStyle: 'italic', fontSize: typography.sizes.sm, lineHeight: 19, marginTop: 2 },
  stateRow: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statePill: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  statePillText: { color: colors.onDark, fontWeight: '700', fontSize: typography.sizes.xs },
  stateMeta: { color: 'rgba(251,250,248,0.7)', fontWeight: '700', fontSize: typography.sizes.xs },

  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.lg,
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  sectionCard: { marginHorizontal: spacing.lg },
  bodyText: { fontSize: typography.sizes.sm, lineHeight: 20, color: colors.ink },
  metaText: { marginTop: 4, fontSize: typography.sizes.xs, color: colors.inkMuted, lineHeight: 18 },
  countsText: { marginTop: spacing.sm, fontSize: typography.sizes.sm, color: colors.inkMuted, lineHeight: 20, fontStyle: 'italic' },

  progressTrackLarge: {
    marginTop: spacing.sm,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFillLarge: { height: 6, borderRadius: radii.pill },

  practiceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  practiceWhat: { flex: 1, fontSize: typography.sizes.md, color: colors.ink, fontWeight: '800' },
  practiceFreq: { fontSize: typography.sizes.xs, color: colors.inkMuted, fontWeight: '700' },
  subLabel: { marginTop: spacing.sm, marginBottom: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.inkMuted, fontWeight: '700' },
  ritualRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },

  voiceCard: { marginHorizontal: spacing.lg, backgroundColor: colors.btn, borderColor: colors.btn },
  voiceLabel: { marginTop: spacing.xs, fontSize: typography.sizes.xs, color: 'rgba(251,250,248,0.6)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  voiceText: { marginTop: 6, marginBottom: spacing.sm, color: colors.onDark, fontSize: typography.sizes.sm, fontStyle: 'italic', lineHeight: 20 },
  voiceTextMuted: { marginTop: 6, marginBottom: spacing.sm, color: 'rgba(251,250,248,0.78)', fontSize: typography.sizes.sm, fontStyle: 'italic', lineHeight: 20 },
  voiceAccent: { height: 2, borderRadius: 2, opacity: 0.8, marginTop: 2, marginBottom: spacing.xs },

  note: { marginHorizontal: spacing.lg, fontSize: typography.sizes.xs, color: colors.inkMuted, lineHeight: 18 },
  campRow: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  campDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campDotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  campDotActive: { backgroundColor: colors.btn, borderColor: colors.btn },
  campDotText: { fontSize: typography.sizes.xs, color: colors.inkMuted, fontWeight: '800' },
  campDotTextOn: { color: colors.onDark },
  campBody: { flex: 1 },
  campTitle: { fontSize: typography.sizes.md, color: colors.ink, fontWeight: '700' },
  layerText: { fontSize: typography.sizes.xs, color: colors.inkMuted, lineHeight: 18, marginTop: 3 },

  actions: { marginTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.sm },
  steadyCard: { marginTop: spacing.xs },
  steadyText: { fontSize: typography.sizes.sm, color: colors.inkMuted, lineHeight: 20 },
});
