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
  HabitWeekRow,
  checkInHabit,
  createHabit,
  deleteHabit,
  habitsWeek,
} from "../api/habits";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

const KIND_OPTIONS: { value: HabitKind; label: string }[] = [
  { value: "yes_no", label: "Yes/No" },
  { value: "number", label: "Number" },
  { value: "scale", label: "Scale 1-10" },
  { value: "time", label: "Time" },
  { value: "text", label: "Note" },
];

function getWeekDates(days = 7): { date: string; label: string }[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result: { date: string; label: string }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    result.push({ date: iso, label: labels[d.getDay()] });
  }
  return result;
}

function getCellStatus(
  row: HabitWeekRow,
  dateStr: string
): "done" | "missed" | "skip" {
  const log = row.logs[dateStr];
  if (!log) return "skip";
  if (row.habit.kind === "yes_no") {
    return log.value_bool ? "done" : "missed";
  }
  if (log.value_number !== null || log.value_text !== null) return "done";
  return "skip";
}

export function HabitsScreen() {
  const [rows, setRows] = useState<HabitWeekRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const weekDates = getWeekDates(7);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      setRows(await habitsWeek(DEV_USER_ID, 7));
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

  async function toggleToday(row: HabitWeekRow) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const log = row.logs[todayStr];
    const next = !(log?.value_bool ?? false);
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

  // For non-yes/no habits, open check-in modal
  const [checkInTarget, setCheckInTarget] = useState<HabitWeekRow | null>(null);

  function onLongPress(row: HabitWeekRow) {
    Alert.alert("Delete habit?", `"${row.habit.title}" and all its logs.`, [
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
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
      >
        {rows.length === 0 ? (
          <Text style={styles.empty}>No habits yet. Tap "+ New" to add one.</Text>
        ) : (
          <View style={styles.matrix}>
            <View style={styles.matrixRow}>
              <View style={styles.habitNameCol}>
                <Text style={styles.colHeader}>Habit</Text>
              </View>
              {weekDates.map((d) => (
                <View key={d.date} style={styles.dayCol}>
                  <Text style={styles.colHeader}>{d.label}</Text>
                </View>
              ))}
              <View style={styles.streakCol}>
                <Text style={styles.colHeader}>Streak</Text>
              </View>
            </View>

            {rows.map((row) => (
              <Pressable
                key={row.habit.id}
                style={styles.matrixRow}
                onPress={() => {
                  if (row.habit.kind === "yes_no") toggleToday(row);
                  else setCheckInTarget(row);
                }}
                onLongPress={() => onLongPress(row)}
              >
                <View style={styles.habitNameCol}>
                  <Text style={styles.habitName} numberOfLines={1}>{row.habit.title}</Text>
                </View>
                {weekDates.map((d) => {
                  const status = getCellStatus(row, d.date);
                  return (
                    <View key={d.date} style={styles.dayCol}>
                      <Text style={[
                        styles.cell,
                        status === "done" && styles.cellDone,
                        status === "missed" && styles.cellMissed,
                        status === "skip" && styles.cellSkip,
                      ]}>
                        {status === "done" ? "\u2713" : status === "missed" ? "\u00d7" : "\u2014"}
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.streakCol}>
                  <Text style={styles.streakText}>{row.streak}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Health Agent insight</Text>
          <Text style={styles.insightBody}>
            When "sleep before 1am" fails, next-day energy drops and cards are more likely to carry over. The bottleneck is sleep timing, not motivation.
          </Text>
        </View>
      </ScrollView>

      <NewHabitModal
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={() => { setCreating(false); load(); }}
      />
      <CheckInModal
        row={checkInTarget}
        onClose={() => setCheckInTarget(null)}
        onSaved={() => { setCheckInTarget(null); load(); }}
      />
    </View>
  );
}

function NewHabitModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<HabitKind>("yes_no");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) { setTitle(""); setKind("yes_no"); setTargetValue(""); setTargetUnit(""); }
  }, [visible]);

  const showTarget = kind !== "yes_no" && kind !== "text";
  const unitHint = kind === "time" ? "e.g. 23:30" : kind === "number" ? "e.g. litres, grams" : kind === "scale" ? "e.g. 1-10" : "";
  const valueHint = kind === "time" ? "23:30" : kind === "number" ? "8" : kind === "scale" ? "7" : "";

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload: any = { user_id: DEV_USER_ID, title: title.trim(), kind };
      if (showTarget && targetValue.trim()) {
        if (kind === "time") {
          // Store as minutes from midnight for comparisons
          const [h, m] = targetValue.split(":").map(Number);
          if (!isNaN(h) && !isNaN(m)) payload.target_value = h * 60 + m;
          payload.target_unit = "HH:MM";
        } else {
          payload.target_value = Number(targetValue);
          if (targetUnit.trim()) payload.target_unit = targetUnit.trim();
        }
      }
      await createHabit(payload);
      onCreated();
    } catch (e: any) {
      Alert.alert("Create failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>New habit</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (e.g. Sleep before 23:30)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
          />
          <Text style={styles.kindLabel}>Type</Text>
          <View style={styles.kindRow}>
            {KIND_OPTIONS.map((k) => (
              <Pressable
                key={k.value}
                style={[styles.chip, kind === k.value && styles.chipOn]}
                onPress={() => setKind(k.value)}
              >
                <Text style={[styles.chipText, kind === k.value && styles.chipTextOn]}>{k.label}</Text>
              </Pressable>
            ))}
          </View>
          {showTarget && (
            <View style={styles.targetSection}>
              <Text style={styles.kindLabel}>Target</Text>
              <View style={styles.targetRow}>
                <TextInput
                  value={targetValue}
                  onChangeText={setTargetValue}
                  placeholder={valueHint}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={kind === "time" ? "default" : "numeric"}
                  style={[styles.input, { flex: 1 }]}
                />
                {kind !== "time" && (
                  <TextInput
                    value={targetUnit}
                    onChangeText={setTargetUnit}
                    placeholder={unitHint}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { flex: 1 }]}
                  />
                )}
              </View>
              {kind === "time" && (
                <Text style={styles.targetHint}>Format: HH:MM — e.g. 23:30 for bedtime goal</Text>
              )}
            </View>
          )}
          <View style={styles.sheetActions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, (!title.trim() || saving) && styles.disabled]}
              disabled={!title.trim() || saving}
              onPress={submit}
            >
              <Text style={styles.submitText}>{saving ? "Saving..." : "Create"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Check-in modal for number / scale / time / text habits.
 */
function CheckInModal({ row, onClose, onSaved }: { row: HabitWeekRow | null; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (row) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const log = row.logs[todayStr];
      if (log?.value_number !== null && log?.value_number !== undefined) {
        if (row.habit.kind === "time") {
          // Convert minutes from midnight back to HH:MM
          const mins = log.value_number;
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          setValue(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        } else {
          setValue(String(log.value_number));
        }
      } else if (log?.value_text) {
        setValue(log.value_text);
      } else {
        setValue("");
      }
    }
  }, [row]);

  if (!row) return null;

  const habit = row.habit;
  const targetLabel = habit.kind === "time" && habit.target_value
    ? `Target: ${String(Math.floor(habit.target_value / 60)).padStart(2, "0")}:${String(Math.round(habit.target_value % 60)).padStart(2, "0")}`
    : habit.target_value
      ? `Target: ${habit.target_value}${habit.target_unit ? ` ${habit.target_unit}` : ""}`
      : null;

  async function submit() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const payload: any = { user_id: DEV_USER_ID };
      if (habit.kind === "text") {
        payload.value_text = value.trim();
      } else if (habit.kind === "time") {
        const [h, m] = value.split(":").map(Number);
        if (isNaN(h) || isNaN(m)) { Alert.alert("Invalid", "Use HH:MM format"); setSaving(false); return; }
        payload.value_number = h * 60 + m;
      } else {
        const n = Number(value);
        if (!Number.isFinite(n)) { Alert.alert("Invalid", "Enter a number"); setSaving(false); return; }
        payload.value_number = n;
      }
      await checkInHabit(habit.id, payload);
      onSaved();
    } catch (e: any) {
      Alert.alert("Check-in failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{habit.title}</Text>
          {targetLabel && <Text style={styles.targetHint}>{targetLabel}</Text>}
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={habit.kind === "time" ? "HH:MM" : habit.kind === "text" ? "Notes..." : "Value"}
            placeholderTextColor={colors.textMuted}
            keyboardType={habit.kind === "time" || habit.kind === "text" ? "default" : "numeric"}
            style={styles.input}
            autoFocus
          />
          <View style={styles.sheetActions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, (!value.trim() || saving) && styles.disabled]}
              disabled={!value.trim() || saving}
              onPress={submit}
            >
              <Text style={styles.submitText}>{saving ? "Saving..." : "Log"}</Text>
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
  header: { flexDirection: "row", alignItems: "center", padding: spacing.lg, borderBottomColor: colors.border, borderBottomWidth: 1 },
  heading: { flex: 1, color: colors.text, fontSize: 20, fontWeight: "700" },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 14 },
  addText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  error: { color: colors.danger, padding: spacing.md, textAlign: "center" },

  matrix: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  matrixRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eadfce" },
  habitNameCol: { flex: 2.2, paddingRight: spacing.sm },
  dayCol: { flex: 1, alignItems: "center" },
  streakCol: { width: 44, alignItems: "center" },
  colHeader: { fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  habitName: { fontSize: 12, fontWeight: "700", color: colors.text },
  cell: { fontSize: 16, fontWeight: "900" },
  cellDone: { color: "#587c50" },
  cellMissed: { color: "#b35e57" },
  cellSkip: { color: "#9c8c75" },
  streakText: { fontSize: 14, fontWeight: "600", color: colors.text },

  insightCard: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  insightTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  insightBody: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },

  backdrop: { flex: 1, backgroundColor: "rgba(45,40,34,0.42)", justifyContent: "center", padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: spacing.lg, gap: spacing.sm },
  sheetTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  input: { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: spacing.md, color: colors.text, marginTop: spacing.sm },
  kindLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginTop: spacing.sm },
  kindRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  targetSection: { marginTop: spacing.sm },
  targetRow: { flexDirection: "row", gap: spacing.sm },
  targetHint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, borderColor: colors.border, borderWidth: 1, backgroundColor: "#faf4ec" },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: "#6b5942", fontSize: 12, fontWeight: "700" },
  chipTextOn: { color: "#fff", fontWeight: "700" },
  sheetActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: { padding: spacing.md },
  cancelText: { color: colors.textMuted },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 14 },
  disabled: { opacity: 0.4 },
  submitText: { color: "#fff", fontWeight: "700" },
});
