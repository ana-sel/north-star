export const ACTIVE_JOURNEY_CAP = 3;
export const WATCHING_RETURNS = 3;
export const DOING_RETURNS = 9;
export const REFLECTION_RETURNS = 15;

export function journeyCampForReturns(returnCount: number): 1 | 2 | 3 {
  if (returnCount >= DOING_RETURNS) return 3;
  if (returnCount >= WATCHING_RETURNS) return 2;
  return 1;
}

export function canStartJourney(activeJourneyCount: number): boolean {
  return activeJourneyCount < ACTIVE_JOURNEY_CAP;
}

/** Starting and resuming both require a free active-journey slot. */
export const canResumeJourney = canStartJourney;