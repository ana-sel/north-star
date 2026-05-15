import React, { useEffect, useMemo, useState } from "react";
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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  CardOut,
  CardStatus,
  CardType,
  LifeArea,
  MissionResponse,
  deleteCard,
  getCard,
  scoreMission,
  updateCard,
} from "../api/cards";
import { DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "CardDetail">;

/**
 * Spec §9 card detail: full view + edit of one card.
 *
 * Shows everything `CardOut` exposes; lets the user edit the fields the
 * backend already accepts on `PATCH /cards/{id}` — title, description,
 * type, life_area, status, energy, priority. "Save" is one network call;
 * pull-to-refresh and delete also live here.
 */

const STATUSES: CardStatus[] = [
  "inbox",
  "filtered",
  "planned",
  "today",
  "in_progress_my_side",
  "in_progress_other_side",
  "review",
  "done",
  "later",
];

const TYPES: CardType[] = [
  "thought",
  "goal",
  "task",
  "habit",
  "health",
  "money",
  "diary",
  "research",
  "decision",
];

const LIFE_AREAS: { value: NonNullable<LifeArea>; label: string }[] = [
  { value: "health_energy", label: "Health & Energy" },
  { value: "mind_healing", label: "Mind & Healing" },
  { value: "money_freedom", label: "Money & Freedom" },
  { value: "work_skills", label: "Work & Skills" },
  { value: "home_property", label: "Home & Property" },
  { value: "joy_culture", label: "Joy & Culture" },
  { value: "family", label: "Family" },
];

const ENERGIES = ["low", "medium", "high"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

export function CardDetailScreen({ route, navigation }: Props) {
  const { cardId } = route.params;
  const [card, setCard] = useState<CardOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable buffer (so we can show "unsaved" state and revert).
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CardType>("task");
  const [status, setStatus] = useState<CardStatus>("inbox");
  const [lifeArea, setLifeArea] = useState<LifeArea>(null);
  const [energy, setEnergy] = useState<(typeof ENERGIES)[number]>("medium");
  const [priority, setPriority] =
    useState<(typeof PRIORITIES)[number]>("medium");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await getCard(cardId);
        if (!alive) return;
        setCard(c);
        setTitle(c.title);
        setDescription(c.description ?? "");
        setType(c.type);
        setStatus(c.status);
        setLifeArea(c.life_area);
        setEnergy(c.energy_required as (typeof ENERGIES)[number]);
        setPriority(c.priority as (typeof PRIORITIES)[number]);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [cardId]);

  const dirty = useMemo(() => {
    if (!card) return false;
    return (
      title !== card.title ||
      description !== (card.description ?? "") ||
      type !== card.type ||
      status !== card.status ||
      lifeArea !== card.life_area ||
      energy !== card.energy_required ||
      priority !== card.priority
    );
  }, [card, title, description, type, status, lifeArea, energy, priority]);

  async function onSave() {
    if (!card || !dirty) return;
    if (title.trim().length === 0) {
      Alert.alert("Title required", "A card needs a title.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCard(card.id, {
        title: title.trim(),
        description: description.trim() === "" ? null : description,
        type,
        status,
        life_area: lifeArea,
        energy_required: energy,
        priority: priority,
      });
      setCard(updated);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function onDelete() {
    if (!card) return;
    Alert.alert("Delete card?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCard(card.id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert("Delete failed", e?.message ?? "Unknown error");
          }
        },
      },
    ]);
  }

  const [missionLoading, setMissionLoading] = useState(false);
  const [mission, setMission] = useState<MissionResponse | null>(null);
  const [missionError, setMissionError] = useState<string | null>(null);

  // Hydrate from persisted scores when the card loads.
  useEffect(() => {
    if (!card?.mission_scores) return;
    const ms = card.mission_scores;
    const keys = Object.keys(ms).filter((k) => k !== "overall");
    if (keys.length === 0) return;
    const scores: Record<string, { score: number; note: string | null }> = {};
    for (const k of keys) {
      const e = ms[k];
      if (e && typeof e === "object" && typeof e.score === "number") {
        scores[k] = { score: e.score, note: e.note ?? null };
      }
    }
    if (Object.keys(scores).length === 0) return;
    setMission({
      card_id: card.id,
      scores,
      overall:
        typeof ms.overall === "number"
          ? ms.overall
          : Object.values(scores).reduce((a, b) => a + b.score, 0) /
            Math.max(1, Object.keys(scores).length),
      used_ai: false,
      audit_log_id: null,
      error: null,
    });
  }, [card?.id]);

  async function onScoreMission() {
    if (!card) return;
    setMissionLoading(true);
    setMissionError(null);
    try {
      const resp = await scoreMission(DEV_USER_ID, card.id);
      setMission(resp);
      if (resp.error) setMissionError(resp.error);
    } catch (e: any) {
      setMissionError(e?.message ?? "Failed");
    } finally {
      setMissionLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>{error ?? "Card not found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Field label="Title">
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder="Title"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field label="Description">
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multiline]}
          placeholder="(none)"
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </Field>

      <Field label="Status">
        <ChipRow
          values={STATUSES}
          selected={status}
          onSelect={(v) => setStatus(v as CardStatus)}
          renderLabel={(v) => v.replace(/_/g, " ")}
        />
      </Field>

      <Field label="Type">
        <ChipRow
          values={TYPES}
          selected={type}
          onSelect={(v) => setType(v as CardType)}
        />
      </Field>

      <Field label="Life area">
        <ChipRow
          values={["__none__", ...LIFE_AREAS.map((l) => l.value)]}
          selected={lifeArea ?? "__none__"}
          onSelect={(v) =>
            setLifeArea(v === "__none__" ? null : (v as LifeArea))
          }
          renderLabel={(v) =>
            v === "__none__"
              ? "—"
              : LIFE_AREAS.find((l) => l.value === v)?.label ?? v
          }
        />
      </Field>

      <Field label="Energy">
        <ChipRow
          values={ENERGIES as unknown as string[]}
          selected={energy}
          onSelect={(v) => setEnergy(v as (typeof ENERGIES)[number])}
        />
      </Field>

      <Field label="Priority">
        <ChipRow
          values={PRIORITIES as unknown as string[]}
          selected={priority}
          onSelect={(v) => setPriority(v as (typeof PRIORITIES)[number])}
        />
      </Field>

      <View style={styles.metaBlock}>
        <MetaRow label="Moved" value={String(card.moved_count)} />
        <MetaRow
          label="Created"
          value={new Date(card.created_at).toLocaleString()}
        />
        <MetaRow
          label="Updated"
          value={new Date(card.updated_at).toLocaleString()}
        />
        {card.completed_at ? (
          <MetaRow
            label="Completed"
            value={new Date(card.completed_at).toLocaleString()}
          />
        ) : null}
        <MetaRow label="Privacy" value={card.privacy_level} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.missionBlock}>
        <View style={styles.missionHeader}>
          <Text style={styles.missionTitle}>Mission filter</Text>
          {mission ? (
            <Text style={styles.missionOverall}>
              {mission.overall.toFixed(1)} / 10
            </Text>
          ) : null}
        </View>
        {mission ? (
          <View style={{ gap: 4 }}>
            {Object.entries(mission.scores).map(([k, v]) => (
              <View key={k} style={styles.missionRow}>
                <Text style={styles.missionLabel}>{k.replace(/_/g, " ")}</Text>
                <Text style={styles.missionScore}>{v.score}/10</Text>
                {v.note ? (
                  <Text style={styles.missionNote} numberOfLines={2}>
                    {v.note}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.missionEmpty}>
            Not scored yet. Run the Mission Agent to evaluate this card
            against the seven personal-mission filters.
          </Text>
        )}
        {missionError ? (
          <Text style={styles.error}>{missionError}</Text>
        ) : null}
        <Pressable
          style={[styles.missionBtn, missionLoading && styles.disabled]}
          onPress={onScoreMission}
          disabled={missionLoading}
        >
          <Text style={styles.missionBtnText}>
            {missionLoading
              ? "Scoring…"
              : mission
              ? "Re-score"
              : "Score against mission"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.saveButton, (!dirty || saving) && styles.disabled]}
        onPress={onSave}
        disabled={!dirty || saving}
      >
        <Text style={styles.saveText}>
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Text>
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteText}>Delete card</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({
  values,
  selected,
  onSelect,
  renderLabel,
}: {
  values: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
  renderLabel?: (v: string) => string;
}) {
  return (
    <View style={styles.chipRow}>
      {values.map((v) => {
        const on = v === selected;
        return (
          <Pressable
            key={v}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onSelect(v)}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>
              {renderLabel ? renderLabel(v) : v}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    color: colors.text,
    padding: spacing.md,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 12 },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  metaBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { color: colors.textMuted, fontSize: 12 },
  metaValue: { color: colors.text, fontSize: 12 },
  saveButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 18,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.4 },
  deleteButton: {
    padding: spacing.md,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteText: { color: colors.danger, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 12, textAlign: "center" },
  missionBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.sm,
  },
  missionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  missionTitle: { color: colors.text, fontWeight: "700", fontSize: 14 },
  missionOverall: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  missionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: 2,
  },
  missionLabel: { color: colors.text, fontSize: 12, minWidth: 110 },
  missionScore: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  missionNote: { color: colors.textMuted, fontSize: 11, flex: 1, minWidth: 0 },
  missionEmpty: { color: colors.textMuted, fontSize: 12 },
  missionBtn: {
    backgroundColor: colors.bg,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.sm,
    alignItems: "center",
  },
  missionBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
});
