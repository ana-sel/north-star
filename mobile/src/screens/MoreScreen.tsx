import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing } from "../theme";
import { DEV_USER_ID } from "../config/api";
import type { MoreStackParamList } from "../navigation/types";

/**
 * "More" tab — drawer for everything that doesn't deserve its own tab yet.
 * Currently exposes Approvals so the redacted-prompt review flow is reachable.
 */
export function MoreScreen() {
  const nav =
    useNavigation<NativeStackNavigationProp<MoreStackParamList, "MoreHome">>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Text style={styles.heading}>More</Text>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("Search")}
      >
        <Text style={styles.rowTitle}>Search</Text>
        <Text style={styles.rowSubtitle}>
          Semantic search across all your cards.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("Goals")}
      >
        <Text style={styles.rowTitle}>Goals</Text>
        <Text style={styles.rowSubtitle}>
          Vision → Goal → Project → Milestone tree.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("Review")}
      >
        <Text style={styles.rowTitle}>Review</Text>
        <Text style={styles.rowSubtitle}>
          Daily / weekly reflection on card activity.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("Productivity")}
      >
        <Text style={styles.rowTitle}>Productivity</Text>
        <Text style={styles.rowSubtitle}>
          Cards completed, completion rate, habit coverage.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("Learning")}
      >
        <Text style={styles.rowTitle}>Learning</Text>
        <Text style={styles.rowSubtitle}>
          Skills, research cards, study habits.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("Healing")}
      >
        <Text style={styles.rowTitle}>Healing</Text>
        <Text style={styles.rowSubtitle}>
          Diary, mood/energy, healing habits — local only.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("Research")}
      >
        <Text style={styles.rowTitle}>Research</Text>
        <Text style={styles.rowSubtitle}>
          Research-typed cards — progress and patterns.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("Diary")}
      >
        <Text style={styles.rowTitle}>Diary</Text>
        <Text style={styles.rowSubtitle}>
          Private reflections — stays on device.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("Files")}
      >
        <Text style={styles.rowTitle}>Files</Text>
        <Text style={styles.rowSubtitle}>
          Private storage — stays on device.
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: colors.border },
        ]}
        onPress={() => nav.navigate("ApprovalsList")}
      >
        <Text style={styles.rowTitle}>Approvals</Text>
        <Text style={styles.rowSubtitle}>
          Review redacted prompts before any external AI call.
        </Text>
      </Pressable>

      <View style={styles.agentCard}>
        <Text style={styles.rowTitle}>Agents</Text>
        <View style={styles.chipRow}>
          {["Mission", "Focus", "Review", "Health", "Money", "Energy"].map((a) => (
            <View key={a} style={styles.chip}>
              <Text style={styles.chipText}>{a}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.devBox}>
        <Text style={styles.devLabel}>Dev user_id</Text>
        <Text style={styles.devValue}>{DEV_USER_ID}</Text>
        <Text style={styles.devHint}>
          Edit `mobile/src/config/api.ts` to change this until JWT auth lands.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  heading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: spacing.lg,
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  agentCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: "#f3eadc",
    borderWidth: 1,
    borderColor: "#dfcfb8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6a5742",
  },
  devBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
  },
  devLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  devValue: {
    color: colors.text,
    fontFamily: "Courier",
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  devHint: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
