# Boards (Plan > Month)

**Route**: `Tabs > Plan` segmented to "Month"
**Source**: [mobile/src/screens/BoardsScreen.tsx](../../mobile/src/screens/BoardsScreen.tsx)

## What it shows
- Kanban board with one column per status (e.g. Inbox / Now / Next / Waiting / Done).
- Cards rendered with title + life-area chip + age.
- "Stuck card" detection — cards that haven't moved in N days get a warning marker.

## Controls
- Drag-and-drop via `PanResponder` (mouse on web; touch on native).
- Long-press → opens a "Move to…" modal as fallback (works reliably on web).
- Card tap → CardDetail modal.

## API calls
- `GET /api/cards?user_id=…&kind=…` etc.
- `PATCH /api/cards/{id}` on drop / move.

## Observed behavior
- Layout loads; drag works on web with mouse but is finicky on small widths.
- Long-press Move-to modal is the recommended interaction.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- No touch-feedback while dragging in web build (only the dragged card jumps).
- No keyboard-accessibility for moving cards.

## Suggested next steps
- Replace `PanResponder` with `react-native-reanimated` + a gesture handler for smoother web/mobile parity.
- Add an "Aged > 7 days" filter to the stuck-card highlight.
