import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import {
  Habit,
  HabitKind,
  HabitWithToday,
  checkInHabit,
  createHabit,
  deleteHabit,
  habitsToday,
} from "../api/habits";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Habits screen — spec §5.6.
 *
 * Shows the user's active habits with today's check-in status. Tap a
 * yes/no habit to toggle today; long-press to delete; "+" creates a
 * new habit. Number/scale/time/text habits prompt for a value.
 */

const KIND_OPTIONS: { value: HabitKind; label: string }[] = [
  { value: "yes_no", label: "Yes/No" },
  { value: "number", label: "Number" },
  { value: "scale", label: "Scale 1–10" },
  { value: "time", label: "Time" },
  { value: "text", label: "Note" },
];

const KIND_LABEL: Record<HabitKind, string> = {
  yes_no: "Yes/No",
  number: "Number",
  scale: "Scale",
  time: "Time",
  text: "Note",
};

export function HabitsScreen() {
  const [rows, setRows] = useState<HabitWithToday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [valuePrompt, setValuePrompt] = useState<{
    habit: Habit;
  } | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      setRows(await habitsToday(DEV_USER_ID));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  async function toggleYesNo(row: HabitWithToday) {
    const next = !(row.today?.value_bool ?? false);
    try {
      await checkInHabit(row.habit.id, {
        user_id: DEV_USER_ID,
        value_bool: next,
      });
      load();
    } catch (e: any) {
      Alert.alert("Check-in failed", e?.message ?? "Unknown error");
    }
  }

  async function submitValue(row: HabitWithToday, raw: string) {
    const trimmed = raw.trim();
    const payload: Parameters<typeof checkInHabit>[1] = {
      user_id: DEV_USER_ID,
    };
    if (row.habit.kind === "number" || row.habit.kind === "scale") {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        Alert.alert("Invalid", "Enter a number.");
        return;
      }
      payload.value_number = n;
    } else if (row.habit.kind === "time") {
      payload.value_text = trimmed;
    } else {
      payload.value_text = trimmed || null;
    }
    try {
      await checkInHabit(row.habit.id, payload);
      setValuePrompt(null);
      load();
    } catch (e: any) {
      Alert.alert("Check-in failed", e?.message ?? "Unknown error");
    }
  }

  function onRowPress(row: HabitWithToday) {
    if (row.habit.kind === "yes_no") {
      toggleYesNo(row);
    } else {
      setValuePrompt({ habit: row.habit });
    }
  }

  function onLongPress(row: HabitWithToday) {
    Alert.alert("Delete habit?", `“${row.habit.title}” and all its logs.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteHabit(row.habit.id);
            load();
          } catch (e: any) {
            Alert.alert("Delete failed", e?.message ?? "Unknown error");
          }
        },
      },
    ]);
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
        <Text style={styles.heading}>Habits</Text>
        <Pressable style={styles.addBtn} onPress={() => setCreating(true)}>
          <Text style={styles.addText}>+ New</Text>
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
        {rows.length === 0 ? (
          <Text style={styles.empty}>
            No habits yet. Tap “+ New” to add one (Walk 10 min, Drink water,
            Sleep on time…).
          </Text>
        ) : (
          rows.map((r) => (
            <HabitRow
              key={r.habit.id}
              row={r}
              onPress={() => onRowPress(r)}
              onLongPress={() => onLongPress(r)}
            />
          ))
        )}
      </ScrollView>

      <NewHabitModal
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />

      <ValuePromptModal
        prompt={valuePrompt}
        onClose={() => setValuePrompt(null)}
        onSubmit={(raw) => {
          const row = rows.find((r) => r.habit.id === valuePrompt?.habit.id);
          if (row) submitValue(row, raw);
        }}
      />
    </View>
  );
}

function HabitRow({
  row,
  onPress,
  onLongPress,
}: {
  row: HabitWithToday;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const kind = row.habit.kind;
  const today = row.today;
  let valueLabel: string;
  let on = false;

  if (kind === "yes_no") {
    on = today?.value_bool === true;
    valueLabel = on ? "✓ Done" : "—";
  } else if (today?.value_number !== null && today?.value_number !== undefined) {
    valueLabel = String(today.value_number);
    on = true;
  } else if (today?.value_text) {
    valueLabel = today.value_text;
    on = true;
  } else {
    valueLabel = "—";
  }

  return (
    <Pressable
      style={[styles.row, on && styles.rowOn]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{row.habit.title}</Text>
        <Text style={styles.rowMeta}>
          {KIND_LABEL[kind]}
          {row.habit.target_value
            ? ` · target ${row.habit.target_value}${
                row.habit.target_unit ? " " + row.habit.target_unit : ""
              }`
            : ""}
        </Text>
      </View>
      <Text style={[styles.rowValue, on && styles.rowValueOn]}>
        {valueLabel}
      </Text>
    </Pressable>
  );
}

function NewHabitModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<HabitKind>("yes_no");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTitle("");
      setKind("yes_no");
    }
  }, [visible]);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createHabit({
        user_id: DEV_USER_ID,
        title: title.trim(),
        kind,
      });
      onCreated();
    } catch (e: any) {
      Alert.alert("Create failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>New habit</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (e.g. Drink water)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
          />
          <View style={styles.kindRow}>
            {KIND_OPTIONS.map((k) => (
              <Pressable
                key={k.value}
                style={[styles.chip, kind === k.value && styles.chipOn]}
                onPress={() => setKind(k.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    kind === k.value && styles.chipTextOn,
                  ]}
                >
                  {k.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.sheetActions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitBtn,
                (!title.trim() || saving) && styles.disabled,
              ]}
              disabled={!title.trim() || saving}
              onPress={submit}
            >
              <Text style={styles.submitText}>
                {saving ? "Saving…" : "Create"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ValuePromptModal({
  prompt,
  onClose,
  onSubmit,
}: {
  prompt: { habit: Habit } | null;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  React.useEffect(() => {
    if (prompt) setValue("");
  }, [prompt]);

  const numeric =
    prompt?.habit.kind === "number" || prompt?.habit.kind === "scale";
  const placeholder =
    prompt?.habit.kind === "scale"
      ? "1–10"
      : prompt?.habit.kind === "number"
      ? "Number"
      : prompt?.habit.kind === "time"
      ? "e.g. 22:30"
      : "Note";

  return (
    <Modal
      visible={!!prompt}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{prompt?.habit.title}</Text>
          <Text style={styles.sheetSubtitle}>
            Today's value ({prompt ? KIND_LABEL[prompt.habit.kind] : ""})
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            keyboardType={numeric ? "numeric" : "default"}
            autoFocus
          />
          <View style={styles.sheetActions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, !value.trim() && styles.disabled]}
              disabled={!value.trim()}
              onPress={() => onSubmit(value)}
            >
              <Text style={styles.submitText}>Save</Text>
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
    padding: spacing.lg,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  heading: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  addText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  error: { color: colors.danger, padding: spacing.md, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.md,
  },
  rowOn: { borderColor: colors.primary },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  rowValue: { color: colors.textMuted, fontWeight: "700" },
  rowValueOn: { color: colors.primary },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sheetSubtitle: { color: colors.textMuted, fontSize: 12 },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: spacing.md,
    color: colors.text,
    marginTop: spacing.sm,
  },
  kindRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.bg,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 12 },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: { padding: spacing.md },
  cancelText: { color: colors.textMuted },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 6,
  },
  disabled: { opacity: 0.4 },
  submitText: { color: "#fff", fontWeight: "700" },
});
