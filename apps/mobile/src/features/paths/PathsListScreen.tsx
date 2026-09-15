import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ACTIVE_JOURNEY_CAP, countReturns, listAllProgress, subscribeToJourneyChanges } from '@data/paths';
import type { PathProgress } from '@data/paths';
import { FOUNDATIONS, foundationForJourneyId, foundationJourneyId } from '@features/foundations/foundationsContent';
import { DATA, DOMAINS, V1_FEATURED_PATH_IDS } from '@features/paths/pathsContent';
import { colors, radii, spacing, typography } from '@styles/theme';
import { Card, EmptyState } from '@ui';
import { featuredBrowsePathIds, groupJourneysForDisplay, stageInfoForReturns } from './pathsLogic';

interface PathsListScreenProps {
  onOpenPathDetail: (pathId: string) => void;
  onOpenFoundationDetail: (foundationId: string) => void;
}

type DomainFilter = 'All' | 'Inward' | 'Together' | 'Craft' | 'Frontier';

const DOMAIN_ORDER: DomainFilter[] = ['Inward', 'Together', 'Craft', 'Frontier'];

export function PathsListScreen({ onOpenPathDetail, onOpenFoundationDetail }: PathsListScreenProps) {
  const [progressRows, setProgressRows] = useState<PathProgress[]>([]);
  const [returnCounts, setReturnCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [panel, setPanel] = useState<'walking' | 'browse'>('walking');
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('All');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const allProgress = await listAllProgress();
      setProgressRows(allProgress);

      const displayRows = allProgress.filter((row) => row.status === 'active' || row.status === 'resting');
      const counts = await Promise.all(
        displayRows.map(async (row) => [row.path_id, await countReturns(row.path_id)] as const),
      );

      const nextCounts: Record<string, number> = {};
      for (const [journeyId, count] of counts) nextCounts[journeyId] = count;
      setReturnCounts(nextCounts);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Detail modals mutate journeys over this still-mounted screen; refresh in place.
  useEffect(() => subscribeToJourneyChanges(() => load(true)), [load]);

  const grouped = useMemo(() => groupJourneysForDisplay(progressRows), [progressRows]);
  const pathStatusById = useMemo(() => {
    const map = new Map<string, PathProgress['status']>();
    for (const row of progressRows) {
      if (row.journey_type === 'path') map.set(row.path_id, row.status);
    }
    return map;
  }, [progressRows]);

  const foundationStatusById = useMemo(() => {
    const map = new Map<string, PathProgress['status']>();
    for (const row of progressRows) {
      if (row.journey_type === 'foundation') map.set(row.path_id, row.status);
    }
    return map;
  }, [progressRows]);

  const featuredBrowseIds = useMemo(
    () => featuredBrowsePathIds(V1_FEATURED_PATH_IDS, progressRows),
    [progressRows],
  );

  const filteredFeatured = useMemo(
    () => featuredBrowseIds.filter((pathId) => domainFilter === 'All' || DATA[pathId].domain === domainFilter),
    [domainFilter, featuredBrowseIds],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const activeCount = grouped.active.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, panel === 'walking' && styles.tabOn]}
          onPress={() => setPanel('walking')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, panel === 'walking' && styles.tabTextOn]}>Walking now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, panel === 'browse' && styles.tabOn]}
          onPress={() => setPanel('browse')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, panel === 'browse' && styles.tabTextOn]}>Browse</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {panel === 'walking' ? (
          <>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionHead}>Active journeys</Text>
              <Text style={styles.sectionMeta}>{activeCount} of {ACTIVE_JOURNEY_CAP}</Text>
            </View>
            <Text style={styles.sectionNote}>Paths and foundations share the same three active slots.</Text>

            {grouped.active.length === 0 ? (
              <EmptyState
                title="You are not walking anything yet"
                body="Start with one quality or one foundation. Nothing needs to be perfect."
                action={{ label: 'Browse journeys', onPress: () => setPanel('browse') }}
              />
            ) : (
              grouped.active.map((row) => (
                <JourneyCard
                  key={row.path_id}
                  journey={row}
                  returns={returnCounts[row.path_id] ?? 0}
                  onOpenPathDetail={onOpenPathDetail}
                  onOpenFoundationDetail={onOpenFoundationDetail}
                />
              ))
            )}

            {activeCount >= ACTIVE_JOURNEY_CAP ? (
              <Card tone="muted" style={styles.capacityCard}>
                <Text style={styles.capacityText}>Your focus is full right now. Pause one journey when you want to begin another.</Text>
              </Card>
            ) : null}

            {grouped.resting.length > 0 ? (
              <>
                <Text style={styles.sectionHead}>Resting journeys</Text>
                <Text style={styles.sectionNote}>Progress is kept. Resume whenever you have a free active slot.</Text>
                {grouped.resting.map((row) => (
                  <JourneyCard
                    key={row.path_id}
                    journey={row}
                    returns={returnCounts[row.path_id] ?? 0}
                    onOpenPathDetail={onOpenPathDetail}
                    onOpenFoundationDetail={onOpenFoundationDetail}
                  />
                ))}
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.sectionHead}>Featured growth paths</Text>
            <Text style={styles.sectionNote}>The V1 set keeps this focused: fourteen practical qualities.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['All', ...DOMAIN_ORDER] as DomainFilter[]).map((domain) => (
                <TouchableOpacity
                  key={domain}
                  style={[styles.filterChip, domainFilter === domain && styles.filterChipOn]}
                  onPress={() => setDomainFilter(domain)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterText, domainFilter === domain && styles.filterTextOn]}>{domain}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredFeatured.length === 0 ? (
              <Card tone="muted" style={styles.emptyBrowseCard}>
                <Text style={styles.emptyBrowseText}>No featured paths available in this filter right now.</Text>
              </Card>
            ) : (
              filteredFeatured.map((pathId) => {
                const path = DATA[pathId];
                const domain = DOMAINS[path.domain];
                const status = pathStatusById.get(pathId) ?? null;

                return (
                  <TouchableOpacity
                    key={pathId}
                    style={[styles.pathCard, { borderLeftColor: domain.colour }]}
                    onPress={() => onOpenPathDetail(pathId)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.pathCardHead}>
                      <View style={styles.pathDomainWrap}>
                        <View style={[styles.dot, { backgroundColor: domain.colour }]} />
                        <Text style={[styles.pathDomain, { color: domain.colour }]}>{path.domain}</Text>
                      </View>
                      {status === 'seeded' ? <Text style={styles.seedBadge}>Saved</Text> : null}
                    </View>
                    <Text style={styles.pathName}>{path.quality}</Text>
                    <Text style={styles.pathShows}>{path.shows}</Text>
                  </TouchableOpacity>
                );
              })
            )}

            <Text style={styles.sectionHead}>Foundations</Text>
            <Text style={styles.sectionNote}>Build the floor first, then grow qualities on top of it.</Text>

            {[1, 2, 3, 4, 5].map((tier) => {
              const items = FOUNDATIONS.filter((foundation) => foundation.tier === tier);
              if (!items.length) return null;

              return (
                <View key={tier} style={styles.tierBlock}>
                  <Text style={styles.tierLabel}>Tier {tier}</Text>
                  {items.map((foundation) => {
                    const journeyId = foundationJourneyId(foundation.id);
                    const status = foundationStatusById.get(journeyId) ?? null;

                    return (
                      <TouchableOpacity
                        key={foundation.id}
                        style={styles.foundationCard}
                        onPress={() => onOpenFoundationDetail(foundation.id)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.foundationCardHead}>
                          <Text style={styles.foundationTitle}>{foundation.title}</Text>
                          {status ? <FoundationStatus status={status} /> : null}
                        </View>
                        <Text style={styles.foundationSummary}>{foundation.summary}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function JourneyCard({
  journey,
  returns,
  onOpenPathDetail,
  onOpenFoundationDetail,
}: {
  journey: PathProgress;
  returns: number;
  onOpenPathDetail: (pathId: string) => void;
  onOpenFoundationDetail: (foundationId: string) => void;
}) {
  const stage = stageInfoForReturns(returns);

  if (journey.journey_type === 'path') {
    const path = DATA[journey.path_id];
    if (!path) return null;

    const domain = DOMAINS[path.domain];
    return (
      <TouchableOpacity
        style={[styles.journeyPathCard, { borderColor: domain.colour, backgroundColor: firstBgColor(path.bg) }]}
        onPress={() => onOpenPathDetail(journey.path_id)}
        activeOpacity={0.85}
      >
        <View style={styles.journeyHeadRow}>
          <View style={styles.typeChipRow}>
            <Text style={styles.typeChip}>Path</Text>
            <Text style={[styles.domainChip, { color: domain.colour }]}>{path.domain}</Text>
          </View>
          <Text style={styles.stateChip}>{journey.status === 'resting' ? 'Resting' : 'Active'}</Text>
        </View>

        <Text style={styles.journeyTitle}>{path.quality}</Text>
        <Text style={styles.journeyPractice}>{path.practice.what}</Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{stageSummary(stage.stage, stage.stageLabel)}</Text>
          <Text style={styles.progressText}>{returns} returns</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(stage.totalProgress * 100)}%`, backgroundColor: domain.colour }]} />
        </View>
      </TouchableOpacity>
    );
  }

  const foundation = foundationForJourneyId(journey.path_id);
  if (!foundation) return null;

  return (
    <TouchableOpacity
      style={styles.journeyFoundationCard}
      onPress={() => onOpenFoundationDetail(foundation.id)}
      activeOpacity={0.85}
    >
      <View style={styles.journeyHeadRow}>
        <View style={styles.typeChipRow}>
            <Text style={[styles.typeChip, styles.typeChipLight]}>Foundation</Text>
          <Text style={styles.tierChip}>Tier {foundation.tier}</Text>
        </View>
        <Text style={[styles.stateChip, styles.stateChipLight]}>{journey.status === 'resting' ? 'Resting' : 'Active'}</Text>
      </View>

      <Text style={styles.foundationJourneyTitle}>{foundation.title}</Text>
      <Text style={styles.journeyPracticeLight}>{foundation.practice}</Text>

      <View style={styles.progressRow}>
        <Text style={styles.progressTextLight}>{stageSummary(stage.stage, stage.stageLabel)}</Text>
        <Text style={styles.progressTextLight}>{returns} returns</Text>
      </View>
      <View style={styles.progressTrackLight}>
        <View style={[styles.progressFill, { width: `${Math.round(stage.totalProgress * 100)}%`, backgroundColor: colors.accent }]} />
      </View>
    </TouchableOpacity>
  );
}

function stageSummary(stage: 1 | 2 | 3, label: 'Watching' | 'Doing' | 'Under pressure'): string {
  return `Camp ${stage} · ${label}`;
}

function firstBgColor(bg: string): string {
  const match = bg.match(/(#[0-9A-Fa-f]{3,6}|rgba?\([^)]+\))/);
  return match ? match[0] : '#2d2b27';
}

function FoundationStatus({ status }: { status: PathProgress['status'] }) {
  if (status === 'active') return <Text style={styles.foundationStatusActive}>Active</Text>;
  if (status === 'resting') return <Text style={styles.foundationStatusResting}>Resting</Text>;
  if (status === 'integrated') return <Text style={styles.foundationStatusSteady}>Steady</Text>;
  if (status === 'seeded') return <Text style={styles.foundationStatusSeed}>Saved</Text>;
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },

  tabs: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 3,
    flexDirection: 'row',
    gap: 2,
  },
  tab: { flex: 1, borderRadius: 11, paddingVertical: spacing.sm, alignItems: 'center' },
  tabOn: { backgroundColor: colors.surface },
  tabText: { fontSize: typography.sizes.xs, fontWeight: '700', color: colors.inkMuted },
  tabTextOn: { color: colors.ink },

  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm },

  sectionHeadRow: { marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHead: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  sectionMeta: { fontSize: typography.sizes.xs, color: colors.inkMuted, fontWeight: '700' },
  sectionNote: { fontSize: typography.sizes.sm, color: colors.inkMuted, lineHeight: 18, marginBottom: spacing.xs },

  journeyPathCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    backgroundColor: '#2d2b27',
    padding: spacing.md,
    gap: spacing.xs,
  },
  journeyFoundationCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  journeyHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  typeChipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  typeChip: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.onDark,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
  },
  typeChipLight: {
    color: colors.ink,
    backgroundColor: colors.surfaceMuted,
  },
  domainChip: { fontSize: 10, fontWeight: '700' },
  tierChip: { fontSize: 10, fontWeight: '700', color: colors.inkMuted },
  stateChip: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onDark,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stateChipLight: {
    color: colors.inkMuted,
    backgroundColor: colors.surfaceMuted,
  },
  journeyTitle: { fontSize: typography.sizes.lg, fontWeight: '800', color: colors.onDark, letterSpacing: -0.2 },
  foundationJourneyTitle: { fontSize: typography.sizes.lg, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  journeyPractice: {
    fontSize: typography.sizes.sm,
    lineHeight: 19,
    color: 'rgba(251,250,248,0.8)',
  },
  journeyPracticeLight: {
    fontSize: typography.sizes.sm,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  progressText: { fontSize: typography.sizes.xs, color: 'rgba(251,250,248,0.66)', fontWeight: '700' },
  progressTextLight: { fontSize: typography.sizes.xs, color: colors.inkMuted, fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  progressTrackLight: { height: 4, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 999 },

  capacityCard: { marginTop: spacing.sm },
  capacityText: { color: colors.inkMuted, fontSize: typography.sizes.sm, lineHeight: 20 },

  filterRow: { gap: 6, paddingVertical: spacing.xs, marginBottom: spacing.sm },
  filterChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  filterChipOn: { backgroundColor: colors.btn, borderColor: colors.btn },
  filterText: { fontSize: typography.sizes.xs, color: colors.inkMuted, fontWeight: '700' },
  filterTextOn: { color: colors.onDark },

  emptyBrowseCard: { marginBottom: spacing.sm },
  emptyBrowseText: { fontSize: typography.sizes.sm, color: colors.inkMuted },

  pathCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  pathCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pathDomainWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pathDomain: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  seedBadge: { fontSize: 10, color: colors.inkMuted, fontWeight: '700' },
  pathName: { marginTop: 6, fontSize: typography.sizes.md, fontWeight: '800', color: colors.ink },
  pathShows: { marginTop: 4, fontSize: typography.sizes.sm, lineHeight: 19, color: colors.inkMuted },

  tierBlock: { marginTop: spacing.sm },
  tierLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  foundationCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  foundationCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  foundationTitle: { flex: 1, color: colors.ink, fontSize: typography.sizes.md, fontWeight: '800' },
  foundationSummary: { marginTop: 5, color: colors.inkMuted, fontSize: typography.sizes.sm, lineHeight: 19 },

  foundationStatusActive: { fontSize: 10, color: colors.accent, fontWeight: '800', textTransform: 'uppercase' },
  foundationStatusResting: { fontSize: 10, color: colors.steel, fontWeight: '800', textTransform: 'uppercase' },
  foundationStatusSteady: { fontSize: 10, color: colors.gold, fontWeight: '800', textTransform: 'uppercase' },
  foundationStatusSeed: { fontSize: 10, color: colors.inkMuted, fontWeight: '800', textTransform: 'uppercase' },
});
