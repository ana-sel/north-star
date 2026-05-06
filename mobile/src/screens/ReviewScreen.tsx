import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  ReviewResponse,
  ReviewWindow,
  runReview,
} from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Review Agent screen — spec §8 MVP agent #5.
 *
 * Pick a window (Daily / Weekly), get a deterministic stat block plus
 * an AI-generated reflection (summary + wins + patterns + suggestions).
 * If the model is unavailable, falls back to stats-only summary.
 */
export function ReviewScreen() {
  const [window, setWindow] = useState<ReviewWindow>("daily");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(w: ReviewWindow) {
    setWindow(w);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await runReview(DEV_USER_ID, w);
      setResult(resp);
      if (resp.error) setError(resp.error);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.windowRow}>
        {(["daily", "weekly"] as const).map((w) => (
          <Pressable
            key={w}
            style={[styles.pill, window === w && styles.pillOn]}
            onPress={() => run(w)}
            disabled={loading}
          >
            <Text
              style={[
                styles.pillText,
                window === w && styles.pillTextOn,
              ]}
            >
              {w === "daily" ? "Today" : "This week"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Reviewing…</Text>
        </View>
      ) : null}

      {result ? (
        <>
          <View style={styles.statsBlock}>
            <Stat label="Completed" value={result.stats.completed} />
            <Stat label="Created" value={result.stats.created} />
            <Stat label="In progress" value={result.stats.in_progress} />
            <Stat label="Moves" value={result.stats.moved} />
          </View>

          <View style={styles.summaryBlock}>
            <Text style={styles.sectionLabel}>Summary</Text>
            <Text style={styles.summaryText}>{result.summary}</Text>
            {!result.used_ai ? (
              <Text style={styles.aiHint}>
                Stats-only fallback (model unavailable).
              </Text>
            ) : null}
          </View>

          <Section title="Wins" items={result.wins} />
          <Section title="Patterns" items={result.patterns} />
          <Section title="Suggestions" items={result.suggestions} />
        </>
      ) : null}

      {error && !result ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !result ? (
        <Pressable style={styles.runBtn} onPress={() => run(window)}>
          <Text style={styles.runBtnText}>Run review</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {items.map((s, i) => (
        <View key={`${title}-${i}`} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  windowRow: { flexDirection: "row", gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textMuted, fontWeight: "600" },
  pillTextOn: { color: "#fff" },
  loadingBlock: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  muted: { color: colors.textMuted, fontSize: 12 },
  statsBlock: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: { color: colors.primary, fontSize: 22, fontWeight: "700" },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  summaryBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  aiHint: { color: colors.textMuted, fontSize: 11, fontStyle: "italic" },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  bulletRow: { flexDirection: "row", gap: spacing.sm, paddingVertical: 2 },
  bullet: { color: colors.primary, fontWeight: "700" },
  bulletText: { color: colors.text, flex: 1, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, textAlign: "center" },
  runBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: "center",
  },
  runBtnText: { color: "#fff", fontWeight: "700" },
});
