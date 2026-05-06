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

import {
  HealthFieldStat,
  HealthInsight,
  healthInsight,
} from "../api/health";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Health Insights screen — spec §8 Health Agent.
 *
 * Local-only by policy. Window picker -> deterministic stats + a short
 * model-written reflection (or stats-only fallback if the model isn't
 * available or returns junk).
 */

const WINDOWS: { value: number; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

export function HealthInsightsScreen() {
  const [days, setDays] = useState(14);
  const [result, setResult] = useState<HealthInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (d: number) => {
    setDays(d);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await healthInsight(DEV_USER_ID, d);
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
            <StatBox label="Days logged" value={String(result.stats.days_covered)} />
            <StatBox label="Reports" value={String(result.stats.sample_count)} />
          </View>

          <FieldRow label="Sleep" stat={result.stats.sleep_minutes} unit="m" />
          <FieldRow label="Steps" stat={result.stats.steps} />
          <FieldRow label="Weight" stat={result.stats.weight_kg} unit="kg" />
          <FieldRow label="Mood" stat={result.stats.mood} suffix="/10" />
          <FieldRow label="Energy" stat={result.stats.energy} suffix="/10" />

          <View style={styles.chartBox}>
            <Text style={styles.sectionLabel}>Averages</Text>
            <BarChart
              data={[
                { value: result.stats.mood?.avg ?? 0, label: "Mood", frontColor: "#8b5cf6" },
                { value: result.stats.energy?.avg ?? 0, label: "Energy", frontColor: "#f59e0b" },
                { value: (result.stats.sleep_minutes?.avg ?? 0) / 60, label: "Sleep h", frontColor: colors.primary },
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
          Pick a window to ask the Health Agent for a reflection.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function FieldRow({
  label,
  stat,
  unit = "",
  suffix = "",
}: {
  label: string;
  stat: HealthFieldStat;
  unit?: string;
  suffix?: string;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {stat.count === 0 ? (
        <Text style={styles.fieldEmpty}>no data</Text>
      ) : (
        <Text style={styles.fieldValue}>
          n={stat.count} · avg {stat.avg}
          {unit}
          {suffix} · {stat.min}–{stat.max}
        </Text>
      )}
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
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
  },
  fieldLabel: { color: colors.text, fontWeight: "600" },
  fieldValue: { color: colors.text, fontSize: 12 },
  fieldEmpty: { color: colors.textMuted, fontSize: 12, fontStyle: "italic" },
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
  summary: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bullet: { color: colors.text, fontSize: 13, lineHeight: 19 },
});
