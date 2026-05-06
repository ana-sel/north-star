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
  HealthLog,
  HealthLogUpsert,
  healthToday,
  listHealth,
  upsertHealth,
} from "../api/health";
import { DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";

/**
 * Health screen — spec §9.
 *
 * Single row per day for sleep / weight / calories / steps / mood.
 * Privacy level is always SENSITIVE — never leaves the device through
 * the gateway without explicit approval.
 */

interface FieldDef {
  key: keyof Pick<
    HealthLog,
    "sleep_minutes" | "weight_kg" | "calories" | "protein_g" | "steps" | "energy" | "mood"
  >;
  label: string;
  placeholder: string;
  step: 0.1 | 1;
  min?: number;
  max?: number;
}

const FIELDS: FieldDef[] = [
  { key: "sleep_minutes", label: "Sleep (min)", placeholder: "420", step: 1 },
  { key: "weight_kg", label: "Weight (kg)", placeholder: "72.5", step: 0.1 },
  { key: "calories", label: "Calories", placeholder: "1800", step: 1 },
  { key: "protein_g", label: "Protein (g)", placeholder: "120", step: 1 },
  { key: "steps", label: "Steps", placeholder: "8000", step: 1 },
  { key: "energy", label: "Energy 1–10", placeholder: "7", step: 1, min: 1, max: 10 },
  { key: "mood", label: "Mood 1–10", placeholder: "7", step: 1, min: 1, max: 10 },
];

export function HealthScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [today, setToday] = useState<HealthLog | null>(null);
  const [recent, setRecent] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [t, r] = await Promise.all([
        healthToday(DEV_USER_ID),
        listHealth(DEV_USER_ID, 14),
      ]);
      setToday(t);
      setRecent(r);
      // Hydrate draft from today's row so the user sees existing values
      // when reopening the screen mid-day.
      const next: Record<string, string> = {};
      if (t) {
        for (const f of FIELDS) {
          const v = t[f.key];
          if (v !== null && v !== undefined) next[f.key] = String(v);
        }
      }
      setDraft(next);
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

  async function saveField(field: FieldDef) {
    const raw = draft[field.key]?.trim();
    if (!raw) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      Alert.alert("Invalid", `${field.label}: enter a number.`);
      return;
    }
    if (field.min !== undefined && n < field.min) {
      Alert.alert("Out of range", `Must be ≥ ${field.min}.`);
      return;
    }
    if (field.max !== undefined && n > field.max) {
      Alert.alert("Out of range", `Must be ≤ ${field.max}.`);
      return;
    }
    const payload: HealthLogUpsert = {
      user_id: DEV_USER_ID,
      [field.key]: n,
    };
    try {
      await upsertHealth(payload);
      load();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
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
      <Text style={styles.heading}>Today</Text>
      <Text style={styles.note}>
        Health stays private. Save each field with its own button — you can
        come back through the day.
      </Text>

      <Pressable
        style={styles.insightsBtn}
        onPress={() => navigation.navigate("HealthInsights")}
      >
        <Text style={styles.insightsText}>View insights →</Text>
      </Pressable>

      {FIELDS.map((f) => {
        const current = today ? today[f.key] : null;
        return (
          <View key={f.key} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={draft[f.key] ?? ""}
                onChangeText={(t) =>
                  setDraft((d) => ({ ...d, [f.key]: t }))
                }
                placeholder={f.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={styles.input}
              />
              <Pressable style={styles.saveBtn} onPress={() => saveField(f)}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
            {current !== null && current !== undefined ? (
              <Text style={styles.fieldHint}>Saved today: {String(current)}</Text>
            ) : null}
          </View>
        );
      })}

      <Text style={[styles.heading, { marginTop: spacing.lg }]}>
        Last 14 days
      </Text>
      {recent.length === 0 ? (
        <Text style={styles.note}>No history yet.</Text>
      ) : (
        recent.map((r) => (
          <View key={r.id} style={styles.historyRow}>
            <Text style={styles.historyDate}>{r.log_date}</Text>
            <Text style={styles.historyLine}>
              {summarise(r)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function summarise(r: HealthLog): string {
  const parts: string[] = [];
  if (r.sleep_minutes != null)
    parts.push(`sleep ${(r.sleep_minutes / 60).toFixed(1)}h`);
  if (r.weight_kg != null) parts.push(`${r.weight_kg}kg`);
  if (r.calories != null) parts.push(`${r.calories}kcal`);
  if (r.steps != null) parts.push(`${r.steps} steps`);
  if (r.energy != null) parts.push(`E${r.energy}`);
  if (r.mood != null) parts.push(`M${r.mood}`);
  return parts.length ? parts.join(" · ") : "—";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  heading: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  note: { color: colors.textMuted, fontSize: 12 },
  insightsBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
    alignItems: "center",
  },
  insightsText: { color: colors.primary, fontWeight: "600" },
  fieldRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 6,
  },
  saveText: { color: "#fff", fontWeight: "700" },
  fieldHint: { color: colors.textMuted, fontSize: 11 },
  historyRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  historyLine: { color: colors.text, fontSize: 13 },
});
