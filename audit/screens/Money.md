# Money

**Route**: `Tabs > Track > Money`
**Source**: [mobile/src/screens/MoneyScreen.tsx](../../mobile/src/screens/MoneyScreen.tsx)
**Backend**: [backend/app/api/money.py](../../backend/app/api/money.py)

## What it shows
- Transactions list + summary (income / expense / net) + BarChart per category.

## Controls
- "+ Add transaction" button.
- Per-row tap → edit/delete.
- Filter / date-range selector.

## API calls
- `GET /api/money/transactions?user_id=…`
- `POST /api/money/transactions`
- `PATCH /api/money/transactions/{id}`
- `DELETE /api/money/transactions/{id}`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- No multi-currency support visible.
- The `/spend` slash command on Chat should also create rows here — verify end-to-end.
