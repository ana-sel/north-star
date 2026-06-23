/**
 * SleepForm Component
 * Time picker for bed time and wake time
 * Uses react-native-date-picker for native picker UI
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { theme } from '@styles/theme';
import { utcToLocal } from '@lib/time';

interface SleepFormProps {
  bedTime: Date;
  wakeTime: Date;
  durationLabel: string;
  timezone: string;
  onBedTimeChange: (date: Date) => void;
  onWakeTimeChange: (date: Date) => void;
}

type PickerMode = 'bed' | 'wake' | null;

export function SleepForm({
  bedTime,
  wakeTime,
  durationLabel,
  timezone,
  onBedTimeChange,
  onWakeTimeChange,
}: SleepFormProps) {
  const [openPicker, setOpenPicker] = useState<PickerMode>(null);

  const bedLabel = utcToLocal(bedTime, timezone);
  const wakeLabel = utcToLocal(wakeTime, timezone);

  return (
    <View style={styles.container}>
      {/* Bed time */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Went to bed</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => setOpenPicker('bed')}
            activeOpacity={0.7}
          >
            <Text style={styles.timeValue}>{bedLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>yesterday</Text>
        </View>
      </View>

      {/* Wake time */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Woke up</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => setOpenPicker('wake')}
            activeOpacity={0.7}
          >
            <Text style={styles.timeValue}>{wakeLabel}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>today</Text>
        </View>
      </View>

      {/* Duration */}
      <View style={styles.duration}>
        <Text style={styles.durationText}>= {durationLabel}</Text>
      </View>

      {/* Native date pickers (modal) */}
      <DatePicker
        modal
        open={openPicker === 'bed'}
        date={bedTime}
        mode="time"
        title="Went to bed"
        onConfirm={(date) => {
          setOpenPicker(null);
          onBedTimeChange(date);
        }}
        onCancel={() => setOpenPicker(null)}
      />

      <DatePicker
        modal
        open={openPicker === 'wake'}
        date={wakeTime}
        mode="time"
        title="Woke up"
        onConfirm={(date) => {
          setOpenPicker(null);
          onWakeTimeChange(date);
        }}
        onCancel={() => setOpenPicker(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
  },
  field: {
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  timeBtn: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minWidth: 120,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: theme.typography.xl,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  hint: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  duration: {
    backgroundColor: theme.colors.greige,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  durationText: {
    fontSize: theme.typography.md,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
});
