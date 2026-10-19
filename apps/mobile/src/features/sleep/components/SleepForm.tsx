// SleepForm — sleep dial plus tappable bed and wake times (Android native time dialog as the accessible fallback).

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing } from '@styles/theme';
import { Icon } from '@ui';
import { utcToLocal } from '@lib/time';
import { utcToZonedTime } from 'date-fns-tz';
import { SleepDial } from './SleepDial';

interface SleepFormProps {
  bedTime: Date;
  wakeTime: Date;
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
  timezone,
  bedHint,
  wakeHint,
  onBedTimeChange,
  onWakeTimeChange,
  bedLabel = 'Bedtime',
  wakeLabel = 'Wake',
  durationSuffix = 'hr asleep',
}: SleepFormProps) {
  const [openPicker, setOpenPicker] = useState<PickerMode>(null);

  const bedDisplay = utcToLocal(bedTime, timezone);
  const wakeDisplay = utcToLocal(wakeTime, timezone);
  const bedMinutes = bedTime.getHours() * 60 + bedTime.getMinutes();
  const wakeMinutes = wakeTime.getHours() * 60 + wakeTime.getMinutes();

  const changeDialTime = (mode: 'bed' | 'wake', minutes: number) => {
    const date = new Date(mode === 'bed' ? bedTime : wakeTime);
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    (mode === 'bed' ? onBedTimeChange : onWakeTimeChange)(date);
  };

  const handleChange =
    (mode: 'bed' | 'wake') => (event: DateTimePickerEvent, date?: Date) => {
      setOpenPicker(null);
      if (event.type === 'set' && date) {
        (mode === 'bed' ? onBedTimeChange : onWakeTimeChange)(date);
      }
    };

  return (
    <View>
      <SleepDial
        bedMinutes={bedMinutes}
        wakeMinutes={wakeMinutes}
        onBedChange={(minutes) => changeDialTime('bed', minutes)}
        onWakeChange={(minutes) => changeDialTime('wake', minutes)}
        caption={durationSuffix}
      />
      <View style={styles.times}>
        <TimeBox icon="moon" label={bedLabel} value={bedDisplay} hint={bedHint} onPress={() => setOpenPicker('bed')} />
        <TimeBox icon="sun" label={wakeLabel} value={wakeDisplay} hint={wakeHint} onPress={() => setOpenPicker('wake')} />
      </View>

      {/* Native time dialog (Android shows it on demand) */}
      {openPicker && (
        <DateTimePicker
          value={utcToZonedTime(openPicker === 'bed' ? bedTime : wakeTime, timezone)}
          mode="time"
          is24Hour
          onChange={handleChange(openPicker)}
        />
      )}
    </View>
  );
}

interface TimeBoxProps {
  icon: 'moon' | 'sun';
  label: string;
  value: string;
  hint: string;
  onPress: () => void;
}

function TimeBox({ icon, label, value, hint, onPress }: TimeBoxProps) {
  return (
    <TouchableOpacity
      style={styles.box}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}${hint ? `, ${hint}` : ''}. Change time`}
    >
      <View style={styles.boxLabel}>
        <Icon name={icon} size={14} color={colors.inkMuted} strokeWidth={2.4} />
        <Text style={styles.boxLabelText}>{label}</Text>
      </View>
      <Text style={styles.boxValue}>{value}</Text>
      {hint ? <Text style={styles.boxHint}>{hint}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', gap: 10 },
  box: { flex: 1, backgroundColor: colors.canvasDark, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  boxLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  boxLabelText: { fontSize: 13, fontWeight: '600', color: colors.inkMuted },
  boxValue: { fontSize: 22, fontWeight: '700', color: colors.ink, marginTop: 2 },
  boxHint: { fontSize: 12, color: colors.inkFaint, marginTop: spacing.xs / 2 },
});
