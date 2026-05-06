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
  Health: undefined;
  Money: undefined;
  Files: undefined;
  Productivity: undefined;
  Learning: undefined;
  Healing: undefined;
  Research: undefined;
};

export type RootTabParamList = {
  Chat: undefined;
  Today: undefined;
  Boards: undefined;
  Habits: undefined;
  More: undefined;
};

/**
 * Root native stack — wraps the tab navigator so any tab can `push`
 * shared modal screens (e.g. card detail).
 */
export type RootStackParamList = {
  Tabs: undefined;
  CardDetail: { cardId: string };
  EnergyInsights: undefined;
  HealthInsights: undefined;
  MoneyInsights: undefined;
};
