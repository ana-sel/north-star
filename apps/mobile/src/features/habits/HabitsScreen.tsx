import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { archiveHabit, completionDatesForHabits, createHabit, habitsForDate, tickHabit, untickHabit } from '@data/habits';
import type { HabitDayStatus } from '@data/habits';
import { getPref } from '@data/prefs';
import { getDeviceTimezone, localDateISO, localDateWindow } from '@lib/time';
import { colors, radii, shadows, spacing, theme, typography } from '@styles/theme';
import { Button, Card, EmptyState, Icon, LoadingState } from '@ui';
import type { IconName } from '@ui';
import { V1_HABIT_TEMPLATES } from './habitTemplates';
import { buildWeeklyDots, cadenceLabel, completionLookupWithSets, partitionHabitGroups, ritualStreakDays } from './habitsLogic';

type PaceMode = 'full' | 'lighter' | 'rest';
type RitualBucket = 'morning' | 'evening' | 'anytime';
type ManageRitual = 'morning' | 'evening';
type ManageStep = 'list' | 'templates' | 'custom';

interface HabitVisual {
  icon: IconName;
  color: string;
  note: string;
}

const RITUAL_COPY: Record<RitualBucket, { title: string; anchor: string; badge: IconName; badgeColor: string }> = {
  morning: {
    title: 'Morning ritual',
    anchor: 'Right after waking',
    badge: 'sun',
    badgeColor: colors.gold,
  },
  evening: {
    title: 'Evening ritual',
    anchor: 'After dinner',
    badge: 'moon',
    badgeColor: colors.steel,
  },
  anytime: {
    title: 'Anytime ritual',
    anchor: 'Any time today',
    badge: 'leaf',
    badgeColor: colors.olive,
  },
};

const TEMPLATE_ICON_BY_ID: Record<string, IconName> = {
  'water-on-waking': 'drop',
  'morning-daylight': 'sun',
  'medication-supplements': 'shield',
  'daily-movement': 'activity',
  'meditation-settling': 'brain',
  'phone-free-first-15': 'moon',
  'morning-spf': 'sun',
  'evening-oral-care': 'sparkle',
  'wind-down': 'wind',
};

const TEMPLATE_BY_NAME = new Map(
  V1_HABIT_TEMPLATES.map((template) => [normalize(template.name), template]),
);

function iconColor(icon: IconName): string {
  switch (icon) {
    case 'drop': return '#5B9BD5';
    case 'sun': return '#D4A843';
    case 'shield': return '#7395AD';
    case 'activity': return '#6DAB5E';
    case 'brain': return '#937CAF';
    case 'moon': return '#6E7FA8';
    case 'sparkle': return '#B07F86';
    case 'wind': return '#7CAE9E';
    case 'leaf': return '#77936F';
    default: return colors.inkMuted;
  }
}

