import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";

import { ProductivityInsight, productivityInsight } from "../api/agents";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Productivity Insights screen - spec §8 Productivity Agent.
 *
 * Cards completed/created + active habit check-in coverage in a window,
 * plus a short reflection from the local model (or stats-only fallback).
 */

const WINDOWS: { value: number; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

export function ProductivityInsightsScreen() {
  const [days, setDays] = useState(14);
  const [result, setResult] = useState<ProductivityInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (d: number) => {
    setDays(d);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await productivityInsight(DEV_USER_ID, d);
      setResult(r);
      if (r.error) setError(r.error);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.windowRow}>
        {WINDOWS.map((w) => (
          <Pressable
            key={w.value}
            style={[styles.pill, days === w.value && styles.pillOn]}
            onPress={() => run(w.value)}
            disabled={loading}
          >
            <Text
              style={[styles.pillText, days === w.value && styles.pillTextOn]}
            >
              {w.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {result ? (
        <>
          <View style={styles.statsBox}>
            <Stat label="Completed" value={String(result.stats.cards_completed)} />
            <Stat label="Created" value={String(result.stats.cards_created)} />
            <Stat
              label="In progress"
              value={String(result.stats.cards_in_progress)}
            />
          </View>
          <View style={styles.statsBox}>
            <Stat
              label="Completion rate"
              value={`${Math.round(result.stats.completion_rate * 100)}%`}
            />
            <Stat
              label="Avg days to done"
              value={
                result.stats.avg_days_to_complete == null
                  ? "—"
                  : result.stats.avg_days_to_complete.toFixed(1)
              }
            />
          </View>

          <View style={styles.chartBox}>
            <Text style={styles.sectionLabel}>Cards overview</Text>
            <BarChart
              data={[
                { value: result.stats.cards_created, label: "Created", frontColor: colors.primary },
                { value: result.stats.cards_completed, label: "Done", frontColor: "#22c55e" },
                { value: result.stats.cards_in_progress, label: "Active", frontColor: "#f59e0b" },
              ]}
              barWidth={36}
              spacing={20}
              noOfSections={4}
              barBorderRadius={4}
              xAxisColor={colors.border}
              yAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11 }}
              height={100}
              isAnimated
            />
          </View>

          {result.stats.habits.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Habits</Text>
              {result.stats.habits.map((h) => {
                const pct = h.target_days
                  ? Math.min(1, h.logged_days / h.target_days)
                  : 0;
                return (
                  <View key={h.habit_id} style={styles.habitRow}>
                    <View style={styles.habitHeader}>
                      <Text style={styles.habitTitle}>{h.title}</Text>
                      <Text style={styles.habitCount}>
                        {h.logged_days}/{h.target_days}
                      </Text>
                    </View>
                    <View style={styles.barBg}>
                      <View
                        style={[styles.barFill, { width: `${pct * 100}%` }]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Summary {result.used_ai ? "" : "(stats-only fallback)"}
            </Text>
            <Text style={styles.summary}>{result.summary}</Text>
          </View>

          {result.patterns.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Patterns</Text>
              {result.patterns.map((p, i) => (
                <Text key={i} style={styles.bullet}>• {p}</Text>
              ))}
            </View>
          ) : null}

          {result.suggestions.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Suggestions</Text>
              {result.suggestions.map((p, i) => (
                <Text key={i} style={styles.bullet}>• {p}</Text>
              ))}
            </View>
          ) : null}
        </>
      ) : !loading ? (
        <Text style={styles.empty}>
          Pick a window to ask the Productivity Agent for a reflection.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  windowRow: { flexDirection: "row", gap: spacing.sm },
  pill: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 18,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textMuted, fontWeight: "600" },
  pillTextOn: { color: "#fff" },
  error: { color: colors.danger, textAlign: "center" },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    padding: spacing.xl,
  },
  statsBox: { flexDirection: "row", gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    alignItems: "center",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  statValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  chartBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    alignItems: "center",
  },
  section: { gap: spacing.xs, marginTop: spacing.sm },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  habitRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.xs,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  habitTitle: { color: colors.text, fontWeight: "600" },
  habitCount: { color: colors.textMuted, fontSize: 12 },
  barBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  barFill: { height: 4, backgroundColor: colors.primary },
  summary: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bullet: { color: colors.text, fontSize: 13, lineHeight: 19 },
});
