import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";
import { HabitsScreen } from "./HabitsScreen";
import { HealthScreen } from "./HealthScreen";
import { MoneyScreen } from "./MoneyScreen";

type Segment = "habits" | "health" | "money";

/**
 * Track tab — segmented: Habits · Health · Money.
 * Each as a dashboard view.
 */
export function TrackScreen() {
  const [segment, setSegment] = useState<Segment>("habits");

  return (
    <View style={styles.container}>
      {/* Segmented control */}
      <View style={styles.segmentBar}>
        {(["habits", "health", "money"] as Segment[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.segmentBtn, segment === s && styles.segmentActive]}
            onPress={() => setSegment(s)}
          >
            <Text
              style={[
                styles.segmentText,
                segment === s && styles.segmentTextActive,
              ]}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {segment === "habits" && <HabitsScreen />}
      {segment === "health" && <HealthScreen />}
      {segment === "money" && <MoneyScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  segmentBar: {
    flexDirection: "row",
    margin: spacing.lg,
    backgroundColor: colors.soft,
    borderRadius: 14,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 14,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
});
