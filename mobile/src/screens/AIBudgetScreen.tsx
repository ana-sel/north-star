import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { AgentBudgetRow, BudgetReport, getBudgetReport } from "../api/audit";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * AI Budget Dashboard — spec §13 nice-to-have.
 *
 * Shows global daily + monthly limits vs current spend, and a
 * per-agent breakdown. Bars turn amber at 70% and red at 100% of limit.
 */
export function AIBudgetScreen() {
  const [report, setReport] = useState<BudgetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const r = await getBudgetReport(DEV_USER_ID);
      setReport(r);
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
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load(false);
          }}
        />
      }
    >
      <Text style={styles.h1}>AI spend</Text>
      <Text style={styles.muted}>
        Only external (paid) AI calls count toward these budgets. Local
        Ollama is free.
      </Text>

      <BudgetCard
        title="Global · today"
        limit={report.global_daily_limit_gbp}
        spend={report.global_daily_spend_gbp}
      />
      <BudgetCard
        title="Global · this month"
        limit={report.global_monthly_limit_gbp}
        spend={report.global_monthly_spend_gbp}
      />

      <Text style={[styles.h2, { marginTop: spacing.xl }]}>By agent</Text>
      {report.by_agent.length === 0 ? (
        <Text style={styles.muted}>No agent policies configured yet.</Text>
      ) : (
        report.by_agent.map((row) => <AgentRow key={row.agent_id} row={row} />)
      )}
    </ScrollView>
  );
}

function BudgetCard({
  title,
  limit,
  spend,
}: {
  title: string;
  limit: string;
  spend: string;
}) {
  const limitNum = Number(limit);
  const spendNum = Number(spend);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.amounts}>
        £{spendNum.toFixed(2)}{" "}
        <Text style={styles.muted}>of £{limitNum.toFixed(2)}</Text>
      </Text>
      <ProgressBar limit={limitNum} spend={spendNum} />
    </View>
  );
}

function AgentRow({ row }: { row: AgentBudgetRow }) {
  const dailyLimit = row.daily_limit_gbp ? Number(row.daily_limit_gbp) : null;
  const monthlyLimit = row.monthly_limit_gbp
    ? Number(row.monthly_limit_gbp)
    : null;
  const dailySpend = Number(row.daily_spend_gbp);
  const monthlySpend = Number(row.monthly_spend_gbp);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{row.display_name}</Text>
      <Text style={styles.muted}>{row.agent_id}</Text>

      <View style={styles.rowSplit}>
        <View style={{ flex: 1 }}>
          <Text style={styles.smallLabel}>Today</Text>
          <Text style={styles.amountsSmall}>
            £{dailySpend.toFixed(2)}
            {dailyLimit !== null && (
              <Text style={styles.muted}> / £{dailyLimit.toFixed(2)}</Text>
            )}
          </Text>
          {dailyLimit !== null && (
            <ProgressBar limit={dailyLimit} spend={dailySpend} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: spacing.lg }}>
          <Text style={styles.smallLabel}>This month</Text>
          <Text style={styles.amountsSmall}>
            £{monthlySpend.toFixed(2)}
            {monthlyLimit !== null && (
              <Text style={styles.muted}> / £{monthlyLimit.toFixed(2)}</Text>
            )}
          </Text>
          {monthlyLimit !== null && (
            <ProgressBar limit={monthlyLimit} spend={monthlySpend} />
          )}
        </View>
      </View>
    </View>
  );
}

function ProgressBar({ limit, spend }: { limit: number; spend: number }) {
  const pct = limit > 0 ? Math.min(1, spend / limit) : 0;
  const colour =
    pct >= 1 ? colors.danger : pct >= 0.7 ? colors.warning : colors.success;
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          { width: `${pct * 100}%`, backgroundColor: colour },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  h1: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  h2: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  muted: { color: colors.textMuted, fontSize: 13 },
  smallLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  amounts: {
    fontSize: 20,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  amountsSmall: { fontSize: 15, color: colors.text, marginBottom: spacing.xs },
  rowSplit: { flexDirection: "row", marginTop: spacing.sm },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.soft,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  error: { color: colors.danger, padding: spacing.lg, textAlign: "center" },
});
