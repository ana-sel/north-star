import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { localDateISO } from '@lib/time';
import { colors, radii, spacing } from '@styles/theme';
import { ListGroup, ListRow, NavBar, ReturnMarks, SectionHeader } from '@ui';
import { journeyContent } from './journeyContent';
import { groupReturnsByMonth, returnDayLabel } from './pathsLogic';
import { useJourney } from './useJourney';

interface ReturnsScreenProps {
  journeyId: string;
  onBack: () => void;
}

const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Health's Show All Data for a journey: every return and when each camp opened. */
export function ReturnsScreen({ journeyId, onBack }: ReturnsScreenProps) {
  const content = journeyContent(journeyId);
  const { returnDates, returns } = useJourney(journeyId);
  const months = groupReturnsByMonth(returnDates);
  const today = localDateISO();
  const first = returnDates[returnDates.length - 1];
  const span = first ? Math.max(dayNumber(today) - dayNumber(first), 1) : 1;
  const marks = first ? returnDates.map((d) => (dayNumber(d) - dayNumber(first)) / span) : [];

  return (
    <View style={styles.fill}>
      <NavBar backLabel={content?.title ?? 'Back'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">All returns</Text>
        <Text style={styles.line}>Each mark is a return. The gaps are rest.</Text>

        <View style={styles.card}>
          <Text style={styles.value}>
            {returns}
            <Text style={styles.unit}> {returns === 1 ? 'return' : 'returns'}</Text>
          </Text>
          {first && content ? (
            <ReturnMarks marks={marks} color={content.tone.base} from={returnDayLabel(first, today)} to="Today" />
          ) : (
            <Text style={styles.sub}>No returns yet. Your first one will appear here.</Text>
          )}
        </View>

        {months.map((month) => (
          <View key={month.title}>
            <SectionHeader title={month.title} />
            <ListGroup>
              {month.days.map((day) => (
                <ListRow key={day.localDate} title={day.label} subtitle={day.milestone ?? undefined} />
              ))}
            </ListGroup>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
  title: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.7 },
  line: { fontSize: 16, color: colors.inkMuted, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, marginTop: spacing.lg },
  value: { fontSize: 28, fontWeight: '700', color: colors.ink },
  unit: { fontSize: 15, fontWeight: '600', color: colors.inkMuted },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: spacing.sm },
});
