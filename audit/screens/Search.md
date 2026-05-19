# Search

**Route**: `Tabs > More > Search`
**Source**: [mobile/src/screens/SearchScreen.tsx](../../mobile/src/screens/SearchScreen.tsx)
**Screenshot**: [../images/18_search.png](../images/18_search.png)

## What it shows
- Header "Search" with back link.
- Input "Search cards…" + "Go" button.
- That's the whole UI — no results area is rendered until a query runs.

## Controls
- Text input + Go button (or Enter).

## API calls
- `POST /api/cards/search` (semantic via pgvector embeddings).

## Bugs / broken / TODO
- No empty state, no "no results" state, no loading spinner.
- DEV_USER_ID scope.
