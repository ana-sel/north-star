/**
 * PathsListScreen — browse + activate paths.
 * Two sections: "Walking now" (active) and "Browse" (everything else,
 * grouped by domain). Tapping a card opens Path Detail.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@styles/theme';
import { DATA, DOMAINS, INTEGRATED } from '@features/paths/pathsContent';
import type { PathQuality } from '@features/paths/pathsContent';
import { listAllProgress } from '@data/paths';
import type { PathProgress } from '@data/paths';

interface PathsListScreenProps {
  onOpenDetail: (pathId: string) => void;
}

const CAP = 3;

const DOMAIN_ORDER: Array<keyof typeof DOMAINS> = ['Inward', 'Together', 'Craft', 'Frontier'] as any;

export function PathsListScreen({ onOpenDetail }: PathsListScreenProps) {
  const [progress, setProgress] = useState<PathProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'walking' | 'browse'>('walking');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAllProgress();
      setProgress(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeIds = useMemo(
    () => progress.filter((p) => p.status === 'active').map((p) => p.path_id),
    [progress],
  );
  const seededIds = useMemo(
    () => progress.filter((p) => p.status === 'seeded').map((p) => p.path_id),
    [progress],
  );
  const integratedIds = useMemo(
    () => new Set([...INTEGRATED, ...progress.filter((p) => p.status === 'integrated').map((p) => p.path_id)]),
    [progress],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.olive} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Sub-tabs */}
      <View style={styles.subTabs}>
        <TouchableOpacity
          style={[styles.subTab, tab === 'walking' && styles.subTabOn]}
          onPress={() => setTab('walking')}
        >
          <Text style={[styles.subTabText, tab === 'walking' && styles.subTabTextOn]}>Walking now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, tab === 'browse' && styles.subTabOn]}
          onPress={() => setTab('browse')}
        >
          <Text style={[styles.subTabText, tab === 'browse' && styles.subTabTextOn]}>Browse</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tab === 'walking' ? (
          <WalkingNow
            activeIds={activeIds}
            seededIds={seededIds}
            integratedIds={integratedIds}
            onOpenDetail={onOpenDetail}
          />
        ) : (
          <Browse activeIds={new Set(activeIds)} integratedIds={integratedIds} onOpenDetail={onOpenDetail} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WalkingNow({
  activeIds,
  seededIds,
  integratedIds,
  onOpenDetail,
}: {
  activeIds: string[];
  seededIds: string[];
  integratedIds: Set<string>;
  onOpenDetail: (id: string) => void;
}) {
  return (
    <>
      <View style={styles.sectionHeadRow}>
        <Text style={styles.sectionHead}>Active paths</Text>
        <Text style={styles.sectionMeta}>
          {activeIds.length} of {CAP}
        </Text>
      </View>

      {activeIds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>You're not walking anything yet.</Text>
          <Text style={styles.emptyBody}>
            A path grows one quality — stillness, warmth, patience — across three camps.
          </Text>
        </View>
      ) : (
        activeIds.map((id) => (
          <ActivePathCard key={id} id={id} onPress={() => onOpenDetail(id)} />
        ))
      )}

      {integratedIds.size > 0 && (
        <>
          <Text style={styles.sectionHead}>Integrated</Text>
          <View style={styles.rowWrap}>
            {[...integratedIds].map((id) => {
              const p = DATA[id];
              if (!p) return null;
              return (
                <TouchableOpacity key={id} style={styles.integratedChip} onPress={() => onOpenDetail(id)}>
                  <Text style={styles.integratedText}>{p.quality}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {seededIds.length > 0 && (
        <>
          <Text style={styles.sectionHead}>Seeds</Text>
          <View style={styles.rowWrap}>
            {seededIds.map((id) => {
              const p = DATA[id];
              if (!p) return null;
              return (
                <TouchableOpacity key={id} style={styles.seedChip} onPress={() => onOpenDetail(id)}>
                  <Text style={styles.seedText}>{p.quality}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </>
  );
}

function ActivePathCard({ id, onPress }: { id: string; onPress: () => void }) {
  const p = DATA[id];
  if (!p) return null;
  return (
    <TouchableOpacity style={styles.apCard} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.apDomain}>{p.domain.toUpperCase()}</Text>
      <Text style={styles.apQuality}>{p.quality}</Text>
      <Text style={styles.apIdentity}>{p.identity.replace(/^"|"$/g, '')}</Text>
      <View style={styles.apRoute}>
        <View style={styles.apRouteBed} />
        <View style={[styles.apRouteWalked, { width: '33%' }]} />
      </View>
      <Text style={styles.apMeta}>Camp 1 · Watching</Text>
    </TouchableOpacity>
  );
}

function Browse({
  activeIds,
  integratedIds,
  onOpenDetail,
}: {
  activeIds: Set<string>;
  integratedIds: Set<string>;
  onOpenDetail: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'All' | keyof typeof DOMAINS>('All');

  const grouped = useMemo(() => {
    const byDom: Record<string, string[]> = {};
    for (const [id, p] of Object.entries(DATA) as Array<[string, PathQuality]>) {
      if (activeIds.has(id) || integratedIds.has(id)) continue;
      if (!byDom[p.domain]) byDom[p.domain] = [];
      byDom[p.domain].push(id);
    }
    return byDom;
  }, [activeIds, integratedIds]);

  const domainsToShow = filter === 'All' ? DOMAIN_ORDER : [filter as keyof typeof DOMAINS];

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {(['All', ...DOMAIN_ORDER] as const).map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, filter === d && styles.chipOn]}
            onPress={() => setFilter(d as 'All' | keyof typeof DOMAINS)}
          >
            <Text style={[styles.chipText, filter === d && styles.chipTextOn]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {domainsToShow.map((dom) => {
        const ids = grouped[dom] ?? [];
        if (!ids.length) return null;
        const domInfo = DOMAINS[dom];
        return (
          <View key={dom}>
            <Text style={[styles.sectionHead, { color: domInfo.colour }]}>{dom}</Text>
            {ids.map((id) => {
              const p = DATA[id];
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.browseCard, { borderLeftColor: domInfo.colour, borderLeftWidth: 4 }]}
                  onPress={() => onOpenDetail(id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.browseName}>{p.quality}</Text>
                  <Text style={styles.browseShows}>{p.shows}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  scrollContent: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
  subTabs: {
    flexDirection: 'row',
    margin: theme.spacing.lg,
    backgroundColor: theme.colors.greige,
    borderRadius: theme.radii.input,
    padding: 3,
    gap: 2,
  },
  subTab: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: 11 },
  subTabOn: { backgroundColor: theme.colors.card },
  subTabText: { fontSize: theme.typography.xs, fontWeight: '700', color: theme.colors.muted },
  subTabTextOn: { color: theme.colors.ink },
  sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHead: { fontSize: theme.typography.xs, fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: theme.spacing.sm },
  sectionMeta: { fontSize: theme.typography.xs, color: theme.colors.muted },
  emptyCard: { backgroundColor: theme.colors.card, borderRadius: theme.radii.card, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.line, gap: theme.spacing.xs },
  emptyTitle: { fontSize: theme.typography.md, fontWeight: '700', color: theme.colors.ink },
  emptyBody: { fontSize: theme.typography.sm, color: theme.colors.muted, lineHeight: 20 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  integratedChip: { backgroundColor: '#f4eee0', borderRadius: theme.radii.full, paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.md },
  integratedText: { fontSize: theme.typography.xs, fontWeight: '700', color: '#a8843f' },
  seedChip: { backgroundColor: theme.colors.greige, borderRadius: theme.radii.full, paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.line },
  seedText: { fontSize: theme.typography.xs, fontWeight: '600', color: theme.colors.muted },
  apCard: { backgroundColor: '#2d2b27', borderRadius: theme.radii.card, padding: theme.spacing.lg, gap: theme.spacing.sm },
  apDomain: { fontSize: 9, letterSpacing: 1, color: 'rgba(242,237,227,0.62)', fontWeight: '700' },
  apQuality: { fontSize: theme.typography.xl, fontWeight: '800', color: '#F2EDE3', letterSpacing: -0.5 },
  apIdentity: { fontSize: theme.typography.sm, fontStyle: 'italic', color: 'rgba(242,237,227,0.72)', lineHeight: 20 },
  apRoute: { height: 4, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 2, marginVertical: 4, overflow: 'hidden' },
  apRouteBed: { position: 'absolute', left: 0, right: 0, height: 4 },
  apRouteWalked: { height: 4, backgroundColor: '#9b8fd6' },
  apMeta: { fontSize: theme.typography.xs, color: 'rgba(242,237,227,0.66)' },
  browseCard: { backgroundColor: theme.colors.card, borderRadius: theme.radii.card, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.line, marginBottom: theme.spacing.xs },
  chipRow: { gap: 6, paddingVertical: 4, marginBottom: theme.spacing.xs },
  chip: {
    paddingHorizontal: theme.spacing.md, paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: 1, borderColor: theme.colors.line,
    backgroundColor: theme.colors.card,
  },
  chipOn: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  chipText: { fontSize: theme.typography.xs, fontWeight: '700', color: theme.colors.muted },
  chipTextOn: { color: theme.colors.card },
  browseName: { fontSize: theme.typography.md, fontWeight: '800', color: theme.colors.ink },
  browseShows: { fontSize: theme.typography.xs, color: theme.colors.muted, marginTop: 4, lineHeight: 18 },
});
