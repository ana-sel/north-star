import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CardOut, listCards } from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing, PILLAR_COLOR } from "../theme";

const PILLARS = [
  { key: "health_energy", label: "Health & Energy", icon: "💚" },
  { key: "mind_healing", label: "Mind & Healing", icon: "💜" },
  { key: "money_freedom", label: "Money & Freedom", icon: "💙" },
  { key: "work_skills", label: "Work & Skills", icon: "🤎" },
  { key: "home_property", label: "Home & Property", icon: "🧡" },
  { key: "joy_culture", label: "Joy & Culture", icon: "🧡" },
  { key: "family", label: "Family", icon: "💗" },
  { key: "contribution", label: "Contribution", icon: "💚" },
] as const;

type PillarKey = (typeof PILLARS)[number]["key"];

interface PillarStat {
  total: number;
  active: number;
  done: number;
  avgMission: number;
}

export function CompassScreen() {
  const [stats, setStats] = useState<Record<string, PillarStat>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const cards = await listCards(DEV_USER_ID);
      const map: Record<string, PillarStat> = {};
      for (const p of PILLARS) {
        map[p.key] = { total: 0, active: 0, done: 0, avgMission: 0 };
      }
      for (const c of cards) {
        const area = c.life_area as PillarKey | null;
        if (!area || !map[area]) continue;
        map[area].total++;
        if (c.status === "done") map[area].done++;
        else map[area].active++;
        // Average mission total
        if (c.mission_scores && typeof c.mission_scores === "object") {
          const vals = Object.values(c.mission_scores).filter(
            (v): v is number => typeof v === "number"
          );
          if (vals.length > 0) {
            map[area].avgMission += vals.reduce((a, b) => a + b, 0);
          }
        }
      }
      // Finalise averages
      for (const p of PILLARS) {
        const s = map[p.key];
        if (s.total > 0) s.avgMission = Math.round(s.avgMission / s.total);
      }
      setStats(map);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxTotal = Math.max(1, ...Object.values(stats).map((s) => s.total));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.title}>Life Compass</Text>
      <Text style={styles.subtitle}>
        Where your attention is going — and where it's missing.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        PILLARS.map((p) => {
          const s = stats[p.key] || { total: 0, active: 0, done: 0, avgMission: 0 };
          const pct = Math.round((s.total / maxTotal) * 100);
          const pillarColor = PILLAR_COLOR[p.key] ?? colors.primary;
          const neglected = s.active === 0 && s.done === 0;

          return (
            <View key={p.key} style={styles.pillarRow}>
              <View style={styles.pillarHeader}>
                <Text style={styles.pillarIcon}>{p.icon}</Text>
                <Text style={styles.pillarLabel}>{p.label}</Text>
                {neglected && <Text style={styles.neglectedBadge}>neglected</Text>}
              </View>
              {/* Bar */}
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${pct}%`, backgroundColor: pillarColor },
                  ]}
                />
              </View>
              {/* Stats row */}
              <View style={styles.statsRow}>
                <Text style={styles.statText}>{s.active} active</Text>
                <Text style={styles.statText}>{s.done} done</Text>
                <Text style={styles.statText}>{s.total} total</Text>
                {s.avgMission > 0 && (
                  <Text style={styles.statText}>
                    mission avg {s.avgMission}/70
                  </Text>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },

  pillarRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.md,
    gap: 6,
  },
  pillarHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pillarIcon: { fontSize: 18 },
  pillarLabel: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  neglectedBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.danger,
    textTransform: "uppercase",
    backgroundColor: "#fce8e5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  barBg: {
    height: 8,
    backgroundColor: "#ece7de",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: 8, borderRadius: 4 },

  statsRow: { flexDirection: "row", gap: 12 },
  statText: { fontSize: 11, color: colors.textMuted },
});
