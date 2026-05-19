# Goals

**Route**: `Tabs > More > Goals`
**Source**: [mobile/src/screens/GoalsScreen.tsx](../../mobile/src/screens/GoalsScreen.tsx)
**Screenshot**: [../images/10_goals.png](../images/10_goals.png)

## What it shows
- Header "Goals" + back link.
- Toolbar row: "Include tasks" toggle + "+ Add goal" button.
- Flat list of seeded entries (in the audit walkthrough): visions, goals, projects (e.g. "be healthy", "Build North Star app", "North Star: implement Plan tab"...).
- Each row shows kind chip (`VISION` / `GOAL` / `PROJECT` / `MILESTONE`), title, life-area tag, plus trailing `✨` and `+` controls.

## Controls
- "Include tasks" switch — broadens the list to include task-typed cards.
- "+ Add goal" — opens add-root flow.
- Row tap → CardDetail modal.
- Trailing `✨` — likely runs the breakdown agent on that node.
- Trailing `+` — adds a child under that node.

## API calls
- `GET /api/cards?user_id=…&kind=…` (filtered to goal/project/vision/milestone).
- `POST /api/cards` (add).
- `POST /api/agents/architect` for ✨ breakdown (suspected).

## Observed behavior
- Loads the user's real seeded tree.
- "+ Add goal" and per-row "+" both render add forms.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- The tree is flattened rather than indented — child relationships are not visually conveyed (or were not visible in the screenshot).
