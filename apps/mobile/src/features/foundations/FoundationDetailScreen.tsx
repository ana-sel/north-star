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
  REFLECTION_RETURNS,
  startJourney,
} from '@data/paths';
import type { PathProgress } from '@data/paths';
import { V1_HABIT_TEMPLATES } from '@features/habits/habitTemplates';
import { FOUNDATIONS, foundationJourneyId } from '@features/foundations/foundationsContent';
import { getDeviceTimezone, localDateISO } from '@lib/time';
import { colors, radii, spacing, typography } from '@styles/theme';
import { Button, Card, Icon } from '@ui';
import { stageInfoForReturns } from '@features/paths/pathsLogic';

interface FoundationDetailScreenProps {
  foundationId: string;
  onClose: () => void;
}

export function FoundationDetailScreen({ foundationId, onClose }: FoundationDetailScreenProps) {
  const foundation = FOUNDATIONS.find((item) => item.id === foundationId);
  const journeyId = foundationJourneyId(foundationId);

  const [progress, setProgress] = useState<PathProgress | null>(null);
  const [returns, setReturns] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextProgress, nextReturns, active] = await Promise.all([
        getProgress(journeyId),
        countReturns(journeyId),
        listActiveJourneys(),
      ]);
      setProgress(nextProgress);
      setReturns(nextReturns);
      setActiveCount(active.length);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    load();
  }, [load]);

  const stage = useMemo(() => stageInfoForReturns(returns), [returns]);

  if (!foundation) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.muted}>Foundation not found.</Text>
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

  const status = progress?.status ?? 'not-started';
  const isActive = status === 'active';
  const isResting = status === 'resting';
  const isIntegrated = status === 'integrated';
  const canStart = status === 'not-started' || status === 'seeded' || status === 'resting';
  const canClaim = isActive && stage.reflectionOpen;

  const linkedTemplates = V1_HABIT_TEMPLATES.filter((template) => foundation.habitTemplateIds.includes(template.id));

  const handleStartOrResume = async () => {
    setBusy(true);
    try {
      await startJourney(journeyId);
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
      await pauseJourney(journeyId);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleLogReturn = async () => {
    if (!progress || !isActive) return;
    setBusy(true);
    try {
      const logged = await logReturn(journeyId, localDateISO(), getDeviceTimezone(), progress.current_camp);
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
      'Integration is self-claimed. Claim only when this foundation truly feels lived.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Claim Steady',
          onPress: async () => {
            setBusy(true);
            try {
              await claimIntegrated(journeyId);
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
        <View style={styles.hero}>
          <Text style={styles.heroType}>Foundation · Tier {foundation.tier}</Text>
          <Text style={styles.heroTitle}>{foundation.title}</Text>
          <Text style={styles.heroSummary}>{foundation.summary}</Text>
          <View style={styles.statePill}>
            <Text style={styles.statePillText}>{stateLabel(status)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Purpose</Text>
        <Card tone="muted" style={styles.sectionCard}>
          <Text style={styles.bodyText}>{foundation.summary}</Text>
        </Card>

        <Text style={styles.sectionLabel}>Core practice</Text>
        <Card tone="muted" style={styles.sectionCard}>
          <Text style={styles.bodyText}>{foundation.practice}</Text>
          <Text style={styles.countsText}>It counts when: {foundation.countsWhen}</Text>
        </Card>

        <Text style={styles.sectionLabel}>Journey progression</Text>
        <Card tone="muted" style={styles.sectionCard}>
          <Text style={styles.bodyText}>Camp {stage.stage} · {stage.stageLabel}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(stage.totalProgress * 100)}%` }]} />
          </View>
          <Text style={styles.metaText}>
            {stage.reflectionOpen
              ? 'Reflection is open. Claim Steady if it feels true.'
              : stage.nextThreshold
                ? `Next gate at ${stage.nextThreshold} returns`
                : 'Keep returning gently.'}
          </Text>
          <Text style={styles.metaText}>{returns} returns logged.</Text>
        </Card>

        <Text style={styles.sectionLabel}>Optional tools</Text>
        <Card tone="muted" style={styles.sectionCard}>
          {foundation.tools && foundation.tools.length > 0 ? (
            foundation.tools.map((tool) => (
              <Text key={tool} style={styles.toolLine}>• {tool}</Text>
            ))
          ) : (
            <Text style={styles.metaText}>No specific tools listed for this foundation.</Text>
          )}
        </Card>

        <Text style={styles.sectionLabel}>Habit templates</Text>
        <Card tone="muted" style={styles.sectionCard}>
          {linkedTemplates.length === 0 ? (
            <Text style={styles.metaText}>No linked habit templates for this foundation.</Text>
          ) : (
            linkedTemplates.map((template) => (
              <View key={template.id} style={styles.templateRow}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateMeta}>{template.minimumVersion}</Text>
              </View>
            ))
          )}
          <Text style={styles.metaText}>These are available supports in Log · Habits. They are optional and do not consume journey slots.</Text>
        </Card>

        <View style={styles.actions}>
          {isActive ? <Button label="I came back" onPress={handleLogReturn} disabled={busy} /> : null}

          {canStart ? (
            <Button
              label={isResting ? 'Resume this foundation' : 'Start this foundation'}
              onPress={handleStartOrResume}
              disabled={busy}
            />
          ) : null}

          {isActive ? <Button label="Pause for now" variant="secondary" onPress={handlePause} disabled={busy} /> : null}

          {canClaim ? <Button label="Claim Steady" onPress={handleClaim} disabled={busy} /> : null}

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
              <Text style={styles.metaText}>Steady is self-claimed and permanent. No daily pressure.</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas, gap: spacing.sm },
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
  hero: {
    backgroundColor: colors.btn,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  heroType: { color: 'rgba(251,250,248,0.65)', fontSize: typography.sizes.xs, fontWeight: '700', letterSpacing: 0.8 },
  heroTitle: { marginTop: 4, color: colors.onDark, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  heroSummary: { marginTop: 6, color: 'rgba(251,250,248,0.86)', fontSize: typography.sizes.sm, lineHeight: 20 },
  statePill: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  statePillText: { color: colors.onDark, fontSize: typography.sizes.xs, fontWeight: '700' },

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
  bodyText: { color: colors.ink, fontSize: typography.sizes.sm, lineHeight: 20 },
  countsText: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: typography.sizes.sm, lineHeight: 20, fontStyle: 'italic' },
  metaText: { marginTop: 5, color: colors.inkMuted, fontSize: typography.sizes.xs, lineHeight: 18 },

  progressTrack: {
    marginTop: spacing.sm,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: radii.pill, backgroundColor: colors.accent },

  toolLine: { fontSize: typography.sizes.sm, color: colors.ink, lineHeight: 20, marginBottom: 2 },
  templateRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  templateName: { fontSize: typography.sizes.sm, color: colors.ink, fontWeight: '700' },
  templateMeta: { marginTop: 2, fontSize: typography.sizes.xs, color: colors.inkMuted, lineHeight: 18 },

  actions: { marginTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.sm },
  steadyCard: { marginTop: spacing.xs },
});
