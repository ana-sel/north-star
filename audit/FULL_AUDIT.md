# North Star — UI Audit (full)

Single-file consolidation of everything in this folder. Generated 2026-05-19 21:54.

Source files in this folder:

- README.md (navigation + audit method)
- SUMMARY.md (prioritised findings)
- screens/*.md (one per screen)
- images/*.png (screenshots)

---

# Part 1 — README

# North Star â€” UI Audit (May 19, 2026)

Auditor: GitHub Copilot (Claude) walking through the running web build at `http://localhost:8081/` after the auth fix that unblocked login.

Logged in as `test@northstar.app` (newly created during this session).
Backend: `northstar-backend` container, port `127.0.0.1:8000`.

## Purpose

Hand this folder to another AI / reviewer. It contains:

- `README.md` (this file) â€” navigation map, audit method, top-level findings.
- `screens/` â€” one Markdown file per screen with screenshot, observed behavior, button inventory, bugs.
- `images/` â€” raw screenshots referenced by the per-screen docs.
- `SUMMARY.md` â€” prioritised list of issues found across the app.

## Navigation map

Top-level: `RootStack` (native stack)

- `Tabs` â€” the bottom-tab navigator (default landing)
  - `Chat` â€” `ChatScreen`
  - `Today` â€” `TodayScreen`
  - `Plan` â€” `PlanScreen`
  - `Track` â€” `TrackScreen`
  - `More` â€” nested `MoreStack` (native stack)
    - `MoreHome` (`MoreScreen`) â€” directory of secondary destinations
    - `ApprovalsList` (`ApprovalsListScreen`)
    - `ApprovalDetail` (`ApprovalDetailScreen`, modal) â€” params: `approvalId`
    - `Goals` (`GoalsScreen`)
    - `Compass` (`CompassScreen`) â€” Life Compass
    - `MissionEditor` (`MissionEditorScreen`)
    - `Review` (`ReviewScreen`)
    - `Diary` (`DiaryScreen`)
    - `Files` (`FilesScreen`)
    - `Search` (`SearchScreen`)
    - `Productivity` (`ProductivityInsightsScreen`)
    - `Learning` (`LearningInsightsScreen`)
    - `Healing` (`HealingInsightsScreen`)
    - `Research` (`ResearchInsightsScreen`)
    - `AuditLogs` (`AuditLogsScreen`) â€” AI audit logs
    - `AIBudget` (`AIBudgetScreen`) â€” AI spend cap
    - `Calendar` (`CalendarScreen`) â€” iCal import
    - `WearablesImport` (`WearablesImportScreen`)
    - `Settings` (`SettingsScreen`)
- `CardDetail` (`CardDetailScreen`, modal) â€” root-level modal pushed from any tab. Params: `cardId`.
- `LoginScreen` â€” rendered by `AuthGate` when there is no token.

That is 28 screens total (5 tabs + 19 More entries + 1 modal + 3 inner stack screens already counted + Login).

## Audit method

For each screen:

1. Read source file (`mobile/src/screens/<Name>.tsx`) and its API client (`mobile/src/api/*.ts`).
2. Navigate to it in the live web build.
3. Capture screenshot into `audit/images/<screen>.png`.
4. Note: what renders, every interactive control + what it does, API endpoints hit, observed bugs, broken/stubbed parts.
5. Write findings to `audit/screens/<Name>.md`.

Each per-screen doc uses this template:

```
# <ScreenName>

**Route**: <route + parent>
**Source**: mobile/src/screens/<Name>.tsx
**API**: mobile/src/api/<file>.ts
**Backend**: backend/app/api/<file>.py

## What it shows
## Controls (buttons / inputs / gestures)
## API calls
## Observed behavior
## Bugs / broken / TODO
## Suggested next steps
```

## Top-level findings (filled in after the walkthrough)

See [SUMMARY.md](./SUMMARY.md).


---
# Part 2 — Summary (prioritised findings)

# North Star â€” UI Audit Summary

Generated: May 19, 2026, after a full walkthrough of every screen on the running web build at `http://localhost:8081/`.

This is the prioritised hand-off list. Per-screen docs live in [screens/](./screens/), raw screenshots in [images/](./images/).

---

## P0 â€” Architectural / data-correctness

### 1. Authentication is implemented but not wired to data scope

**The issue**

- Login + register endpoints work and JWTs are issued (proved during this session â€” first user `test@northstar.app` created, token persisted, navigation switches to authed view).
- The `AuthContext` exposes the logged-in user's `userId`, and **only 3 of 28 screens use it**: `LoginScreen`, `CalendarScreen`, `SettingsScreen` (and even Settings displays `DEV_USER_ID` instead of the real id â€” see below).
- The other **25 screens read `DEV_USER_ID` from [mobile/src/config/api.ts](../mobile/src/config/api.ts#L4)** (`00000000-0000-0000-0000-000000000000`) and send it as a query/body parameter to the backend.
- The backend [backend/app/api/cards.py](../backend/app/api/cards.py) (and every other domain router) accepts `user_id` from the request and trusts it; the JWT is not consulted. Comment in source: *"No auth yet â€” user_id arrives via query/body. JWT will replace this."*
- Net effect: every user who logs in still reads and writes the same shared seeded "DEV" account. A second registered user would see the first user's diary, money, and habits.

**Why login still appears to work**

A seeded DEV user with id `00000000-â€¦` is pre-populated with cards, mission text, goals, etc. The UI fetches from that account, so logged-in users see content and assume their session is real.

**Recommended fix path**

1. Backend: change `Depends(get_current_user)` from optional to required on every router, and ignore any `user_id` parameter passed in the request â€” derive it from the JWT only. Today only `/auth/*` uses required auth.
2. Mobile: delete `DEV_USER_ID` from `mobile/src/config/api.ts`, then `git grep` every reference and replace with `useAuth().userId` (with a guard that bounces to LoginScreen if null).
3. Migration: backfill any in-the-wild data created against `00000000-â€¦` onto whichever real account is "Ana's" so nothing visually disappears.

**Affected screens** (still using `DEV_USER_ID`):

`ChatScreen`, `TodayScreen`, `PlanScreen` (via children), `TrackScreen` (via children), `BoardsScreen`, `GoalsScreen`, `CompassScreen`, `MissionEditorScreen`, `ReviewScreen`, `DiaryScreen`, `FilesScreen`, `SearchScreen`, `ApprovalsListScreen`, `AIBudgetScreen`, `AuditLogsScreen`, `WearablesImportScreen`, `HabitsScreen`, `HealthScreen`, `MoneyScreen`, `ProductivityInsightsScreen`, `LearningInsightsScreen`, `HealingInsightsScreen`, `ResearchInsightsScreen`, `CardDetailScreen`, `MoreScreen`.

### 2. SettingsScreen "current user" displays the wrong id

[mobile/src/screens/SettingsScreen.tsx](../mobile/src/screens/SettingsScreen.tsx#L56) imports `useAuth()` (with `userId` and `logout` available) but renders `DEV_USER_ID.slice(0, 8)â€¦` instead of the real authenticated userId. Confusing for users and masks the issue above.

**Fix**: replace `DEV_USER_ID` with `userId ?? "(no session)"`.

### 3. SettingsScreen "Save settings" is a stub

[mobile/src/screens/SettingsScreen.tsx](../mobile/src/screens/SettingsScreen.tsx) â€” `handleSave` shows an `Alert.alert("Saved", "Settings stored locally.")` but the values (API URL, notification toggles, externalAI, requireApproval) are never persisted to AsyncStorage / SecureStore, never read on next launch, and never sent to the backend. Toggles reset every reload. Logout works.

**Fix**: persist via AsyncStorage on Save, hydrate in a `useEffect` on mount, and (for `externalAI` / `requireApproval`) PATCH the backend user prefs once that endpoint exists.

---

## P1 â€” Stub / placeholder behaviour that the UI hides

### 4. "ðŸ§  What should I do today?" Focus Agent button â€” verify behavior

Button is rendered on TodayScreen. Without external AI enabled and approval flow, it should either fall back to a deterministic local rule or queue an approval. Worth confirming end-to-end during a tester pass.

### 5. Habit toggles on TodayScreen don't have an undo affordance

Switches on TodayScreen ("Drink water", "Sleep before 1am") fire an immediate POST. Tapping twice creates noise rather than reversing. Acceptable for v0.1 but the API should accept idempotent date+habit and the UI should debounce.

### 6. Search shows no UX state

[SearchScreen](../mobile/src/screens/SearchScreen.tsx) renders just an input and a "Go" button â€” no empty state, no "no results", no loading spinner. Easy win.

### 7. Approvals empty state phrased oddly

"No pending approvals. When an agent tries an external AI call with sensitive data, it will appear here for your review." â€” fine, but until externalAI is enabled in Settings nothing will ever appear here. Consider linking back to Settings.

### 8. Calendar screen has no "saved feed" indicator

[CalendarScreen](../mobile/src/screens/CalendarScreen.tsx) â€” input field + Days ahead + "Fetch events". User can save a URL (encrypted at rest) but there is no visual indicator that a saved feed exists or button to clear it. Should show "âœ“ Saved feed in use" pill.

---

## P2 â€” Web-platform quirks

### 9. expo-notifications spam in console

`[expo-notifications] Listening to push token changes is not yet fully supported on web. Adding a listener will have no effect.` â€” gate behind `Platform.OS !== "web"` so it stops logging.

### 10. Deprecation warnings

`"shadow*" style props are deprecated. Use "boxShadow".` and `props.pointerEvents is deprecated. Use style.pointerEvents` â€” bulk fix across `theme.ts` and any shadow usage.

### 11. Chart rendering on web

`react-native-gifted-charts` is used by HealthScreen and MoneyScreen. It works in Expo web but text labels can mis-position on certain widths. Worth a hand-resize test.

### 12. Bottom tab bar tappable area on mobile-narrow web

The "â· â· Chat" prefix on each tab label looks like leftover from a dev/debug rendering of an icon. Either render the actual icon component or remove the placeholder glyphs.

---

## P3 â€” Polish

- Many screens repeat the same "Loadingâ€¦" spinner. Could centralise.
- Several "+ Add" buttons (`Goals`, `MissionEditor`, `Diary`) lack pressed-state styling on web.
- `MoreScreen` shows a `Dev user_id` debug card at the bottom â€” fine while DEV_USER_ID lives but should be hidden in any release build.
- `BoardsScreen` drag-and-drop uses `PanResponder`. Long-press fallback (Move-to modal) works in the web build; the drag itself is mouse-only and feels finicky. Document this clearly for testers.

---

## What works well

- The whole app loads, no white-screen errors, no broken bundles after the bcrypt + localStorage fixes from earlier this session.
- Login/Register/Logout cycle is solid â€” JWT in localStorage on web, SecureStore on native.
- Mission text and Mission Filter Questions edit + save fine.
- Goals tree (Vision â†’ Goal â†’ Project â†’ Milestone) renders the seeded data correctly and the `+` to add children is wired up.
- Life Compass shows real card counts per pillar with the "neglected" badge for empty pillars.
- Wearables import is clearly explained, with default-source field and an accurate field list.
- Review screen segmented control (Today/Week/Month/Year) + Run review.

---

## Suggested order of attack for the next AI / engineer

1. **Wire auth to data scope (P0 #1)** â€” biggest leverage. Until this lands, multi-user is unsafe.
2. **Fix SettingsScreen "current user" + Save (P0 #2, #3)** â€” small, exposes the auth issue otherwise.
3. **Suppress web noise + deprecation warnings (P2 #9, #10)** â€” quality-of-life so the console is usable.
4. **Search empty/loading/no-results states (P1 #6)** â€” fast UX win.
5. **Calendar saved-feed indicator (P1 #8)** â€” already 90% there.
6. Remove dev-only `DEV_USER_ID` from MoreScreen footer once #1 is done.


---
# Part 3 — Per-screen notes


---

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
- **Text input** â€” free text or slash commands `/spend`, `/energy`, `/habit`, `/help`.
- **Send button** â€” calls Capture Agent â†’ returns draft card.
- (Conditional after Send) **Save / Discard** on the draft.

## API calls
- `POST /api/agents/capture` (Capture Agent endpoint) â€” produces a draft card.
- `POST /api/cards` â€” when the user accepts the draft.
- Subsequent **intake filter** runs in the same flow: score against mission filter (/70), decision `keep / archive / delete`.

## Observed behavior
- Page loads, input focuses on tap, slash hint is visible.
- Send not exercised in the audit walkthrough.

## Bugs / broken / TODO
- Uses `DEV_USER_ID` â€” every captured card lands on the shared dev account.
- Tab label icon shows placeholder glyphs ("â· â· Chat"), not real icons (cross-cutting; see [SUMMARY.md #12](../SUMMARY.md)).

## Suggested next steps
- Swap to `useAuth().userId`.
- Show a per-message timestamp + small inline error if Capture Agent errors out.


---

# Today

**Route**: `Tabs > Today`
**Source**: [mobile/src/screens/TodayScreen.tsx](../../mobile/src/screens/TodayScreen.tsx)
**Backend**: cards, habits, energy_logs
**Screenshot**: [../images/02b_today.png](../images/02b_today.png) (preferred), [../images/02_tab_today.png](../images/02_tab_today.png)

## What it shows
- Header "Today".
- 3-up stat grid: âš¡ Energy `â€“/5` (tap to log), ðŸ˜Š Mood `â€“/5` (tap to log), ðŸŒ™ Sleep `--`.
- **Top 3 today** card with the three highest-priority active cards (title + life area + estimated minutes); a `âš¡ defer?` badge appears on cards that look misaligned with today's energy.
- **ðŸ§  What should I do today?** button (Focus Agent).
- **Today's habits (top 3)** with switch toggles per habit; "Show all (N more)" link to full Habits screen.

## Controls
- Tap any stat to open a quick-log overlay (energy / mood / sleep duration).
- Tap a card in "Top 3" â†’ opens CardDetail modal.
- "ðŸ§  What should I do today?" â†’ invokes Focus Agent, returns a suggestion list.
- Habit switches â€” toggle today's habit log.
- "Show all" â€” `navigation.navigate("Track", { initial: "Habits" })`.

## API calls
- `GET /api/cards?user_id=â€¦&status=active` (filtered to top 3 by priority).
- `GET /api/habits?user_id=â€¦`
- `GET /api/energy/today?user_id=â€¦`
- `GET /api/health/today?user_id=â€¦`
- `POST /api/agents/focus` (Focus Agent).
- `POST /api/habits/{id}/log`.

## Observed behavior
- Loads quickly, all three Top-3 cards rendered from seed data ("North Star: implement Plan tab", "Walk 15 minutes", "Log food for the day").
- Stats correctly show `â€“/5` when no log for today.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Habit toggle double-tap creates duplicates (no debounce / idempotency on client).
- Focus Agent end-to-end not exercised in audit â€” verify graceful fallback when externalAI is off.

## Suggested next steps
- Cache today's logs to disable the switch briefly after toggle to prevent double-fire.
- Add skeleton-loader for the Top 3 card.


---

# Plan

**Route**: `Tabs > Plan`
**Source**: [mobile/src/screens/PlanScreen.tsx](../../mobile/src/screens/PlanScreen.tsx)
**Screenshot**: [../images/03b_plan.png](../images/03b_plan.png), [../images/03_tab_plan.png](../images/03_tab_plan.png)

## What it shows
- Header "Plan" + segmented control: **Year / Month / Projects**.
- The selected segment swaps the body view.
  - **Year** â€” annual overview (Goals + milestones grouped by quarter).
  - **Month** â€” Kanban (delegates to `BoardsScreen` â€” see [Boards.md](./Boards.md)).
  - **Projects** â€” project-typed cards list grouped by status.

## Controls
- Three segmented buttons (Year / Month / Projects).
- Card taps â†’ CardDetail modal.
- In Year/Projects, "+" buttons may exist to add new items.

## API calls
- `GET /api/cards?user_id=â€¦&kind=goal`
- `GET /api/cards?user_id=â€¦&kind=project`
- (Month view â†’ see Boards)

## Observed behavior
- Segmented control swaps content in place; no flash.
- Default selection appears to be "Month" (Kanban).

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Segmented control state is not persisted across tab switches â€” going Today â†’ Plan resets to default.

## Suggested next steps
- Persist last-selected segment to AsyncStorage.


---

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


---

# More (MoreHome)

**Route**: `Tabs > More > MoreHome`
**Source**: [mobile/src/screens/MoreScreen.tsx](../../mobile/src/screens/MoreScreen.tsx)
**Screenshot**: [../images/05_tab_more.png](../images/05_tab_more.png), [../images/05b_tab_more_bottom.png](../images/05b_tab_more_bottom.png)

## What it shows
- A directory list of the 17 More sub-screens, each row with title + one-line description.
- Footer "Agents" section with chips for: Mission, Focus, Review, Health, Money, Energy.
- Footer "Dev user_id" debug card with the hardcoded `00000000-0000-0000-0000-000000000000` and the hint "Edit `mobile/src/config/api.ts` to change this until JWT auth lands."

## Controls
- Each row is a `Pressable` â†’ `navigation.navigate("<RouteName>")` to that screen.
- Agent chips are display-only.

## Observed behavior
- All 17 rows navigate correctly to their destination (verified in this audit).
- All sub-screens have a working back link "MoreHome, back" that returns here.

## Bugs / broken / TODO
- The "Dev user_id" debug card is the most visible symptom of the DEV_USER_ID architecture issue (see [SUMMARY.md #1](../SUMMARY.md)).
- Agent chips are not tappable â€” should either link to their respective endpoints or be removed.

## Suggested next steps
- Hide the Dev user_id card behind `__DEV__` flag once auth is wired.
- Make agent chips link to their config screen or to a settings page that explains them.


---

# Boards (Plan > Month)

**Route**: `Tabs > Plan` segmented to "Month"
**Source**: [mobile/src/screens/BoardsScreen.tsx](../../mobile/src/screens/BoardsScreen.tsx)

## What it shows
- Kanban board with one column per status (e.g. Inbox / Now / Next / Waiting / Done).
- Cards rendered with title + life-area chip + age.
- "Stuck card" detection â€” cards that haven't moved in N days get a warning marker.

## Controls
- Drag-and-drop via `PanResponder` (mouse on web; touch on native).
- Long-press â†’ opens a "Move toâ€¦" modal as fallback (works reliably on web).
- Card tap â†’ CardDetail modal.

## API calls
- `GET /api/cards?user_id=â€¦&kind=â€¦` etc.
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


---

# Habits

**Route**: `Tabs > Track > Habits` (default) or via deep-link from Today.
**Source**: [mobile/src/screens/HabitsScreen.tsx](../../mobile/src/screens/HabitsScreen.tsx)
**Backend**: [backend/app/api/habits.py](../../backend/app/api/habits.py)

## What it shows
- List of all habits.
- Per-habit week grid (last 7 days) with the day-cell coloured by completion / value.
- Five habit kinds supported: `yes_no`, `number`, `scale`, `time`, `text`.

## Controls
- Tap a day cell â†’ quick-log overlay matching the habit kind.
- "+ Add habit" button.
- Edit/delete affordances per habit (likely long-press or trailing icon).

## API calls
- `GET /api/habits?user_id=â€¦`
- `GET /api/habits/{id}/logs?days=7`
- `POST /api/habits/{id}/log`
- `POST /api/habits`
- `PATCH /api/habits/{id}`
- `DELETE /api/habits/{id}`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Multi-kind quick-log overlays need consistent dismiss/cancel behaviour on web.


---

# Health

**Route**: `Tabs > Track > Health`
**Source**: [mobile/src/screens/HealthScreen.tsx](../../mobile/src/screens/HealthScreen.tsx)
**Backend**: [backend/app/api/health.py](../../backend/app/api/health.py)

## What it shows
- Daily metrics: sleep (hrs + bedtime/wake), weight (kg), calories, protein, steps, energy (1-5), mood (1-5).
- BarChart + LineChart visualisations via `react-native-gifted-charts`.

## Controls
- Date selector (today / scroll back).
- Per-metric inline input or "Log" button.

## API calls
- `GET /api/health?user_id=â€¦&from=â€¦&to=â€¦`
- `POST /api/health/log`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Gifted-charts label positioning can clip on narrow widths.
- No empty-state when no logs exist for the selected range.


---

# Money

**Route**: `Tabs > Track > Money`
**Source**: [mobile/src/screens/MoneyScreen.tsx](../../mobile/src/screens/MoneyScreen.tsx)
**Backend**: [backend/app/api/money.py](../../backend/app/api/money.py)

## What it shows
- Transactions list + summary (income / expense / net) + BarChart per category.

## Controls
- "+ Add transaction" button.
- Per-row tap â†’ edit/delete.
- Filter / date-range selector.

## API calls
- `GET /api/money/transactions?user_id=â€¦`
- `POST /api/money/transactions`
- `PATCH /api/money/transactions/{id}`
- `DELETE /api/money/transactions/{id}`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- No multi-currency support visible.
- The `/spend` slash command on Chat should also create rows here â€” verify end-to-end.


---

# Search

**Route**: `Tabs > More > Search`
**Source**: [mobile/src/screens/SearchScreen.tsx](../../mobile/src/screens/SearchScreen.tsx)
**Screenshot**: [../images/18_search.png](../images/18_search.png)

## What it shows
- Header "Search" with back link.
- Input "Search cardsâ€¦" + "Go" button.
- That's the whole UI â€” no results area is rendered until a query runs.

## Controls
- Text input + Go button (or Enter).

## API calls
- `POST /api/cards/search` (semantic via pgvector embeddings).

## Bugs / broken / TODO
- No empty state, no "no results" state, no loading spinner.
- DEV_USER_ID scope.


---

# Goals

**Route**: `Tabs > More > Goals`
**Source**: [mobile/src/screens/GoalsScreen.tsx](../../mobile/src/screens/GoalsScreen.tsx)
**Screenshot**: [../images/10_goals.png](../images/10_goals.png)

## What it shows
- Header "Goals" + back link.
- Toolbar row: "Include tasks" toggle + "+ Add goal" button.
- Flat list of seeded entries (in the audit walkthrough): visions, goals, projects (e.g. "be healthy", "Build North Star app", "North Star: implement Plan tab"...).
- Each row shows kind chip (`VISION` / `GOAL` / `PROJECT` / `MILESTONE`), title, life-area tag, plus trailing `âœ¨` and `+` controls.

## Controls
- "Include tasks" switch â€” broadens the list to include task-typed cards.
- "+ Add goal" â€” opens add-root flow.
- Row tap â†’ CardDetail modal.
- Trailing `âœ¨` â€” likely runs the breakdown agent on that node.
- Trailing `+` â€” adds a child under that node.

## API calls
- `GET /api/cards?user_id=â€¦&kind=â€¦` (filtered to goal/project/vision/milestone).
- `POST /api/cards` (add).
- `POST /api/agents/architect` for âœ¨ breakdown (suspected).

## Observed behavior
- Loads the user's real seeded tree.
- "+ Add goal" and per-row "+" both render add forms.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- The tree is flattened rather than indented â€” child relationships are not visually conveyed (or were not visible in the screenshot).


---

# Compass â€” Life Compass

**Route**: `Tabs > More > Compass`
**Source**: [mobile/src/screens/CompassScreen.tsx](../../mobile/src/screens/CompassScreen.tsx)
**Screenshot**: [../images/11_compass.png](../images/11_compass.png)

## What it shows
- Header "Life Compass" + back link.
- Intro: "Where your attention is going â€” and where it's missing."
- 8 life-pillar rows, each with emoji + name + counts (active / done / total):
  - ðŸ’š Health & Energy â€” 3 / 0 / 3
  - ðŸ’œ Mind & Healing â€” 1 / 1 / 2
  - ðŸ’™ Money & Freedom â€” 1 / 0 / 1
  - ðŸ¤Ž Work & Skills â€” 2 / 0 / 2
  - ðŸ§¡ Home & Property â€” 0 / 0 / 0 (badge: **neglected**)
  - ðŸ§¡ Joy & Culture â€” 0 / 0 / 0 (badge: **neglected**)
  - ðŸ’— Family â€” 2 / 0 / 2
  - ðŸ’š Contribution â€” 1 / 0 / 1

## Controls
- (Read-only in the audit walkthrough; rows may be tappable to filter cards by pillar.)

## API calls
- Aggregation built from `GET /api/cards?user_id=â€¦` grouped by `life_area`.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- "neglected" badge has no action â€” no "Add a goal to this pillar" CTA.


---

# Mission Editor

**Route**: `Tabs > More > MissionEditor`
**Source**: [mobile/src/screens/MissionEditorScreen.tsx](../../mobile/src/screens/MissionEditorScreen.tsx)
**Screenshot**: [../images/16_mission_editor.png](../images/16_mission_editor.png)

## What it shows
- Header "Mission Editor" + back link.
- **Personal Mission Statement** textarea â€” multi-line; renders the user's saved mission.
- **Mission Filter Questions** section with a "+ Add" button and a list of question rows. Each row has a key chip (e.g. `happiness`, `hidden_rules`, `clarity`, `freedom`, `self_refinement`, `chosen_solitude`, `meaning`), the question text, and a `Ã—` to delete.

## Controls
- Edit mission text inline.
- "+ Add" â†’ adds a new filter question row.
- Per-row text edit + `Ã—` delete.
- (Implicit) Save button or auto-save on blur â€” verify in source.

## API calls
- `GET /api/mission?user_id=â€¦`
- `PATCH /api/mission`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Confirm there is a Save button or that auto-save fires (the screenshot does not show one).
- No confirm-before-delete on `Ã—`.

## Observed
- Real saved data loads (the audit confirmed the seven seeded filter questions).


---

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
- Run review â†’ calls Review Agent for that period.

## API calls
- `POST /api/agents/review` with `{ user_id, period }`.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Result area is only rendered after "Run review" â€” no cached last-review shown.
- Verify Review Agent fallback when external AI is disabled.


---

# Productivity Insights

**Route**: `Tabs > More > Productivity`
**Source**: [mobile/src/screens/ProductivityInsightsScreen.tsx](../../mobile/src/screens/ProductivityInsightsScreen.tsx)

## What it shows
- Cards completed / completion rate / habit coverage stats.

## API calls
- `GET /api/cards?user_id=â€¦&status=done`
- `GET /api/habits?user_id=â€¦` + log aggregation.
- Possibly `POST /api/agents/productivity` for narrative insights.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Not visited live in the audit â€” recommend a tester pass.


---

# Learning Insights

**Route**: `Tabs > More > Learning`
**Source**: [mobile/src/screens/LearningInsightsScreen.tsx](../../mobile/src/screens/LearningInsightsScreen.tsx)

## What it shows
- Skills, research cards, study habits.

## API calls
- `GET /api/cards?user_id=â€¦&kind=â€¦` (research/skill types).
- Possibly `POST /api/agents/learning`.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Not visited live in the audit.


---

# Healing Insights

**Route**: `Tabs > More > Healing`
**Source**: [mobile/src/screens/HealingInsightsScreen.tsx](../../mobile/src/screens/HealingInsightsScreen.tsx)

## What it shows
- Diary signal, mood/energy trend, healing habits â€” **local-only** per the More description.

## API calls
- Local-first; diary entries should never leave device (see [Diary.md](./Diary.md)).
- Habit + energy logs come from `/api/habits` and `/api/energy`.

## Bugs / broken / TODO
- DEV_USER_ID scope (for habit/energy aggregation).
- Verify that no diary text is sent anywhere off-device.
- Not visited live in the audit.


---

# Research Insights

**Route**: `Tabs > More > Research`
**Source**: [mobile/src/screens/ResearchInsightsScreen.tsx](../../mobile/src/screens/ResearchInsightsScreen.tsx)

## What it shows
- Research-typed cards â€” progress and patterns.

## API calls
- `GET /api/cards?user_id=â€¦&kind=research`
- Possibly `POST /api/agents/research`.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Not visited live in the audit.


---

# Diary

**Route**: `Tabs > More > Diary`
**Source**: [mobile/src/screens/DiaryScreen.tsx](../../mobile/src/screens/DiaryScreen.tsx)
**Backend**: [backend/app/api/diary.py](../../backend/app/api/diary.py)
**Screenshot**: [../images/15_diary.png](../images/15_diary.png)

## What it shows
- Header "Diary" + back link.
- Mood picker (ðŸ˜Š ðŸ˜ ðŸ˜” ðŸ˜¤ ðŸ˜´ ðŸ™).
- Reflection-prompt cards.
- Entry list (latest first).
- OCR / file pick via `expo-document-picker` for photo-of-journal capture.

## Controls
- Mood emojis (tap to select).
- "+ New entry" / large textarea.
- Picker button for OCR import.

## API calls
- `GET /api/diary?user_id=â€¦`
- `POST /api/diary` (text, mood, prompts).
- `POST /api/diary/ocr` (image upload for OCR).

## Bugs / broken / TODO
- **PRIVACY-CRITICAL**: data must stay local. Confirm backend writes are encrypted at rest and never sent to external AI providers.
- DEV_USER_ID scope.


---

# Files

**Route**: `Tabs > More > Files`
**Source**: [mobile/src/screens/FilesScreen.tsx](../../mobile/src/screens/FilesScreen.tsx)
**Backend**: [backend/app/api/files.py](../../backend/app/api/files.py)

## What it shows
- Private file storage â€” list of uploaded files with metadata.
- Upload via `expo-document-picker`.

## Controls
- "Pick file & upload" button.
- Per-file: open / delete.

## API calls
- `GET /api/files?user_id=â€¦`
- `POST /api/files/upload`
- `DELETE /api/files/{id}`

## Bugs / broken / TODO
- **PRIVATE** â€” must never leave device per More description.
- DEV_USER_ID scope.


---

# Approvals (list)

**Route**: `Tabs > More > ApprovalsList`
**Source**: [mobile/src/screens/ApprovalsListScreen.tsx](../../mobile/src/screens/ApprovalsListScreen.tsx)
**Backend**: [backend/app/api/approvals.py](../../backend/app/api/approvals.py)
**Screenshot**: [../images/20_approvals.png](../images/20_approvals.png)

## What it shows
- Header "Approvals" + back link.
- Empty state: "No pending approvals. When an agent tries an external AI call with sensitive data, it will appear here for your review."

## Controls
- (When non-empty) row tap â†’ ApprovalDetail modal.

## API calls
- `GET /api/approvals?user_id=â€¦&status=pending`

## Bugs / broken / TODO
- Empty until externalAI is enabled in Settings â€” empty state should link there.
- DEV_USER_ID scope.


---

# Approval detail (modal)

**Route**: `Tabs > More > ApprovalDetail` (modal-style, params `approvalId`)
**Source**: [mobile/src/screens/ApprovalDetailScreen.tsx](../../mobile/src/screens/ApprovalDetailScreen.tsx)

## What it shows
- Redacted prompt the agent wants to send.
- Provider / model / estimated cost / agent identity.
- Approve / Reject buttons.

## Controls
- **Approve** â†’ `POST /api/approvals/{id}/approve` â†’ unblocks the agent call.
- **Reject** â†’ `POST /api/approvals/{id}/reject`.

## Bugs / broken / TODO
- Not exercised in the audit (no pending approvals existed).
- DEV_USER_ID scope.


---

# Audit Logs

**Route**: `Tabs > More > AuditLogs`
**Source**: [mobile/src/screens/AuditLogsScreen.tsx](../../mobile/src/screens/AuditLogsScreen.tsx)
**Backend**: `ai_audit_log` model + likely under [backend/app/api/agents.py](../../backend/app/api/agents.py)
**Screenshot**: [../images/17_audit_logs.png](../images/17_audit_logs.png)

## What it shows
- Header "ðŸ” Audit Logs" + back link.
- Filter pills + summary tile (calls today / month / total cost).
- Reverse-chronological list of every AI call: agent, provider, model, tokens, cost, redacted prompt preview, decision.

## Controls
- Filter by agent / provider / date.
- Row tap â†’ expanded detail.

## API calls
- `GET /api/audit-logs?user_id=â€¦`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Verify costs match the AI Budget screen totals.


---

# AI Budget

**Route**: `Tabs > More > AIBudget`
**Source**: [mobile/src/screens/AIBudgetScreen.tsx](../../mobile/src/screens/AIBudgetScreen.tsx)
**Screenshot**: [../images/13_ai_budget.png](../images/13_ai_budget.png)

## What it shows
- Header "ðŸ’· AI Budget" + back link.
- Daily and monthly spend per agent vs configured caps.
- 70% amber warning, 100% red.

## Controls
- Edit per-agent / global cap.
- (Display-only otherwise.)

## API calls
- `GET /api/agents/budget?user_id=â€¦`
- `PATCH /api/agents/budget`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Budgets are per-agent on the same account â€” once auth is wired, scope per real user.


---

# Calendar

**Route**: `Tabs > More > Calendar`
**Source**: [mobile/src/screens/CalendarScreen.tsx](../../mobile/src/screens/CalendarScreen.tsx)
**Screenshot**: [../images/12_calendar.png](../images/12_calendar.png)

## What it shows
- Header "Calendar" + back link.
- "Calendar feed" card with explanation: "Paste a secret iCal/ICS URL. Save it to skip the paste step next time â€” saved URLs are encrypted on the server."
- URL input "https://calendar.google.com/calendar/ical/...".
- "Days ahead" numeric input (default 14).
- **Fetch events** button.

## Controls
- URL input + days-ahead input.
- Fetch events â†’ fetch + parse + show upcoming events.
- (In source) Save URL button persists encrypted URL on the server.

## API calls
- `POST /api/calendar/fetch` with `{ url, days_ahead }`.
- `POST /api/calendar/save-url` (encrypted at rest).
- `GET /api/calendar/saved-url`.

## Observed behavior
- Loads cleanly. Saved URL handling and VTIMEZONE/TZID fix already shipped earlier this session (commit `fd5066f`).
- One of the few screens that already uses `useAuth().userId`.

## Bugs / broken / TODO
- No visible indicator that a saved feed is already in use (see [SUMMARY.md #8](../SUMMARY.md)).
- No "Clear saved feed" button.


---

# Wearables import

**Route**: `Tabs > More > WearablesImport`
**Source**: [mobile/src/screens/WearablesImportScreen.tsx](../../mobile/src/screens/WearablesImportScreen.tsx)
**Screenshot**: [../images/19_wearables.png](../images/19_wearables.png)

## What it shows
- Header "Wearables" + back link.
- "Import wearable data" card with explanation: choose a JSON file exported from Apple Health, Fitbit, Garmin or Oura. Existing health log rows for the same dates are **merged** â€” only the fields you send overwrite existing values.
- "Default source" input (default `apple_health`) used if the file omits it.
- **Pick JSON file & import** button.
- Expected fields per day documented: `log_date (YYYY-MM-DD)`, `sleep_minutes`, `steps`, `weight_kg`, `calories`, `bedtime`, `wake_time`.

## Controls
- Default source input.
- Pick JSON file & import button â€” uses `expo-document-picker`.

## API calls
- `POST /api/health/import` with array of daily rows.

## Observed behavior
- Loads cleanly, copy is clear, defaults sensible.

## Bugs / broken / TODO
- DEV_USER_ID scope.
- No post-import summary banner (rows imported / merged / rejected).


---

# Settings

**Route**: `Tabs > More > Settings`
**Source**: [mobile/src/screens/SettingsScreen.tsx](../../mobile/src/screens/SettingsScreen.tsx)
**Screenshot**: [../images/14_settings.png](../images/14_settings.png)

## What it shows
- Header "Settings" + back link.
- **Connection** card: API Base URL input + hint `"Current user: 00000000â€¦"`.
- **Notifications** card with 3 switches:
  - Morning review prompt (on) â€” "Remind to check today's plan at 8:00".
  - Overload alert (on) â€” "Warn when >5 cards are in-progress".
  - Bedtime reflection (off) â€” "Evening prompt to write a diary entry".
- **Privacy & AI** card:
  - "Allow external AI" switch (off).
  - "Require approval for external" switch (on).
  - Lock note: "ðŸ”’ Diary entries, healing reflections, and private cards never leave this device regardless of these settings."
- **About** card: "North Star â€” Personal Navigation OS Â· v0.1.0 (local-first MVP) Â· All data stays on your device by default."
- **Save settings** button.
- **Log out** button (with confirm dialog).

## Controls
- API URL text input.
- Five toggle switches.
- Save settings â€” currently **stub**; shows `Alert.alert("Saved", "Settings stored locally.")`. No persistence to AsyncStorage, no backend write.
- Log out â€” confirmed â†’ `logout()` from AuthContext, which clears the token and bounces back to LoginScreen.

## API calls
- None of the settings actually call the backend on Save.
- Logout: client-side token clear only.

## Bugs / broken / TODO
- **#2 in [SUMMARY.md](../SUMMARY.md)** â€” "Current user" shows `DEV_USER_ID.slice(0, 8)â€¦` from `mobile/src/config/api.ts` instead of `useAuth().userId`. The screen even imports `useAuth` but never reads `userId`.
- **#3 in [SUMMARY.md](../SUMMARY.md)** â€” "Save settings" is a stub. None of the toggles persist across reloads.
- No theme toggle despite the More-tab description mentioning "theme".

## Suggested next steps
- Wire each toggle to AsyncStorage on mount + on change.
- Replace the `DEV_USER_ID` hint with the real `userId` from `useAuth()`.
- Once a `/users/me/preferences` endpoint exists, PATCH the externalAI + requireApproval values there too.


---

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
- "Split this" â†’ architect agent breakdown.
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


---

# Login

**Route**: Rendered by `AuthGate` when there is no token (no parent Tabs / no header).
**Source**: [mobile/src/screens/LoginScreen.tsx](../../mobile/src/screens/LoginScreen.tsx)
**Backend**: [backend/app/api/auth.py](../../backend/app/api/auth.py), [backend/app/auth.py](../../backend/app/auth.py)

## What it shows
- App branding header.
- Email input.
- Password input.
- Display-name input (Register mode only).
- "Sign in" / "Register" submit button.
- Toggle link "Need an account? Register" / "Already have an account? Sign in".

## Controls
- Email + password (+ display name) inputs.
- Submit button.
- Mode toggle link.

## API calls
- `POST /api/auth/register` `{ email, password, display_name }` â†’ 201 + JWT.
- `POST /api/auth/login` `{ email, password }` â†’ 200 + JWT.
- On success, `AuthContext.setToken` stores the JWT (web: `window.localStorage`, native: `SecureStore`), root navigator swaps to Tabs.

## Observed behavior
- Verified end-to-end in this session: registered `test@northstar.app` / `Test1234!`, JWT returned, navigated to Tabs, browser reload preserves session (localStorage fallback shipped in commit `361f5b7`).

## Bugs / broken / TODO
- No "forgot password" flow.
- No password strength meter.
- Once auth is fully wired (see [SUMMARY.md #1](../SUMMARY.md)), the rest of the app needs to switch off DEV_USER_ID before login is meaningful for data scope.


