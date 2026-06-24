/**
 * HistoryScreen — V1 Sleep History
 * Paginated list of all past sleep entries
 * Shows local times (not UTC) and duration for each night
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { theme } from '@styles/theme';
import { useAuthStore, AuthStore } from '@hooks/useAuthStore';
import { getSleepHistory, deleteSleepEntry } from '@data/sleep';
import { utcToLocal, calculateDuration, getDeviceTimezone } from '@lib/time';
import { SleepEntry } from '../../../types/index';
import { supabaseConfigured } from '@lib/env';

const PAGE_SIZE = 20;

export function HistoryScreen() {
  const user = useAuthStore((s: AuthStore) => s.user);
  const profile = useAuthStore((s: AuthStore) => s.profile);

  const timezone = profile?.active_timezone ?? getDeviceTimezone();

  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(
    async (reset = false) => {
      if (!user?.id || !supabaseConfigured) { setIsLoading(false); setIsRefreshing(false); return; }

      const currentOffset = reset ? 0 : offset;

      if (reset) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await getSleepHistory(user.id, PAGE_SIZE, currentOffset);

        if (reset) {
          setEntries(data);
          setOffset(data.length);
        } else {
          setEntries((prev) => [...prev, ...data]);
          setOffset((prev) => prev + data.length);
        }

        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        console.error('HistoryScreen loadData error:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user, offset]
  );

  useEffect(() => {
    loadData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleDelete = useCallback(
    (entry: SleepEntry) => {
      Alert.alert(
        'Delete entry',
        'Remove this night from your history?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteSleepEntry(entry.id);
                setEntries((prev) => prev.filter((e) => e.id !== entry.id));
              } catch (err) {
                Alert.alert('Error', 'Could not delete entry. Please try again.');
                console.error('Delete entry error:', err);
              }
            },
          },
        ]
      );
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SleepEntry>) => {
      const entryTz = item.timezone ?? timezone;
      const bedLocal = utcToLocal(new Date(item.sleep_start_utc), entryTz);
      const wakeLocal = utcToLocal(new Date(item.sleep_end_utc), entryTz);
      const { formatted: duration } = calculateDuration(
        new Date(item.sleep_start_utc),
        new Date(item.sleep_end_utc)
      );

      const date = new Date(item.sleep_start_utc).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      return (
        <View style={styles.entryCard}>
          <View style={styles.entryLeft}>
            <Text style={styles.entryDate}>{date}</Text>
            <Text style={styles.entryTimes}>
              {bedLocal} → {wakeLocal}
            </Text>
            {item.timezone && item.timezone !== timezone && (
              <Text style={styles.entryTz}>{item.timezone}</Text>
            )}
          </View>
          <View style={styles.entryRight}>
            <Text style={styles.entryDuration}>{duration}</Text>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [timezone, handleDelete]
  );

  const keyExtractor = (item: SleepEntry) => item.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrapper}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>All logged nights</Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={theme.colors.olive}
          />
        }
        onEndReached={() => {
          if (hasMore && !isLoading) {
            loadData(false);
          }
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No sleep entries yet.{'\n'}
                Go to Today to log your first night.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  headerWrapper: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg + theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    fontWeight: '500',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.sm,
  },
  entryCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.card,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.sm,
  },
  entryLeft: {
    flex: 1,
    gap: 2,
  },
  entryDate: {
    fontSize: theme.typography.sm,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  entryTimes: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  entryTz: {
    fontSize: theme.typography.xs,
    color: theme.colors.muted,
  },
  entryRight: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  entryDuration: {
    fontSize: theme.typography.md,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  emptyState: {
    paddingVertical: theme.spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.md,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
