import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CaptureDraft, captureThought, createCard, filterCard, FilterResponse, TriageInterpretation, TriageKind } from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";
import { handleCommand, matchCommands, type CommandDef } from "../utils/chatCommands";

interface Message {
  id: string;
  role: "user" | "system";
  text: string;
  draft?: CaptureDraft;
  triage?: TriageInterpretation;
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
  const { token, userId, profile } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);

  // Slice 0: Chat is scoped to the authenticated user. The shared
  // DEV_USER_ID is still in use across the other 24 screens; here we
  // prefer the real session id and fall back to DEV_USER_ID only so the
  // screen keeps rendering during the unauth bootstrap second.
  const scopedUserId = userId ?? DEV_USER_ID;

  async function onSend() {
    const text = input.trim();
    if (!text || busy) return;
    if (!token) {
      Alert.alert("Not signed in", "Please sign in again to capture thoughts.");
      return;
    }
    setInput("");
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      // 1. Try slash command first (e.g. /spend 5 coffee).
      const cmd = await handleCommand(scopedUserId, text);
      if (cmd) {
        setMessages((m) => [
          ...m,
          { id: `s-${Date.now()}`, role: "system", text: cmd.text },
        ]);
        return;
      }
      // 2. Otherwise fall through to the Capture Agent draft path.
      const result = await captureThought(token, text);
      setMessages((m) => [
        ...m,
        {
          id: `s-${Date.now()}`,
          role: "system",
          // Keep this humane regardless of whether the local AI was up.
          // Technical status (model availability, errors) belongs in
          // Settings — not in the conversation.
          text: "Caught. Here is a small next step you could take.",
          draft: result.draft,
          triage: result.triage,
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
        user_id: scopedUserId,
        title: msg.draft.title,
        description: msg.draft.description,
        type: msg.draft.type,
        life_area: msg.draft.life_area,
        status: "inbox",
      });
      setMessages((m) => m.map((it) => (it.id === msg.id ? { ...it, saved: true, savedCardId: card.id, filtering: true } : it)));
      // Auto-run intake filter
      try {
        const fr = await filterCard(scopedUserId, card.id);
        setMessages((m) => m.map((it) => (it.id === msg.id ? { ...it, filterResult: fr, filtering: false } : it)));
      } catch {
        setMessages((m) => m.map((it) => (it.id === msg.id ? { ...it, filtering: false } : it)));
      }
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    }
  }

  const [safeAutoOpen, setSafeAutoOpen] = useState(false);

  // Avatar initials come from the authenticated profile (display name
  // preferred, email as fallback). Until /auth/me lands we show two dots
  // rather than leaking the userId UUID prefix.
  const avatarLetters = getInitials(profile?.display_name, profile?.email);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* ── Fixed header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Chat</Text>
            <Text style={styles.headerSub}>Speak freely. I suggest — you decide.</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetters}</Text>
          </View>
        </View>

        <View style={styles.safeRow}>
          <Pressable style={styles.safeChip} onPress={() => setSafeAutoOpen(true)} hitSlop={6}>
            <View style={styles.safeDot} />
            <Text style={styles.safeChipText}>Safe Auto</Text>
          </Pressable>
          <Text style={styles.contextLabel}>This message only</Text>
        </View>
      </View>

      {/* ── Scrolling conversation ──────────────────────────────────── */}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Slim day-context bar — replaces the bigger "Today's signal" card.
            Slice 4/6 will source the body text from the most recent
            sleep/energy/mood log; Slice 1 hardcodes a calm placeholder. */}
        <View style={styles.stateBar}>
          <View style={styles.stateDot}><Text style={styles.stateDotText}>◐</Text></View>
          <Text style={styles.stateBarText}>
            <Text style={styles.stateBarStrong}>Low-sleep day.</Text> I'll keep decisions and workload light.
          </Text>
        </View>

        {messages.length === 0 && (
          <View style={styles.hintCard}>
            <Text style={styles.hintText}>
              Type a thought — the Capture Agent will draft a card.{"\n"}
              Or use a slash command: /spend, /energy, /habit, /help.
            </Text>
          </View>
        )}

        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <View key={m.id} style={[styles.messageRow, { justifyContent: "flex-end" }]}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{m.text}</Text>
                </View>
              </View>
            );
          }
          // System messages: inline interpretation line → AI bubble → recommendation card.
          // Slice 2: interpretation label comes from the server-side triage
          // classifier embedded in the capture response.
          const interpretLabel = humanizeTriage(m.triage?.kind);
          return (
            <View key={m.id}>
              {m.draft && (
                <View style={styles.interpretation}>
                  <Text style={styles.interpretText}>
                    Understood as: <Text style={styles.interpretStrong}>{interpretLabel}</Text>
                  </Text>
                  <Pressable style={styles.changeBtn} onPress={() => {}} hitSlop={4}>
                    <Text style={styles.changeBtnText}>Change</Text>
                  </Pressable>
                </View>
              )}

              {/* AI explanation bubble */}
              <View style={[styles.messageRow, { justifyContent: "flex-start" }]}>
                <View style={styles.aiMark}><Text style={styles.aiMarkText}>AI</Text></View>
                <View style={styles.aiBubble}>
                  <Text style={styles.aiText}>{m.text}</Text>
                </View>
              </View>

              {/* Recommendation card (only when we have a draft to suggest) */}
              {m.draft && (
                <View style={styles.recommendation}>
                  <View style={styles.recTop}>
                    <View style={styles.recIcon}><Text style={styles.recIconText}>✓</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recStrong}>Best next move</Text>
                      <Text style={styles.recSmall}>Choose the softer path. Keep it small enough to actually do.</Text>
                    </View>
                  </View>

                  <View style={styles.recList}>
                    <View style={styles.recItem}>
                      <View style={[styles.stripe, stripeColorForType(m.draft.type)]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recItemTitle}>{m.draft.title}</Text>
                        {m.draft.description ? (
                          <Text style={styles.recItemDesc}>{m.draft.description}</Text>
                        ) : (
                          <Text style={styles.recItemDesc}>
                            {m.draft.life_area ? m.draft.life_area.replace(/_/g, " ") : "unclassified"} · {m.draft.type}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.actionBtn, styles.actionPrimary, m.saved && styles.actionDone]}
                      disabled={m.saved}
                      onPress={() => onSaveDraft(m)}
                    >
                      <Text style={[styles.actionBtnText, styles.actionPrimaryText]}>
                        {m.saved ? "Saved ✓" : "Accept"}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => {}}>
                      <Text style={styles.actionBtnText}>Review</Text>
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => {}}>
                      <Text style={styles.actionBtnText}>Just talk</Text>
                    </Pressable>
                  </View>

                  {m.filtering && (
                    <View style={styles.filterRow}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.filterLabel}>Running mission filter…</Text>
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
          );
        })}

        {busy && (
          <View style={styles.busyRow}><ActivityIndicator color={colors.primary} /></View>
        )}
      </ScrollView>

      {/* ── Composer ────────────────────────────────────────────────── */}
      <View style={styles.composer}>
        {matchCommands(input).length > 0 && (
          <View style={styles.autocomplete} pointerEvents="box-none">
            {matchCommands(input).map((cmd: CommandDef) => (
              <Pressable
                key={cmd.name}
                style={({ pressed }) => [
                  styles.autocompleteRow,
                  pressed && { backgroundColor: colors.bg },
                ]}
                onPress={() => setInput(`/${cmd.name} `)}
              >
                <Text style={styles.autocompleteUsage}>{cmd.usage}</Text>
                <Text style={styles.autocompleteDesc}>{cmd.description}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <TextInput
          style={styles.composerInput}
          value={input}
          onChangeText={setInput}
          placeholder="Write anything…"
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!busy}
        />
        <View style={styles.composeBottom}>
          <Text style={styles.composeHint}>I'll suggest. You approve.</Text>
          <Pressable
            style={[styles.sendBtn, (busy || !input.trim()) && styles.sendDisabled]}
            onPress={onSend}
            disabled={busy || !input.trim()}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Safe Auto explanation sheet ─────────────────────────────── */}
      <Modal
        visible={safeAutoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSafeAutoOpen(false)}
      >
        <Pressable style={styles.sheetBg} onPress={() => setSafeAutoOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Safe Auto</Text>
                <Text style={styles.sheetSub}>
                  I choose the safest lane and ask before saving anything important.
                </Text>
              </View>
              <Pressable style={styles.sheetClose} onPress={() => setSafeAutoOpen(false)}>
                <Text style={styles.sheetCloseText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailStrong}>Feelings</Text>
                <Text style={styles.detailText}>Stay as conversation or diary unless you ask for actions.</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailStrong}>Tasks and habits</Text>
                <Text style={styles.detailText}>Suggested first. You confirm before they become active.</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailStrong}>Money / property decisions</Text>
                <Text style={styles.detailText}>Become careful briefs, not instant tasks.</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailStrong}>Patterns</Text>
                <Text style={styles.detailText}>Shown gently as hypotheses, not judgments.</Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Draft type → stripe colour. Mirrors the preview's green / blue / red palette.
function stripeColorForType(type: string) {
  if (type === "decision" || type === "money") return { backgroundColor: "#b8685f" };
  if (type === "goal" || type === "research") return { backgroundColor: "#7398b4" };
  return { backgroundColor: "#7b9b76" };
}

// Triage kind → a calm, plain-English label rendered in the
// `Understood as: …` interpretation line.
function humanizeTriage(kind?: TriageKind): string {
  switch (kind) {
    case "decision": return "a decision to think through";
    case "diary":    return "an emotional reflection";
    case "log":      return "a quick log";
    case "review":   return "a review note";
    case "sort":     return "an item to sort";
    case "talk":
    default:         return "a conversation";
  }
}

// Derive up to 2 avatar letters from display name (preferred) or email.
// Falls back to a calm placeholder so the chip never looks empty.
function getInitials(displayName?: string | null, email?: string | null): string {
  const name = (displayName ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  const e = (email ?? "").trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "••";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // ── Header ─────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  headerTitle: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -1 },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#d9c5a5",
    borderWidth: 1, borderColor: "#c9b99e",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontWeight: "900", color: "#5b4c39", fontSize: 13 },

  safeRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  safeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: "#fffaf3",
    borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 7,
    flexShrink: 1,
  },
  safeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#7b9b76",
  },
  safeChipText: { fontSize: 11, fontWeight: "800", color: "#5e4f3e" },
  contextLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "700" },

  // ── Scroll ─────────────────────────────────────────────────────────
  // Reserve ~190px at the bottom so the composer (multiline + hint row)
  // never overlaps the recommendation actions.
  scroll: { padding: spacing.lg, paddingBottom: 200, gap: spacing.sm },

  // ── Day-state bar (slim, replaces the old dayNote card) ────────
  stateBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: "#fffaf3",
    borderRadius: 19,
    paddingHorizontal: 11, paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  stateDot: {
    width: 22, height: 22, borderRadius: 9,
    backgroundColor: "#efe3d2",
    alignItems: "center", justifyContent: "center",
  },
  stateDotText: { fontSize: 12, color: "#5f554b" },
  stateBarText: { flex: 1, fontSize: 12.5, color: "#5f554b", lineHeight: 18 },
  stateBarStrong: { fontWeight: "800", color: colors.text },

  // ── Inline interpretation row (replaces the lane card) ─────────
  interpretation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    marginLeft: 37, // align under the AI avatar column below
  },
  interpretText: { flex: 1, fontSize: 12, color: "#6c604f" },
  interpretStrong: { fontWeight: "800", color: "#4f4438" },
  changeBtn: {
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: "#fffaf3",
    borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  changeBtnText: { fontSize: 10.5, fontWeight: "800", color: "#5e4f3e" },

  hintCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: spacing.lg },
  hintText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },

  // ── Messages ───────────────────────────────────────────────────────
  messageRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginVertical: spacing.xs },

  userBubble: {
    maxWidth: "86%",
    backgroundColor: "#eee3d4",
    borderWidth: 1, borderColor: "#d2c2aa",
    borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 11,
  },
  userText: { color: colors.text, fontSize: 13.5, lineHeight: 19 },

  aiMark: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#e7dccb",
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  aiMarkText: { fontSize: 11, fontWeight: "900", color: "#5b4d3d" },
  aiBubble: {
    maxWidth: "86%",
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 11,
  },
  aiText: { color: colors.text, fontSize: 13, lineHeight: 19 },

  // (lane card retired in v2 — see `interpretation` row above)

  // ── Recommendation card ───────────────────────────────────────────
  recommendation: {
    marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 23,
    padding: spacing.md,
  },
  recTop: { flexDirection: "row", gap: 9, alignItems: "flex-start", marginBottom: 9 },
  recIcon: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: "#2f271f",
    alignItems: "center", justifyContent: "center",
  },
  recIconText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  recStrong: { fontSize: 13.5, fontWeight: "800", color: colors.text, marginBottom: 2 },
  recSmall: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
  recList: { gap: 7, marginTop: 4 },
  recItem: {
    flexDirection: "row",
    gap: 9,
    borderWidth: 1, borderColor: "#eadfce",
    backgroundColor: "#fffaf3",
    borderRadius: 15,
    padding: 10,
  },
  stripe: { width: 5, borderRadius: 99, alignSelf: "stretch", minHeight: 32 },
  recItemTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 2 },
  recItemDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  actions: { flexDirection: "row", gap: 7, marginTop: 12, flexWrap: "wrap" },
  actionBtn: {
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: "#fffaf3",
    borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  actionBtnText: { fontSize: 11.5, fontWeight: "800", color: "#5f4f3d" },
  actionPrimary: { backgroundColor: "#2f271f", borderColor: "#2f271f" },
  actionPrimaryText: { color: "#fff" },
  actionDone: { backgroundColor: colors.success, borderColor: colors.success },

  // ── Mission-filter sub-card (kept from previous build) ────────────
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

  // ── Composer ─────────────────────────────────────────────────────
  composer: {
    margin: spacing.md,
    marginTop: 0,
    padding: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: "#fffdf8",
    borderRadius: 24,
  },
  composerInput: {
    minHeight: 78,
    maxHeight: 160,
    color: colors.text,
    backgroundColor: "#fbf7ef",
    borderWidth: 1, borderColor: "#eadfce",
    borderRadius: 17,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: "top",
  },
  composeBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  composeHint: { fontSize: 11.5, color: colors.textMuted },
  sendBtn: {
    backgroundColor: "#2f271f",
    borderRadius: 15,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  // ── Autocomplete dropdown ────────────────────────────────────────
  autocomplete: {
    position: "absolute",
    left: 10, right: 10,
    bottom: 110,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    elevation: 3,
  },
  autocompleteRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  autocompleteUsage: { fontSize: 13, fontWeight: "600", color: colors.text },
  autocompleteDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // ── Safe Auto modal ──────────────────────────────────────────────
  sheetBg: {
    flex: 1,
    backgroundColor: "rgba(36,29,22,0.46)",
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: "86%",
  },
  sheetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  sheetSub: { marginTop: 6, fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  sheetClose: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: "#fffaf3",
    alignItems: "center", justifyContent: "center",
  },
  sheetCloseText: { fontSize: 20, color: colors.text, lineHeight: 22 },
  detailList: { marginTop: spacing.md, gap: spacing.sm },
  detailRow: {
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: "#fffaf3",
    borderRadius: 16,
    padding: spacing.md,
  },
  detailStrong: { fontWeight: "800", color: colors.text, marginBottom: 3, fontSize: 13 },
  detailText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
