import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CaptureDraft, captureThought, createCard, filterCard, FilterResponse } from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";
import { handleCommand } from "../utils/chatCommands";

interface Message {
  id: string;
  role: "user" | "system";
  text: string;
  draft?: CaptureDraft;
  saved?: boolean;
  savedCardId?: string;
  usedAi?: boolean;
  filterResult?: FilterResponse;
  filtering?: boolean;
}

/**
 * Chat Screen - matches design_habits_today.html "Home / Chat Command Centre".
 * Capture thoughts, ask agents, create cards. Mission-aligned, local-first AI.
 */
export function ChatScreen() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);

  async function onSend() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      // 1. Try slash command first (e.g. /spend 5 coffee).
      const cmd = await handleCommand(DEV_USER_ID, text);
      if (cmd) {
        setMessages((m) => [
          ...m,
          { id: `s-${Date.now()}`, role: "system", text: cmd.text },
        ]);
        return;
      }
      // 2. Otherwise fall through to the Capture Agent draft path.
      const result = await captureThought(DEV_USER_ID, text);
      setMessages((m) => [
        ...m,
        {
          id: `s-${Date.now()}`,
          role: "system",
          text: result.used_ai
            ? "Drafted via Capture Agent."
            : "Captured as a raw thought (local model unavailable).",
          draft: result.draft,
          usedAi: result.used_ai,
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: `s-${Date.now()}`, role: "system", text: `Error: ${e?.message ?? "capture failed"}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDraft(msg: Message) {
    if (!msg.draft || msg.saved) return;
    try {
      const card = await createCard({
        user_id: DEV_USER_ID,
        title: msg.draft.title,
        description: msg.draft.description,
        type: msg.draft.type,
        life_area: msg.draft.life_area,
        status: "inbox",
      });
      setMessages((m) => m.map((it) => (it.id === msg.id ? { ...it, saved: true, savedCardId: card.id, filtering: true } : it)));
      // Auto-run intake filter
      try {
        const fr = await filterCard(DEV_USER_ID, card.id);
        setMessages((m) => m.map((it) => (it.id === msg.id ? { ...it, filterResult: fr, filtering: false } : it)));
      } catch {
        setMessages((m) => m.map((it) => (it.id === msg.id ? { ...it, filtering: false } : it)));
      }
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header with pills */}
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.appTitle}>Chat</Text>
            <Text style={styles.appSub}>Capture thoughts, ask agents, create cards.</Text>
          </View>
        </View>

        <View style={styles.pillRow}>
          <View style={styles.pill}><Text style={styles.pillText}>Mission aligned</Text></View>
          <View style={styles.pill}><Text style={styles.pillText}>Local-first AI</Text></View>
        </View>

        {messages.length === 0 && (
          <View style={styles.hintCard}>
            <Text style={styles.hintText}>
              Type a thought — the Capture Agent will draft a card.{"\n"}
              Or use a slash command: /spend, /energy, /habit, /help.
            </Text>
          </View>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <View key={m.id} style={styles.userBubble}>
              <Text style={styles.userText}>{m.text}</Text>
            </View>
          ) : (
            <View key={m.id} style={styles.aiBubble}>
              <Text style={styles.aiText}>{m.text}</Text>
              {m.draft && (
                <View style={styles.draftCard}>
                  <View style={styles.draftHeader}>
                    <Text style={styles.draftTitle}>{m.draft.title}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{m.draft.type}</Text>
                    </View>
                  </View>
                  {m.draft.description ? (
                    <Text style={styles.draftDesc}>{m.draft.description}</Text>
                  ) : null}
                  <Text style={styles.draftMeta}>
                    {m.draft.life_area ? m.draft.life_area.replace(/_/g, " ") : "unclassified"}
                  </Text>
                  <Pressable
                    style={[styles.saveButton, m.saved && styles.saveButtonDone]}
                    disabled={m.saved}
                    onPress={() => onSaveDraft(m)}
                  >
                    <Text style={styles.saveButtonText}>{m.saved ? "Saved \u2713" : "Save as card"}</Text>
                  </Pressable>
                  {/* Intake filter result */}
                  {m.filtering && (
                    <View style={styles.filterRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.filterLabel}>Running mission filter...</Text>
                    </View>
                  )}
                  {m.filterResult && (
                    <View style={styles.filterCard}>
                      <Text style={styles.filterTitle}>
                        Mission Score: {m.filterResult.total}/70
                      </Text>
                      <View style={styles.scoreGrid}>
                        {Object.entries(m.filterResult.scores).map(([key, val]) => (
                          <View key={key} style={styles.scoreItem}>
                            <Text style={styles.scoreKey}>{key.replace(/_/g, " ")}</Text>
                            <Text style={styles.scoreVal}>{val}/10</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.filterDecisionRow}>
                        <View style={[
                          styles.decisionBadge,
                          m.filterResult.decision === "keep" && styles.decisionKeep,
                          m.filterResult.decision === "delete" && styles.decisionDelete,
                          m.filterResult.decision === "archive" && styles.decisionArchive,
                        ]}>
                          <Text style={styles.decisionText}>{m.filterResult.decision}</Text>
                        </View>
                        <View style={styles.wantBadge}>
                          <Text style={styles.wantText}>{m.filterResult.want_type.replace(/_/g, " ")}</Text>
                        </View>
                      </View>
                      {m.filterResult.reasoning ? (
                        <Text style={styles.filterReasoning}>{m.filterResult.reasoning}</Text>
                      ) : null}
                    </View>
                  )}
                </View>
              )}
            </View>
          )
        )}
        {busy && (
          <View style={styles.busyRow}><ActivityIndicator color={colors.primary} /></View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!busy}
        />
        <Pressable
          style={[styles.sendBtn, (busy || !input.trim()) && styles.sendDisabled]}
          onPress={onSend}
          disabled={busy || !input.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  appHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  appTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  appSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },

  pillRow: { flexDirection: "row", gap: spacing.sm },
  pill: { backgroundColor: "#fbf8f3", borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },

  hintCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.lg },
  hintText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },

  userBubble: { alignSelf: "flex-end", backgroundColor: "#efe5d7", borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, maxWidth: "85%" },
  userText: { color: colors.text, fontSize: 14, lineHeight: 20 },

  aiBubble: { alignSelf: "flex-start", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: spacing.md, maxWidth: "92%" },
  aiText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },

  draftCard: { marginTop: spacing.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md, gap: spacing.xs },
  draftHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  draftTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  draftDesc: { fontSize: 13, color: colors.text, lineHeight: 19 },
  draftMeta: { fontSize: 12, color: colors.textMuted },
  badge: { backgroundColor: "#f3eadc", borderWidth: 1, borderColor: "#dfcfb8", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#6a5742" },

  saveButton: { backgroundColor: colors.primary, padding: spacing.sm, borderRadius: 14, alignItems: "center", marginTop: spacing.sm },
  saveButtonDone: { backgroundColor: colors.success },
  saveButtonText: { color: "#fff", fontWeight: "600" },

  filterRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  filterLabel: { fontSize: 12, color: colors.textMuted },
  filterCard: { marginTop: spacing.sm, backgroundColor: "#faf7f2", borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.md, gap: spacing.sm },
  filterTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  scoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  scoreItem: { flexDirection: "row", gap: 4, width: "48%" },
  scoreKey: { fontSize: 11, color: colors.textMuted, textTransform: "capitalize", flex: 1 },
  scoreVal: { fontSize: 11, fontWeight: "700", color: colors.text },
  filterDecisionRow: { flexDirection: "row", gap: spacing.sm, marginTop: 2 },
  decisionBadge: { backgroundColor: "#e8e2d8", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  decisionKeep: { backgroundColor: "#d4edda" },
  decisionDelete: { backgroundColor: "#fce8e5" },
  decisionArchive: { backgroundColor: "#e2daf1" },
  decisionText: { fontSize: 11, fontWeight: "700", color: colors.text, textTransform: "uppercase" },
  wantBadge: { backgroundColor: "#f3eadc", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  wantText: { fontSize: 11, fontWeight: "600", color: "#6a5742" },
  filterReasoning: { fontSize: 12, color: colors.textMuted, fontStyle: "italic", lineHeight: 18 },

  busyRow: { padding: spacing.md, alignItems: "center" },

  inputRow: { flexDirection: "row", padding: spacing.md, gap: spacing.sm, borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: colors.surface },
  input: { flex: 1, color: colors.text, backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 40, maxHeight: 120 },
  sendBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, borderRadius: 16, justifyContent: "center" },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "600" },
});
