/**
 * PathDetailScreen — read-only view of a quality.
 * Called from Today and Paths list. Header · practice · sentence ·
 * meaning · camps. Start / Stop actions at the bottom.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '@styles/theme';
import {
  DATA,
  DOMAINS,
  STAGES,
  DOMAIN_AIM,
  AIM_NOTE,
  extraAims,
  INTEGRATED,
} from '@features/paths/pathsContent';
import { getProgress, startPath, seedPath, claimIntegrated } from '@data/paths';
import type { PathProgress } from '@data/paths';

interface PathDetailScreenProps {
  pathId: string;
  onClose: () => void;
}

export function PathDetailScreen({ pathId, onClose }: PathDetailScreenProps) {
  const [progress, setProgress] = useState<PathProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProgress(pathId);
      setProgress(p);
    } finally {
      setLoading(false);
    }
  }, [pathId]);

  useEffect(() => {
    load();
  }, [load]);

  const p = DATA[pathId];
  if (!p) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Path not found.</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.link}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dom = DOMAINS[p.domain];
  const state = progress?.status ?? (INTEGRATED.has(pathId) ? 'integrated' : null);
  const stateBadge =
    state === 'integrated' ? 'Integrated'
    : state === 'active' && progress ? `Practising · Camp ${progress.current_camp} of 3`
    : state === 'active' ? 'Practising'
    : state === 'seeded' ? 'Seed'
    : 'Not started';

  const handleStart = useCallback(async () => {
    setBusy(true);
    try {
      const next = await startPath(pathId);
      setProgress(next);
    } finally {
      setBusy(false);
    }
  }, [pathId]);

  const handleSeed = useCallback(async () => {
    setBusy(true);
    try {
      const next = await seedPath(pathId);
      setProgress(next);
    } finally {
      setBusy(false);
    }
  }, [pathId]);

  const handleClaim = useCallback(() => {
    Alert.alert(
      'Claim integrated?',
      'You keep this permanently. It stops appearing in Browse and joins the gold shelf.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim',
          onPress: async () => {
            setBusy(true);
            try {
              const next = await claimIntegrated(pathId);
              setProgress(next);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [pathId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.olive} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: firstBgColor(p.bg) }]}>
          <Text style={styles.eyebrow}>{p.domain.toUpperCase()} · {dom.q.toLowerCase()}</Text>
          <Text style={styles.name}>{p.quality}</Text>
          <Text style={styles.identity}>{p.identity}</Text>
          <View style={styles.tags}>
            <View style={styles.stateBadge}>
              <Text style={styles.stateBadgeText}>{stateBadge}</Text>
            </View>
            {p.values.map((v) => (
              <View key={v} style={styles.valueTag}>
                <Text style={styles.valueTagText}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Practice */}
        <Text style={styles.sect}>The practice</Text>
        <View style={styles.practiceCard}>
          <View style={styles.practiceHead}>
            <Text style={styles.practiceWhat}>{p.practice.what}</Text>
            <Text style={styles.practiceFreq}>{p.practice.freq}</Text>
          </View>
          <Text style={styles.subLbl}>Do this</Text>
          <Text style={styles.body}>{stripHtml(p.practice.do)}</Text>
          <Text style={styles.counts}>{stripHtml(p.practice.counts)}</Text>

          {p.ritual && (
            <View style={styles.ritualLine}>
              <Text style={styles.ritualKey}>RITUAL</Text>
              <Text style={styles.ritualVal}>{p.ritual.v} · in Log · Habits</Text>
            </View>
          )}
        </View>

        {/* Sentence */}
        <Text style={styles.sect}>The sentence</Text>
        <View style={styles.voiceCard}>
          <View style={styles.voiceRow}>
            <Text style={styles.voiceLbl}>WHEN IT'S TIGHT</Text>
            <Text style={styles.voiceTxt}>{p.voice.tight}</Text>
          </View>
          <View style={[styles.voiceRow, styles.voiceRowOpen, { borderLeftColor: dom.colour }]}>
            <Text style={styles.voiceLbl}>THE ONE YOU'RE PRACTISING</Text>
            <Text style={styles.voiceTxt}>{p.voice.open}</Text>
          </View>
        </View>

        {/* Meaning */}
        <Text style={styles.sect}>What this quality is</Text>
        <View style={styles.meaningCard}>
          <MeaningRow label="Where it helps">
            {p.situations && p.situations.length ? (
              p.situations.map((s, i) => (
                <Text key={i} style={styles.bulletLine}>· {s}</Text>
              ))
            ) : (
              <Text style={styles.body}>{p.shows}</Text>
            )}
          </MeaningRow>
          <MeaningRow label="What it buys you">
            <Text style={styles.body}>
              <Text style={styles.bold}>{DOMAIN_AIM[p.domain]}</Text> — {AIM_NOTE[DOMAIN_AIM[p.domain]]}
            </Text>
            {extraAims(pathId).map((a) => (
              <Text key={a} style={styles.body}>
                {'\n'}<Text style={styles.bold}>{a}</Text> — {AIM_NOTE[a]}
              </Text>
            ))}
          </MeaningRow>
          <MeaningRow label="Inner work">
            <Text style={styles.body}>{p.innerWork}</Text>
          </MeaningRow>
        </View>

        {/* Camps */}
        <Text style={styles.sect}>How it unfolds</Text>
        <Text style={styles.campsNote}>
          Three camps, {p.span} at this rhythm. There's no clock — camps open on returns, not dates.
        </Text>
        {p.camps.map((c, i) => (
          <View key={i} style={styles.campRow}>
            <View style={styles.campBadge}>
              <Text style={styles.campBadgeText}>{i + 1}</Text>
            </View>
            <View style={styles.campBody}>
              <Text style={styles.campName}>Camp {i + 1} · {STAGES[i]}</Text>
              <Text style={styles.campMeta}>{c.dur}</Text>
              {c.layers.map((l, k) => (
                <Text key={k} style={styles.campLayer}>· {l.s}{l.r}</Text>
              ))}
              <Text style={styles.effort}>{c.effort}</Text>
            </View>
          </View>
        ))}

        {/* Actions */}
        <View style={styles.actions}>
          {state !== 'active' && state !== 'integrated' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStart} disabled={busy}>
              <Text style={styles.primaryBtnText}>Start walking this path</Text>
            </TouchableOpacity>
          )}
          {state === 'active' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleClaim} disabled={busy}>
              <Text style={styles.primaryBtnText}>Claim as integrated</Text>
            </TouchableOpacity>
          )}
          {state !== 'seeded' && state !== 'active' && state !== 'integrated' && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSeed} disabled={busy}>
              <Text style={styles.secondaryBtnText}>Save as a seed instead</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MeaningRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.meaningRow}>
      <Text style={styles.meaningLbl}>{label}</Text>
      <View style={styles.meaningVal}>{children}</View>
    </View>
  );
}

