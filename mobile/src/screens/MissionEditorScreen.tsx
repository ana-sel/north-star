import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import {
  MissionData,
  MissionQuestion,
  getMission,
  updateMission,
} from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

export function MissionEditorScreen() {
  const [data, setData] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    setLoading(true);
    try {
      setData(await getMission(DEV_USER_ID));
      setDirty(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load mission");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      setData(await updateMission(DEV_USER_ID, data));
      setDirty(false);
      Alert.alert("Saved", "Mission updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function setStatement(text: string) {
    if (!data) return;
    setData({ ...data, statement: text });
    setDirty(true);
  }

  function setQuestion(index: number, question: string) {
    if (!data) return;
    const questions = [...data.questions];
    questions[index] = { ...questions[index], question };
    setData({ ...data, questions });
    setDirty(true);
  }

  function addQuestion() {
    if (!data) return;
    if (data.questions.length >= 12) {
      Alert.alert("Limit", "Maximum 12 questions.");
      return;
    }
    setData({
      ...data,
      questions: [
        ...data.questions,
        { key: `custom_${Date.now()}`, question: "" },
      ],
    });
    setDirty(true);
  }

  function removeQuestion(index: number) {
    if (!data || data.questions.length <= 1) return;
    const questions = data.questions.filter((_, i) => i !== index);
    setData({ ...data, questions });
    setDirty(true);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>Personal Mission Statement</Text>
      <TextInput
        style={styles.statementInput}
        value={data.statement}
        onChangeText={setStatement}
        multiline
        placeholder="Your personal mission..."
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Mission Filter Questions</Text>
        <Pressable onPress={addQuestion}>
          <Text style={styles.addBtn}>+ Add</Text>
        </Pressable>
      </View>

      {data.questions.map((q, i) => (
        <View key={q.key} style={styles.questionRow}>
          <Text style={styles.questionKey}>{q.key}</Text>
          <TextInput
            style={styles.questionInput}
            value={q.question}
            onChangeText={(t) => setQuestion(i, t)}
            multiline
            placeholder="Question text..."
            placeholderTextColor={colors.textMuted}
          />
          {data.questions.length > 1 ? (
            <Pressable onPress={() => removeQuestion(i)}>
              <Text style={styles.removeBtn}>×</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {dirty ? (
        <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>
            {saving ? "Saving..." : "Save changes"}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statementInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    minHeight: 100,
    textAlignVertical: "top",
  },
  questionRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.xs,
  },
  questionKey: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  questionInput: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    minHeight: 40,
  },
  addBtn: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  removeBtn: {
    color: colors.danger ?? "#bf6b62",
    fontSize: 20,
    fontWeight: "700",
    alignSelf: "flex-end",
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
