import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { listAllProgress, subscribeToJourneyChanges } from '@data/paths';
import type { PathProgress } from '@data/paths';
import { colors, palette, spacing } from '@styles/theme';
import { Button, Icon, ListGroup, ListRow, NavBar, Tile } from '@ui';
import { DOMAIN_ICONS, journeyContent } from './journeyContent';
import { DATA, DOMAINS, V1_FEATURED_PATH_IDS } from './pathsContent';
import { suggestedPathIds } from './pathsLogic';

const STATUS_TAG: Partial<Record<PathProgress['status'], string>> = { active: 'Walking', resting: 'Paused', integrated: 'Steady' };

function useProgressRows() {
  const [rows, setRows] = useState<PathProgress[]>([]);
  const load = useCallback(async () => setRows(await listAllProgress()), []);
  useEffect(() => {
    load();
    return subscribeToJourneyChanges(load);
  }, [load]);
  return rows;
}

interface PathListScreenProps {
  domain: string;
  /** 'area' lists every featured path; 'suggest' shows at most three not already in use. */
  mode: 'area' | 'suggest';
  heading?: string;
  backLabel: string;
  onBack: () => void;
  onOpenJourney: (journeyId: string) => void;
  onPreview: (journeyId: string) => void;
  onOpenArea?: (domain: string) => void;
}

export function PathListScreen({ domain, mode, heading, backLabel, onBack, onOpenJourney, onPreview, onOpenArea }: PathListScreenProps) {
  const rows = useProgressRows();
  const info = DOMAINS[domain];
  const tone = palette[domain as keyof typeof palette];
  const status = new Map(rows.filter((r) => r.journey_type === 'path').map((r) => [r.path_id, r.status]));
  const ids = mode === 'area'
    ? V1_FEATURED_PATH_IDS.filter((id) => DATA[id].domain === domain)
    : suggestedPathIds(domain, V1_FEATURED_PATH_IDS, (id) => DATA[id].domain, rows);

  return (
    <View style={styles.fill}>
      <NavBar backLabel={backLabel} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kicker}>
          <Icon name={DOMAIN_ICONS[domain]} size={15} color={tone.deep} />
          <Text style={[styles.kickerText, { color: tone.deep }]}>{mode === 'area' ? 'Growth paths' : heading}</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">{mode === 'area' ? info.label : 'Places to start'}</Text>
        <Text style={styles.line}>{mode === 'area' ? `${info.q}.` : `${info.label}: ${info.q.toLowerCase()}.`}</Text>

        <ListGroup style={styles.list}>
          {ids.map((id) => {
            const content = journeyContent(id);
            const state = status.get(id);
            const inUse = state === 'active' || state === 'resting' || state === 'integrated';
            return (
              <ListRow
                key={id}
                title={content?.title ?? id}
                subtitle={content?.line}
                value={state ? STATUS_TAG[state] : undefined}
                chevron
                onPress={() => (inUse ? onOpenJourney(id) : onPreview(id))}
              />
            );
          })}
        </ListGroup>
        {mode === 'suggest' && ids.length === 0 ? (
          <Text style={styles.foot}>You are already walking or holding every {info.label} path in this set.</Text>
        ) : null}
        <Text style={styles.foot}>Each path grows one quality across three camps: Watching, Doing, Under pressure.</Text>
        {mode === 'suggest' && onOpenArea ? (
          <Button label={`See all ${info.label} paths`} variant="ghost" onPress={() => onOpenArea(domain)} />
        ) : null}
      </ScrollView>
    </View>
  );
}

interface AreasScreenProps {
  backLabel: string;
  onBack: () => void;
  onOpenArea: (domain: string) => void;
}

/** The four path areas, named by what they give you. */
export function AreasScreen({ backLabel, onBack, onOpenArea }: AreasScreenProps) {
  const domains = Object.keys(DOMAINS);
  return (
    <View style={styles.fill}>
      <NavBar backLabel={backLabel} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kicker}>
          <Icon name="compass" size={15} color={colors.btn} />
          <Text style={[styles.kickerText, { color: colors.btn }]}>{V1_FEATURED_PATH_IDS.length} qualities</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">Growth paths</Text>
        <Text style={styles.line}>Each path grows one quality, a few times a week.</Text>
        <ListGroup inset={58} style={styles.list}>
          {domains.map((d) => (
            <ListRow
              key={d}
              title={DOMAINS[d].label}
              subtitle={DOMAINS[d].q}
              value={String(V1_FEATURED_PATH_IDS.filter((id) => DATA[id].domain === d).length)}
              leading={<Tile icon={DOMAIN_ICONS[d]} color={palette[d as keyof typeof palette].base} />}
              chevron
              onPress={() => onOpenArea(d)}
            />
          ))}
        </ListGroup>
        <Text style={styles.foot}>Every path has the same three camps: Watching, Doing, Under pressure.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  kickerText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  title: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.7, marginTop: 2 },
  line: { fontSize: 16, color: colors.inkMuted, marginTop: 6, lineHeight: 22 },
  list: { marginTop: spacing.lg },
  foot: { fontSize: 13, color: colors.inkMuted, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, lineHeight: 18 },
});
