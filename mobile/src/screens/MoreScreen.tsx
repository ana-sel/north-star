import React from "react";
import {
  Pressable,
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
    <View style={styles.container}>
      <Text style={styles.heading}>More</Text>

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

      <View style={styles.devBox}>
        <Text style={styles.devLabel}>Dev user_id</Text>
        <Text style={styles.devValue}>{DEV_USER_ID}</Text>
        <Text style={styles.devHint}>
          Edit `mobile/src/config/api.ts` to change this until JWT auth lands.
        </Text>
      </View>
    </View>
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
    borderRadius: 8,
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
  devBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
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
