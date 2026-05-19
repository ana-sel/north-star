# Health

**Route**: `Tabs > Track > Health`
**Source**: [mobile/src/screens/HealthScreen.tsx](../../mobile/src/screens/HealthScreen.tsx)
**Backend**: [backend/app/api/health.py](../../backend/app/api/health.py)

## What it shows
- Daily metrics: sleep (hrs + bedtime/wake), weight (kg), calories, protein, steps, energy (1-5), mood (1-5).
- BarChart + LineChart visualisations via `react-native-gifted-charts`.

## Controls
- Date selector (today / scroll back).
- Per-metric inline input or "Log" button.

## API calls
- `GET /api/health?user_id=…&from=…&to=…`
- `POST /api/health/log`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Gifted-charts label positioning can clip on narrow widths.
- No empty-state when no logs exist for the selected range.
