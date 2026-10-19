/**
 * One content shape for Growth Paths and Foundations, so both render with the same journey page.
 * Content stays in pathsContent / foundationsContent; this only adapts it.
 */

import { foundationForJourneyId, FOUNDATION_TIER_NAMES } from '@features/foundations/foundationsContent';
import { DATA, DOMAINS } from '@features/paths/pathsContent';
import { palette, Tone } from '@styles/theme';
import type { IconName } from '@ui';

export interface JourneyContent {
  journeyId: string;
  kind: 'path' | 'foundation';
  title: string;
  line: string;
  /** Area display name for paths, tier name for foundations. */
  category: string;
  tone: Tone;
  icon: IconName;
  freq?: string;
  practice: string;
  counts: string;
  givesYou?: string[];
  examplesTitle?: string;
  examples?: string[];
  voice?: { tight: string; open: string };
  habitTemplateIds: string[];
  about: string;
}

export const DOMAIN_ICONS: Record<string, IconName> = { Inward: 'moon', Together: 'users', Craft: 'pen', Frontier: 'compass' };

const stripTags = (text: string) => text.replace(/<[^>]+>/g, '');
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const formatFreq = (freq: string) => freq.replace(/(\d)\s*[-\u2013]\s*(\d)\s*[x\u00d7]\s*\/\s*week/i, '$1\u2013$2\u00d7 a week');

export function journeyContent(journeyId: string): JourneyContent | null {
  const foundation = foundationForJourneyId(journeyId);
  if (journeyId.startsWith('foundation:')) {
    if (!foundation) return null;
    return {
      journeyId,
      kind: 'foundation',
      title: foundation.title,
      line: foundation.summary,
      category: FOUNDATION_TIER_NAMES[foundation.tier],
      tone: palette.foundation,
      icon: 'layers',
      practice: foundation.practice,
      counts: lowerFirst(foundation.countsWhen),
      examplesTitle: foundation.tools?.length ? 'Tools you can use' : undefined,
      examples: foundation.tools?.length ? foundation.tools : undefined,
      habitTemplateIds: foundation.habitTemplateIds,
      about: foundation.summary,
    };
  }

  const path = DATA[journeyId];
  if (!path) return null;
  const domain = DOMAINS[path.domain];
  const values = path.values.map((v) => v.toLowerCase());
  return {
    journeyId,
    kind: 'path',
    title: path.quality,
    line: path.shows,
    category: domain?.label ?? path.domain,
    tone: palette[path.domain as keyof typeof palette] ?? palette.Inward,
    icon: DOMAIN_ICONS[path.domain] ?? 'compass',
    freq: formatFreq(path.practice.freq),
    practice: stripTags(path.practice.what),
    counts: lowerFirst(stripTags(path.practice.counts)),
    givesYou: path.values,
    examplesTitle: path.situations?.length ? 'In real life' : undefined,
    examples: path.situations,
    voice: path.voice,
    habitTemplateIds: [],
    about: `${path.quality} gives you ${values.join(' and ')}. ${path.innerWork ? `A question to carry: ${path.innerWork}` : ''}`.trim(),
  };
}
