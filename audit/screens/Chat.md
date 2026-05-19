# Chat

**Route**: `Tabs > Chat` (default landing)
**Source**: [mobile/src/screens/ChatScreen.tsx](../../mobile/src/screens/ChatScreen.tsx)
**Backend**: [backend/app/api/cards.py](../../backend/app/api/cards.py), [backend/app/api/agents.py](../../backend/app/api/agents.py)
**Screenshot**: [../images/01_tab_chat.png](../images/01_tab_chat.png)

## What it shows
- Header "Chat" + intro card with "Mission aligned" / "Local-first AI" badges and slash-command hint.
- Single-line text input "What's on your mind?" + Send button.
- (After interaction) renders draft-card preview returned by the Capture Agent and a save-or-discard row.

## Controls
- **Text input** — free text or slash commands `/spend`, `/energy`, `/habit`, `/help`.
- **Send button** — calls Capture Agent → returns draft card.
- (Conditional after Send) **Save / Discard** on the draft.

## API calls
- `POST /api/agents/capture` (Capture Agent endpoint) — produces a draft card.
- `POST /api/cards` — when the user accepts the draft.
- Subsequent **intake filter** runs in the same flow: score against mission filter (/70), decision `keep / archive / delete`.

## Observed behavior
- Page loads, input focuses on tap, slash hint is visible.
- Send not exercised in the audit walkthrough.

## Bugs / broken / TODO
- Uses `DEV_USER_ID` — every captured card lands on the shared dev account.
- Tab label icon shows placeholder glyphs ("⏷ ⏷ Chat"), not real icons (cross-cutting; see [SUMMARY.md #12](../SUMMARY.md)).

## Suggested next steps
- Swap to `useAuth().userId`.
- Show a per-message timestamp + small inline error if Capture Agent errors out.
