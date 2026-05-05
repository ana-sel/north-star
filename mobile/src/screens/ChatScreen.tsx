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
import {
  CaptureDraft,
  captureThought,
  createCard,
} from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

interface Message {
  id: string;
  role: "user" | "system";
  text: string;
  draft?: CaptureDraft;
  saved?: boolean;
  usedAi?: boolean;
}

/**
 * Spec §9 Chat Screen — primary capture surface.
 * Sends each message through the Capture Agent (local-only),
 * shows a card draft, lets the user save it as a `cards` row.
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
        {
          id: `s-${Date.now()}`,
          role: "system",
          text: `Error: ${e?.message ?? "capture failed"}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDraft(msg: Message) {
    if (!msg.draft || msg.saved) return;
    try {
      await createCard({
        user_id: DEV_USER_ID,
        title: msg.draft.title,
        description: msg.draft.description,
        type: msg.draft.type,
        life_area: msg.draft.life_area,
        status: "inbox",
      });
      setMessages((m) =>
        m.map((it) => (it.id === msg.id ? { ...it, saved: true } : it))
      );
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <Text style={styles.hint}>
            Type a thought. The Capture Agent will turn it into a card draft
            you can save.
          </Text>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <View key={m.id} style={[styles.bubble, styles.userBubble]}>
              <Text style={styles.userText}>{m.text}</Text>
            </View>
          ) : (
            <View key={m.id} style={[styles.bubble, styles.systemBubble]}>
              <Text style={styles.systemText}>{m.text}</Text>
              {m.draft && (
                <View style={styles.draft}>
                  <Text style={styles.draftLabel}>Draft</Text>
                  <Text style={styles.draftTitle}>{m.draft.title}</Text>
                  {m.draft.description ? (
                    <Text style={styles.draftDesc}>{m.draft.description}</Text>
                  ) : null}
                  <Text style={styles.draftMeta}>
                    {m.draft.type}
                    {m.draft.life_area ? ` · ${m.draft.life_area}` : ""}
                  </Text>
                  <Pressable
                    style={[styles.saveButton, m.saved && styles.saveButtonDone]}
                    disabled={m.saved}
                    onPress={() => onSaveDraft(m)}
                  >
                    <Text style={styles.saveButtonText}>
                      {m.saved ? "Saved ✓" : "Save as card"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )
        )}
        {busy && (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.primary} />
          </View>
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
          style={[styles.send, (busy || !input.trim()) && styles.sendDisabled]}
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
  hint: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 20,
  },
  bubble: { padding: spacing.md, borderRadius: 10, maxWidth: "92%" },
  userBubble: { backgroundColor: colors.primary, alignSelf: "flex-end" },
  userText: { color: "#fff", fontSize: 15 },
  systemBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  systemText: { color: colors.textMuted, fontSize: 13 },
  draft: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderColor: colors.border,
    borderWidth: 1,
  },
  draftLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  draftTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  draftDesc: { color: colors.text, fontSize: 13, marginBottom: spacing.xs },
  draftMeta: { color: colors.textMuted, fontSize: 12 },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 6,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveButtonDone: { backgroundColor: colors.success },
  saveButtonText: { color: "#fff", fontWeight: "600" },
  busy: { padding: spacing.md, alignItems: "center" },
  inputRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    maxHeight: 120,
  },
  send: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "600" },
});