function normalizePace(value: string): PaceMode {
  if (value === 'lighter' || value === 'rest') return value;
  return 'full';
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function habitVisual(row: HabitDayStatus): HabitVisual {
  const template = TEMPLATE_BY_NAME.get(normalize(row.habit.name));
  if (template) {
    const icon = TEMPLATE_ICON_BY_ID[template.id] ?? 'leaf';
    return {
      icon,
      color: iconColor(icon),
      note: template.minimumVersion,
    };
  }

  const icon = row.habit.icon === 'sun' || row.habit.icon === 'moon' || row.habit.icon === 'leaf'
    ? row.habit.icon
    : 'leaf';

  return {
    icon,
    color: iconColor(icon),
    note: row.habit.duration_min ? `${row.habit.duration_min} min focus` : 'Custom daily habit',
  };
}

export function HabitsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pace, setPace] = useState<PaceMode>('full');

  const [morning, setMorning] = useState<HabitDayStatus[]>([]);
  const [evening, setEvening] = useState<HabitDayStatus[]>([]);
  const [anytime, setAnytime] = useState<HabitDayStatus[]>([]);

  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [streakDatesDesc, setStreakDatesDesc] = useState<string[]>([]);
  const [completionLookup, setCompletionLookup] = useState<Record<string, Set<string>>>({});

  const [manageOpen, setManageOpen] = useState(false);
  const [manageRitual, setManageRitual] = useState<ManageRitual>('morning');
  const [pickerRitual, setPickerRitual] = useState<ManageRitual>('morning');
  const [manageStep, setManageStep] = useState<ManageStep>('list');
  const [customName, setCustomName] = useState('');

  const today = localDateISO();

  const load = useCallback(async () => {
    setError(null);
    const week = localDateWindow(7);
    const streakWindow = localDateWindow(56);

    try {
      const [rows, savedPace] = await Promise.all([
        habitsForDate(today),
        getPref<string>(`pace:${today}`, 'full'),
      ]);

      const grouped = partitionHabitGroups(rows);
      const habitIds = rows.map((row) => row.habit.id);
      const completionRows = await completionDatesForHabits(habitIds, streakWindow);

      setPace(normalizePace(savedPace));
      setMorning(grouped.morning);
      setEvening(grouped.evening);
      setAnytime(grouped.anytime);
      setWeekDates(week);
      setStreakDatesDesc([...streakWindow].reverse());
      setCompletionLookup(completionLookupWithSets(completionRows));
    } catch {
      setError('Could not load habits right now. Nothing is lost.');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleHabit = useCallback(async (row: HabitDayStatus) => {
    if (row.completed) {
      await untickHabit(row.habit.id, today);
    } else {
      await tickHabit(row.habit.id, today, getDeviceTimezone());
    }
    await load();
  }, [load, today]);

  const confirmArchive = useCallback((row: HabitDayStatus) => {
    Alert.alert('Archive habit?', row.habit.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await archiveHabit(row.habit.id);
          await load();
        },
      },
    ]);
  }, [load]);

  const openManage = useCallback((ritual: ManageRitual) => {
    setManageRitual(ritual);
    setPickerRitual(ritual);
    setManageStep('list');
    setCustomName('');
    setManageOpen(true);
  }, []);

  const closeManage = useCallback(() => {
    setManageOpen(false);
    setManageStep('list');
    setCustomName('');
  }, []);

  const activeForManage = manageRitual === 'morning' ? morning : evening;
  const activeForPicker = pickerRitual === 'morning' ? morning : evening;

  const addTemplate = useCallback(async (templateId: string) => {
    const template = V1_HABIT_TEMPLATES.find((candidate) => candidate.id === templateId && candidate.ritual === pickerRitual);
    if (!template) return;

    const alreadyAdded = activeForPicker.some((row) => normalize(row.habit.name) === normalize(template.name));
    if (alreadyAdded) {
      Alert.alert('Already in ritual', 'That template is already active in this ritual.');
      return;
    }

    await createHabit({
      name: template.name,
      ritual: pickerRitual,
      icon: TEMPLATE_ICON_BY_ID[template.id] ?? null,
      cadence: 'daily',
      days_mask: null,
      duration_min: null,
    });
    setManageRitual(pickerRitual);
    setManageStep('list');
    await load();
  }, [activeForPicker, load, pickerRitual]);

  const addCustom = useCallback(async () => {
    const name = customName.trim();
    if (!name) return;
    await createHabit({
      name,
      ritual: pickerRitual,
      icon: 'leaf',
      cadence: 'daily',
      days_mask: null,
      duration_min: null,
    });
    setManageRitual(pickerRitual);
    setManageStep('list');
    setCustomName('');
    await load();
  }, [customName, load, pickerRitual]);

  const sections = useMemo(() => {
    const base: RitualBucket[] = ['morning', 'evening'];
    if (anytime.length > 0) base.push('anytime');
    return base;
  }, [anytime.length]);

  if (loading) return <LoadingState />;

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card tone="muted" style={styles.lens}>
          <View style={styles.lensBadge}>
            <Icon name="leaf" size={18} color={colors.onDark} />
          </View>
          <View style={styles.lensText}>
            <Text style={styles.lensTitle}>Habits</Text>
            <Text style={styles.lensSub}>Your daily baseline rituals</Text>
          </View>
        </Card>

        <View style={styles.paceRow}>
          <Text style={styles.paceLabel}>Today's pace</Text>
          <View style={styles.paceSeg}>
            {(['full', 'lighter', 'rest'] as const).map((option) => (
              <View key={option} style={[styles.paceBtn, pace === option && styles.paceBtnOn]}>
                <Text style={[styles.paceBtnText, pace === option && styles.paceBtnTextOn]}>
                  {option === 'full' ? 'Full' : option === 'lighter' ? 'Lighter' : 'Rest'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {pace === 'rest' ? (
          <Card tone="muted" style={styles.banner}>
            <Icon name="shield" size={16} color={colors.steel} />
            <Text style={styles.bannerText}>Today is for rest. Just the bare minimum is enough. Nothing is lost.</Text>
          </Card>
        ) : null}

        {pace === 'lighter' ? (
          <Card tone="muted" style={styles.banner}>
            <Icon name="wind" size={16} color={colors.steel} />
            <Text style={styles.bannerText}>A lighter day still counts. Smaller reps, same direction.</Text>
          </Card>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {sections.map((section) => {
          const rows = section === 'morning' ? morning : section === 'evening' ? evening : anytime;
          const ritual = RITUAL_COPY[section];
          const streak = ritualStreakDays(
            rows.map((row) => row.habit.id),
            streakDatesDesc,
            completionLookup,
          );
          const doneCount = rows.filter((row) => row.completed).length;

          return (
            <Card key={section} style={styles.ritualCard}>
              <View style={styles.ritualHead}>
                <View style={[styles.ritualBadge, { backgroundColor: ritual.badgeColor }]}>
                  <Icon name={ritual.badge} size={18} color={colors.onDark} />
                </View>
                <View style={styles.ritualHeadText}>
                  <Text style={styles.ritualTitle}>{ritual.title}</Text>
                  <Text style={styles.ritualMeta}>{`${ritual.anchor} · ${doneCount} of ${rows.length} done`}</Text>
                </View>
                <View style={[styles.streakChip, streak >= 7 && styles.streakChipWarm]}>
                  <Text style={[styles.streakText, streak >= 7 && styles.streakTextWarm]}>{`${streak} day${streak === 1 ? '' : 's'}`}</Text>
                </View>
                {section !== 'anytime' ? (
                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => openManage(section as ManageRitual)}
                    activeOpacity={0.8}
                  >
                    <Icon name="pen" size={14} color={colors.ink} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {rows.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track}>
                  {rows.map((row, index) => {
                    const visual = habitVisual(row);
                    return (
                      <View key={row.habit.id} style={styles.trackNodeWrap}>
                        {index > 0 ? <View style={[styles.trackLink, rows[index - 1].completed && styles.trackLinkDone]} /> : null}
                        <View style={[styles.trackNode, row.completed && styles.trackNodeDone]}>
                          <Icon name={visual.icon} size={13} color={row.completed ? colors.onDark : visual.color} />
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : null}

              {rows.length === 0 ? (
                <EmptyState title="No habits yet" body="Templates are optional. Add one when it feels useful." />
              ) : (
                rows.map((row) => {
                  const visual = habitVisual(row);
                  const completedDates = completionLookup[row.habit.id] ?? new Set<string>();
                  const dots = buildWeeklyDots(weekDates, completedDates, today);
                  const freq = cadenceLabel(row.habit.cadence, row.habit.days_mask);

                  return (
                    <TouchableOpacity
                      key={row.habit.id}
                      style={[styles.habitRow, row.completed && styles.habitRowDone]}
                      onPress={() => toggleHabit(row)}
                      onLongPress={() => confirmArchive(row)}
                      activeOpacity={0.88}
                    >
                      <View style={[styles.tick, row.completed && styles.tickDone]}>
                        {row.completed ? <Icon name="check" size={12} color={colors.onDark} /> : null}
                      </View>
                      <View style={[styles.habitIcon, { backgroundColor: `${visual.color}24` }]}>
                        <Icon name={visual.icon} size={15} color={visual.color} />
                      </View>
                      <View style={styles.habitMain}>
                        <Text style={[styles.habitName, row.completed && styles.habitNameDone]}>{row.habit.name}</Text>
                        <Text style={styles.habitMeta}>{visual.note}</Text>
                      </View>
                      <View style={styles.habitRight}>
                        <View style={styles.dots}>
                          {dots.map((dot) => (
                            <View
                              key={`${row.habit.id}:${dot.localDate}`}
                              style={[
                                styles.dot,
                                dot.done && styles.dotDone,
                                dot.today && styles.dotToday,
                              ]}
                            />
                          ))}
                        </View>
                        <Text style={styles.freq}>{freq}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </Card>
          );
        })}
      </ScrollView>

      <Modal visible={manageOpen} transparent animationType="slide" onRequestClose={closeManage}>
        <View style={styles.sheetBack}>
          <TouchableOpacity style={styles.sheetOverlay} onPress={closeManage} />
          <View style={styles.sheet}>
            <View style={styles.sheetGrip} />
            <View style={styles.sheetHead}>
              {manageStep !== 'list' ? (
                <TouchableOpacity
                  style={styles.sheetBackBtn}
                  onPress={() => {
                    if (manageStep === 'custom') setManageStep('templates');
                    else setManageStep('list');
                  }}
                >
                  <Icon name="chev" size={14} color={colors.ink} />
                </TouchableOpacity>
              ) : <View style={styles.sheetBackBtn} />}
              <Text style={styles.sheetTitle}>
                {manageStep === 'list' ? `Manage ${manageRitual} ritual` : manageStep === 'templates' ? 'Choose a habit' : 'Create custom habit'}
              </Text>
              <TouchableOpacity style={styles.sheetClose} onPress={closeManage}>
                <Icon name="x" size={14} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>

            {manageStep === 'list' ? (
              <ScrollView contentContainerStyle={styles.sheetBody}>
                {activeForManage.map((row) => {
                  const visual = habitVisual(row);
                  return (
                    <View key={`manage:${row.habit.id}`} style={styles.manageRow}>
                      <View style={[styles.manageIcon, { backgroundColor: `${visual.color}24` }]}>
                        <Icon name={visual.icon} size={14} color={visual.color} />
                      </View>
                      <View style={styles.manageTextWrap}>
                        <Text style={styles.manageName}>{row.habit.name}</Text>
                        <Text style={styles.manageMeta}>{cadenceLabel(row.habit.cadence, row.habit.days_mask)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => confirmArchive(row)} style={styles.manageArchive}>
                        <Text style={styles.manageArchiveText}>Archive</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                <Button
                  label="New habit"
                  variant="secondary"
                  onPress={() => setManageStep('templates')}
                />
              </ScrollView>
            ) : null}

            {manageStep === 'templates' ? (
              <ScrollView contentContainerStyle={styles.sheetBody}>
                <View style={styles.ritualSeg}>
                  <TouchableOpacity
                    style={[styles.ritualSegBtn, pickerRitual === 'morning' && styles.ritualSegBtnOn]}
                    onPress={() => setPickerRitual('morning')}
                  >
                    <Icon name="sun" size={13} color={pickerRitual === 'morning' ? colors.ink : colors.inkMuted} />
                    <Text style={[styles.ritualSegText, pickerRitual === 'morning' && styles.ritualSegTextOn]}>Morning</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ritualSegBtn, pickerRitual === 'evening' && styles.ritualSegBtnOn]}
                    onPress={() => setPickerRitual('evening')}
                  >
                    <Icon name="moon" size={13} color={pickerRitual === 'evening' ? colors.ink : colors.inkMuted} />
                    <Text style={[styles.ritualSegText, pickerRitual === 'evening' && styles.ritualSegTextOn]}>Evening</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.customShortcut} onPress={() => setManageStep('custom')}>
                  <View style={styles.customShortcutIcon}>
                    <Icon name="plus" size={13} color={colors.onDark} />
                  </View>
                  <Text style={styles.customShortcutText}>Create your own</Text>
                </TouchableOpacity>

                {V1_HABIT_TEMPLATES.filter((template) => template.ritual === pickerRitual).map((template) => {
                  const icon = TEMPLATE_ICON_BY_ID[template.id] ?? 'leaf';
                  const added = activeForPicker.some((row) => normalize(row.habit.name) === normalize(template.name));
                  const color = iconColor(icon);
                  return (
                    <TouchableOpacity
                      key={template.id}
                      style={styles.templateRow}
                      onPress={() => addTemplate(template.id)}
                    >
                      <View style={[styles.templateIcon, { backgroundColor: `${color}24` }]}>
                        <Icon name={icon} size={16} color={color} />
                      </View>
                      <View style={styles.templateMain}>
                        <Text style={styles.templateName}>{template.name}</Text>
                        <Text style={styles.templateMeta}>{template.minimumVersion}</Text>
                      </View>
                      <View style={[styles.templateMark, added && styles.templateMarkOn]}>
                        {added ? <Icon name={pickerRitual === 'morning' ? 'sun' : 'moon'} size={12} color={colors.onDark} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {manageStep === 'custom' ? (
              <View style={styles.sheetBody}>
                <Text style={styles.customLabel}>Habit name</Text>
                <TextInput
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Name a daily habit"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.customInput}
                  autoFocus
                />
                <Text style={styles.customHint}>Templates are optional. Nothing is auto-activated.</Text>
                <Button label="Add to ritual" onPress={addCustom} disabled={customName.trim().length === 0} />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  lens: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  lensBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.olive,
  },
  lensText: { flex: 1 },
  lensTitle: {
    fontSize: typography.sizes.md,
    color: colors.ink,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  lensSub: {
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
    marginTop: 2,
  },
  paceRow: { gap: 8 },
  paceLabel: {
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    fontWeight: '600',
  },
  paceSeg: {
    flexDirection: 'row',
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 3,
    opacity: 0.75,
  },
  paceBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingVertical: 8,
  },
  paceBtnOn: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  paceBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    fontWeight: '700',
  },
  paceBtnTextOn: {
    color: colors.ink,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
    lineHeight: 19,
  },
  error: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    backgroundColor: '#FAF1EF',
    borderWidth: 1,
    borderColor: '#E6CAC4',
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ritualCard: { overflow: 'hidden' },
  ritualHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  ritualBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualHeadText: { flex: 1 },
  ritualTitle: {
    fontSize: typography.sizes.md,
    color: colors.ink,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  ritualMeta: {
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    marginTop: 2,
  },
  streakChip: {
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  streakChipWarm: {
    backgroundColor: '#F4EEE0',
    borderColor: '#E7D7B5',
  },
  streakText: {
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    fontWeight: '700',
  },
  streakTextWarm: {
    color: colors.gold,
  },
  manageBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  trackNodeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackLink: {
    width: 16,
    height: 2,
    backgroundColor: colors.border,
  },
  trackLinkDone: {
    backgroundColor: colors.accent,
  },
  trackNode: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvasLight,
  },
  trackNodeDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  habitRowDone: {
    backgroundColor: '#F8FAF7',
  },
  tick: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickDone: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  habitIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitMain: { flex: 1, minWidth: 0 },
  habitName: {
    fontSize: typography.sizes.md,
    color: colors.ink,
    fontWeight: '600',
    lineHeight: 18,
  },
  habitNameDone: {
    color: '#3D6E37',
  },
  habitMeta: {
    marginTop: 2,
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  habitRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotDone: {
    backgroundColor: colors.accent,
  },
  dotToday: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  freq: {
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    fontWeight: '700',
  },

  sheetBack: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 18, 16, 0.36)',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: spacing.lg,
  },
  sheetGrip: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHead: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  sheetBackBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  sheetTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.md,
    color: colors.ink,
    fontWeight: '700',
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  manageIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageTextWrap: { flex: 1 },
  manageName: {
    fontSize: typography.sizes.sm,
    color: colors.ink,
    fontWeight: '600',
  },
  manageMeta: {
    marginTop: 2,
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
  },
  manageArchive: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  manageArchiveText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    fontWeight: '700',
  },
  ritualSeg: {
    flexDirection: 'row',
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.sm,
  },
  ritualSegBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 9,
    paddingVertical: 8,
  },
  ritualSegBtnOn: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  ritualSegText: {
    fontSize: typography.sizes.sm,
    color: colors.inkMuted,
    fontWeight: '700',
  },
  ritualSegTextOn: {
    color: colors.ink,
  },
  customShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customShortcutIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customShortcutText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: '700',
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  templateIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateMain: { flex: 1 },
  templateName: {
    fontSize: typography.sizes.sm,
    color: colors.ink,
    fontWeight: '700',
  },
  templateMeta: {
    marginTop: 2,
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  templateMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateMarkOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  customLabel: {
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  customInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: theme.typography.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customHint: {
    fontSize: typography.sizes.xs,
    color: colors.inkMuted,
    lineHeight: 16,
  },
});
