import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";
import { BoardsScreen } from "./BoardsScreen";

type Segment = "month" | "year" | "projects";

/**
 * Plan tab — segmented: Year · Month · Projects.
 * Month is default (most-used execution view).
 */
export function PlanScreen() {
  const [segment, setSegment] = useState<Segment>("month");

  return (
    <View style={styles.container}>
      {/* Segmented control */}
      <View style={styles.segmentBar}>
        {(["year", "month", "projects"] as Segment[]).map((s) => (
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
              {s === "year" ? "Year" : s === "month" ? "Month" : "Projects"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {segment === "month" && <BoardsScreen />}
      {segment === "year" && <YearBoard />}
      {segment === "projects" && <ProjectsView />}
    </View>
  );
}

const YEAR_QUARTERS = [
  {
    label: "Q1 — Foundation",
    items: [
      { title: "Launch Personal Navigation OS MVP", badge: "done", done: true },
      { title: "Complete CS50 AI certification", badge: "in progress", done: false },
      { title: "Establish sleep routine", badge: "habit", done: true },
    ],
  },
  {
    label: "Q2 — Growth",
    items: [
      { title: "IBM RAG specialisation", badge: "scheduled", done: false },
      { title: "Flat renovation phase 1", badge: "in progress", done: false },
      { title: "Build investment tracker", badge: "planned", done: false },
    ],
  },
  {
    label: "Q3 — Scale",
    items: [
      { title: "AWS Bedrock certification", badge: "scheduled", done: false },
      { title: "Contribute to open-source AI project", badge: "planned", done: false },
      { title: "Publish side project", badge: "planned", done: false },
    ],
  },
  {
    label: "Q4 — Consolidate",
    items: [
      { title: "Year review & 2027 planning", badge: "planned", done: false },
      { title: "Financial year-end audit", badge: "planned", done: false },
    ],
  },
];

const PROJECTS = [
  {
    name: "Personal Navigation OS",
    area: "Work / Skills",
    progress: 0.45,
    columns: { backlog: 4, doing: 3, waiting: 1, done: 8 },
  },
  {
    name: "Vilnius Flat Renovation",
    area: "Home / Property",
    progress: 0.3,
    columns: { backlog: 6, doing: 2, waiting: 3, done: 4 },
  },
  {
    name: "CS50 AI Certification",
    area: "Work / Skills",
    progress: 0.7,
    columns: { backlog: 2, doing: 1, waiting: 0, done: 7 },
  },
  {
    name: "Health Reset Programme",
    area: "Health / Energy",
    progress: 0.55,
    columns: { backlog: 3, doing: 2, waiting: 0, done: 5 },
  },
];

function YearBoard() {
  return (
    <ScrollView contentContainerStyle={s.yearScroll}>
      {YEAR_QUARTERS.map((q) => (
        <View key={q.label} style={s.card}>
          <Text style={s.cardHeading}>{q.label}</Text>
          {q.items.map((item, i) => (
            <View key={i} style={s.yearRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.yearTitle, item.done && s.yearDone]}>{item.title}</Text>
              </View>
              <View style={[s.badge, item.done && s.badgeDone]}>
                <Text style={[s.badgeText, item.done && s.badgeDoneText]}>{item.badge}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
      <View style={s.card}>
        <Text style={s.insightTitle}>Year insight</Text>
        <Text style={s.insightBody}>
          Q1 focus was strong. Q2 has 2 active tracks — keep renovation and study from overlapping on the same weeks.
        </Text>
      </View>
    </ScrollView>
  );
}

function ProjectsView() {
  return (
    <ScrollView contentContainerStyle={s.yearScroll}>
      {PROJECTS.map((p) => (
        <View key={p.name} style={s.card}>
          <View style={s.projectHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardHeading}>{p.name}</Text>
              <Text style={s.projectArea}>{p.area}</Text>
            </View>
            <Text style={s.projectPct}>{Math.round(p.progress * 100)}%</Text>
          </View>
          {/* Progress bar */}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${p.progress * 100}%` }]} />
          </View>
          {/* Column counts */}
          <View style={s.colRow}>
            {(["backlog", "doing", "waiting", "done"] as const).map((c) => (
              <View key={c} style={s.colStat}>
                <Text style={s.colStatValue}>{p.columns[c]}</Text>
                <Text style={s.colStatLabel}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={s.card}>
        <Text style={s.insightTitle}>Project health</Text>
        <Text style={s.insightBody}>
          Renovation has 3 cards in "waiting" — follow up on blocked items. CS50 AI is on track for the August target.
        </Text>
      </View>
    </ScrollView>
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

/* Shared inner styles for Year + Projects */
const s = StyleSheet.create({
  yearScroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  // Year
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ebe4d8",
  },
  yearTitle: { fontSize: 14, color: colors.text },
  yearDone: { textDecorationLine: "line-through", color: colors.textMuted },
  badge: {
    backgroundColor: "#f3eadc",
    borderWidth: 1,
    borderColor: "#dfcfb8",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeDone: { backgroundColor: "#e6efe4", borderColor: "#b8d4b4" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#6a5742" },
  badgeDoneText: { color: "#4a7a44" },
  // Insight
  insightTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  insightBody: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  // Projects
  projectHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  projectArea: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  projectPct: { fontSize: 22, fontWeight: "700", color: colors.primary },
  progressTrack: {
    height: 6,
    backgroundColor: colors.soft,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  colRow: { flexDirection: "row", gap: spacing.sm },
  colStat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fbf7f1",
    borderRadius: 14,
    paddingVertical: 8,
  },
  colStatValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  colStatLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
