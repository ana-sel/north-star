/**
 * AINoteCard Component
 * Displays an AI-generated (or rule-based fallback) sleep note
 * GDPR: only numbers sent to AI, never personal data
 */

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '@styles/theme';

interface AINoteCardProps {
  note: string | null;
  isLoading?: boolean;
  isAI?: boolean;
}

export function AINoteCard({ note, isLoading = false }: AINoteCardProps) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Gentle note</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.steel} />
          <Text style={styles.loadingText}>Thinking…</Text>
        </View>
      ) : (
        <Text style={styles.noteText}>
          {note ?? 'Log a few nights of sleep to see your note here.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.card,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.steel,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: theme.typography.md,
    color: theme.colors.ink,
    lineHeight: 24,
    fontWeight: '400',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
  },
});
