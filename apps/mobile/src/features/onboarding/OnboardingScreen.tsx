/**
 * OnboardingScreen — v1 first-run.
 *
 * Three quiet slides + a suggestion: "Start with Stillness". Skipping
 * goes straight to Today with the empty state; accepting activates the
 * first path and drops you on Today with the anchor hero ready.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { theme } from '@styles/theme';
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
    title: 'Today. Log. Plan. You.',
    body: 'Today shows the practice. Log holds sleep and habits. Plan is where tasks land. You is where the paths grow.',
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
            <Text style={styles.eyebrow}>{SLIDES[idx].eyebrow.toUpperCase()}</Text>
            <Text style={styles.title}>{SLIDES[idx].title}</Text>
            <Text style={styles.text}>{SLIDES[idx].body}</Text>
          </>
        ) : (
          <>
            <Text style={styles.eyebrow}>SUGGESTED FIRST PATH</Text>
            <Text style={styles.title}>{FIRST_PATH_NAME}</Text>
            <Text style={styles.text}>
              You pause before you react, instead of after. A quiet, well-known place to start —
              you can always change paths on the You tab.
            </Text>
          </>
        )}
      </View>

      <View style={styles.dots}>
        {SLIDES.concat([{ eyebrow: '', title: '', body: '' }]).map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.actions}>
        {isLast ? (
          <>
            <TouchableOpacity style={styles.primary} onPress={handleStart} disabled={busy}>
              <Text style={styles.primaryText}>Start with {FIRST_PATH_NAME}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={handleSkip}>
              <Text style={styles.secondaryText}>I'll choose later</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primary} onPress={handleNext}>
            <Text style={styles.primaryText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing.lg, justifyContent: 'space-between' },
  body: { flex: 1, justifyContent: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.sm },
  eyebrow: { fontSize: theme.typography.xs, letterSpacing: 1.5, fontWeight: '700', color: theme.colors.olive },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.ink, letterSpacing: -0.5, lineHeight: 34 },
  text: { fontSize: theme.typography.md, color: theme.colors.muted, lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: theme.spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.line },
  dotOn: { width: 20, backgroundColor: theme.colors.olive },
  actions: { gap: theme.spacing.sm },
  primary: {
    backgroundColor: theme.colors.ink, borderRadius: theme.radii.full,
    paddingVertical: theme.spacing.md, alignItems: 'center',
  },
  primaryText: { color: theme.colors.card, fontWeight: '700', fontSize: theme.typography.md },
  secondary: {
    paddingVertical: theme.spacing.md, alignItems: 'center',
  },
  secondaryText: { color: theme.colors.muted, fontWeight: '600', fontSize: theme.typography.sm },
});
