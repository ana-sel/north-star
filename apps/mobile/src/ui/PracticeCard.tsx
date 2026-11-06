import { ReactNode, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, spacing } from '@styles/theme';
import { Icon, IconName } from './Icon';

interface PracticeCardProps {
  label: string;
  labelColor: string;
  labelIcon?: IconName;
  freq?: string;
  /** Right side of the header as a link (e.g. "Camp 2 · Doing" opening the journey page). */
  headerAction?: { label: string; onPress: () => void };
  practice: string;
  counts: string;
  /** What success does not depend on ("Not when you feel calm"). */
  not?: string;
  /** The tight sentence and the one being practised, shown collapsed. */
  voice?: { tight: string; open: string };
  meta?: string;
  children?: ReactNode;
}

/** The practice, when it counts, and its action. Identical on Today and on the journey page. */
export function PracticeCard({ label, labelColor, labelIcon, freq, headerAction, practice, counts, not, voice, meta, children }: PracticeCardProps) {
  const [voiceOpen, setVoiceOpen] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.labelRow}>
          {labelIcon ? <Icon name={labelIcon} size={17} color={labelColor} /> : null}
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        </View>
        {headerAction ? (
          <TouchableOpacity style={styles.labelRow} onPress={headerAction.onPress} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.freq}>{headerAction.label}</Text>
            <Icon name="chev" size={14} color={colors.inkFaint} strokeWidth={2.4} />
          </TouchableOpacity>
        ) : freq ? (
          <Text style={styles.freq}>{freq}</Text>
        ) : null}
      </View>
      <Text style={styles.practice}>{practice}</Text>
      <Text style={styles.counts}>
        <Text style={styles.strong}>It counts when </Text>
        {counts}
      </Text>
      {not ? (
        <Text style={[styles.counts, styles.not]}>
          <Text style={styles.strong}>Not </Text>
          {not}
        </Text>
      ) : null}
      {voice ? (
        <View style={styles.voice}>
          <TouchableOpacity
            style={styles.voiceHead}
            onPress={() => setVoiceOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: voiceOpen }}
          >
            <Text style={styles.voiceTitle}>The sentence</Text>
            <View style={voiceOpen ? styles.chevOpen : undefined}>
              <Icon name="chev" size={14} color={colors.accent} strokeWidth={2.4} />
            </View>
          </TouchableOpacity>
          {voiceOpen ? (
            <>
              <Text style={styles.qLabel}>When it is tight</Text>
              <Text style={[styles.quote, styles.quoteTight]}>{voice.tight}</Text>
              <Text style={[styles.qLabel, styles.qLabelGap]}>The one you are practising</Text>
              <Text style={styles.quote}>{voice.open}</Text>
            </>
          ) : null}
        </View>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.lg, paddingTop: 14, marginBottom: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 15, fontWeight: '600' },
  freq: { fontSize: 14, color: colors.inkMuted },
  practice: { fontSize: 19, fontWeight: '700', color: colors.ink, lineHeight: 25, letterSpacing: -0.2, marginBottom: spacing.sm },
  counts: { fontSize: 15, color: colors.inkMuted, lineHeight: 21 },
  not: { marginTop: spacing.xs },
  strong: { color: colors.ink, fontWeight: '600' },
  actions: { marginTop: 14, gap: spacing.sm },
  voice: { marginTop: spacing.md, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  voiceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  voiceTitle: { fontSize: 15, fontWeight: '600', color: colors.accent },
  chevOpen: { transform: [{ rotate: '90deg' }] },
  qLabel: { fontSize: 12, fontWeight: '600', color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: spacing.sm },
  qLabelGap: { marginTop: spacing.md },
  quote: { fontSize: 15, fontStyle: 'italic', color: colors.ink, lineHeight: 21, marginTop: 2 },
  quoteTight: { color: colors.inkMuted },
  meta: { fontSize: 13, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.sm },
});
