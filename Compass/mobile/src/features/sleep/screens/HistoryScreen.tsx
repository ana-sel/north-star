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
      const { formatted: duration } = calculateDuration(
        new Date(item.sleep_start_utc),
        new Date(item.sleep_end_utc)
      );

      // Day label: Today / Yesterday / Mon 18 Jun
      const entryDate = new Date(item.sleep_start_utc);
      const todayDate = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const sameDay = (a: Date, b: Date) =>
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear();
      let dayLabel: string;
      if (sameDay(entryDate, todayDate)) {
        dayLabel = 'Today';
      } else if (sameDay(entryDate, yesterday)) {
        dayLabel = 'Yesterday';
      } else {
        dayLabel = entryDate.toLocaleDateString('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short',
        });
      }

      return (
        <View style={styles.entryCard}>
          <View style={styles.entryLeft}>
            <Text style={styles.entryDay}>{dayLabel}</Text>
            <Text style={styles.entryMeta}>{duration} · bed {bedLocal}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [timezone, handleDelete]
  );

  const keyExtractor = (item: SleepEntry) => item.id;

  return (
    <SafeAreaView style={styles.container}>
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
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.sm,
  },
  entryLeft: {
    flex: 1,
    gap: 3,
  },
  entryDay: {
    fontSize: theme.typography.md,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: -0.2,
  },
  entryMeta: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 6,
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
