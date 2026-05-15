import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  ArchitectSuggestion,
  CardTreeNode,
  architectGoal,
  createCard,
  getCardTree,
} from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";

/**
 * Spec §3 hierarchy: Vision → Goal → Project → Milestone → Task.
 *
 * Shows the tree of long-horizon cards (Vision/Goal/Project/Milestone
 * by default; toggle "Include tasks" to fold leaf tasks in too).
 *
 * Interactions:
 *   • Tap a row → CardDetail (full edit / status / delete)
 *   • "+" on a row → add a child card at the next level down
 *   • "+ Add root" at top → create a new Vision/Goal at the root
 */

const LEVEL_DOWN: Record<string, string> = {
  vision: "goal",
  goal: "project",
  project: "milestone",
  milestone: "task",
  task: "subtask",
  subtask: "focus_block",
  focus_block: "focus_block",
};

const LEVEL_LABEL: Record<string, string> = {
  vision: "Vision",
  goal: "Goal",
  project: "Project",
  milestone: "Milestone",
  task: "Task",
  subtask: "Subtask",
  focus_block: "Focus block",
};

export function GoalsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tree, setTree] = useState<CardTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeTasks, setIncludeTasks] = useState(false);
  const [adding, setAdding] = useState<{
    parent: CardTreeNode | null;
    level: string;
  } | null>(null);
  const [splitting, setSplitting] = useState<{
    parent: CardTreeNode;
    childLevel: string;
    suggestions: ArchitectSuggestion[];
    loading: boolean;
    error: string | null;
    selected: Set<number>;
    creating: boolean;
  } | null>(null);

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        setTree(await getCardTree(DEV_USER_ID, includeTasks));
      } catch (e: any) {
        setError(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [includeTasks]
  );

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  async function handleCreate(title: string) {
    if (!adding) return;
    const parent = adding.parent;
    try {
      await createCard({
        user_id: DEV_USER_ID,
        title,
        level: adding.level as any,
        type: adding.level === "task" ? "task" : "goal",
        parent_id: parent?.id ?? null,
      });
      setAdding(null);
      load();
    } catch (e: any) {
      Alert.alert("Create failed", e?.message ?? "Unknown error");
    }
  }

  async function handleSplit(parent: CardTreeNode) {
    const childLevel = LEVEL_DOWN[parent.level] ?? "task";
    setSplitting({
      parent,
      childLevel,
      suggestions: [],
      loading: true,
      error: null,
      selected: new Set(),
      creating: false,
    });
    try {
      const resp = await architectGoal(DEV_USER_ID, parent.id);
      setSplitting((s) =>
        s && s.parent.id === parent.id
          ? {
              ...s,
              loading: false,
              suggestions: resp.suggestions,
              childLevel: resp.child_level,
              error: resp.suggestions.length === 0
                ? resp.error ?? "No suggestions returned (is Ollama running?)"
                : null,
            }
          : s
      );
    } catch (e: any) {
      setSplitting((s) =>
        s && s.parent.id === parent.id
          ? { ...s, loading: false, error: e?.message ?? "Failed" }
          : s
      );
    }
  }

  function toggleSplitPick(idx: number) {
    setSplitting((s) => {
      if (!s) return s;
      const next = new Set(s.selected);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { ...s, selected: next };
    });
  }

  async function commitSplit() {
    if (!splitting) return;
    const { parent, childLevel, suggestions, selected } = splitting;
    if (selected.size === 0) {
      setSplitting(null);
      return;
    }
    setSplitting({ ...splitting, creating: true });
    try {
      const picks = [...selected]
        .sort((a, b) => a - b)
        .map((i) => suggestions[i]);
      for (const s of picks) {
        await createCard({
          user_id: DEV_USER_ID,
          title: s.title,
          description: s.description,
          level: childLevel as any,
          type: childLevel === "task" ? "task" : "goal",
          parent_id: parent.id,
        });
      }
      setSplitting(null);
      load();
    } catch (e: any) {
      Alert.alert("Create failed", e?.message ?? "Unknown error");
      setSplitting((s) => (s ? { ...s, creating: false } : s));
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
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerToggle}>
          <Text style={styles.headerLabel}>Include tasks</Text>
          <Switch
            value={includeTasks}
            onValueChange={setIncludeTasks}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        <Pressable
          style={styles.addRootButton}
          onPress={() => setAdding({ parent: null, level: "goal" })}
        >
          <Text style={styles.addRootText}>+ Add goal</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
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
        {tree.length === 0 ? (
          <Text style={styles.empty}>
            No goals yet. Tap “+ Add goal” to create your first one.
          </Text>
        ) : (
          tree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              onTap={(n) =>
                navigation.navigate("CardDetail", { cardId: n.id })
              }
              onAddChild={(n) =>
                setAdding({
                  parent: n,
                  level: LEVEL_DOWN[n.level] ?? "task",
                })
              }
              onSplit={handleSplit}
            />
          ))
        )}
      </ScrollView>

      <AddCardModal
        adding={adding}
        onClose={() => setAdding(null)}
        onSubmit={handleCreate}
      />
      <SplitModal
        state={splitting}
        onClose={() => setSplitting(null)}
        onTogglePick={toggleSplitPick}
        onCommit={commitSplit}
      />
    </View>
  );
}

