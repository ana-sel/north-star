import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { API_BASE_URL, DEV_USER_ID } from "../config/api";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing } from "../theme";

interface SearchHit {
  card: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    life_area: string | null;
    energy_required: string;
    priority: string;
  };
  distance: number;
}

async function searchCards(
  userId: string,
  query: string,
  limit = 20
): Promise<SearchHit[]> {
  const qs = new URLSearchParams({
    user_id: userId,
    q: query,
    limit: String(limit),
  });
  const resp = await fetch(`${API_BASE_URL}/cards/search?${qs.toString()}`);
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    throw new Error(body?.detail ?? `${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

export function SearchScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      setResults(await searchCards(DEV_USER_ID, q));
    } catch (e: any) {
      setError(e?.message ?? "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search cards…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          autoFocus
        />
        <Pressable
          style={[styles.btn, (loading || !query.trim()) && styles.disabled]}
          onPress={onSearch}
          disabled={loading || !query.trim()}
        >
          <Text style={styles.btnText}>{loading ? "…" : "Go"}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {!loading && searched && results.length === 0 && (
          <Text style={styles.empty}>No matching cards found.</Text>
        )}
        {results.map((hit) => {
          const relevance = Math.max(0, Math.round((1 - hit.distance) * 100));
          return (
            <Pressable
              key={hit.card.id}
              style={styles.row}
              onPress={() =>
                navigation.navigate("CardDetail", { cardId: hit.card.id })
              }
            >
              <View style={styles.rowHeader}>
                <Text style={styles.title} numberOfLines={2}>
                  {hit.card.title}
                </Text>
                <Text style={styles.relevance}>{relevance}%</Text>
              </View>
              {hit.card.description ? (
                <Text style={styles.desc} numberOfLines={2}>
                  {hit.card.description}
                </Text>
              ) : null}
              <View style={styles.meta}>
                <Text style={styles.pill}>{hit.card.type}</Text>
                <Text style={styles.pill}>
                  {hit.card.status.replace(/_/g, " ")}
                </Text>
                {hit.card.life_area ? (
                  <Text style={styles.pill}>
                    {hit.card.life_area.replace(/_/g, " ")}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.4 },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  center: { alignItems: "center", padding: spacing.xl },
  error: { color: colors.danger, padding: spacing.md },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  title: { color: colors.text, fontSize: 15, fontWeight: "600", flex: 1 },
  relevance: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  desc: { color: colors.textMuted, fontSize: 13 },
  meta: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  pill: {
    color: colors.textMuted,
    fontSize: 11,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
});
