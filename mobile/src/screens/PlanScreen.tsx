import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, PILLAR_COLOR } from "../theme";
import { BoardsScreen } from "./BoardsScreen";
import { CardOut, listCards } from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";

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

const STATUS_LABEL: Record<string, string> = {
  inbox: "inbox",
  filtered: "filtered",
  planned: "planned",
  in_progress_my_side: "in progress",
  in_progress_other_side: "waiting",
  today: "today",
  done: "done",
  later: "later",
  review: "review",
};

function YearBoard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [cards, setCards] = useState<CardOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const all = await listCards(DEV_USER_ID);
      // Year board: visions, goals, and projects
      setCards(all.filter((c) => ["vision", "goal", "project"].includes(c.level) && c.status !== "deleted"));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  // Group by life_area
  const grouped: Record<string, CardOut[]> = {};
  for (const c of cards) {
    const area = c.life_area ?? "unclassified";
    if (!grouped[area]) grouped[area] = [];
    grouped[area].push(c);
  }

  return (
    <ScrollView contentContainerStyle={s.yearScroll}>
      {Object.entries(grouped).length === 0 ? (
        <View style={s.card}>
          <Text style={s.insightBody}>No goals or visions yet. Capture thoughts in Chat and they'll appear here once filtered.</Text>
        </View>
      ) : (
        Object.entries(grouped).map(([area, items]) => (
          <View key={area} style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: PILLAR_COLOR[area] ?? colors.primary }} />
              <Text style={s.cardHeading}>{area.replace(/_/g, " ")}</Text>
            </View>
            {items.map((c) => (
              <Pressable key={c.id} style={s.yearRow} onPress={() => navigation.navigate("CardDetail", { cardId: c.id })}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.yearTitle, c.status === "done" && s.yearDone]}>{c.title}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{c.level}</Text>
                </View>
                <View style={[s.badge, c.status === "done" && s.badgeDone]}>
                  <Text style={[s.badgeText, c.status === "done" && s.badgeDoneText]}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ProjectsView() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [projects, setProjects] = useState<CardOut[]>([]);
  const [allCards, setAllCards] = useState<CardOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const all = await listCards(DEV_USER_ID);
      setAllCards(all);
      setProjects(all.filter((c) => c.level === "project" && c.status !== "deleted"));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={s.yearScroll}>
      {projects.length === 0 ? (
        <View style={s.card}>
          <Text style={s.insightBody}>No projects yet. Create a goal and use the Architect Agent to split it into a project.</Text>
        </View>
      ) : (
        projects.map((p) => {
          const children = allCards.filter((c) => c.parent_id === p.id);
          const done = children.filter((c) => c.status === "done").length;
          const total = children.length;
          const progress = total > 0 ? done / total : 0;
          const colCounts = {
            backlog: children.filter((c) => ["inbox", "filtered", "planned"].includes(c.status)).length,
            doing: children.filter((c) => ["in_progress_my_side", "today"].includes(c.status)).length,
            waiting: children.filter((c) => c.status === "in_progress_other_side").length,
            done,
          };

          return (
            <Pressable key={p.id} style={s.card} onPress={() => navigation.navigate("CardDetail", { cardId: p.id })}>
              <View style={s.projectHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardHeading}>{p.title}</Text>
                  <Text style={s.projectArea}>{p.life_area?.replace(/_/g, " ") ?? "unclassified"}</Text>
                </View>
                <Text style={s.projectPct}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={s.colRow}>
                {(["backlog", "doing", "waiting", "done"] as const).map((c) => (
                  <View key={c} style={s.colStat}>
                    <Text style={s.colStatValue}>{colCounts[c]}</Text>
                    <Text style={s.colStatLabel}>{c}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })
      )}
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
