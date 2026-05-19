import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BarChart } from "react-native-gifted-charts";

import {
  MoneySummary,
  MoneyTxn,
  createTransaction,
  deleteTransaction,
  listTransactions,
  moneySummary,
} from "../api/money";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Money screen - matches design_habits_today.html "Money & Freedom Dashboard".
 * Shows: stat grid (monthly spend / AI budget / cash flow) + add form + insight + history.
 */
export function MoneyScreen() {
  const [summary, setSummary] = useState<MoneySummary | null>(null);
  const [txns, setTxns] = useState<MoneyTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [s, t] = await Promise.all([moneySummary(DEV_USER_ID, 30), listTransactions(DEV_USER_ID, 30)]);
      setSummary(s);
      setTxns(t);
    } catch (e: any) {
      Alert.alert("Load failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  async function submit() {
    const raw = amount.trim();
    if (!raw || saving) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n === 0) {
      Alert.alert("Invalid", "Enter a non-zero amount (negative for expenses).");
      return;
    }
    setSaving(true);
    try {
      await createTransaction({ user_id: DEV_USER_ID, amount: raw, category: category.trim() || null, description: description.trim() || null });
      setAmount(""); setCategory(""); setDescription("");
      load();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(txn: MoneyTxn) {
    Alert.alert("Delete?", `${txn.amount} ${txn.currency}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteTransaction(txn.id); load(); } catch (e: any) { Alert.alert("Delete failed", e?.message ?? "Unknown error"); }
      }},
    ]);
  }

  if (loading) {
    return (<View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>);
  }

  const expenses = summary ? Math.abs(Number(summary.expenses)).toFixed(0) : "--";
  const aiSpend = summary?.by_category.find(c => c.category === "ai_usage");
  const aiLabel = aiSpend ? `\u00a3${Math.abs(Number(aiSpend.total)).toFixed(2)}` : "\u00a30";
  const netOk = summary ? Number(summary.net) >= 0 : true;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Stat grid */}
      <View style={styles.statGrid}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Monthly spend</Text>
          <Text style={styles.statValue}>{"\u00a3"}{expenses}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>AI budget</Text>
          <Text style={styles.statValue}>{aiLabel} / {"\u00a3"}20</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Cash flow</Text>
          <Text style={[styles.statValue, netOk ? styles.ok : styles.warn]}>{netOk ? "OK" : "Low"}</Text>
        </View>
      </View>

      {/* Add transaction */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add transaction</Text>
        <TextInput value={amount} onChangeText={setAmount} placeholder="Amount (-12.50 for expense)" placeholderTextColor={colors.textMuted} keyboardType="numbers-and-punctuation" style={styles.input} />
        <TextInput value={category} onChangeText={setCategory} placeholder="Category (groceries, rent, salary...)" placeholderTextColor={colors.textMuted} style={styles.input} />
        <TextInput value={description} onChangeText={setDescription} placeholder="Note (optional)" placeholderTextColor={colors.textMuted} style={styles.input} />
        <Pressable style={[styles.saveBtn, (!amount.trim() || saving) && styles.disabled]} disabled={!amount.trim() || saving} onPress={submit}>
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </View>

      {/* Money Agent insight */}
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>Money Agent insight</Text>
        <Text style={styles.insightBody}>
          This purchase is affordable, but it delays your renovation buffer. Delay by one month if freedom is the priority.
        </Text>
      </View>

      {/* By category */}
      {summary && summary.by_category.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>By category (30 days)</Text>
          {(() => {
            const chartData = summary.by_category
              .filter(c => Number(c.total) < 0)
              .sort((a, b) => Number(a.total) - Number(b.total))
              .slice(0, 8)
              .map(c => ({
                value: Math.abs(Number(c.total)),
                label: (c.category ?? "??").slice(0, 8),
                frontColor: colors.primary,
              }));
            return chartData.length > 0 ? (
              <BarChart
                data={chartData}
                barWidth={28}
                spacing={14}
                barBorderRadius={6}
                noOfSections={4}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9, transform: [{ rotate: "-45deg" }] }}
                xAxisColor={colors.border}
                yAxisColor={colors.border}
                height={120}
                isAnimated
              />
            ) : null;
          })()}
          {summary.by_category.map((c) => (
            <View key={c.category} style={styles.catRow}>
              <Text style={styles.catName}>{c.category}</Text>
              <Text style={[styles.catAmount, Number(c.total) < 0 && styles.expenseText]}>{Number(c.total).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent transactions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent transactions</Text>
        {txns.length === 0 ? (
          <Text style={styles.muted}>No transactions in the last 30 days.</Text>
        ) : (
          txns.map((t) => (
            <Pressable key={t.id} style={styles.txnRow} onLongPress={() => confirmDelete(t)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnTitle}>{t.category ?? "uncategorised"}</Text>
                <Text style={styles.txnMeta}>{t.txn_date}{t.description ? ` \u00b7 ${t.description}` : ""}</Text>
              </View>
              <Text style={[styles.txnAmount, Number(t.amount) < 0 && styles.expenseText]}>{Number(t.amount).toFixed(2)} {t.currency}</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  statGrid: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, alignItems: "center" },
  statLabel: { fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "800" },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 7 },
  ok: { color: "#587c50" },
  warn: { color: colors.danger },

  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.lg, gap: spacing.sm },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  input: { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: spacing.md, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: 14, alignItems: "center" },
  disabled: { opacity: 0.4 },
  saveText: { color: "#fff", fontWeight: "700" },

  insightCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.lg },
  insightTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  insightBody: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },

  catRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fbf7f1", borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.md },
  catName: { fontSize: 13, color: colors.text },
  catAmount: { fontWeight: "600", color: colors.text },
  expenseText: { color: colors.danger },

  muted: { color: colors.textMuted, fontSize: 13 },
  txnRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fbf7f1", borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.md, gap: spacing.md },
  txnTitle: { fontSize: 13, fontWeight: "600", color: colors.text },
  txnMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txnAmount: { fontWeight: "700", color: colors.text },
});
