# Track

**Route**: `Tabs > Track`
**Source**: [mobile/src/screens/TrackScreen.tsx](../../mobile/src/screens/TrackScreen.tsx)
**Screenshot**: [../images/04b_track.png](../images/04b_track.png), [../images/04_tab_track.png](../images/04_tab_track.png)

## What it shows
- Segmented control: **Habits / Health / Money**.
- Delegates body to one of [Habits.md](./Habits.md), [Health.md](./Health.md), [Money.md](./Money.md).

## Controls
- Three segmented buttons.

## Observed behavior
- Loads the chosen sub-view; default appears to be Habits.
- Can be navigated to with `initial` route param (Today's "Show all" passes `initial: "Habits"`).

## Bugs / broken / TODO
- DEV_USER_ID scope (inherited).
- Charts in Health/Money sub-views can mis-position labels on narrow web widths (see [SUMMARY.md #11](../SUMMARY.md)).

## Suggested next steps
- Persist last-selected segment.
