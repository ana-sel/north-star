import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { archiveHabit, completionDatesForHabits, createHabit, habitsForDate, tickHabit, untickHabit } from '@data/habits';
import type { HabitDayStatus } from '@data/habits';
import { getPref } from '@data/prefs';
import { getDeviceTimezone, localDateISO, localDateWindow } from '@lib/time';
import { colors, palette, radii, spacing } from '@styles/theme';
import { Button, CheckCircle, Icon, ListGroup, ListRow, LoadingState, Ring, SectionHeader, Sheet, SubNav, SummaryCard, SummaryValue, Tile } from '@ui';
import type { IconName } from '@ui';
import { normalizeHabitName as normalize, TEMPLATE_ICON_BY_ID, V1_HABIT_TEMPLATES } from './habitTemplates';
import { buildWeeklyDots, cadenceLabel, completionLookupWithSets, partitionHabitGroups } from './habitsLogic';

type PaceMode = 'full' | 'lighter' | 'rest';
type RitualBucket = 'morning' | 'evening' | 'anytime';
type ManageRitual = 'morning' | 'evening';
type ManageStep = 'list' | 'templates' | 'custom';

interface HabitVisual {
  icon: IconName;
  note: string;
}

const SECTION_TITLES: Record<RitualBucket, string> = {
  morning: 'Morning',
  evening: 'Evening',
  anytime: 'Anytime',
};

const PACE_LABEL: Record<PaceMode, string> = { full: 'Full', lighter: 'Lighter', rest: 'Rest' };

const PACE_SUB: Record<PaceMode, string> = {
  full: 'Daily baselines. Small is enough.',
  lighter: 'A lighter day still counts. Smaller reps, same direction.',
  rest: 'Today is for rest. The bare minimum is enough. Nothing is lost.',
};

const RITUAL_OPTIONS = [
  { key: 'morning', label: 'Morning' },
  { key: 'evening', label: 'Evening' },
];

const TEMPLATE_BY_NAME = new Map(
  V1_HABIT_TEMPLATES.map((template) => [normalize(template.name), template]),
);

function normalizePace(value: string): PaceMode {
  if (value === 'lighter' || value === 'rest') return value;
  return 'full';
}

function habitVisual(row: HabitDayStatus): HabitVisual {
  const template = TEMPLATE_BY_NAME.get(normalize(row.habit.name));
  if (template) {
    return { icon: TEMPLATE_ICON_BY_ID[template.id] ?? 'leaf', note: template.minimumVersion };
  }
  const icon = row.habit.icon === 'sun' || row.habit.icon === 'moon' || row.habit.icon === 'leaf'
    ? row.habit.icon
    : 'leaf';
  return { icon, note: row.habit.duration_min ? `${row.habit.duration_min} min focus` : 'Custom daily habit' };
}

