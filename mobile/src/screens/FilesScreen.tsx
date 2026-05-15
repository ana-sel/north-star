import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";

import {
  FileEntry,
  deleteFile,
  fileDownloadUrl,
  listFiles,
  uploadFile,
} from "../api/files";
import { DEV_USER_ID } from "../config/api";
import { colors, spacing } from "../theme";

/**
 * Files screen — spec §9 private storage.
 *
 * All uploads land on the local backend disk under the user's folder
 * and are tagged PRIVATE — the gateway / external-AI policy never
 * forwards their contents.
 */
export function FilesScreen() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      setEntries(await listFiles(DEV_USER_ID));
    } catch (e: any) {
      Alert.alert("Load failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  async function pickAndUpload() {
    if (uploading) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      setUploading(true);
      await uploadFile(
        DEV_USER_ID,
        asset.uri,
        asset.name,
        asset.mimeType ?? null,
        category.trim() || null
      );
      load();
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  function confirmDelete(entry: FileEntry) {
    Alert.alert("Delete?", entry.filename, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFile(entry.id, DEV_USER_ID);
            load();
          } catch (e: any) {
            Alert.alert("Delete failed", e?.message ?? "Unknown error");
          }
        },
      },
    ]);
  }

  function openInBrowser(entry: FileEntry) {
    const url = fileDownloadUrl(entry.id, DEV_USER_ID);
    Linking.openURL(url).catch((e) =>
      Alert.alert("Open failed", e?.message ?? "Unknown error")
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.composer}>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Category (optional, e.g. tax, id, contracts)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Pressable
          style={[styles.uploadBtn, uploading && styles.disabled]}
          disabled={uploading}
          onPress={pickAndUpload}
        >
          <Text style={styles.uploadText}>
            {uploading ? "Uploading…" : "+ Pick & upload file"}
          </Text>
        </Pressable>
        <Text style={styles.note}>
          Files stay on this device. Privacy level is PRIVATE — the gateway
          never forwards their contents.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
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
      >
        {entries.length === 0 ? (
          <Text style={styles.empty}>No files yet.</Text>
        ) : (
          entries.map((e) => (
            <Pressable
              key={e.id}
              style={styles.row}
              onPress={() => openInBrowser(e)}
              onLongPress={() => confirmDelete(e)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{e.filename}</Text>
                <Text style={styles.rowMeta}>
                  {e.category ? `${e.category} · ` : ""}
                  {formatSize(e.size_bytes)}
                  {e.mime_type ? ` · ${e.mime_type}` : ""}
                </Text>
              </View>
              <Text style={styles.openHint}>open</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "?";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  composer: {
    padding: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    color: colors.text,
  },
  uploadBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: "center",
  },
  uploadText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  note: { color: colors.textMuted, fontSize: 11 },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { color: colors.textMuted, padding: spacing.xl, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.md,
  },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  openHint: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
