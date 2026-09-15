// SettingsScreen — v1: delete-my-data flow, no auth.

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '@styles/theme';
import { wipeAll } from '@lib/db';

interface SettingsScreenProps {
  onClose?: () => void;
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
  const [isWiping, setIsWiping] = useState(false);

  const handleDeleteMyData = () => {
    Alert.alert(
      'Delete all data?',
      'This removes every sleep entry, habit, path return and preference from this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setIsWiping(true);
            try {
              await wipeAll();
              Alert.alert('Done', 'Your data has been erased from this device.');
            } catch (err) {
              console.error('Wipe error:', err);
              Alert.alert('Something went wrong', 'Could not fully erase — please try again.');
            } finally {
              setIsWiping(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Privacy</Text>
          <View style={styles.card}>
            <Text style={styles.privacyText}>
              Compass v1 is fully local. Nothing leaves this device — no account,
              no server, no analytics.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your data</Text>
          <TouchableOpacity
            style={[styles.destructiveBtn, isWiping && styles.destructiveBtnDisabled]}
            onPress={handleDeleteMyData}
            disabled={isWiping}
            activeOpacity={0.7}
          >
            {isWiping ? (
              <ActivityIndicator color={theme.colors.error} size="small" />
            ) : (
              <Text style={styles.destructiveBtnText}>Delete all my data</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  privacyText: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  closeBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  closeBtnText: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.olive,
  },
  destructiveBtn: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  destructiveBtnDisabled: {
    opacity: 0.5,
  },
  destructiveBtnText: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.error,
  },
});
