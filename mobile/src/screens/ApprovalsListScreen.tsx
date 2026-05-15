import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ApprovalListItem,
  listApprovals,
} from "../api/approvals";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";
import type { MoreStackParamList } from "../navigation/types";

/**
 * Lists pending approvals for the current dev user. Tap one to open the
 * review modal (ApprovalDetailScreen).
 */
export function ApprovalsListScreen() {
  const nav =
    useNavigation<
      NativeStackNavigationProp<MoreStackParamList, "ApprovalsList">
    >();
  const [items, setItems] = useState<ApprovalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listApprovals(DEV_USER_ID, "pending");
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load approvals");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No pending approvals.{"\n\n"}When an agent tries an external AI
            call with sensitive data, it will appear here for your review.
          </Text>
        }
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
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: colors.border },
            ]}
            onPress={() =>
              nav.navigate("ApprovalDetail", { approvalId: item.id })
            }
          >
            <View style={styles.rowHeader}>
              <Text style={styles.agent}>{item.agent_id}</Text>
              <Text style={styles.cost}>£{item.estimated_cost_gbp}</Text>
            </View>
            <Text style={styles.meta}>
              {item.provider} · {item.model}
            </Text>
            <Text style={styles.privacy}>
              privacy: {item.privacy_level} · {item.request_type}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg },
  error: {
    color: colors.danger,
    padding: spacing.md,
    textAlign: "center",
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 20,
  },
  row: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  agent: { color: colors.text, fontWeight: "600", fontSize: 15 },
  cost: { color: colors.warning, fontWeight: "600" },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs },
  privacy: { color: colors.textMuted, fontSize: 11 },
});