export function HabitsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pace, setPace] = useState<PaceMode>('full');

  const [morning, setMorning] = useState<HabitDayStatus[]>([]);
  const [evening, setEvening] = useState<HabitDayStatus[]>([]);
  const [anytime, setAnytime] = useState<HabitDayStatus[]>([]);

  const [weekDates, setWeekDates] = useState<string[]>([]);
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

    try {
      const [rows, savedPace] = await Promise.all([
        habitsForDate(today),
        getPref<string>(`pace:${today}`, 'full'),
      ]);

      const grouped = partitionHabitGroups(rows);
      const habitIds = rows.map((row) => row.habit.id);
      const completionRows = await completionDatesForHabits(habitIds, week);

      setPace(normalizePace(savedPace));
      setMorning(grouped.morning);
      setEvening(grouped.evening);
      setAnytime(grouped.anytime);
      setWeekDates(week);
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

  const openAdd = useCallback(() => {
    setManageRitual('morning');
    setPickerRitual('morning');
    setManageStep('templates');
    setCustomName('');
    setManageOpen(true);
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

  const all = [...morning, ...evening, ...anytime];
  const doneTotal = all.filter((row) => row.completed).length;
  const tone = palette.habits;

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <SummaryCard label="Today" icon="leaf" color={tone.deep} right={`Pace · ${PACE_LABEL[pace]}`}>
          <View style={styles.split}>
            <View style={styles.flex}>
              {all.length > 0 ? (
                <SummaryValue parts={[{ value: String(doneTotal), unit: `of ${all.length} done` }]} />
              ) : (
                <Text style={styles.emptyValue}>No habits yet</Text>
              )}
              <Text style={styles.sub}>{PACE_SUB[pace]}</Text>
            </View>
            <Ring value={all.length ? doneTotal / all.length : 0} size={52} stroke={7} color={tone.base} trackColor={tone.soft} />
          </View>
        </SummaryCard>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {sections.map((section) => {
          const rows = section === 'morning' ? morning : section === 'evening' ? evening : anytime;
          return (
            <View key={section}>
              <SectionHeader
                title={SECTION_TITLES[section]}
                action={section !== 'anytime' ? { label: 'Edit', onPress: () => openManage(section as ManageRitual) } : undefined}
              />
              {rows.length === 0 ? (
                <ListGroup>
                  <ListRow
                    title="Nothing here yet"
                    subtitle="Templates are optional. Add one when it feels useful."
                    chevron
                    onPress={() => openManage(section as ManageRitual)}
                  />
                </ListGroup>
              ) : (
                <ListGroup inset={52}>
                  {rows.map((row) => {
                    const dots = buildWeeklyDots(weekDates, completionLookup[row.habit.id] ?? new Set<string>(), today);
                    const meta = [
                      row.habit.cadence !== 'daily' ? cadenceLabel(row.habit.cadence, row.habit.days_mask) : null,
                      row.completed ? null : habitVisual(row).note,
                    ].filter(Boolean).join(' · ');
                    return (
                      <TouchableOpacity
                        key={row.habit.id}
                        style={styles.habitRow}
                        onPress={() => toggleHabit(row)}
                        onLongPress={() => confirmArchive(row)}
                        activeOpacity={0.6}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: row.completed }}
                        accessibilityLabel={row.habit.name}
                        accessibilityHint="Long press to archive"
                      >
                        <CheckCircle done={row.completed} color={tone.base} />
                        <View style={styles.habitMain}>
                          <Text style={styles.habitName}>{row.habit.name}</Text>
                          {meta ? <Text style={styles.habitMeta}>{meta}</Text> : null}
                        </View>
                        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                          {dots.map((dot) => (
                            <View
                              key={dot.localDate}
                              style={[styles.dot, { backgroundColor: dot.done ? tone.base : tone.soft }]}
                            />
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ListGroup>
              )}
            </View>
          );
        })}

        <ListGroup>
          <ListRow
            title="Add a habit"
            tone="action"
            leading={<Icon name="plus" size={20} color={colors.accent} />}
            onPress={openAdd}
          />
        </ListGroup>
        <Text style={styles.foot}>
          Dots show the last 7 days. Pace is set on Today; a lighter day asks only for the minimum version.
        </Text>
      </ScrollView>
      <Sheet
        visible={manageOpen}
        onClose={closeManage}
        title={manageStep === 'list' ? `${SECTION_TITLES[manageRitual]} habits` : manageStep === 'templates' ? 'Add a habit' : 'Your own habit'}
        leading={manageStep !== 'list' ? (
          <TouchableOpacity
            style={styles.back}
            onPress={() => setManageStep(manageStep === 'custom' ? 'templates' : 'list')}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
          >
            <Icon name="back" size={16} color={colors.ink} />
          </TouchableOpacity>
        ) : undefined}
      >
        {manageStep === 'list' ? (
          <View style={styles.sheetBody}>
            {activeForManage.length > 0 ? (
              <ListGroup inset={58}>
                {activeForManage.map((row) => (
                  <ListRow
                    key={row.habit.id}
                    title={row.habit.name}
                    subtitle={cadenceLabel(row.habit.cadence, row.habit.days_mask)}
                    leading={<Tile icon={habitVisual(row).icon} color={palette.habits.base} />}
                    trailing={(
                      <TouchableOpacity onPress={() => confirmArchive(row)} accessibilityRole="button" accessibilityLabel={`Archive ${row.habit.name}`} hitSlop={8}>
                        <Text style={styles.archive}>Archive</Text>
                      </TouchableOpacity>
                    )}
                  />
                ))}
              </ListGroup>
            ) : (
              <Text style={styles.sub}>Nothing here yet.</Text>
            )}
            <Button label="Add a habit" variant="secondary" onPress={() => setManageStep('templates')} />
          </View>
        ) : null}

        {manageStep === 'templates' ? (
          <View style={styles.sheetBody}>
            <SubNav options={RITUAL_OPTIONS} value={pickerRitual} onChange={(key) => setPickerRitual(key as ManageRitual)} style={styles.seg} />
            <ListGroup inset={58}>
              <ListRow
                title="Create your own"
                tone="action"
                leading={<Tile icon="plus" color={colors.btn} />}
                chevron
                onPress={() => setManageStep('custom')}
              />
              {V1_HABIT_TEMPLATES.filter((template) => template.ritual === pickerRitual).map((template) => {
                const added = activeForPicker.some((row) => normalize(row.habit.name) === normalize(template.name));
                return (
                  <ListRow
                    key={template.id}
                    title={template.name}
                    subtitle={template.minimumVersion}
                    leading={<Tile icon={TEMPLATE_ICON_BY_ID[template.id] ?? 'leaf'} color={palette.habits.base} />}
                    trailing={added ? <CheckCircle done color={palette.habits.base} /> : undefined}
                    onPress={() => void addTemplate(template.id)}
                    accessibilityLabel={`${template.name}${added ? ', already added' : ''}`}
                  />
                );
              })}
            </ListGroup>
          </View>
        ) : null}

        {manageStep === 'custom' ? (
          <View style={styles.sheetBody}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Name a daily habit"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              accessibilityLabel="Habit name"
              autoFocus
            />
            <Text style={styles.foot}>Templates are optional. Nothing is auto-activated.</Text>
            <Button label={`Add to ${SECTION_TITLES[pickerRitual].toLowerCase()}`} onPress={() => void addCustom()} disabled={customName.trim().length === 0} />
          </View>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  flex: { flex: 1 },
  split: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: 3 },
  emptyValue: { fontSize: 17, fontWeight: '600', color: colors.ink },
  foot: { fontSize: 13, color: colors.inkMuted, lineHeight: 18, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  error: { fontSize: 14, color: colors.error, marginBottom: spacing.sm },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingVertical: 11, paddingHorizontal: spacing.lg },
  habitMain: { flex: 1, minWidth: 0 },
  habitName: { fontSize: 16, color: colors.ink },
  habitMeta: { fontSize: 13, color: colors.inkMuted, marginTop: 1, lineHeight: 18 },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  sheetBody: { gap: spacing.md, paddingTop: spacing.sm },
  back: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.canvasDark, alignItems: 'center', justifyContent: 'center' },
  archive: { fontSize: 15, color: colors.error },
  seg: { marginHorizontal: 0, marginBottom: 0 },
  input: { backgroundColor: colors.surface, borderRadius: radii.card, fontSize: 17, color: colors.ink, paddingHorizontal: spacing.lg, paddingVertical: 12 },
});
