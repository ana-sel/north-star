import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  ApprovalDetail,
  approveApproval,
  getApproval,
  rejectApproval,
} from "../api/approvals";
import { colors, spacing } from "../theme";
import type { MoreStackParamList } from "../navigation/types";

type RouteProps = NativeStackScreenProps<
  MoreStackParamList,
  "ApprovalDetail"
>["route"];

/**
 * Approval review modal (spec Phase 4): shows redacted prompt + redaction
 * map + cost, lets the user Approve or Reject. Approve runs the actual
 * external AI call server-side. Reject leaves nothing sent.
 */
export function ApprovalDetailScreen() {
  const nav =
    useNavigation<
      NativeStackNavigationProp<MoreStackParamList, "ApprovalDetail">
    >();
  const route = useRoute<RouteProps>();
  const { approvalId } = route.params;

  const [detail, setDetail] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await getApproval(approvalId));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load approval");
    } finally {
      setLoading(false);
    }
  }, [approvalId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onApprove() {
    setBusy(true);
    try {
      const result = await approveApproval(approvalId);
      Alert.alert(
        "Approved",
        result.error
          ? `Provider error: ${result.error}`
          : `Completed (${result.input_tokens}+${result.output_tokens} tokens, £${result.estimated_cost_gbp})`
      );
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Approve failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    setBusy(true);
    try {
      await rejectApproval(approvalId);
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Reject failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.error}>{error ?? "Not found"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Field label="Agent" value={detail.agent_id} />
        <Field label="Request" value={detail.request_type} />
        <Field
          label="Provider · Model"
          value={`${detail.provider} · ${detail.model}`}
        />
        <Field label="Privacy level" value={detail.privacy_level} />
        <Field
          label="Estimated cost"
          value={`£${detail.estimated_cost_gbp}`}
        />
        <Field
          label="Expires"
          value={new Date(detail.expires_at).toLocaleString()}
        />

        <Text style={styles.sectionLabel}>Redacted prompt</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>{detail.redacted_prompt}</Text>
        </View>

        <Text style={styles.sectionLabel}>Redaction map</Text>
        <View style={styles.codeBlock}>
          {Object.keys(detail.redaction_map).length === 0 ? (
            <Text style={styles.codeMuted}>(nothing redacted)</Text>
          ) : (
            Object.entries(detail.redaction_map).map(([k, v]) => (
              <Text key={k} style={styles.code}>
                {k}  →  {v}
              </Text>
            ))
          )}
        </View>

        <Text style={styles.notice}>
          Approving sends this redacted prompt to {detail.provider}. The
          original (with PII) stays on this device.
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.reject, busy && styles.disabled]}
          onPress={onReject}
          disabled={busy}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.approve, busy && styles.disabled]}
          onPress={onApprove}
          disabled={busy}
        >
          <Text style={styles.buttonText}>
            {busy ? "Working…" : "Approve & send"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  error: { color: colors.danger, padding: spacing.lg },
  field: { marginBottom: spacing.md },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  fieldValue: { color: colors.text, fontSize: 15 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  codeBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
  },
  code: {
    color: colors.text,
    fontFamily: "Courier",
    fontSize: 13,
    lineHeight: 18,
  },
  codeMuted: {
    color: colors.textMuted,
    fontFamily: "Courier",
    fontSize: 13,
  },
  notice: {
    color: colors.warning,
    fontSize: 12,
    marginTop: spacing.lg,
    lineHeight: 17,
  },
  actions: {
    flexDirection: "row",
    padding: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  approve: { backgroundColor: colors.primary },
  reject: { backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
