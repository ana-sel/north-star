# More (MoreHome)

**Route**: `Tabs > More > MoreHome`
**Source**: [mobile/src/screens/MoreScreen.tsx](../../mobile/src/screens/MoreScreen.tsx)
**Screenshot**: [../images/05_tab_more.png](../images/05_tab_more.png), [../images/05b_tab_more_bottom.png](../images/05b_tab_more_bottom.png)

## What it shows
- A directory list of the 17 More sub-screens, each row with title + one-line description.
- Footer "Agents" section with chips for: Mission, Focus, Review, Health, Money, Energy.
- Footer "Dev user_id" debug card with the hardcoded `00000000-0000-0000-0000-000000000000` and the hint "Edit `mobile/src/config/api.ts` to change this until JWT auth lands."

## Controls
- Each row is a `Pressable` → `navigation.navigate("<RouteName>")` to that screen.
- Agent chips are display-only.

## Observed behavior
- All 17 rows navigate correctly to their destination (verified in this audit).
- All sub-screens have a working back link "MoreHome, back" that returns here.

## Bugs / broken / TODO
- The "Dev user_id" debug card is the most visible symptom of the DEV_USER_ID architecture issue (see [SUMMARY.md #1](../SUMMARY.md)).
- Agent chips are not tappable — should either link to their respective endpoints or be removed.

## Suggested next steps
- Hide the Dev user_id card behind `__DEV__` flag once auth is wired.
- Make agent chips link to their config screen or to a settings page that explains them.
