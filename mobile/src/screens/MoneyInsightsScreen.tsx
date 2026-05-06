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

import { MoneyInsight, moneyInsight } from "../api/money";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Money Insights screen - spec §8 Money Agent.
 *
 * Local-only by policy. Pick a window, see totals + top categories +
 * a short reflection from the local model (or stats-only fallback).
 */

const WINDOWS: { value: number; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function MoneyInsightsScreen() {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState<MoneyInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (d: number) => {
    setDays(d);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await moneyInsight(DEV_USER_ID, d);
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
            <Stat label="Income" value={fmt(result.stats.income)} positive />
            <Stat label="Expenses" value={fmt(result.stats.expenses)} negative />
            <Stat
              label="Net"
              value={fmt(result.stats.net)}
              positive={result.stats.net >= 0}
              negative={result.stats.net < 0}
            />
          </View>

          <View style={styles.chartBox}>
            <BarChart
              data={[
                { value: Math.abs(result.stats.income), label: "In", frontColor: "#22c55e" },
                { value: Math.abs(result.stats.expenses), label: "Out", frontColor: "#ef4444" },
              ]}
              barWidth={44}
              spacing={32}
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

          <Text style={styles.subtle}>
            {result.stats.txn_count} transactions in window
          </Text>

          {result.stats.top_categories.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Top categories</Text>
              {result.stats.top_categories.map((c) => (
                <View key={c.category} style={styles.catRow}>
                  <Text style={styles.catName}>{c.category}</Text>
                  <Text
                    style={[
                      styles.catAmount,
                      c.total < 0 ? styles.neg : styles.pos,
                    ]}
                  >
                    {fmt(c.total)}{" "}
                    <Text style={styles.catCount}>· {c.count}</Text>
                  </Text>
                </View>
              ))}
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
          Pick a window to ask the Money Agent for a reflection.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}£${Math.abs(n).toFixed(2)}`;
}

function Stat({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          positive && styles.pos,
          negative && styles.neg,
        ]}
      >
        {value}
      </Text>
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
    borderRadius: 16,
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
  subtle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: -spacing.sm,
  },
  statsBox: { flexDirection: "row", gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: "center",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  pos: { color: colors.success },
  neg: { color: colors.danger },
  chartBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
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
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
  },
  catName: { color: colors.text, fontWeight: "600" },
  catAmount: { color: colors.text, fontVariant: ["tabular-nums"] },
  catCount: { color: colors.textMuted, fontSize: 11 },
  summary: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bullet: { color: colors.text, fontSize: 13, lineHeight: 19 },
});
