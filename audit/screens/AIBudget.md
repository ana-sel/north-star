# AI Budget

**Route**: `Tabs > More > AIBudget`
**Source**: [mobile/src/screens/AIBudgetScreen.tsx](../../mobile/src/screens/AIBudgetScreen.tsx)
**Screenshot**: [../images/13_ai_budget.png](../images/13_ai_budget.png)

## What it shows
- Header "💷 AI Budget" + back link.
- Daily and monthly spend per agent vs configured caps.
- 70% amber warning, 100% red.

## Controls
- Edit per-agent / global cap.
- (Display-only otherwise.)

## API calls
- `GET /api/agents/budget?user_id=…`
- `PATCH /api/agents/budget`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Budgets are per-agent on the same account — once auth is wired, scope per real user.
