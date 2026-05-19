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
  DiaryEntryOut,
  createDiary,
  updateDiary,
  deleteDiary,
  listDiary,
  ocrDiaryImage,
} from "../api/diary";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";
import * as DocumentPicker from "expo-document-picker";

/**
 * Diary screen — spec §9.
 *
 * Full reflection UI: guided prompts, mood picker, entry list with
 * expand/edit/delete, and mood streak display. Privacy level defaults to
 * SENSITIVE so reflections never leave the device through the gateway.
 */

const MOODS = ["😊", "😐", "😔", "😤", "😴", "🙏"];

const REFLECTION_PROMPTS = [
  "What's on your mind right now?",
  "What went well today?",
  "What drained my energy?",
  "What am I grateful for?",
  "What do I need to let go of?",
  "What would make tomorrow better?",
];

export function DiaryScreen() {
  const [entries, setEntries] = useState<DiaryEntryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const [ocrBusy, setOcrBusy] = useState(false);

  async function pickAndOcr() {
    if (ocrBusy) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setOcrBusy(true);
      const { text } = await ocrDiaryImage({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "image/jpeg",
      });
      if (!text) {
        Alert.alert("No text found", "The image didn't contain readable text.");
        return;
      }
      setDraft((d) => (d ? d + "\n\n" + text : text));
    } catch (e: any) {
      Alert.alert("OCR failed", e?.message ?? "Unknown error");
    } finally {
      setOcrBusy(false);
    }
  }

  // Detail / edit modal
  const [selected, setSelected] = useState<DiaryEntryOut | null>(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editMood, setEditMood] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      setEntries(await listDiary(DEV_USER_ID));
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

  function cyclePrompt() {
    setPromptIdx((i) => (i + 1) % REFLECTION_PROMPTS.length);
  }

  async function submit() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const firstLine = text.split("\n", 1)[0];
      const title = firstLine.length > 80 ? firstLine.slice(0, 77) + "\u2026" : firstLine;
      const body = text;
      await createDiary({
        user_id: DEV_USER_ID,
        title,
        body,
        mood,
      });
      setDraft("");
      setMood(null);
      load();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: DiaryEntryOut) {
    Alert.alert("Delete entry?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDiary(entry.id);
            setSelected(null);
            load();
          } catch (e: any) {
            Alert.alert("Delete failed", e?.message ?? "Unknown error");
          }
        },
      },
    ]);
  }

  async function handleSaveEdit() {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDiary(selected.id, { body: editBody, mood: editMood });
      setEditing(false);
      setSelected(null);
      load();
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function openDetail(entry: DiaryEntryOut) {
    setSelected(entry);
    setEditBody(entry.body);
    setEditMood(entry.mood);
    setEditing(false);
  }

  // Mood streak from recent entries
  const moodStreak = entries.slice(0, 7).filter((e) => e.mood).map((e) => e.mood!);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mood streak */}
      {moodStreak.length > 0 && (
        <View style={styles.streakRow}>
          <Text style={styles.streakLabel}>Recent mood</Text>
          <View style={styles.streakMoods}>
            {moodStreak.map((m, i) => (
              <Text key={i} style={styles.streakEmoji}>{m}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Composer */}
      <View style={styles.composer}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>New entry</Text>
          <View style={{ backgroundColor: "#f3eadc", borderWidth: 1, borderColor: "#dfcfb8", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6a5742" }}>sensitive</Text>
          </View>
        </View>

        {/* Reflection prompt */}
        <Pressable onPress={cyclePrompt} style={styles.promptRow}>
          <Text style={styles.promptText}>💡 {REFLECTION_PROMPTS[promptIdx]}</Text>
          <Text style={styles.promptHint}>tap for another</Text>
        </Pressable>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={REFLECTION_PROMPTS[promptIdx]}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
        />
        <View style={styles.moodRow}>
          {MOODS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMood(mood === m ? null : m)}
              style={[styles.moodBtn, mood === m && styles.moodBtnOn]}
            >
              <Text style={styles.moodEmoji}>{m}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.saveBtn, (!draft.trim() || saving) && styles.disabled]}
          disabled={!draft.trim() || saving}
          onPress={submit}
        >
          <Text style={styles.saveText}>{saving ? "Saving\u2026" : "Save entry"}</Text>
        </Pressable>
        <Pressable
          style={[styles.ocrBtn, ocrBusy && styles.disabled]}
          disabled={ocrBusy}
          onPress={pickAndOcr}
        >
          <Text style={styles.ocrText}>
            {ocrBusy ? "Reading photo\u2026" : "📷 Extract text from photo"}
          </Text>
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
        {entries.length === 0 ? (
          <Text style={styles.empty}>
            No entries yet. Reflections stay private — they're never sent to
            external models.
          </Text>
        ) : (
          entries.map((e) => (
            <Pressable key={e.id} onPress={() => openDetail(e)}>
              <View style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>{formatDate(e.created_at)}</Text>
                  {e.mood ? <Text style={styles.entryMood}>{e.mood}</Text> : null}
                </View>
                {e.title ? (
                  <Text style={styles.entryTitle}>{e.title}</Text>
                ) : null}
                <Text style={styles.entryBody} numberOfLines={4}>
                  {e.body}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Detail / Edit modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selected && !editing && (
              <>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>{formatDate(selected.created_at)}</Text>
                  {selected.mood ? <Text style={styles.entryMood}>{selected.mood}</Text> : null}
                </View>
                {selected.title ? <Text style={styles.entryTitle}>{selected.title}</Text> : null}
                <ScrollView style={{ maxHeight: 300, marginVertical: spacing.md }}>
                  <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{selected.body}</Text>
                </ScrollView>
                <View style={styles.modalActions}>
                  <Pressable style={styles.actionBtn} onPress={() => setEditing(true)}>
                    <Text style={styles.actionText}>✏️ Edit</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleDelete(selected)}>
                    <Text style={[styles.actionText, { color: colors.danger }]}>🗑️ Delete</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.actionText}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
            {selected && editing && (
              <>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: spacing.sm }}>Edit entry</Text>
                <TextInput
                  value={editBody}
                  onChangeText={setEditBody}
                  style={[styles.input, { minHeight: 120 }]}
                  multiline
                />
                <View style={[styles.moodRow, { marginTop: spacing.sm }]}>
                  {MOODS.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setEditMood(editMood === m ? null : m)}
                      style={[styles.moodBtn, editMood === m && styles.moodBtnOn]}
                    >
                      <Text style={styles.moodEmoji}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={[styles.modalActions, { marginTop: spacing.md }]}>
                  <Pressable style={styles.saveBtn} onPress={handleSaveEdit} disabled={saving}>
                    <Text style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => setEditing(false)}>
                    <Text style={styles.actionText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  streakLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  streakMoods: { flexDirection: "row", gap: 4 },
  streakEmoji: { fontSize: 18 },
  composer: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  promptRow: {
    backgroundColor: colors.soft,
    borderRadius: 12,
    padding: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  promptText: { color: colors.text, fontSize: 13, fontWeight: "500", flex: 1 },
  promptHint: { color: colors.textMuted, fontSize: 10 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  moodRow: { flexDirection: "row", gap: spacing.xs },
  moodBtn: {
    padding: spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  moodBtnOn: { borderColor: colors.primary, backgroundColor: colors.surface },
  moodEmoji: { fontSize: 20 },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
  ocrBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.soft,
  },
  ocrText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  disabled: { opacity: 0.4 },
  error: { color: colors.danger, padding: spacing.md, textAlign: "center" },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.xl },
  entry: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  entryDate: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  entryMood: { fontSize: 16 },
  entryTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  entryBody: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: spacing.lg,
    maxHeight: "80%",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.soft,
  },
  actionText: { color: colors.text, fontWeight: "600", fontSize: 13 },
});
