/**
 * Navigation type definitions.
 */
export type MoreStackParamList = {
  MoreHome: undefined;
  ApprovalsList: undefined;
  ApprovalDetail: { approvalId: string };
  Goals: undefined;
  Review: undefined;
  Diary: undefined;
  Files: undefined;
  Search: undefined;
  Productivity: undefined;
  Learning: undefined;
  Healing: undefined;
  Research: undefined;
};

export type RootTabParamList = {
  Chat: undefined;
  Today: undefined;
  Plan: undefined;
  Track: undefined;
  More: undefined;
};

/**
 * Root native stack — wraps the tab navigator so any tab can `push`
 * shared modal screens (e.g. card detail).
 */
export type RootStackParamList = {
  Tabs: undefined;
  CardDetail: { cardId: string };
};
