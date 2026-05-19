import React, { useState } from "react";
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
import * as DocumentPicker from "expo-document-picker";

import {
  importWearables,
  WearableDay,
  WearableImportResult,
} from "../api/wearables";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Wearables import — spec §13 nice-to-have.
 *
 * Accepts a JSON file exported from Apple Health / Fitbit / Garmin /
 * Oura. The file must match the shape:
 *
 *   {
 *     "source": "apple_health",
 *     "days": [
 *       { "log_date": "2026-05-19", "sleep_minutes": 420, "steps": 8200, ... }
 *     ]
 *   }
 *
 * For Apple Health: use the "Auto Export" community app, set the JSON
 * shape, then share to this app. For Fitbit/Oura: scripted export
 * (their official exports are CSV-only — you transform once).
 */
export function WearablesImportScreen() {
  const [source, setSource] = useState("apple_health");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WearableImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    fileName: string;
    dayCount: number;
  } | null>(null);

  async function pickAndImport() {
    if (busy) return;
    setError(null);
    setResult(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];

      setBusy(true);

      const text = await fetch(asset.uri).then((r) => r.text());
      let parsed: { source?: string; days?: WearableDay[] };
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("File is not valid JSON.");
      }

      const days = parsed.days ?? [];
      if (!Array.isArray(days) || days.length === 0) {
        throw new Error('JSON must include a non-empty "days" array.');
      }

      setPreview({ fileName: asset.name ?? "import.json", dayCount: days.length });

      const r = await importWearables({
        user_id: DEV_USER_ID,
        source: parsed.source ?? source,
        days,
      });
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Import failed");
      Alert.alert("Import failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h1}>Import wearable data</Text>
      <Text style={styles.muted}>
        Choose a JSON file exported from Apple Health, Fitbit, Garmin or
        Oura. Existing health log rows for the same dates are merged —
        only the fields you send overwrite existing values.
      </Text>

      <Text style={styles.label}>Default source (used if the file omits it)</Text>
      <TextInput
        style={styles.input}
        value={source}
        onChangeText={setSource}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="apple_health"
        placeholderTextColor={colors.textMuted}
      />

      <Pressable
        style={({ pressed }) => [
          styles.btn,
          pressed && { opacity: 0.7 },
          busy && { opacity: 0.5 },
        ]}
        onPress={pickAndImport}
        disabled={busy}
      >
        <Text style={styles.btnText}>
          {busy ? "Importing…" : "Pick JSON file & import"}
        </Text>
      </Pressable>

      {busy && (
        <View style={{ marginTop: spacing.lg }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {preview && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{preview.fileName}</Text>
          <Text style={styles.cardMeta}>
            {preview.dayCount} day{preview.dayCount === 1 ? "" : "s"} in file
          </Text>
        </View>
      )}

      {result && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import complete</Text>
          <Text style={styles.cardMeta}>Source: {result.source}</Text>
          <Text style={styles.cardMeta}>Created: {result.created}</Text>
          <Text style={styles.cardMeta}>Updated: {result.updated}</Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={[styles.muted, { marginTop: spacing.xl }]}>
        Expected fields per day: log_date (YYYY-MM-DD), sleep_minutes,
        steps, weight_kg, calories, bedtime, wake_time. All optional
        except log_date.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  h1: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  muted: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  btnText: { color: colors.surface, fontWeight: "600", fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  error: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 13,
  },
});
