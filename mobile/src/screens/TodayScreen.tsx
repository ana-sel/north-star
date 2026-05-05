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
import { DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";

/**
 * Spec §9 Today Screen — Energy + top 1–3 tasks via the Focus Agent.
 *
 * Flow: pick energy → tap "Pick my top 1–3" → Focus Agent suggests cards
 *       (local-only via gateway) → tap a suggestion to move it to TODAY.
 * Below the picker, the existing TODAY column is shown so the user
 * always sees what they've already committed to.
 */

const ENERGIES: { value: EnergyLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function TodayScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [energy, setEnergy] = useState<EnergyLevel>("medium");
  const [picks, setPicks] = useState<FocusPick[]>([]);
  const [usedAi, setUsedAi] = useState(false);
  const [picksError, setPicksError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const [todayCards, setTodayCards] = useState<CardOut[]>([]);
  const [loadingToday, setLoadingToday] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadToday = useCallback(async () => {
    try {
      setTodayCards(await listCards(DEV_USER_ID, "today"));
    } catch {
      /* surfaced on the picks button instead */
    } finally {
      setLoadingToday(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  async function onPick() {
    setPicking(true);
    setPicksError(null);
    try {
      const resp = await pickFocus(DEV_USER_ID, energy);
      setPicks(resp.picks);
      setUsedAi(resp.used_ai);
      if (resp.picks.length === 0) {
        setPicksError(
          resp.candidate_count === 0
            ? "No open cards to pick from. Capture some thoughts first."
            : "Focus Agent returned nothing — try again."
        );
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadToday();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.heading}>Energy right now</Text>
      <View style={styles.energyRow}>
        {ENERGIES.map((e) => {
          const selected = e.value === energy;
          return (
            <Pressable
              key={e.value}
              style={[styles.energyButton, selected && styles.energyButtonOn]}
              onPress={() => setEnergy(e.value)}
            >
              <Text
                style={[styles.energyText, selected && styles.energyTextOn]}
              >
                {e.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.pickButton, picking && styles.pickDisabled]}
        onPress={onPick}
        disabled={picking}
      >
        <Text style={styles.pickText}>
          {picking ? "Thinking…" : "Pick my top 1–3"}
        </Text>
      </Pressable>

      {picksError ? <Text style={styles.error}>{picksError}</Text> : null}

      {picks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Suggestions {usedAi ? "(via Focus Agent)" : "(heuristic fallback)"}
          </Text>
          {picks.map((p) => (
            <View key={p.card_id} style={styles.pickCard}>
              <Text style={styles.pickTitle}>{p.title}</Text>
              {p.reason ? (
                <Text style={styles.pickReason}>{p.reason}</Text>
              ) : null}
              <Pressable
                style={styles.moveButton}
                onPress={() => moveToToday(p)}
              >
                <Text style={styles.moveButtonText}>Move to Today</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>On Today</Text>
        {loadingToday ? (
          <ActivityIndicator color={colors.primary} />
        ) : todayCards.length === 0 ? (
          <Text style={styles.muted}>Nothing here yet.</Text>
        ) : (
          todayCards.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [
                styles.todayCard,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() =>
                navigation.navigate("CardDetail", { cardId: c.id })
              }
            >
              <Text style={styles.todayTitle}>{c.title}</Text>
              {c.description ? (
                <Text style={styles.todayDesc} numberOfLines={2}>
                  {c.description}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  heading: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.sm,
  },
  energyRow: { flexDirection: "row", gap: spacing.sm },
  energyButton: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },
  energyButtonOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  energyText: { color: colors.textMuted, fontWeight: "600" },
  energyTextOn: { color: "#fff" },
  pickButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  pickDisabled: { opacity: 0.5 },
  pickText: { color: "#fff", fontWeight: "700" },
  error: {
    color: colors.danger,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  section: { marginTop: spacing.lg, gap: spacing.sm },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  pickCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
  },
  pickTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  pickReason: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  moveButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 6,
    alignItems: "center",
  },
  moveButtonText: { color: "#fff", fontWeight: "600" },
  muted: { color: colors.textMuted },
  todayCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
  },
  todayTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  todayDesc: { color: colors.textMuted, fontSize: 12 },
});
