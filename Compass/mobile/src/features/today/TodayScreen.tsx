/**
 * TodayScreen (v1) — the anchor hero for today's practice.
 *
 * Layout mirrors the wireframe: domain·quality eyebrow → practice line
 * → voice → tick + return trail. A peek button on the right shows the
 * next eligible quality (never yesterday's), and dots below indicate
 * carousel position. Swipe left/right cycles too.
 *
 * Empty state: no active paths → CTA to Paths.
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
  PanResponder,
} from 'react-native';
import { theme } from '@styles/theme';
import { DATA } from '@features/paths/pathsContent';
import { getPref, setPref } from '@data/prefs';
import { listActivePaths, logReturn, recentReturns } from '@data/paths';
import type { PathProgress, PathReturn } from '@data/paths';
import { getDeviceTimezone, localDateISO } from '@lib/time';

interface TodayScreenProps {
  onOpenPaths: () => void;
  onOpenPathDetail: (pathId: string) => void;
}

const TRAIL_DAYS = 14;

async function getYesterdayPathId(): Promise<string | null> {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yStr = y.toISOString().slice(0, 10);
  return getPref<string | null>(`practicedOn:${yStr}`, null);
}

async function markPracticedToday(pathId: string): Promise<void> {
  await setPref(`practicedOn:${localDateISO()}`, pathId);
}

export function TodayScreen({ onOpenPaths, onOpenPathDetail }: TodayScreenProps) {
  const [active, setActive] = useState<PathProgress[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [yesterdayId, setYesterdayId] = useState<string | null>(null);
  const [returns, setReturns] = useState<PathReturn[]>([]);
  const [ticked, setTicked] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paths, yest] = await Promise.all([listActivePaths(), getYesterdayPathId()]);
      setActive(paths);
      setYesterdayId(yest);
      const eligible = paths.filter((p) => p.path_id !== yest);
      const first = eligible[0] ?? paths[0] ?? null;
      setCurrentId(first?.path_id ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh returns whenever the selected quality changes.
  useEffect(() => {
    if (!currentId) { setReturns([]); setTicked(false); return; }
    const today = localDateISO();
    recentReturns(currentId, TRAIL_DAYS).then((r) => {
      setReturns(r);
      setTicked(r.some((x) => x.local_date === today));
    });
  }, [currentId]);

  useEffect(() => { load(); }, [load]);

  const eligible = useMemo(
    () => active.filter((p) => p.path_id !== yesterdayId),
    [active, yesterdayId],
  );

  const currentIdx = currentId ? eligible.findIndex((p) => p.path_id === currentId) : -1;

  const cycleQuality = useCallback(
    (direction: 1 | -1) => {
      if (eligible.length < 2) return;
      const nextIdx = (currentIdx + direction + eligible.length) % eligible.length;
      setCurrentId(eligible[nextIdx].path_id);
    },
    [eligible, currentIdx],
  );

  const nextEligible = eligible.length > 1 ? eligible[(currentIdx + 1) % eligible.length] : null;

  const handleTick = useCallback(async () => {
    if (!currentId || ticked) return;
    const progress = active.find((p) => p.path_id === currentId);
    if (!progress) return;
    const done = await logReturn(currentId, localDateISO(), getDeviceTimezone(), progress.current_camp);
    if (done) {
      setTicked(true);
      const fresh = await recentReturns(currentId, TRAIL_DAYS);
      setReturns(fresh);
      await markPracticedToday(currentId);
    }
  }, [currentId, ticked, active]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_evt, gesture) => {
          if (Math.abs(gesture.dx) > 60) cycleQuality(gesture.dx < 0 ? 1 : -1);
        },
      }),
    [cycleQuality],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.olive} />
      </View>
    );
  }

  if (!currentId || active.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Nothing to practise yet</Text>
          <Text style={styles.emptyBody}>
            Compass grows one quality at a time. Pick a first path and today's
            practice will live here.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={onOpenPaths}>
            <Text style={styles.emptyBtnText}>Find a quality to grow</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const data = DATA[currentId];
  const shows = data.shows;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.stage}>
          <View style={styles.heroWrap} {...panResponder.panHandlers}>
            <View style={[styles.hero, ticked && styles.heroDone]}>
              <TouchableOpacity
                style={styles.eyebrow}
                onPress={() => onOpenPathDetail(currentId)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyebrowText}>
                  {data.domain.toUpperCase()} · {data.quality.toUpperCase()}
                </Text>
                <View style={styles.expand}>
                  <Text style={styles.expandChev}>›</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.practice}>{data.practice.what}</Text>

              <View style={styles.voice}>
                <Text style={styles.voiceText}>{data.voice.open}</Text>
              </View>

              <View style={styles.bottom}>
                <TouchableOpacity
                  style={[styles.tick, ticked && styles.tickDone]}
                  onPress={handleTick}
                  disabled={ticked}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tickIcon, ticked && styles.tickIconDone]}>✓</Text>
                </TouchableOpacity>
                <View style={styles.trail}>
                  <ReturnTrail returns={returns} tickedToday={ticked} />
                  <Text style={styles.freqText}>
                    {ticked ? shows : `${returns.length} return${returns.length === 1 ? '' : 's'} · 2 weeks`}
                  </Text>
                </View>
              </View>
            </View>

            {nextEligible && (
              <TouchableOpacity
                style={styles.peek}
                onPress={() => cycleQuality(1)}
                activeOpacity={0.85}
              >
                <Text style={styles.peekName}>{DATA[nextEligible.path_id].quality.toUpperCase()}</Text>
                <Text style={styles.peekChev}>›</Text>
              </TouchableOpacity>
            )}
          </View>

          {active.length > 1 && (
            <View style={styles.dots}>
              {active.map((p) => {
                const isCurrent = p.path_id === currentId;
                const isYesterday = p.path_id === yesterdayId;
                return (
                  <View
                    key={p.path_id}
                    style={[
                      styles.dot,
                      isCurrent && styles.dotOn,
                      isYesterday && styles.dotYesterday,
                    ]}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Return trail — one small dot per day within the 14-day window.
 * Days you returned are filled olive; today is a hollow marker.
 */
