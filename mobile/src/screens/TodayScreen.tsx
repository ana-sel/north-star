import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CardOut,
  EnergyLevel,
  FocusPick,
  listCards,
  pickFocus,
  updateCard,
} from "../api/cards";
import { latestEnergy, logEnergy } from "../api/energy";
import { healthToday, HealthLog } from "../api/health";
import { DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";

/**
 * Today Screen - matches design_habits_today.html "Global Today" view.
 * Shows: stat grid (energy/mood/sleep) + top 3 tasks + "do not do" + focus agent.
 */

const ENERGIES: { value: EnergyLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function TodayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [energy, setEnergy] = useState<EnergyLevel>("medium");
  const [picks, setPicks] = useState<FocusPick[]>([]);
  const [usedAi, setUsedAi] = useState(false);
  const [picksError, setPicksError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [todayCards, setTodayCards] = useState<CardOut[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState<HealthLog | null>(null);

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
    } catch {}
  }, []);

  const loadEnergy = useCallback(async () => {
    try {
      const latest = await latestEnergy(DEV_USER_ID);
      if (latest) setEnergy(latest.level);
    } catch {}
  }, []);

  useEffect(() => {
    loadToday();
    loadHealth();
    loadEnergy();
  }, [loadToday, loadHealth, loadEnergy]);

  async function selectEnergy(level: EnergyLevel) {
    setEnergy(level);
    try { await logEnergy(DEV_USER_ID, level); } catch {}
  }

  async function onPick() {
    setPicking(true);
    setPicksError(null);
    try {
      const resp = await pickFocus(DEV_USER_ID, energy);
      setPicks(resp.picks);
      setUsedAi(resp.used_ai);
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
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadToday(); loadHealth(); }} tintColor={colors.primary} />
      }
    >
      {/* Stat grid */}
      <View style={styles.statGrid}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Energy</Text>
          <Text style={styles.statValue}>{healthData?.energy ?? "--"}/10</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Mood</Text>
          <Text style={styles.statValue}>{healthData?.mood ?? "--"}/10</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Sleep</Text>
          <Text style={styles.statValue}>{sleepLabel}</Text>
        </View>
      </View>

      {/* Energy selector */}
      <View style={styles.energySection}>
        <Text style={styles.sectionLabel}>Energy right now</Text>
        <View style={styles.energyRow}>
          {ENERGIES.map((e) => {
            const selected = e.value === energy;
            return (
              <Pressable
                key={e.value}
                style={[styles.energyBtn, selected && styles.energyBtnOn]}
                onPress={() => selectEnergy(e.value)}
              >
                <Text style={[styles.energyText, selected && styles.energyTextOn]}>{e.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

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
              style={styles.taskLine}
              onPress={() => navigation.navigate("CardDetail", { cardId: c.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{c.title}</Text>
                <Text style={styles.taskMeta}>
                  {c.life_area ? c.life_area.replace(/_/g, " ") : "task"}
                  {c.estimated_minutes ? ` \u00b7 ${c.estimated_minutes}m` : ""}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{i + 1}</Text>
              </View>
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

      {/* Do not do today */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Do not do today</Text>
        <Text style={styles.listItem}>{"\u2022"} Do not start new project boards</Text>
        <Text style={styles.listItem}>{"\u2022"} Do not research more AI tools</Text>
        <Text style={styles.listItem}>{"\u2022"} Do not move more than 3 cards into Today</Text>
      </View>

      {/* Focus Agent card */}
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>Focus Agent</Text>
        <Text style={styles.insightBody}>
          Today is low-medium intensity. Finish one technical task, one admin task, and one body-support habit. Completion over expansion.
        </Text>
      </View>
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

  energySection: { gap: spacing.sm },
  sectionLabel: { fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: "700" },
  energyRow: { flexDirection: "row", gap: spacing.sm },
  energyBtn: { flex: 1, padding: spacing.md, backgroundColor: "#fffaf3", borderColor: colors.border, borderWidth: 1, borderRadius: 15, alignItems: "center" },
  energyBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  energyText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  energyTextOn: { color: "#fff" },

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

  moveBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 14 },
  moveBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },

  listItem: { fontSize: 13, color: "#463d33", lineHeight: 20 },

  insightCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.lg },
  insightTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  insightBody: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },

  muted: { color: colors.textMuted, fontSize: 13 },
  errorText: { color: colors.danger, fontSize: 12 },
});
