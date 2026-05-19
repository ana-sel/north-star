# Healing Insights

**Route**: `Tabs > More > Healing`
**Source**: [mobile/src/screens/HealingInsightsScreen.tsx](../../mobile/src/screens/HealingInsightsScreen.tsx)

## What it shows
- Diary signal, mood/energy trend, healing habits — **local-only** per the More description.

## API calls
- Local-first; diary entries should never leave device (see [Diary.md](./Diary.md)).
- Habit + energy logs come from `/api/habits` and `/api/energy`.

## Bugs / broken / TODO
- DEV_USER_ID scope (for habit/energy aggregation).
- Verify that no diary text is sent anywhere off-device.
- Not visited live in the audit.
