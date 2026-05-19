# Productivity Insights

**Route**: `Tabs > More > Productivity`
**Source**: [mobile/src/screens/ProductivityInsightsScreen.tsx](../../mobile/src/screens/ProductivityInsightsScreen.tsx)

## What it shows
- Cards completed / completion rate / habit coverage stats.

## API calls
- `GET /api/cards?user_id=…&status=done`
- `GET /api/habits?user_id=…` + log aggregation.
- Possibly `POST /api/agents/productivity` for narrative insights.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Not visited live in the audit — recommend a tester pass.
