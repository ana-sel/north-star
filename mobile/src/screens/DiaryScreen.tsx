import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  listDiary,
} from "../api/diary";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Diary screen — spec §9.
 *
 * Lists diary entries reverse-chronologically and provides a
 * quick-entry box with optional mood. Privacy level defaults to
 * SENSITIVE so reflections never leave the device through the gateway.
 */

const MOODS = ["😊", "😐", "😔", "😤", "😴", "🙏"];

export function DiaryScreen() {
  const [entries, setEntries] = useState<DiaryEntryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.composer}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>New entry</Text>
          <View style={{ backgroundColor: "#f3eadc", borderWidth: 1, borderColor: "#dfcfb8", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6a5742" }}>sensitive</Text>
          </View>
        </View>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="What's on your mind right now?"
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
            <View key={e.id} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryDate}>{formatDate(e.created_at)}</Text>
                {e.mood ? <Text style={styles.entryMood}>{e.mood}</Text> : null}
              </View>
              {e.title ? (
                <Text style={styles.entryTitle}>{e.title}</Text>
              ) : null}
              <Text style={styles.entryBody} numberOfLines={6}>
                {e.body}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
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
  composer: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.sm,
  },
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
});
