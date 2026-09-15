import { featuredBrowsePathIds, groupJourneysForDisplay, stageInfoForReturns } from '../src/features/paths/pathsLogic';
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
});
