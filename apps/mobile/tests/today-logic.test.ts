import { buildInsight, formatSleepDuration, isBelowSleepTarget, paceNote, sectionsForPace, shouldWelcomeBack, sleepTargetMinutes, sleepVsTarget } from '../src/features/today/todayLogic';

describe('Today pace', () => {
  it('shows the full set on a full day', () => {
    expect(sectionsForPace('full')).toEqual({ showSignals: true, banner: null });
    expect(paceNote('full')).toBeNull();
  });

  it('hides signals on a lighter day', () => {
    expect(sectionsForPace('lighter')).toEqual({ showSignals: false, banner: 'lighter' });
    expect(paceNote('lighter')).toMatch(/nothing is lost/i);
  });

  it('reduces to the essential floor on a rest day', () => {
    expect(sectionsForPace('rest')).toEqual({ showSignals: false, banner: 'rest' });
    expect(paceNote('rest')).toMatch(/rest/i);
  });
});

describe('Today coach fallback', () => {
  const base = {
    morningTotal: 3,
    morningDone: 1,
    sleptBelowTarget: false,
  };

  it('prioritises a gentle sleep note over other signals', () => {
    expect(buildInsight({ ...base, sleptBelowTarget: true })?.tag).toBe('Gentle note');
  });

  it('acknowledges a completed morning ritual', () => {
    const insight = buildInsight({ ...base, morningDone: 3 });
    expect(insight?.tag).toBe('Nicely done');
  });

  it('returns nothing when there is no signal worth surfacing', () => {
    expect(buildInsight(base)).toBeNull();
  });
});

describe('Today welcome-back', () => {
  it('greets after a three-day gap', () => {
    expect(shouldWelcomeBack('2026-09-01', '2026-09-04')).toBe(true);
  });

  it('stays quiet for short gaps, same day, or first run', () => {
    expect(shouldWelcomeBack('2026-09-03', '2026-09-04')).toBe(false);
    expect(shouldWelcomeBack('2026-09-04', '2026-09-04')).toBe(false);
    expect(shouldWelcomeBack(null, '2026-09-04')).toBe(false);
  });
});

describe('Today sleep target', () => {
  it('computes minutes from a saved target across midnight', () => {
    expect(sleepTargetMinutes({ bed: { h: 23, m: 0 }, wake: { h: 7, m: 0 } })).toBe(480);
    expect(sleepTargetMinutes({ bed: { h: 22, m: 30 }, wake: { h: 6, m: 0 } })).toBe(450);
  });

  it('returns null when no target is saved — never a hard-coded default', () => {
    expect(sleepTargetMinutes(null)).toBeNull();
  });

  it('flags below target only when a real target exists', () => {
    expect(isBelowSleepTarget(300, 480)).toBe(true);
    expect(isBelowSleepTarget(470, 480)).toBe(false);
    expect(isBelowSleepTarget(300, null)).toBe(false);
    expect(isBelowSleepTarget(null, 480)).toBe(false);
  });

  it('formats durations and compares them factually with the saved target', () => {
    expect(formatSleepDuration(470)).toBe('7 hr 50 min');
    expect(formatSleepDuration(480)).toBe('8 hr');
    expect(formatSleepDuration(45)).toBe('45 min');
    expect(sleepVsTarget(470, 480)).toBe('10 min under your 8 hr target');
    expect(sleepVsTarget(510, 480)).toBe('30 min over your 8 hr target');
    expect(sleepVsTarget(480, 480)).toBe('Right on your 8 hr target');
    expect(sleepVsTarget(470, null)).toBeNull();
  });
});
