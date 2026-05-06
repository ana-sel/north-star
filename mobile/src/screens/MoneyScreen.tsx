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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  MoneySummary,
  MoneyTxn,
  createTransaction,
  deleteTransaction,
  listTransactions,
  moneySummary,
} from "../api/money";
import { DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";

/**
 * Money screen — spec §9.
 *
 * Quick entry (signed amount + optional category) + last-30-days
 * summary (income / expenses / net + by-category list).
 * All transactions are SENSITIVE — never leave the device automatically.
 */
export function MoneyScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
      const [s, t] = await Promise.all([
        moneySummary(DEV_USER_ID, 30),
        listTransactions(DEV_USER_ID, 30),
      ]);
      setSummary(s);
      setTxns(t);
    } catch (e: any) {
      Alert.alert("Load failed", e?.message ?? "Unknown error");
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
      await createTransaction({
        user_id: DEV_USER_ID,
        amount: raw,
        category: category.trim() || null,
        description: description.trim() || null,
      });
      setAmount("");
      setCategory("");
      setDescription("");
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
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction(txn.id);
            load();
          } catch (e: any) {
            Alert.alert("Delete failed", e?.message ?? "Unknown error");
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

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
      {summary ? (
        <View style={styles.summaryRow}>
          <Stat label="Income" value={summary.income} positive />
          <Stat label="Expenses" value={summary.expenses} negative />
          <Stat label="Net" value={summary.net} bold />
        </View>
      ) : null}

      <Pressable
        style={styles.insightsBtn}
        onPress={() => navigation.navigate("MoneyInsights")}
      >
        <Text style={styles.insightsText}>View insights →</Text>
      </Pressable>

      <View style={styles.composer}>
        <Text style={styles.heading}>Add transaction</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount (negative for expense, e.g. -12.50)"
          placeholderTextColor={colors.textMuted}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Category (groceries, rent, salary…)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Note (optional)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Pressable
          style={[styles.saveBtn, (!amount.trim() || saving) && styles.disabled]}
          disabled={!amount.trim() || saving}
          onPress={submit}
        >
          <Text style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
      </View>

      {summary && summary.by_category.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading}>By category (30 days)</Text>
          {summary.by_category.map((c) => (
            <View key={c.category} style={styles.catRow}>
              <Text style={styles.catName}>{c.category}</Text>
              <Text
                style={[
                  styles.catAmount,
                  Number(c.total) < 0 && styles.expenseText,
                ]}
              >
                {Number(c.total).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.heading}>Recent transactions</Text>
        {txns.length === 0 ? (
          <Text style={styles.empty}>No transactions in the last 30 days.</Text>
        ) : (
          txns.map((t) => (
            <Pressable
              key={t.id}
              style={styles.txnRow}
              onLongPress={() => confirmDelete(t)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.txnTitle}>
                  {t.category ?? "uncategorised"}
                </Text>
                <Text style={styles.txnMeta}>
                  {t.txn_date}
                  {t.description ? ` · ${t.description}` : ""}
                </Text>
              </View>
              <Text
                style={[
                  styles.txnAmount,
                  Number(t.amount) < 0 && styles.expenseText,
                ]}
              >
                {Number(t.amount).toFixed(2)} {t.currency}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  positive,
  negative,
  bold,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
}) {
  const n = Number(value);
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          bold && { fontWeight: "800" },
          positive && { color: "#3fb950" },
          negative && { color: colors.danger },
        ]}
      >
        {n.toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  summaryRow: { flexDirection: "row", gap: spacing.sm },
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
  statValue: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 4 },
  composer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heading: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  insightsBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
    alignItems: "center",
  },
  insightsText: { color: colors.primary, fontWeight: "600" },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 6,
    alignItems: "center",
  },
  disabled: { opacity: 0.4 },
  saveText: { color: "#fff", fontWeight: "700" },
  section: { gap: spacing.sm },
  catRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  catName: { color: colors.text, fontSize: 13 },
  catAmount: { color: colors.text, fontWeight: "600" },
  expenseText: { color: colors.danger },
  empty: { color: colors.textMuted, padding: spacing.md, textAlign: "center" },
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
    gap: spacing.md,
  },
  txnTitle: { color: colors.text, fontSize: 13, fontWeight: "600" },
  txnMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  txnAmount: { color: colors.text, fontWeight: "700" },
});
