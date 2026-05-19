# Compass — Life Compass

**Route**: `Tabs > More > Compass`
**Source**: [mobile/src/screens/CompassScreen.tsx](../../mobile/src/screens/CompassScreen.tsx)
**Screenshot**: [../images/11_compass.png](../images/11_compass.png)

## What it shows
- Header "Life Compass" + back link.
- Intro: "Where your attention is going — and where it's missing."
- 8 life-pillar rows, each with emoji + name + counts (active / done / total):
  - 💚 Health & Energy — 3 / 0 / 3
  - 💜 Mind & Healing — 1 / 1 / 2
  - 💙 Money & Freedom — 1 / 0 / 1
  - 🤎 Work & Skills — 2 / 0 / 2
  - 🧡 Home & Property — 0 / 0 / 0 (badge: **neglected**)
  - 🧡 Joy & Culture — 0 / 0 / 0 (badge: **neglected**)
  - 💗 Family — 2 / 0 / 2
  - 💚 Contribution — 1 / 0 / 1

## Controls
- (Read-only in the audit walkthrough; rows may be tappable to filter cards by pillar.)

## API calls
- Aggregation built from `GET /api/cards?user_id=…` grouped by `life_area`.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- "neglected" badge has no action — no "Add a goal to this pillar" CTA.
