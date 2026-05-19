# Mission Editor

**Route**: `Tabs > More > MissionEditor`
**Source**: [mobile/src/screens/MissionEditorScreen.tsx](../../mobile/src/screens/MissionEditorScreen.tsx)
**Screenshot**: [../images/16_mission_editor.png](../images/16_mission_editor.png)

## What it shows
- Header "Mission Editor" + back link.
- **Personal Mission Statement** textarea — multi-line; renders the user's saved mission.
- **Mission Filter Questions** section with a "+ Add" button and a list of question rows. Each row has a key chip (e.g. `happiness`, `hidden_rules`, `clarity`, `freedom`, `self_refinement`, `chosen_solitude`, `meaning`), the question text, and a `×` to delete.

## Controls
- Edit mission text inline.
- "+ Add" → adds a new filter question row.
- Per-row text edit + `×` delete.
- (Implicit) Save button or auto-save on blur — verify in source.

## API calls
- `GET /api/mission?user_id=…`
- `PATCH /api/mission`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Confirm there is a Save button or that auto-save fires (the screenshot does not show one).
- No confirm-before-delete on `×`.

## Observed
- Real saved data loads (the audit confirmed the seven seeded filter questions).
