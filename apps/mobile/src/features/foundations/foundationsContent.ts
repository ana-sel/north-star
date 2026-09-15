export interface FoundationDefinition {
  id: string;
  title: string;
  tier: 1 | 2 | 3 | 4 | 5;
  summary: string;
  practice: string;
  countsWhen: string;
  tools?: string[];
  habitTemplateIds: string[];
}

export const FOUNDATIONS: readonly FoundationDefinition[] = [
  { id: 'body', title: 'Tend the Body', tier: 1, summary: 'Support the physical floor required for everything else.', practice: 'Notice one basic body need being neglected and meet it in the smallest useful way.', countsWhen: 'You meet one basic need in a small useful way.', habitTemplateIds: ['water-on-waking', 'morning-daylight', 'medication-supplements', 'daily-movement', 'morning-spf', 'evening-oral-care', 'wind-down'] },
  { id: 'regulate', title: 'Regulate', tier: 1, summary: 'Notice activation and settle enough to choose the next action.', practice: 'Notice activation. Use one settling tool. Continue when you have enough space to choose.', countsWhen: 'You use one settling tool and choose what comes next.', tools: ['Slow breathing', 'Orienting to surroundings', 'Grounding through senses', 'Longer exhale', 'Dropping shoulders'], habitTemplateIds: ['meditation-settling'] },
  { id: 'attention', title: 'Steady Your Attention', tier: 1, summary: 'Notice when attention has been captured and deliberately return it.', practice: 'Notice where attention went. Choose where to place it next. Return once.', countsWhen: 'You notice the capture and return once.', habitTemplateIds: ['phone-free-first-15'] },
  { id: 'feel', title: 'Feel & Name', tier: 2, summary: 'Recognise emotional experience rather than immediately acting from it.', practice: 'Name the feeling as specifically as possible and identify what you may need.', countsWhen: 'You name one feeling, with an optional need.', habitTemplateIds: [] },
  { id: 'clear', title: 'See Clearly', tier: 2, summary: 'Separate reality from interpretation, projection, and uncertainty.', practice: 'Split the situation into Fact / Story / Unknown.', countsWhen: 'You name a fact, a story, and an unknown where relevant.', habitTemplateIds: [] },
  { id: 'self', title: 'Self-relationship', tier: 2, summary: 'Treat yourself as worthy of care rather than using self-attack as motivation.', practice: 'Notice a harsh inner statement and answer it with a fairer, adult response.', countsWhen: 'You notice the harsh statement and offer a fairer response.', habitTemplateIds: [] },
  { id: 'know', title: 'Know Yourself', tier: 2, summary: 'Distinguish your values, wants, and needs from social approval.', practice: 'Ask: What do I actually want here if nobody is watching?', countsWhen: 'You identify one genuine preference, value, or need.', habitTemplateIds: [] },
  { id: 'communicate', title: 'Communicate', tier: 3, summary: 'Express needs, requests, limits, and repair clearly.', practice: 'Say the need, request, or no clearly and without unnecessary aggression or over-explaining.', countsWhen: 'You make one clear expression of need, request, limit, or repair.', tools: ['Basic boundary tools'], habitTemplateIds: [] },
  { id: 'relate', title: 'Relate', tier: 3, summary: 'Stay connected without abandoning yourself.', practice: 'Notice both sides: What is happening for them, and what remains true for me?', countsWhen: 'You make room for both perspectives.', tools: ['Reciprocity awareness', 'Attachment awareness', 'Consent and mutuality'], habitTemplateIds: [] },
  { id: 'hard', title: 'Handle Hard Things', tier: 4, summary: 'Stay with pain, grief, uncertainty, or failure without forcing resolution.', practice: 'Let the difficult thing be true for a moment without arguing with it or demanding immediate relief.', countsWhen: 'You allow the experience without requiring it to feel better.', habitTemplateIds: [] },
  { id: 'word', title: 'Keep Your Word', tier: 4, summary: 'Build reliability toward yourself and others.', practice: 'Keep the commitment, renegotiate it early, or repair it honestly.', countsWhen: 'You keep, renegotiate, or repair one commitment honestly.', habitTemplateIds: [] },
  { id: 'practical', title: 'Live Practically', tier: 4, summary: 'Deal with real-world money, admin, decisions, and responsibilities.', practice: 'Identify the concrete practical move and do the smallest useful next step.', countsWhen: 'You take one concrete practical step.', habitTemplateIds: [] },
  { id: 'meaning', title: 'Make Meaning', tier: 5, summary: 'Connect life to values, beauty, service, purpose, and what matters.', practice: 'Do one small thing that expresses what matters to you.', countsWhen: 'You make one small expression of what matters.', habitTemplateIds: [] },
];

export const FOUNDATION_IDS = new Set(FOUNDATIONS.map((foundation) => foundation.id));

export const foundationJourneyId = (foundationId: string): string => `foundation:${foundationId}`;

export function foundationForJourneyId(journeyId: string): FoundationDefinition | undefined {
  const foundationId = journeyId.replace(/^foundation:/, '');
  return FOUNDATIONS.find((foundation) => foundation.id === foundationId);
}
