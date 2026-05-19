import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CardOut,
  CouncilResponse,
  EnergyLevel,
  FocusPick,
  askCouncil,
  listCards,
  pickFocus,
  updateCard,
} from "../api/cards";
import { latestEnergy, logEnergy } from "../api/energy";
import { healthToday, upsertHealth, HealthLog } from "../api/health";
import { HabitWithToday, habitsToday, checkInHabit } from "../api/habits";
import { DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing, PILLAR_COLOR } from "../theme";

/**
 * Today Screen - matches design_habits_today.html "Global Today" view.
 * Shows: stat grid (energy/mood/sleep) + top 3 tasks + "do not do" + focus agent.
 */

/** 0-5 scale matching DBT diary card convention.
 *  Enough granularity for trend analysis; low enough for daily compliance. */
const SCALE_LABELS: { value: number; label: string }[] = [
  { value: 0, label: "depleted" },
  { value: 1, label: "low" },
  { value: 2, label: "below avg" },
  { value: 3, label: "okay" },
  { value: 4, label: "good" },
  { value: 5, label: "strong" },
];

export function TodayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [energy, setEnergy] = useState<EnergyLevel>("medium");
  const [picks, setPicks] = useState<FocusPick[]>([]);
  const [usedAi, setUsedAi] = useState(false);
  const [doNotDo, setDoNotDo] = useState<string[]>([]);
  const [focusInsight, setFocusInsight] = useState<string | null>(null);
  const [picksError, setPicksError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [todayCards, setTodayCards] = useState<CardOut[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState<HealthLog | null>(null);
  const [habits, setHabits] = useState<HabitWithToday[]>([]);
  const [editingEnergy, setEditingEnergy] = useState(false);
  const [editingMood, setEditingMood] = useState(false);
  const [showAllHabits, setShowAllHabits] = useState(false);
  const [council, setCouncil] = useState<CouncilResponse | null>(null);
  const [councilLoading, setCouncilLoading] = useState(false);

  const loadToday = useCallback(async () => {
    try {
      setTodayCards(await listCards(DEV_USER_ID, "today"));
    } catch {} finally {
      setLoadingToday(false);
      setRefreshing(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const h = await healthToday(DEV_USER_ID);
      setHealthData(h);
      // Sync Focus Agent energy bucket from health data
      if (h?.energy != null) {
        const bucket: EnergyLevel = h.energy <= 1 ? "low" : h.energy <= 3 ? "medium" : "high";
        setEnergy(bucket);
      }
    } catch {}
  }, []);

  const loadEnergy = useCallback(async () => {
    try {
      const latest = await latestEnergy(DEV_USER_ID);
      if (latest) setEnergy(latest.level);
    } catch {}
  }, []);

  const loadHabits = useCallback(async () => {
    try {
      setHabits(await habitsToday(DEV_USER_ID));
    } catch {}
  }, []);

  useEffect(() => {
    loadToday();
    loadHealth();
    loadEnergy();
    loadHabits();
  }, [loadToday, loadHealth, loadEnergy, loadHabits]);

  // Map 0-5 energy to Focus Agent bucket (DBT-style scale)
  function energyBucket(n: number): EnergyLevel {
    if (n <= 1) return "low";
    if (n <= 3) return "medium";
    return "high";
  }

  async function saveHealthField(field: "energy" | "mood", value: number) {
    // Optimistic update
    setHealthData((prev) => (prev ? { ...prev, [field]: value } : { [field]: value } as any));
    if (field === "energy") {
      const bucket = energyBucket(value);
      setEnergy(bucket);
      setEditingEnergy(false);
      setShowAllHabits(false);
      // Also log to Focus Agent energy
      try { await logEnergy(DEV_USER_ID, bucket); } catch {}
      // Auto-trigger Focus Agent for do-not-do rules + insight
      try {
        const resp = await pickFocus(DEV_USER_ID, bucket, healthData?.mood ?? null);
        if (resp.do_not_do?.length) setDoNotDo(resp.do_not_do);
        if (resp.insight) setFocusInsight(resp.insight);
        // Only set picks if user hasn't already got tasks in Today
        if (todayCards.length === 0 && resp.picks.length > 0) {
          setPicks(resp.picks);
          setUsedAi(resp.used_ai);
        }
      } catch {}
    }
    if (field === "mood") {
      setEditingMood(false);
      // Re-trigger Focus Agent with updated mood
      try {
        const bucket = energy;
        const resp = await pickFocus(DEV_USER_ID, bucket, value);
        if (resp.do_not_do?.length) setDoNotDo(resp.do_not_do);
        if (resp.insight) setFocusInsight(resp.insight);
      } catch {}
    }
    try {
      const updated = await upsertHealth({ user_id: DEV_USER_ID, [field]: value });
      setHealthData(updated);
    } catch {}
  }

  async function toggleHabit(row: HabitWithToday) {
    const done = !!row.today?.value_bool;
    // Optimistic toggle
    setHabits((prev) =>
      prev.map((h) =>
        h.habit.id === row.habit.id
          ? { ...h, today: done ? null : ({ ...h.today, value_bool: true } as any) }
          : h
      )
    );
    try {
      await checkInHabit(row.habit.id, {
        user_id: DEV_USER_ID,
        value_bool: !done,
      });
    } catch {
      loadHabits(); // revert on failure
    }
  }

  async function onPick() {
    setPicking(true);
    setPicksError(null);
    try {
      const resp = await pickFocus(DEV_USER_ID, energy, healthData?.mood ?? null);
      setPicks(resp.picks);
      setUsedAi(resp.used_ai);
      if (resp.do_not_do?.length) setDoNotDo(resp.do_not_do);
      if (resp.insight) setFocusInsight(resp.insight);
      if (resp.picks.length === 0) {
        setPicksError(resp.candidate_count === 0
          ? "No open cards to pick from."
          : "Focus Agent returned nothing.");
      }
    } catch (e: any) {
      setPicksError(e?.message ?? "Failed to pick");
    } finally {
      setPicking(false);
    }
  }

  async function moveToToday(pick: FocusPick) {
    try {
      await updateCard(pick.card_id, { status: "today" });
      setPicks((prev) => prev.filter((p) => p.card_id !== pick.card_id));
      loadToday();
    } catch (e: any) {
      Alert.alert("Move failed", e?.message ?? "Unknown error");
    }
  }

  const sleepLabel = healthData?.sleep_minutes
    ? `${Math.floor(healthData.sleep_minutes / 60)}h${String(healthData.sleep_minutes % 60).padStart(2, "0")}`
    : "--";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadToday(); loadHealth(); loadHabits(); }} tintColor={colors.primary} />
      }
    >
      {/* Stat grid — tap Energy or Mood to quick-log */}
      <View style={styles.statGrid}>
        <Pressable style={styles.stat} onPress={() => { setEditingEnergy((v) => !v); setEditingMood(false); }}>
          <Text style={styles.statLabel}>⚡ Energy</Text>
          <Text style={styles.statValue}>{healthData?.energy ?? "–"}/5</Text>
          {!editingEnergy && <Text style={styles.statHint}>tap to log</Text>}
        </Pressable>
        <Pressable style={styles.stat} onPress={() => { setEditingMood((v) => !v); setEditingEnergy(false); }}>
          <Text style={styles.statLabel}>😊 Mood</Text>
          <Text style={styles.statValue}>{healthData?.mood ?? "–"}/5</Text>
          {!editingMood && <Text style={styles.statHint}>tap to log</Text>}
        </Pressable>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>🌙 Sleep</Text>
          <Text style={styles.statValue}>{sleepLabel}</Text>
        </View>
      </View>

      {/* Inline energy picker (0-5, DBT-style) */}
      {editingEnergy && (
        <View style={styles.pickerCard}>
          <Text style={styles.pickerLabel}>How's your energy?</Text>
          <View style={styles.pickerRow}>
            {SCALE_LABELS.map(({ value, label }) => {
              const active = healthData?.energy === value;
              return (
                <Pressable key={value} style={[styles.scaleChip, active && styles.scaleChipOn]} onPress={() => saveHealthField("energy", value)}>
                  <Text style={[styles.scaleNum, active && styles.scaleNumOn]}>{value}</Text>
                  <Text style={[styles.scaleLabel, active && styles.scaleLabelOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Day shape — always visible when energy is set */}
      {healthData?.energy != null && !editingEnergy && (
        <Text style={styles.dayShape}>
          {healthData?.mood != null && healthData.mood <= 1
            ? "Low mood — be gentle. One small win is enough."
            : energy === "low"
            ? "Low energy — do one easy win, protect your rest."
            : energy === "medium"
            ? healthData?.mood != null && healthData.mood <= 2
              ? "Steady energy but mood is low — keep it simple and kind."
              : "Medium energy — 2-3 tasks, steady pace."
            : healthData?.mood != null && healthData.mood <= 2
            ? "Good energy but mood is off — pick something satisfying."
            : "High energy — tackle the hardest thing first."}
        </Text>
      )}

      {/* Inline mood picker (0-5, DBT-style) */}
      {editingMood && (
        <View style={styles.pickerCard}>
          <Text style={styles.pickerLabel}>How's your mood?</Text>
          <View style={styles.pickerRow}>
            {SCALE_LABELS.map(({ value, label }) => {
              const active = healthData?.mood === value;
              return (
                <Pressable key={value} style={[styles.scaleChip, active && styles.scaleChipOn]} onPress={() => saveHealthField("mood", value)}>
                  <Text style={[styles.scaleNum, active && styles.scaleNumOn]}>{value}</Text>
                  <Text style={[styles.scaleLabel, active && styles.scaleLabelOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Top 3 today */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Top 3 today</Text>
          {!loadingToday && todayCards.length === 0 && (
            <Pressable style={styles.pickBtn} onPress={onPick} disabled={picking}>
              <Text style={styles.pickBtnText}>{picking ? "Thinking..." : "Pick my top 1-3"}</Text>
            </Pressable>
          )}
        </View>
        {loadingToday ? (
          <ActivityIndicator color={colors.primary} />
        ) : todayCards.length === 0 ? (
          <Text style={styles.muted}>Nothing here yet. Use the button above to let the Focus Agent choose.</Text>
        ) : (
          todayCards.slice(0, 3).map((c, i) => (
            <Pressable
              key={c.id}
              style={[
                styles.taskLine,
                c.life_area && { borderLeftWidth: 4, borderLeftColor: PILLAR_COLOR[c.life_area] ?? colors.border },
              ]}
              onPress={() => navigation.navigate("CardDetail", { cardId: c.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{c.title}</Text>
                <Text style={styles.taskMeta}>
                  {c.life_area ? c.life_area.replace(/_/g, " ") : "task"}
                </Text>
              </View>
              <View style={[
                styles.badge,
                energy === "low" && c.energy_required === "high" && styles.badgeWarn,
              ]}>
                <Text style={[
                  styles.badgeText,
                  energy === "low" && c.energy_required === "high" && styles.badgeWarnText,
                ]}>
                  {c.estimated_minutes ? `${c.estimated_minutes}m` : c.energy_required ?? "–"}
                </Text>
              </View>
              {energy === "low" && c.energy_required === "high" && (
                <Text style={styles.mismatchHint}>⚡ defer?</Text>
              )}
            </Pressable>
          ))
        )}
        {picksError ? <Text style={styles.errorText}>{picksError}</Text> : null}
      </View>

      {/* Focus Agent suggestions */}
      {picks.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Suggestions {usedAi ? "(Focus Agent)" : "(heuristic)"}
          </Text>
          {picks.map((p) => (
            <View key={p.card_id} style={styles.taskLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{p.title}</Text>
                {p.reason ? <Text style={styles.taskMeta}>{p.reason}</Text> : null}
              </View>
              <Pressable style={styles.moveBtn} onPress={() => moveToToday(p)}>
                <Text style={styles.moveBtnText}>Add</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Do not do today — dynamic from Focus Agent */}
      {doNotDo.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Do not do today</Text>
          {doNotDo.map((rule, i) => (
            <Text key={i} style={styles.listItem}>{"\u2022"} {rule}</Text>
          ))}
        </View>
      )}

      {/* Focus Agent insight — dynamic */}
      {focusInsight && (
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Focus Agent</Text>
          <Text style={styles.insightBody}>{focusInsight}</Text>
        </View>
      )}

      {/* Agent Council — "what should I do today?" */}
      <Pressable
        style={styles.councilBtn}
        onPress={async () => {
          setCouncilLoading(true);
          try {
            setCouncil(await askCouncil(DEV_USER_ID));
          } catch (e: any) {
            Alert.alert("Council", e?.message ?? "Failed");
          } finally {
            setCouncilLoading(false);
          }
        }}
        disabled={councilLoading}
      >
        <Text style={styles.councilBtnText}>
          {councilLoading ? "Asking agents…" : "🧠 What should I do today?"}
        </Text>
      </Pressable>
      {council && (
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Agent Council</Text>
          {council.votes.map((v, i) => (
            <Text key={i} style={styles.councilVote}>
              <Text style={{ fontWeight: "700" }}>{v.agent}:</Text> {v.recommendation}
            </Text>
          ))}
        </View>
      )}

      {/* Today's habits — collapsed on low energy */}
      {habits.length > 0 && (() => {
        const collapsed = energy === "low" && !showAllHabits;
        const visible = collapsed ? habits.slice(0, 3) : habits;
        const hiddenCount = habits.length - 3;
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Today's habits{collapsed ? ` (top 3)` : ""}
            </Text>
            {visible.map((row) => {
              const done = row.habit.kind === "yes_no"
                ? !!row.today?.value_bool
                : row.today != null;
              return (
                <View key={row.habit.id} style={styles.habitRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.habitLabel, done && styles.habitDone]}>{row.habit.title}</Text>
                    {row.habit.target_value != null && row.habit.kind === "time" && (
                      <Text style={styles.taskMeta}>
                        Target: {String(Math.floor(row.habit.target_value / 60)).padStart(2, "0")}:{String(row.habit.target_value % 60).padStart(2, "0")}
                      </Text>
                    )}
                  </View>
                  {row.habit.kind === "yes_no" && (
                    <Switch
                      value={done}
                      onValueChange={() => toggleHabit(row)}
                      trackColor={{ false: colors.border, true: colors.success }}
                      thumbColor={done ? "#fff" : colors.soft}
                    />
                  )}
                  {row.habit.kind !== "yes_no" && (
                    <Text style={[styles.habitBadge, done && styles.habitBadgeDone]}>
                      {done ? "✓" : "–"}
                    </Text>
                  )}
                </View>
              );
            })}
            {collapsed && hiddenCount > 0 && (
              <Pressable onPress={() => setShowAllHabits(true)} style={styles.showMore}>
                <Text style={styles.showMoreText}>Show all ({hiddenCount} more)</Text>
              </Pressable>
            )}
            {energy === "low" && showAllHabits && (
              <Pressable onPress={() => setShowAllHabits(false)} style={styles.showMore}>
                <Text style={styles.showMoreText}>Show fewer</Text>
              </Pressable>
            )}
          </View>
        );
      })()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  statGrid: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, alignItems: "center" },
  statLabel: { fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "800" },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 7 },
  statHint: { fontSize: 10, color: colors.gold, marginTop: 4 },

  pickerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md },
  pickerLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600", marginBottom: spacing.sm },
  pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scaleChip: { flex: 1, minWidth: 48, paddingVertical: 10, backgroundColor: "#fffaf3", borderWidth: 1, borderColor: colors.border, borderRadius: 14, alignItems: "center" },
  scaleChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleNum: { fontSize: 18, fontWeight: "800", color: colors.text },
  scaleNumOn: { color: "#fff" },
  scaleLabel: { fontSize: 9, color: colors.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.3 },
  scaleLabelOn: { color: "rgba(255,255,255,0.8)" },

  dayShape: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },

  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  pickBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 14 },
  pickBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },

  taskLine: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 11, gap: 10 },
  taskTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  taskMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  badge: { backgroundColor: "#f3eadc", borderWidth: 1, borderColor: "#dfcfb8", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#6a5742" },
  badgeWarn: { backgroundColor: "#fce8e5", borderColor: colors.danger },
  badgeWarnText: { color: colors.danger },
  mismatchHint: { fontSize: 10, color: colors.danger, fontWeight: "600", marginTop: 2 },

  moveBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 14 },
  moveBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },

  listItem: { fontSize: 13, color: "#463d33", lineHeight: 20 },

  insightCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.lg },
  insightTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  insightBody: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },

  councilBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: "center",
  },
  councilBtnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  councilVote: { fontSize: 13, color: colors.text, lineHeight: 20, marginTop: 4 },

  muted: { color: colors.textMuted, fontSize: 13 },
  errorText: { color: colors.danger, fontSize: 12 },

  habitRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  habitLabel: { fontSize: 14, color: colors.text, fontWeight: "600" },
  habitDone: { textDecorationLine: "line-through", color: colors.textMuted },
  habitBadge: { fontSize: 16, color: colors.textMuted, fontWeight: "700", width: 28, textAlign: "center" },
  habitBadgeDone: { color: colors.success },
  showMore: { paddingVertical: spacing.sm, alignItems: "center" },
  showMoreText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
});
