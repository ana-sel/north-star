# Today

**Route**: `Tabs > Today`
**Source**: [mobile/src/screens/TodayScreen.tsx](../../mobile/src/screens/TodayScreen.tsx)
**Backend**: cards, habits, energy_logs
**Screenshot**: [../images/02b_today.png](../images/02b_today.png) (preferred), [../images/02_tab_today.png](../images/02_tab_today.png)

## What it shows
- Header "Today".
- 3-up stat grid: ⚡ Energy `–/5` (tap to log), 😊 Mood `–/5` (tap to log), 🌙 Sleep `--`.
- **Top 3 today** card with the three highest-priority active cards (title + life area + estimated minutes); a `⚡ defer?` badge appears on cards that look misaligned with today's energy.
- **🧠 What should I do today?** button (Focus Agent).
- **Today's habits (top 3)** with switch toggles per habit; "Show all (N more)" link to full Habits screen.

## Controls
- Tap any stat to open a quick-log overlay (energy / mood / sleep duration).
- Tap a card in "Top 3" → opens CardDetail modal.
- "🧠 What should I do today?" → invokes Focus Agent, returns a suggestion list.
- Habit switches — toggle today's habit log.
- "Show all" — `navigation.navigate("Track", { initial: "Habits" })`.

## API calls
- `GET /api/cards?user_id=…&status=active` (filtered to top 3 by priority).
- `GET /api/habits?user_id=…`
- `GET /api/energy/today?user_id=…`
- `GET /api/health/today?user_id=…`
- `POST /api/agents/focus` (Focus Agent).
- `POST /api/habits/{id}/log`.

## Observed behavior
- Loads quickly, all three Top-3 cards rendered from seed data ("North Star: implement Plan tab", "Walk 15 minutes", "Log food for the day").
- Stats correctly show `–/5` when no log for today.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Habit toggle double-tap creates duplicates (no debounce / idempotency on client).
- Focus Agent end-to-end not exercised in audit — verify graceful fallback when externalAI is off.

## Suggested next steps
- Cache today's logs to disable the switch briefly after toggle to prevent double-fire.
- Add skeleton-loader for the Top 3 card.
