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
  HealthLog,
  HealthLogUpsert,
  healthToday,
  listHealth,
  upsertHealth,
} from "../api/health";
import { checkInHabit, habitsWeek } from "../api/habits";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Health screen - matches design_habits_today.html "Health & Energy Dashboard".
 * Shows: stat grid (sleep/weight/energy) + input fields + insight card + history.
 */

interface FieldDef {
  key: keyof Pick<HealthLog, "sleep_minutes" | "weight_kg" | "calories" | "protein_g" | "steps" | "energy" | "mood">;
  label: string;
  placeholder: string;
  min?: number;
  max?: number;
}

const FIELDS: FieldDef[] = [
  { key: "sleep_minutes", label: "Sleep (min)", placeholder: "420" },
  { key: "calories", label: "Calories", placeholder: "1800" },
  { key: "protein_g", label: "Protein (g)", placeholder: "120" },
  { key: "steps", label: "Steps", placeholder: "8000" },
  { key: "weight_kg", label: "Weight (kg)", placeholder: "72.5" },
  { key: "energy", label: "Energy 1-10", placeholder: "7", min: 1, max: 10 },
  { key: "mood", label: "Mood 1-10", placeholder: "7", min: 1, max: 10 },
];

export function HealthScreen() {
  const [today, setToday] = useState<HealthLog | null>(null);
  const [recent, setRecent] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [t, r] = await Promise.all([healthToday(DEV_USER_ID), listHealth(DEV_USER_ID, 14)]);
      setToday(t);
      setRecent(r);
      const next: Record<string, string> = {};
      if (t) {
        for (const f of FIELDS) {
          const v = t[f.key];
          if (v !== null && v !== undefined) next[f.key] = String(v);
        }
        setBedtime(t.bedtime ?? "");
        setWakeTime(t.wake_time ?? "");
      } else {
        setBedtime("");
        setWakeTime("");
      }
      setDraft(next);
    } catch (e: any) {
      Alert.alert("Load failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  async function saveField(field: FieldDef) {
    const raw = draft[field.key]?.trim();
    if (!raw) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) { Alert.alert("Invalid", `${field.label}: enter a number.`); return; }
    if (field.min !== undefined && n < field.min) { Alert.alert("Out of range", `Must be >= ${field.min}.`); return; }
    if (field.max !== undefined && n > field.max) { Alert.alert("Out of range", `Must be <= ${field.max}.`); return; }
    try {
      await upsertHealth({ user_id: DEV_USER_ID, [field.key]: n } as HealthLogUpsert);
      load();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  }

  async function saveSleepTimes() {
    const timeRe = /^\d{1,2}:\d{2}$/;
    const payload: HealthLogUpsert = { user_id: DEV_USER_ID };
    if (bedtime.trim()) {
      if (!timeRe.test(bedtime.trim())) { Alert.alert("Invalid", "Bedtime: use HH:MM"); return; }
      payload.bedtime = bedtime.trim();
    }
    if (wakeTime.trim()) {
      if (!timeRe.test(wakeTime.trim())) { Alert.alert("Invalid", "Wake time: use HH:MM"); return; }
      payload.wake_time = wakeTime.trim();
    }
    // Auto-calculate sleep_minutes if both are set
    if (payload.bedtime && payload.wake_time) {
      const [bh, bm] = payload.bedtime.split(":").map(Number);
      const [wh, wm] = payload.wake_time.split(":").map(Number);
      let bedMins = bh * 60 + bm;
      let wakeMins = wh * 60 + wm;
      if (wakeMins <= bedMins) wakeMins += 24 * 60; // crossed midnight
      payload.sleep_minutes = wakeMins - bedMins;
    }
    try {
      await upsertHealth(payload);
      // Auto-complete time-based habits (e.g. "sleep before 23:30")
      if (payload.bedtime) {
        try {
          const rows = await habitsWeek(DEV_USER_ID, 1);
          const [bh, bm] = payload.bedtime.split(":").map(Number);
          const bedMins = bh * 60 + bm;
          for (const row of rows) {
            if (row.habit.kind === "time" && row.habit.target_value != null) {
              const targetMins = row.habit.target_value;
              // For bedtime habits: done if bedtime <= target (both as mins from midnight)
              // Handle wrap: if target > 720 (noon), it's an evening target
              const met = bedMins <= targetMins || (bedMins > 720 && targetMins > 720 && bedMins <= targetMins);
              await checkInHabit(row.habit.id, {
                user_id: DEV_USER_ID,
                value_number: bedMins,
              });
            }
          }
        } catch { /* habit sync is best-effort */ }
      }
      load();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  }

  if (loading) {
    return (<View style={[styles.container, styles.center]}><ActivityIndicator color={colors.primary} /></View>);
  }

  const sleepLabel = today?.sleep_minutes ? `${Math.floor(today.sleep_minutes / 60)}h${String(today.sleep_minutes % 60).padStart(2, "0")}` : "--";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Stat grid */}
      <View style={styles.statGrid}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Sleep</Text>
          <Text style={styles.statValue}>{sleepLabel}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Weight</Text>
          <Text style={styles.statValue}>{today?.weight_kg ? `${today.weight_kg} kg` : "--"}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Energy</Text>
          <Text style={styles.statValue}>{today?.energy ? `${today.energy}/10` : "--"}</Text>
        </View>
      </View>

      {/* Sleep card — bedtime + wake time + chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sleep</Text>
        <View style={styles.sleepRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Bedtime</Text>
            <TextInput
              value={bedtime}
              onChangeText={setBedtime}
              placeholder="23:30"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Wake time</Text>
            <TextInput
              value={wakeTime}
              onChangeText={setWakeTime}
              placeholder="07:00"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>
        {bedtime.trim() && wakeTime.trim() && (() => {
          const [bh, bm] = bedtime.split(":").map(Number);
          const [wh, wm] = wakeTime.split(":").map(Number);
          if (!isNaN(bh) && !isNaN(bm) && !isNaN(wh) && !isNaN(wm)) {
            let bed = bh * 60 + bm, wake = wh * 60 + wm;
            if (wake <= bed) wake += 1440;
            const dur = wake - bed;
            return <Text style={styles.sleepCalc}>{Math.floor(dur / 60)}h {dur % 60}m of sleep</Text>;
          }
          return null;
        })()}
        <Pressable style={styles.saveBtn} onPress={saveSleepTimes}>
          <Text style={styles.saveText}>Save sleep times</Text>
        </Pressable>

        {/* Sleep trend chart */}
        {recent.length > 1 && (() => {
          const chartData = [...recent]
            .reverse()
            .filter(r => r.sleep_minutes != null)
            .map(r => ({
              value: (r.sleep_minutes ?? 0) / 60,
              label: r.log_date.slice(5),  // "MM-DD"
              frontColor: (r.sleep_minutes ?? 0) >= 420 ? colors.success : (r.sleep_minutes ?? 0) >= 360 ? colors.warning : colors.danger,
            }));
          if (chartData.length < 2) return null;
          return (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.fieldLabel}>Last {chartData.length} days (hours)</Text>
              <BarChart
                data={chartData}
                barWidth={22}
                spacing={12}
                barBorderRadius={6}
                noOfSections={4}
                maxValue={10}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9, transform: [{ rotate: "-45deg" }] }}
                xAxisColor={colors.border}
                yAxisColor={colors.border}
                height={120}
                isAnimated
                showReferenceLine1
                referenceLine1Position={7}
                referenceLine1Config={{ color: colors.success, dashWidth: 4, dashGap: 4 }}
              />
              <Text style={styles.chartLegend}>Green line = 7h target</Text>
            </View>
          );
        })()}
      </View>

      {/* Tracked inputs */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today</Text>
        <Text style={styles.note}>Health stays private. Save each field individually.</Text>
        {FIELDS.map((f) => {
          const current = today ? today[f.key] : null;
          return (
            <View key={f.key} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={draft[f.key] ?? ""}
                  onChangeText={(t) => setDraft((d) => ({ ...d, [f.key]: t }))}
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
                <Text style={styles.fieldHint}>Saved: {String(current)}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Agent insight */}
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>Health Agent insight</Text>
        <Text style={styles.insightBody}>
          When sleep before 1am fails, next-day energy drops and cards are more likely to carry over. The bottleneck is sleep timing, not motivation.
        </Text>
      </View>

      {/* History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last 14 days</Text>
        {recent.length === 0 ? (
          <Text style={styles.note}>No history yet.</Text>
        ) : (
          recent.map((r) => (
            <View key={r.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{r.log_date}</Text>
              <Text style={styles.historyLine}>{summarise(r)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function summarise(r: HealthLog): string {
  const parts: string[] = [];
  if (r.sleep_minutes != null) parts.push(`sleep ${(r.sleep_minutes / 60).toFixed(1)}h`);
  if (r.bedtime) parts.push(`bed ${r.bedtime}`);
  if (r.wake_time) parts.push(`wake ${r.wake_time}`);
  if (r.weight_kg != null) parts.push(`${r.weight_kg}kg`);
  if (r.calories != null) parts.push(`${r.calories}kcal`);
  if (r.protein_g != null) parts.push(`${r.protein_g}g protein`);
  if (r.steps != null) parts.push(`${r.steps} steps`);
  if (r.energy != null) parts.push(`E${r.energy}`);
  if (r.mood != null) parts.push(`M${r.mood}`);
  return parts.length ? parts.join(" \u00b7 ") : "\u2014";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  statGrid: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, alignItems: "center" },
  statLabel: { fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "800" },
  statValue: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 7 },

  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.lg, gap: spacing.sm },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  note: { fontSize: 12, color: colors.textMuted },

  fieldRow: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: { flex: 1, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: spacing.md, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 14 },
  saveText: { color: "#fff", fontWeight: "700" },
  fieldHint: { fontSize: 11, color: colors.textMuted },

  insightCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.lg },
  insightTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  insightBody: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },

  historyRow: { backgroundColor: "#fbf7f1", borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.md },
  historyDate: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  historyLine: { fontSize: 13, color: colors.text },

  sleepRow: { flexDirection: "row", gap: spacing.sm },
  sleepCalc: { fontSize: 14, fontWeight: "700", color: colors.primary, marginTop: spacing.xs },
  chartLegend: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: "center" },
});
