import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CalendarEvent, CalendarFeed, getCalendarFeed } from "../api/calendar";
import { colors, spacing } from "../theme";

/**
 * Calendar feed reader — spec §13 nice-to-have.
 *
 * The user pastes a *secret* ICS URL (e.g. Google "Secret address in iCal
 * format" or iCloud public share). Nothing is stored on disk — the URL
 * lives in component state for the session. To persist it, add it later
 * to encrypted user settings.
 */
export function CalendarScreen() {
  const [url, setUrl] = useState("");
  const [days, setDays] = useState("14");
  const [feed, setFeed] = useState<CalendarFeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!url.trim()) {
      setError("Paste an ICS feed URL first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const parsedDays = Math.max(1, Math.min(90, Number(days) || 14));
      const f = await getCalendarFeed(url.trim(), parsedDays);
      setFeed(f);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load feed");
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, [url, days]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h1}>Calendar feed</Text>
      <Text style={styles.muted}>
        Paste a secret iCal/ICS URL. The URL is not stored on the device —
        you'll need to re-paste it after restarting the app.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="https://calendar.google.com/calendar/ical/..."
        placeholderTextColor={colors.textMuted}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <View style={styles.rowFlex}>
        <Text style={styles.label}>Days ahead</Text>
        <TextInput
          style={[styles.input, styles.inputSmall]}
          value={days}
          onChangeText={setDays}
          keyboardType="numeric"
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.btn,
          pressed && { opacity: 0.7 },
          loading && { opacity: 0.5 },
        ]}
        onPress={load}
        disabled={loading}
      >
        <Text style={styles.btnText}>{loading ? "Loading…" : "Fetch events"}</Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading && (
        <View style={{ marginTop: spacing.lg }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {feed && !loading && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.h2}>
            {feed.events.length} event{feed.events.length === 1 ? "" : "s"}
          </Text>
          {feed.events.length === 0 ? (
            <Text style={styles.muted}>No upcoming events in range.</Text>
          ) : (
            feed.events.map((ev) => <EventCard key={ev.uid} event={ev} />)
          )}
        </View>
      )}
    </ScrollView>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const start = new Date(event.start);
  const dateLabel = event.all_day
    ? start.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : start.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{event.summary || "(no title)"}</Text>
      <Text style={styles.cardMeta}>{dateLabel}</Text>
      {event.location && (
        <Text style={styles.cardMeta}>📍 {event.location}</Text>
      )}
      {event.description && (
        <Text style={styles.cardBody} numberOfLines={3}>
          {event.description}
        </Text>
      )}
    </View>
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
  h2: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  muted: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputSmall: { width: 80, marginLeft: spacing.sm },
  rowFlex: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  label: { color: colors.text, fontSize: 14 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  btnText: { color: colors.surface, fontWeight: "600", fontSize: 15 },
  error: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBody: {
    fontSize: 13,
    color: colors.text,
    marginTop: spacing.xs,
  },
});
