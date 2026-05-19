# Card detail (root modal)

**Route**: Root `CardDetail` modal (pushed from anywhere that renders a card)
**Source**: [mobile/src/screens/CardDetailScreen.tsx](../../mobile/src/screens/CardDetailScreen.tsx)
**Backend**: [backend/app/api/cards.py](../../backend/app/api/cards.py)

## What it shows
- Full card record: title, body, kind chip, life-area chip, status, priority, mission score, estimated minutes, due date, tags, sub-cards.
- Action row (status change / move / archive / delete / split).

## Controls
- Edit title + body inline.
- Change status / kind / life area.
- "Split this" → architect agent breakdown.
- Archive / Delete.
- Close (back to caller).

## API calls
- `GET /api/cards/{id}`
- `PATCH /api/cards/{id}`
- `DELETE /api/cards/{id}`
- `POST /api/agents/architect` (for split).

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Not visited live in the audit walkthrough.
