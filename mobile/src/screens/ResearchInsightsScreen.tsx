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

import { ResearchInsight, researchInsight } from "../api/agents";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Research Insights screen - spec section 8 Research Agent.
 *
 * Cards with type=research. Default 30-day window.
 */

const WINDOWS: { value: number; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function ResearchInsightsScreen() {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState<ResearchInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (d: number) => {
    setDays(d);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await researchInsight(DEV_USER_ID, d);
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
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: spacing.lg }}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {result ? (
        <>
          <View style={styles.statsBox}>
            <Stat
              label="Research cards"
              value={String(result.stats.research_cards_total)}
            />
            <Stat
              label="Completed"
              value={String(result.stats.research_cards_completed)}
            />
            <Stat
              label="In progress"
              value={String(result.stats.research_cards_in_progress)}
            />
          </View>

          <View style={styles.chartBox}>
            <Text style={styles.sectionLabel}>Research cards</Text>
            <BarChart
              data={[
                { value: result.stats.research_cards_total, label: "Total", frontColor: colors.primary },
                { value: result.stats.research_cards_completed, label: "Done", frontColor: "#22c55e" },
                { value: result.stats.research_cards_in_progress, label: "Active", frontColor: "#f59e0b" },
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
                <Text key={i} style={styles.bullet}>
                  {"\u2022"} {p}
                </Text>
              ))}
            </View>
          ) : null}

          {result.suggestions.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Suggestions</Text>
              {result.suggestions.map((p, i) => (
                <Text key={i} style={styles.bullet}>
                  {"\u2022"} {p}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : !loading ? (
        <Text style={styles.empty}>
          Pick a window to ask the Research Agent for a reflection.
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
  summary: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bullet: { color: colors.text, fontSize: 14, paddingLeft: spacing.sm },
});
