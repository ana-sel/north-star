# Review

**Route**: `Tabs > More > Review`
**Source**: [mobile/src/screens/ReviewScreen.tsx](../../mobile/src/screens/ReviewScreen.tsx)
**Screenshot**: [../images/21_review.png](../images/21_review.png)

## What it shows
- Header "Review" + back link.
- Segmented control: **Today / Week / Month / Year**.
- "Run review" button.

## Controls
- Segmented buttons.
- Run review → calls Review Agent for that period.

## API calls
- `POST /api/agents/review` with `{ user_id, period }`.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Result area is only rendered after "Run review" — no cached last-review shown.
- Verify Review Agent fallback when external AI is disabled.
