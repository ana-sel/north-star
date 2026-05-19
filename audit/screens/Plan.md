# Plan

**Route**: `Tabs > Plan`
**Source**: [mobile/src/screens/PlanScreen.tsx](../../mobile/src/screens/PlanScreen.tsx)
**Screenshot**: [../images/03b_plan.png](../images/03b_plan.png), [../images/03_tab_plan.png](../images/03_tab_plan.png)

## What it shows
- Header "Plan" + segmented control: **Year / Month / Projects**.
- The selected segment swaps the body view.
  - **Year** — annual overview (Goals + milestones grouped by quarter).
  - **Month** — Kanban (delegates to `BoardsScreen` — see [Boards.md](./Boards.md)).
  - **Projects** — project-typed cards list grouped by status.

## Controls
- Three segmented buttons (Year / Month / Projects).
- Card taps → CardDetail modal.
- In Year/Projects, "+" buttons may exist to add new items.

## API calls
- `GET /api/cards?user_id=…&kind=goal`
- `GET /api/cards?user_id=…&kind=project`
- (Month view → see Boards)

## Observed behavior
- Segmented control swaps content in place; no flash.
- Default selection appears to be "Month" (Kanban).

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Segmented control state is not persisted across tab switches — going Today → Plan resets to default.

## Suggested next steps
- Persist last-selected segment to AsyncStorage.
