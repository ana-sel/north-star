import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { API_BASE_URL, DEV_USER_ID } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

/**
 * Settings screen — app configuration.
 *
 * Covers: API endpoint, notifications, privacy defaults, theme hint.
 * Most settings are stored locally until JWT auth lands.
 */

export function SettingsScreen() {
  const { logout, userId } = useAuth();
  const [apiUrl, setApiUrl] = useState(API_BASE_URL);
  const [notifMorning, setNotifMorning] = useState(true);
  const [notifOverload, setNotifOverload] = useState(true);
  const [notifBedtime, setNotifBedtime] = useState(false);
  const [externalAI, setExternalAI] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);

  function handleSave() {
    Alert.alert(
      "Settings saved",
      "Settings are stored locally. Full persistence lands with JWT auth."
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection */}
      <Text style={styles.sectionTitle}>Connection</Text>
      <View style={styles.card}>
        <Text style={styles.label}>API Base URL</Text>
        <TextInput
          value={apiUrl}
          onChangeText={setApiUrl}
          style={styles.input}
          placeholder="http://localhost:8000"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Current user: {DEV_USER_ID.slice(0, 8)}…
        </Text>
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <SettingRow
          label="Morning review prompt"
          description="Remind to check today's plan at 8:00"
          value={notifMorning}
          onToggle={setNotifMorning}
        />
        <SettingRow
          label="Overload alert"
          description="Warn when >5 cards are in-progress"
          value={notifOverload}
          onToggle={setNotifOverload}
        />
        <SettingRow
          label="Bedtime reflection"
          description="Evening prompt to write a diary entry"
          value={notifBedtime}
          onToggle={setNotifBedtime}
        />
      </View>

      {/* Privacy */}
      <Text style={styles.sectionTitle}>Privacy & AI</Text>
      <View style={styles.card}>
        <SettingRow
          label="Allow external AI"
          description="Send redacted prompts to cloud providers (OpenAI, Claude)"
          value={externalAI}
          onToggle={setExternalAI}
        />
        <SettingRow
          label="Require approval for external"
          description="Show approval modal before any external call"
          value={requireApproval}
          onToggle={setRequireApproval}
        />
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🔒 Diary entries, healing reflections, and private cards never leave
            this device regardless of these settings.
          </Text>
        </View>
      </View>

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.card}>
        <Text style={styles.aboutText}>North Star — Personal Navigation OS</Text>
        <Text style={styles.hint}>v0.1.0 (local-first MVP)</Text>
        <Text style={styles.hint}>All data stays on your device by default.</Text>
      </View>

      <Pressable style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save settings</Text>
      </Pressable>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: colors.danger, marginTop: spacing.md }]}
        onPress={() =>
          Alert.alert("Log out?", "You'll need to sign in again.", [
            { text: "Cancel", style: "cancel" },
            { text: "Log out", style: "destructive", onPress: logout },
          ])
        }
      >
        <Text style={styles.saveBtnText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

function SettingRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: { fontSize: 13, fontWeight: "600", color: colors.text },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    color: colors.text,
    fontSize: 13,
  },
  hint: { fontSize: 11, color: colors.textMuted },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  settingLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  settingDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  infoBox: {
    backgroundColor: colors.soft,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  infoText: { fontSize: 12, color: colors.text, lineHeight: 18 },
  aboutText: { fontSize: 14, fontWeight: "600", color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