function TreeRow({
  node,
  depth,
  onTap,
  onAddChild,
  onSplit,
}: {
  node: CardTreeNode;
  depth: number;
  onTap: (n: CardTreeNode) => void;
  onAddChild: (n: CardTreeNode) => void;
  onSplit: (n: CardTreeNode) => void;
}) {
  const done = node.completed_at !== null;
  // Don't offer Split on the bottom rungs — there's nothing meaningful
  // to break a focus_block down into.
  const splittable =
    node.level !== "focus_block" && node.level !== "subtask";
  return (
    <View>
      <View style={[styles.row, { marginLeft: depth * 16 }]}>
        <Pressable
          style={styles.rowMain}
          onPress={() => onTap(node)}
        >
          <Text style={styles.levelTag}>
            {(LEVEL_LABEL[node.level] ?? node.level).toUpperCase()}
          </Text>
          <Text
            style={[styles.rowTitle, done && styles.rowTitleDone]}
            numberOfLines={2}
          >
            {node.title}
          </Text>
          {node.life_area ? (
            <Text style={styles.rowMeta}>{node.life_area}</Text>
          ) : null}
        </Pressable>
        {splittable ? (
          <Pressable
            style={styles.splitBtn}
            onPress={() => onSplit(node)}
            hitSlop={8}
          >
            <Text style={styles.splitText}>✨</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.addChild}
          onPress={() => onAddChild(node)}
          hitSlop={8}
        >
          <Text style={styles.addChildText}>+</Text>
        </Pressable>
      </View>
      {node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onTap={onTap}
          onAddChild={onAddChild}
          onSplit={onSplit}
        />
      ))}
    </View>
  );
}

function AddCardModal({
  adding,
  onClose,
  onSubmit,
}: {
  adding: { parent: CardTreeNode | null; level: string } | null;
  onClose: () => void;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = useState("");

  React.useEffect(() => {
    if (adding) setTitle("");
  }, [adding]);

  const visible = !!adding;
  const levelLabel = adding ? LEVEL_LABEL[adding.level] ?? adding.level : "";
  const parentTitle = adding?.parent?.title;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Add {levelLabel}</Text>
          {parentTitle ? (
            <Text style={styles.sheetSubtitle} numberOfLines={2}>
              under “{parentTitle}”
            </Text>
          ) : (
            <Text style={styles.sheetSubtitle}>at root</Text>
          )}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
          />
          <View style={styles.sheetActions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitBtn,
                title.trim().length === 0 && styles.disabled,
              ]}
              disabled={title.trim().length === 0}
              onPress={() => onSubmit(title.trim())}
            >
              <Text style={styles.submitText}>Create</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SplitModal({
  state,
  onClose,
  onTogglePick,
  onCommit,
}: {
  state: {
    parent: CardTreeNode;
    childLevel: string;
    suggestions: ArchitectSuggestion[];
    loading: boolean;
    error: string | null;
    selected: Set<number>;
    creating: boolean;
  } | null;
  onClose: () => void;
  onTogglePick: (idx: number) => void;
  onCommit: () => void;
}) {
  const visible = !!state;
  const childLabel = state ? LEVEL_LABEL[state.childLevel] ?? state.childLevel : "";
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Split into {childLabel}s</Text>
          {state ? (
            <Text style={styles.sheetSubtitle} numberOfLines={2}>
              under “{state.parent.title}”
            </Text>
          ) : null}

          {state?.loading ? (
            <View style={{ paddingVertical: spacing.lg, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.sheetSubtitle, { marginTop: spacing.sm }]}>
                Asking the architect…
              </Text>
            </View>
          ) : state?.error ? (
            <Text style={styles.error}>{state.error}</Text>
          ) : (
            <ScrollView style={styles.suggestionList}>
              {state?.suggestions.map((s, i) => {
                const on = state.selected.has(i);
                return (
                  <Pressable
                    key={`${s.title}-${i}`}
                    style={styles.suggestionRow}
                    onPress={() => onTogglePick(i)}
                  >
                    <View
                      style={[
                        styles.suggestionCheck,
                        on && styles.suggestionCheckOn,
                      ]}
                    >
                      {on ? (
                        <Text style={styles.suggestionCheckMark}>✓</Text>
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionTitle}>{s.title}</Text>
                      {s.description ? (
                        <Text style={styles.suggestionDesc}>
                          {s.description}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.sheetActions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitBtn,
                (!state ||
                  state.loading ||
                  state.creating ||
                  state.selected.size === 0) &&
                  styles.disabled,
              ]}
              disabled={
                !state ||
                state.loading ||
                state.creating ||
                state.selected.size === 0
              }
              onPress={onCommit}
            >
              <Text style={styles.submitText}>
                {state?.creating
                  ? "Creating…"
                  : `Create ${state?.selected.size ?? 0}`}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  headerLabel: { color: colors.textMuted, fontSize: 12 },
  addRootButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
  },
  addRootText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  error: { color: colors.danger, padding: spacing.md, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.sm,
    marginVertical: 3,
    gap: spacing.sm,
  },
  rowMain: { flex: 1, gap: 2 },
  levelTag: {
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  rowTitleDone: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  rowMeta: { color: colors.textMuted, fontSize: 11 },
  addChild: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  addChildText: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  splitBtn: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  splitText: { fontSize: 14 },
  suggestionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  suggestionCheck: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  suggestionCheckOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  suggestionCheckMark: { color: "#fff", fontWeight: "700", fontSize: 14 },
  suggestionTitle: { color: colors.text, fontWeight: "600", fontSize: 14 },
  suggestionDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  suggestionList: { maxHeight: 360 },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(45,40,34,0.42)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sheetSubtitle: { color: colors.textMuted, fontSize: 12 },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    color: colors.text,
    marginTop: spacing.sm,
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: { padding: spacing.md },
  cancelText: { color: colors.textMuted },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 14,
  },
  disabled: { opacity: 0.4 },
  submitText: { color: "#fff", fontWeight: "700" },
});