/** Strip inline HTML tags the wireframe data uses (e.g. <b>). */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

/** Extract the first color from a `linear-gradient(...)` string. */
function firstBgColor(bg: string): string {
  const match = bg.match(/(#[0-9A-Fa-f]{3,6}|rgba?\([^)]+\))/);
  return match ? match[0] : '#2d2b27';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: theme.colors.muted, fontSize: theme.typography.md },
  link: { color: theme.colors.olive, fontWeight: '700' },
  scrollContent: { paddingBottom: theme.spacing.xxxl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  back: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  backText: { fontSize: theme.typography.md, fontWeight: '600', color: theme.colors.muted },
  hero: {
    backgroundColor: '#3a3850',
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  eyebrow: { fontSize: theme.typography.xs, letterSpacing: 1, color: 'rgba(242,237,227,0.4)', textTransform: 'uppercase', fontWeight: '600' },
  name: { fontSize: 22, fontWeight: '800', color: '#F2EDE3', letterSpacing: -0.5 },
  identity: { fontSize: theme.typography.sm, fontStyle: 'italic', color: 'rgba(242,237,227,0.72)', lineHeight: 20, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: theme.spacing.sm, alignItems: 'center' },
  stateBadge: { paddingHorizontal: theme.spacing.md, paddingVertical: 3, borderRadius: theme.radii.full, backgroundColor: 'rgba(255,255,255,0.18)' },
  stateBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  valueTag: { paddingHorizontal: theme.spacing.md, paddingVertical: 3, borderRadius: theme.radii.full, backgroundColor: 'rgba(255,255,255,0.12)' },
  valueTagText: { color: '#F2EDE3', fontSize: 11, fontWeight: '600' },
  sect: {
    fontSize: theme.typography.xs, fontWeight: '700', color: theme.colors.muted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
  },
  practiceCard: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.greige, borderRadius: theme.radii.card, padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  practiceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  practiceWhat: { flex: 1, fontSize: theme.typography.md, fontWeight: '800', color: theme.colors.ink, letterSpacing: -0.2 },
  practiceFreq: { fontSize: theme.typography.xs, fontWeight: '700', color: theme.colors.muted, marginLeft: theme.spacing.sm },
  subLbl: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '700', color: theme.colors.muted, marginTop: 4 },
  body: { fontSize: theme.typography.sm, color: theme.colors.ink, lineHeight: 22 },
  counts: { fontSize: theme.typography.sm, color: theme.colors.muted, lineHeight: 22, fontStyle: 'italic' },
  ritualLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: theme.spacing.xs, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.line },
  ritualKey: { fontSize: 9, letterSpacing: 1.3, fontWeight: '700', color: theme.colors.muted },
  ritualVal: { fontSize: theme.typography.sm, color: theme.colors.ink },
  voiceCard: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.ink, borderRadius: theme.radii.card,
    paddingHorizontal: theme.spacing.md,
  },
  voiceRow: { paddingVertical: theme.spacing.md },
  voiceRowOpen: { borderLeftWidth: 3, paddingLeft: 12, marginLeft: -theme.spacing.md, paddingRight: 0, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  voiceLbl: { fontSize: 10, letterSpacing: 1, fontWeight: '700', color: 'rgba(242,237,227,0.55)', marginBottom: 6 },
  voiceTxt: { fontSize: theme.typography.sm, color: '#F2EDE3', lineHeight: 22, fontStyle: 'italic' },
  meaningCard: { marginHorizontal: theme.spacing.lg, gap: theme.spacing.sm },
  meaningRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  meaningLbl: { width: 90, fontSize: theme.typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.colors.muted, paddingTop: 2 },
  meaningVal: { flex: 1 },
  bulletLine: { fontSize: theme.typography.sm, color: theme.colors.ink, lineHeight: 22, marginBottom: 2 },
  bold: { fontWeight: '700' },
  campsNote: { fontSize: theme.typography.xs, color: theme.colors.muted, lineHeight: 20, marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  campRow: { flexDirection: 'row', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  campBadge: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' },
  campBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.muted },
  campBody: { flex: 1, gap: 2 },
  campName: { fontSize: theme.typography.md, fontWeight: '700', color: theme.colors.ink },
  campMeta: { fontSize: theme.typography.xs, color: theme.colors.muted, marginBottom: 4 },
  campLayer: { fontSize: theme.typography.xs, color: theme.colors.muted, lineHeight: 18 },
  effort: { fontSize: theme.typography.xs, color: theme.colors.muted, marginTop: 4, alignSelf: 'flex-start', backgroundColor: theme.colors.greige, paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radii.full },
  actions: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  primaryBtn: { backgroundColor: theme.colors.ink, borderRadius: theme.radii.full, paddingVertical: theme.spacing.md, alignItems: 'center' },
  primaryBtnText: { color: theme.colors.card, fontWeight: '700', fontSize: theme.typography.md },
  secondaryBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.line, borderRadius: theme.radii.full, paddingVertical: theme.spacing.md, alignItems: 'center' },
  secondaryBtnText: { color: theme.colors.muted, fontWeight: '600', fontSize: theme.typography.md },
});
