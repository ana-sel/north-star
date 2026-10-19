/**
 * OnboardingScreen — v1 first-run.
 *
 * Three quiet slides + a suggestion: "Start with Stillness". Skipping
 * goes straight to Today with the empty state; accepting activates the
 * first path and drops you on Today with the anchor hero ready.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, palette, spacing } from '@styles/theme';
import { Button, Tile } from '@ui';
import { startPath } from '@data/paths';
import { setPref } from '@data/prefs';

interface OnboardingScreenProps {
  onDone: () => void;
}

const SLIDES = [
  {
    eyebrow: 'Welcome',
    title: 'A compass, not a map',
    body: 'Compass helps you notice — sleep, energy, habits, and the qualities you\'re growing. Nothing here is a target to hit.',
  },
  {
    eyebrow: 'How it works',
    title: 'One quality at a time',
    body: 'A path grows one quality — like stillness, or warmth — across three camps. The practice is spaced, never two days running.',
  },
  {
    eyebrow: 'What lives here',
    title: 'Today. Log. You.',
    body: 'Today shows your practice and Trello tasks when connected. Log holds sleep and habits. You is where the paths grow.',
  },
];

const FIRST_PATH_ID = 'stillness';
const FIRST_PATH_NAME = 'Stillness';

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const isLast = idx === SLIDES.length;

  const handleNext = () => setIdx((n) => n + 1);

  const handleStart = async () => {
    setBusy(true);
    try {
      await startPath(FIRST_PATH_ID);
      await setPref('onboarded', true);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    await setPref('onboarded', true);
    onDone();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        {!isLast ? (
          <>
            <Text style={styles.eyebrow}>{SLIDES[idx].eyebrow}</Text>
            <Text style={styles.title} accessibilityRole="header">{SLIDES[idx].title}</Text>
            <Text style={styles.text}>{SLIDES[idx].body}</Text>
          </>
        ) : (
          <>
            <Tile icon="moon" color={palette.Inward.base} size={44} />
            <Text style={[styles.eyebrow, { color: palette.Inward.deep }]}>Suggested first path</Text>
            <Text style={styles.title} accessibilityRole="header">{FIRST_PATH_NAME}</Text>
            <Text style={styles.text}>
              You pause before you react, instead of after. A quiet, well-known place to start —
              you can always change paths on the You tab.
            </Text>
          </>
        )}
      </View>

      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {SLIDES.concat([{ eyebrow: '', title: '', body: '' }]).map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.actions}>
        {isLast ? (
          <>
            <Button label={`Start with ${FIRST_PATH_NAME}`} onPress={() => void handleStart()} loading={busy} />
            <Button label="I'll choose later" variant="ghost" onPress={() => void handleSkip()} />
          </>
        ) : (
          <Button label="Continue" onPress={handleNext} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg, justifyContent: 'space-between' },
  body: { flex: 1, justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.sm },
  eyebrow: { fontSize: 13, fontWeight: '600', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, lineHeight: 40 },
  text: { fontSize: 17, color: colors.inkMuted, lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: spacing.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.canvasDark },
  dotOn: { width: 20, backgroundColor: colors.btn },
  actions: { gap: spacing.sm },
});
