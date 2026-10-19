import { featuredBrowsePathIds, groupJourneysForDisplay, groupReturnsByMonth, journeyProgressLine, journeyView, returnDayLabel, stageInfoForReturns, suggestedPathIds } from '../src/features/paths/pathsLogic';
import type { PathProgress } from '../src/data/paths';

function journey(partial: Partial<PathProgress> & Pick<PathProgress, 'journey_type' | 'path_id' | 'status'>): PathProgress {
  return {
    journey_type: partial.journey_type,
    path_id: partial.path_id,
    status: partial.status,
    current_camp: partial.current_camp ?? 1,
    started_at: partial.started_at ?? '2026-09-01T00:00:00.000Z',
    camp1_closed_at: partial.camp1_closed_at ?? null,
    camp2_closed_at: partial.camp2_closed_at ?? null,
    camp3_closed_at: partial.camp3_closed_at ?? null,
    claimed_at: partial.claimed_at ?? null,
    notes: partial.notes ?? null,
    updated_at: partial.updated_at ?? '2026-09-01T00:00:00.000Z',
  };
}

describe('Paths logic', () => {
  it('filters featured browse ids to keep V1 featured only while hiding active/resting/integrated paths', () => {
    const featured = ['stillness', 'warmth', 'curiosity', 'agency'] as const;
    const progressRows: PathProgress[] = [
      journey({ journey_type: 'path', path_id: 'stillness', status: 'active' }),
      journey({ journey_type: 'path', path_id: 'warmth', status: 'resting' }),
      journey({ journey_type: 'path', path_id: 'curiosity', status: 'integrated' }),
      journey({ journey_type: 'path', path_id: 'agency', status: 'seeded' }),
      journey({ journey_type: 'foundation', path_id: 'foundation:regulate', status: 'active' }),
    ];

    expect(featuredBrowsePathIds(featured, progressRows)).toEqual(['agency']);
  });

  it('groups active and resting journeys and preserves chronological order', () => {
    const rows: PathProgress[] = [
      journey({ journey_type: 'path', path_id: 'warmth', status: 'resting', started_at: '2026-09-04T00:00:00.000Z' }),
      journey({ journey_type: 'foundation', path_id: 'foundation:regulate', status: 'active', started_at: '2026-09-03T00:00:00.000Z' }),
      journey({ journey_type: 'path', path_id: 'stillness', status: 'active', started_at: '2026-09-01T00:00:00.000Z' }),
      journey({ journey_type: 'path', path_id: 'play', status: 'seeded', started_at: '2026-09-02T00:00:00.000Z' }),
    ];

    const grouped = groupJourneysForDisplay(rows);

    expect(grouped.active.map((row) => row.path_id)).toEqual(['stillness', 'foundation:regulate']);
    expect(grouped.resting.map((row) => row.path_id)).toEqual(['warmth']);
  });

  it('computes 3/9/15 stage progression and reflection availability', () => {
    expect(stageInfoForReturns(0)).toMatchObject({ stage: 1, stageLabel: 'Watching', nextThreshold: 3, reflectionOpen: false });
    expect(stageInfoForReturns(3)).toMatchObject({ stage: 2, stageLabel: 'Doing', nextThreshold: 9, reflectionOpen: false });
    expect(stageInfoForReturns(9)).toMatchObject({ stage: 3, stageLabel: 'Under pressure', nextThreshold: 15, reflectionOpen: false });
    expect(stageInfoForReturns(15)).toMatchObject({ stage: 3, stageLabel: 'Under pressure', nextThreshold: null, reflectionOpen: true, totalProgress: 1 });
  });

  it('maps stored status and returns to the five journey page states', () => {
    expect(journeyView(null, 0)).toBe('new');
    expect(journeyView('seeded', 0)).toBe('new');
    expect(journeyView('active', 14)).toBe('walking');
    expect(journeyView('active', 15)).toBe('reflection');
    expect(journeyView('resting', 4)).toBe('paused');
    expect(journeyView('integrated', 18)).toBe('steady');
  });

  it('describes progress with forward camp counters only', () => {
    expect(journeyProgressLine('new', 0)).toBe('Starts with Watching: three returns of only noticing.');
    expect(journeyProgressLine('walking', 2)).toBe('Camp 1 · Watching · 2 returns. 1 more opens Doing.');
    expect(journeyProgressLine('walking', 5)).toBe('Camp 2 · Doing · 5 returns. 4 more open Under pressure.');
    expect(journeyProgressLine('walking', 10)).toBe('Camp 3 · Under pressure · 10 returns. Reflection opens at 15.');
    expect(journeyProgressLine('paused', 1)).toBe('Paused at 1 return. Resume whenever you like; nothing is lost.');
    expect(journeyProgressLine('steady', 18)).toContain('nothing to keep up');
  });

  it('suggests at most three featured paths in a domain that are not already in use', () => {
    const domains: Record<string, string> = { stillness: 'Inward', selfpossession: 'Inward', nonattachment: 'Inward', resilience: 'Inward', warmth: 'Together' };
    const rows = [journey({ journey_type: 'path', path_id: 'stillness', status: 'active' })];
    expect(suggestedPathIds('Inward', Object.keys(domains), (id) => domains[id], rows)).toEqual(['selfpossession', 'nonattachment', 'resilience']);
    expect(suggestedPathIds('Together', Object.keys(domains), (id) => domains[id], rows)).toEqual(['warmth']);
  });

  it('labels the last return as today, yesterday, or a calendar day', () => {
    expect(returnDayLabel('2026-10-16', '2026-10-16')).toBe('today');
    expect(returnDayLabel('2026-10-15', '2026-10-16')).toBe('yesterday');
    expect(returnDayLabel('2026-10-12', '2026-10-16')).toBe('Monday 12 October');
  });

  it('groups returns by month, newest first, and marks the returns that opened camps', () => {
    const months = groupReturnsByMonth(['2026-09-21', '2026-09-29', '2026-10-05', '2026-10-10', '2026-10-14']);
    expect(months.map((m) => m.title)).toEqual(['October 2026', 'September 2026']);
    expect(months[0].days.map((d) => d.label)).toEqual(['Wednesday 14', 'Saturday 10', 'Monday 5']);
    expect(months[0].days[2].milestone).toBe('Camp 2 · Doing opened');
    expect(months[1].days.map((d) => d.milestone)).toEqual([null, null]);
  });
});
