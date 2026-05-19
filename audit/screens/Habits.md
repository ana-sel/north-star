# Habits

**Route**: `Tabs > Track > Habits` (default) or via deep-link from Today.
**Source**: [mobile/src/screens/HabitsScreen.tsx](../../mobile/src/screens/HabitsScreen.tsx)
**Backend**: [backend/app/api/habits.py](../../backend/app/api/habits.py)

## What it shows
- List of all habits.
- Per-habit week grid (last 7 days) with the day-cell coloured by completion / value.
- Five habit kinds supported: `yes_no`, `number`, `scale`, `time`, `text`.

## Controls
- Tap a day cell → quick-log overlay matching the habit kind.
- "+ Add habit" button.
- Edit/delete affordances per habit (likely long-press or trailing icon).

## API calls
- `GET /api/habits?user_id=…`
- `GET /api/habits/{id}/logs?days=7`
- `POST /api/habits/{id}/log`
- `POST /api/habits`
- `PATCH /api/habits/{id}`
- `DELETE /api/habits/{id}`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Multi-kind quick-log overlays need consistent dismiss/cancel behaviour on web.
