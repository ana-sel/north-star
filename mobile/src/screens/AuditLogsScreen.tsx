import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import {
  AuditLogOut,
  AuditSummary,
  getAuditSummary,
  listAuditLogs,
} from "../api/audit";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Audit Logs screen — spec §7.8 transparency view.
 *
 * Shows summary stats (total calls, cost, local vs external) and
 * a scrollable list of recent AI audit records.
 */

export function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLogOut[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([
        getAuditSummary(DEV_USER_ID),
        listAuditLogs(DEV_USER_ID),
      ]);
      setSummary(s);
      setLogs(l);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary card */}
        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>AI Usage Summary</Text>
            <View style={styles.statsGrid}>
              <Stat label="Total requests" value={String(summary.total_requests)} />
              <Stat label="External" value={String(summary.external_calls)} />
              <Stat label="Local" value={String(summary.local_calls)} />
              <Stat label="Cost (£)" value={Number(summary.total_cost_gbp).toFixed(4)} />
            </View>
            <View style={styles.statsGrid}>
              <Stat label="Approvals needed" value={String(summary.approvals_required)} />
              <Stat label="Approved" value={String(summary.approvals_granted)} />
            </View>
            {Object.keys(summary.by_agent).length > 0 && (
              <View style={styles.agentBreakdown}>
                <Text style={styles.subLabel}>By agent</Text>
                <View style={styles.chipRow}>
                  {Object.entries(summary.by_agent).map(([agent, count]) => (
                    <View key={agent} style={styles.chip}>
                      <Text style={styles.chipText}>{agent}: {count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Log list */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {logs.length === 0 ? (
          <Text style={styles.empty}>No AI activity logged yet.</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logRow}>
              <View style={styles.logHeader}>
                <View style={[styles.badge, log.external_call ? styles.badgeExternal : styles.badgeLocal]}>
                  <Text style={styles.badgeText}>{log.external_call ? "external" : "local"}</Text>
                </View>
                <Text style={styles.logAgent}>{log.agent_id}</Text>
                <Text style={styles.logDate}>{formatDate(log.created_at)}</Text>
              </View>
              <View style={styles.logDetails}>
                <Text style={styles.logDetail}>{log.provider}/{log.model}</Text>
                <Text style={styles.logDetail}>{log.input_tokens + log.output_tokens} tokens</Text>
                {log.approval_required && (
                  <Text style={[styles.logDetail, { color: log.approved_by_user ? colors.success : colors.warning }]}>
                    {log.approved_by_user ? "✓ approved" : "⏳ pending"}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  error: { color: colors.danger, padding: spacing.md, textAlign: "center" },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  statsGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  subLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs },
  agentBreakdown: { marginTop: spacing.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    backgroundColor: colors.soft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipText: { fontSize: 11, color: colors.text, fontWeight: "500" },
  logRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  logHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeExternal: { backgroundColor: "#fde8e6" },
  badgeLocal: { backgroundColor: "#e6f4e6" },
  badgeText: { fontSize: 10, fontWeight: "700" },
  logAgent: { fontSize: 13, fontWeight: "600", color: colors.text, flex: 1 },
  logDate: { fontSize: 10, color: colors.textMuted },
  logDetails: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  logDetail: { fontSize: 11, color: colors.textMuted },
});