function ReturnTrail({ returns, tickedToday }: { returns: PathReturn[]; tickedToday: boolean }) {
  const today = localDateISO();
  const days: string[] = [];
  for (let i = TRAIL_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const returnSet = new Set(returns.map((r) => r.local_date));
  return (
    <View style={styles.dotsRow}>
      {days.map((d) => {
        const isToday = d === today;
        const isReturned = returnSet.has(d);
        if (isToday) {
          return (
            <View
              key={d}
              style={[styles.trailDot, styles.trailToday, tickedToday && styles.trailTodayDone]}
            />
          );
        }
        return (
          <View
            key={d}
            style={[styles.trailDot, isReturned ? styles.trailReturned : styles.trailBlank]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  scrollContent: { padding: theme.spacing.lg, gap: theme.spacing.md },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.md },
  emptyTitle: { fontSize: theme.typography.xl, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' },
  emptyBody: { fontSize: theme.typography.md, color: theme.colors.muted, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  emptyBtn: {
    marginTop: theme.spacing.md, backgroundColor: theme.colors.ink,
    borderRadius: theme.radii.full, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl,
  },
  emptyBtnText: { color: theme.colors.card, fontWeight: '700', fontSize: theme.typography.md },

  stage: { gap: theme.spacing.xs },
  heroWrap: { position: 'relative' },
  hero: {
    backgroundColor: '#2d2b27',
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginRight: 14,
  },
  heroDone: {
    // Warmer, not dimmer — completion is not deactivation.
    shadowColor: theme.colors.olive, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    borderWidth: 1.5, borderColor: theme.colors.olive,
  },
  eyebrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrowText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: 'rgba(241,237,230,0.62)' },
  expand: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center', justifyContent: 'center',
  },
  expandChev: { fontSize: 16, color: 'rgba(241,237,230,0.72)' },
  practice: { fontSize: 17, fontWeight: '700', color: '#F1EDE6', lineHeight: 24, letterSpacing: -0.2 },
  voice: { borderLeftWidth: 2, borderLeftColor: theme.colors.olive, paddingLeft: 13, paddingVertical: 2 },
  voiceText: { fontSize: theme.typography.sm, fontStyle: 'italic', color: 'rgba(241,237,230,0.86)', lineHeight: 22 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.sm },
  tick: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  tickDone: { backgroundColor: theme.colors.olive, borderColor: theme.colors.olive },
  tickIcon: { fontSize: 22, color: 'transparent', fontWeight: '700' },
  tickIconDone: { color: '#F1EDE6' },
  trail: { flex: 1, gap: 6 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 11 },
  trailDot: { width: 4, height: 4, borderRadius: 2 },
  trailReturned: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: theme.colors.olive },
  trailBlank: { backgroundColor: 'rgba(255,255,255,0.13)' },
  trailToday: {
    width: 9, height: 9, borderRadius: 4.5,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'transparent',
  },
  trailTodayDone: { backgroundColor: theme.colors.olive, borderColor: theme.colors.olive },
  freqText: { fontSize: theme.typography.xs, color: 'rgba(241,237,230,0.55)', lineHeight: 20 },

  peek: {
    position: 'absolute', top: 8, bottom: 8, right: 0, width: 26,
    backgroundColor: '#3d3a37',
    borderTopRightRadius: theme.radii.card, borderBottomRightRadius: theme.radii.card,
    alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8,
  },
  peekName: {
    fontSize: 9, letterSpacing: 1.4, fontWeight: '700',
    color: 'rgba(241,237,230,0.55)',
    transform: [{ rotate: '90deg' }],
    width: 120, textAlign: 'center',
  },
  peekChev: { fontSize: 14, color: 'rgba(241,237,230,0.7)' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4, marginBottom: theme.spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.line },
  dotOn: { width: 20, backgroundColor: theme.colors.olive },
  dotYesterday: { opacity: 0.35 },
});
