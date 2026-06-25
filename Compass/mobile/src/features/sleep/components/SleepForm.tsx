// SleepForm — bed and wake time pickers (Android native time dialog).

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '@styles/theme';
import { utcToLocal } from '@lib/time';

interface SleepFormProps {
  bedTime: Date;
  wakeTime: Date;
  durationLabel: string;
  timezone: string;
  bedHint: string;
  wakeHint: string;
  onBedTimeChange: (date: Date) => void;
  onWakeTimeChange: (date: Date) => void;
  bedLabel?: string;
  wakeLabel?: string;
  durationSuffix?: string;
}

type PickerMode = 'bed' | 'wake' | null;

export function SleepForm({
  bedTime,
  wakeTime,
  durationLabel,
  timezone,
  bedHint,
  wakeHint,
  onBedTimeChange,
  onWakeTimeChange,
  bedLabel = 'Went to bed',
  wakeLabel = 'Woke up',
  durationSuffix = 'time asleep',
}: SleepFormProps) {
  const [openPicker, setOpenPicker] = useState<PickerMode>(null);

  const bedDisplay = utcToLocal(bedTime, timezone);
  const wakeDisplay = utcToLocal(wakeTime, timezone);

  const handleChange =
    (mode: 'bed' | 'wake') => (event: DateTimePickerEvent, date?: Date) => {
      setOpenPicker(null);
      if (event.type === 'set' && date) {
        (mode === 'bed' ? onBedTimeChange : onWakeTimeChange)(date);
      }
    };

  return (
    <View style={styles.container}>
      {/* Bed time */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{bedLabel}</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => setOpenPicker('bed')}
            activeOpacity={0.7}
          >
            <Text style={styles.timeValue}>{bedDisplay}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{bedHint}</Text>
        </View>
      </View>

      {/* Wake time */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{wakeLabel}</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity
            style={styles.timeBtn}
            onPress={() => setOpenPicker('wake')}
            activeOpacity={0.7}
          >
            <Text style={styles.timeValue}>{wakeDisplay}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>{wakeHint}</Text>
        </View>
      </View>

      {/* Duration */}
      <View style={styles.duration}>
        <Text style={styles.durationBig}>{durationLabel}</Text>
        <Text style={styles.durationSmall}>{durationSuffix}</Text>
      </View>

      {/* Native time dialog (Android shows it on demand) */}
      {openPicker && (
        <DateTimePicker
          value={openPicker === 'bed' ? bedTime : wakeTime}
          mode="time"
          is24Hour
          onChange={handleChange(openPicker)}
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.greige,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.input,
    paddingVertical: theme.spacing.md,
  },
  durationBig: {
    fontSize: theme.typography.xl,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  durationSmall: {
    fontSize: theme.typography.sm,
    color: theme.colors.muted,
    fontWeight: '500',
  },
});
