/**
 * Navigation type definitions.
 */
export type MoreStackParamList = {
  MoreHome: undefined;
  ApprovalsList: undefined;
  ApprovalDetail: { approvalId: string };
};

export type RootTabParamList = {
  Chat: undefined;
  Today: undefined;
  Boards: undefined;
  Habits: undefined;
  More: undefined;
};
