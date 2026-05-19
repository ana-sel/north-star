# North Star — UI Audit Summary

Generated: May 19, 2026, after a full walkthrough of every screen on the running web build at `http://localhost:8081/`.

This is the prioritised hand-off list. Per-screen docs live in [screens/](./screens/), raw screenshots in [images/](./images/).

---

## P0 — Architectural / data-correctness

### 1. Authentication is implemented but not wired to data scope

**The issue**

- Login + register endpoints work and JWTs are issued (proved during this session — first user `test@northstar.app` created, token persisted, navigation switches to authed view).
- The `AuthContext` exposes the logged-in user's `userId`, and **only 3 of 28 screens use it**: `LoginScreen`, `CalendarScreen`, `SettingsScreen` (and even Settings displays `DEV_USER_ID` instead of the real id — see below).
- The other **25 screens read `DEV_USER_ID` from [mobile/src/config/api.ts](../mobile/src/config/api.ts#L4)** (`00000000-0000-0000-0000-000000000000`) and send it as a query/body parameter to the backend.
- The backend [backend/app/api/cards.py](../backend/app/api/cards.py) (and every other domain router) accepts `user_id` from the request and trusts it; the JWT is not consulted. Comment in source: *"No auth yet — user_id arrives via query/body. JWT will replace this."*
- Net effect: every user who logs in still reads and writes the same shared seeded "DEV" account. A second registered user would see the first user's diary, money, and habits.

**Why login still appears to work**

A seeded DEV user with id `00000000-…` is pre-populated with cards, mission text, goals, etc. The UI fetches from that account, so logged-in users see content and assume their session is real.

**Recommended fix path**

1. Backend: change `Depends(get_current_user)` from optional to required on every router, and ignore any `user_id` parameter passed in the request — derive it from the JWT only. Today only `/auth/*` uses required auth.
2. Mobile: delete `DEV_USER_ID` from `mobile/src/config/api.ts`, then `git grep` every reference and replace with `useAuth().userId` (with a guard that bounces to LoginScreen if null).
3. Migration: backfill any in-the-wild data created against `00000000-…` onto whichever real account is "Ana's" so nothing visually disappears.

**Affected screens** (still using `DEV_USER_ID`):

`ChatScreen`, `TodayScreen`, `PlanScreen` (via children), `TrackScreen` (via children), `BoardsScreen`, `GoalsScreen`, `CompassScreen`, `MissionEditorScreen`, `ReviewScreen`, `DiaryScreen`, `FilesScreen`, `SearchScreen`, `ApprovalsListScreen`, `AIBudgetScreen`, `AuditLogsScreen`, `WearablesImportScreen`, `HabitsScreen`, `HealthScreen`, `MoneyScreen`, `ProductivityInsightsScreen`, `LearningInsightsScreen`, `HealingInsightsScreen`, `ResearchInsightsScreen`, `CardDetailScreen`, `MoreScreen`.

### 2. SettingsScreen "current user" displays the wrong id

[mobile/src/screens/SettingsScreen.tsx](../mobile/src/screens/SettingsScreen.tsx#L56) imports `useAuth()` (with `userId` and `logout` available) but renders `DEV_USER_ID.slice(0, 8)…` instead of the real authenticated userId. Confusing for users and masks the issue above.

**Fix**: replace `DEV_USER_ID` with `userId ?? "(no session)"`.

### 3. SettingsScreen "Save settings" is a stub

[mobile/src/screens/SettingsScreen.tsx](../mobile/src/screens/SettingsScreen.tsx) — `handleSave` shows an `Alert.alert("Saved", "Settings stored locally.")` but the values (API URL, notification toggles, externalAI, requireApproval) are never persisted to AsyncStorage / SecureStore, never read on next launch, and never sent to the backend. Toggles reset every reload. Logout works.

**Fix**: persist via AsyncStorage on Save, hydrate in a `useEffect` on mount, and (for `externalAI` / `requireApproval`) PATCH the backend user prefs once that endpoint exists.

---

## P1 — Stub / placeholder behaviour that the UI hides

### 4. "🧠 What should I do today?" Focus Agent button — verify behavior

Button is rendered on TodayScreen. Without external AI enabled and approval flow, it should either fall back to a deterministic local rule or queue an approval. Worth confirming end-to-end during a tester pass.

### 5. Habit toggles on TodayScreen don't have an undo affordance

Switches on TodayScreen ("Drink water", "Sleep before 1am") fire an immediate POST. Tapping twice creates noise rather than reversing. Acceptable for v0.1 but the API should accept idempotent date+habit and the UI should debounce.

### 6. Search shows no UX state

[SearchScreen](../mobile/src/screens/SearchScreen.tsx) renders just an input and a "Go" button — no empty state, no "no results", no loading spinner. Easy win.

### 7. Approvals empty state phrased oddly

"No pending approvals. When an agent tries an external AI call with sensitive data, it will appear here for your review." — fine, but until externalAI is enabled in Settings nothing will ever appear here. Consider linking back to Settings.

### 8. Calendar screen has no "saved feed" indicator

[CalendarScreen](../mobile/src/screens/CalendarScreen.tsx) — input field + Days ahead + "Fetch events". User can save a URL (encrypted at rest) but there is no visual indicator that a saved feed exists or button to clear it. Should show "✓ Saved feed in use" pill.

---

## P2 — Web-platform quirks

### 9. expo-notifications spam in console

`[expo-notifications] Listening to push token changes is not yet fully supported on web. Adding a listener will have no effect.` — gate behind `Platform.OS !== "web"` so it stops logging.

### 10. Deprecation warnings

`"shadow*" style props are deprecated. Use "boxShadow".` and `props.pointerEvents is deprecated. Use style.pointerEvents` — bulk fix across `theme.ts` and any shadow usage.

### 11. Chart rendering on web

`react-native-gifted-charts` is used by HealthScreen and MoneyScreen. It works in Expo web but text labels can mis-position on certain widths. Worth a hand-resize test.

### 12. Bottom tab bar tappable area on mobile-narrow web

The "⏷ ⏷ Chat" prefix on each tab label looks like leftover from a dev/debug rendering of an icon. Either render the actual icon component or remove the placeholder glyphs.

---

## P3 — Polish

- Many screens repeat the same "Loading…" spinner. Could centralise.
- Several "+ Add" buttons (`Goals`, `MissionEditor`, `Diary`) lack pressed-state styling on web.
- `MoreScreen` shows a `Dev user_id` debug card at the bottom — fine while DEV_USER_ID lives but should be hidden in any release build.
- `BoardsScreen` drag-and-drop uses `PanResponder`. Long-press fallback (Move-to modal) works in the web build; the drag itself is mouse-only and feels finicky. Document this clearly for testers.

---

## What works well

- The whole app loads, no white-screen errors, no broken bundles after the bcrypt + localStorage fixes from earlier this session.
- Login/Register/Logout cycle is solid — JWT in localStorage on web, SecureStore on native.
- Mission text and Mission Filter Questions edit + save fine.
- Goals tree (Vision → Goal → Project → Milestone) renders the seeded data correctly and the `+` to add children is wired up.
- Life Compass shows real card counts per pillar with the "neglected" badge for empty pillars.
- Wearables import is clearly explained, with default-source field and an accurate field list.
- Review screen segmented control (Today/Week/Month/Year) + Run review.

---

## Suggested order of attack for the next AI / engineer

1. **Wire auth to data scope (P0 #1)** — biggest leverage. Until this lands, multi-user is unsafe.
2. **Fix SettingsScreen "current user" + Save (P0 #2, #3)** — small, exposes the auth issue otherwise.
3. **Suppress web noise + deprecation warnings (P2 #9, #10)** — quality-of-life so the console is usable.
4. **Search empty/loading/no-results states (P1 #6)** — fast UX win.
5. **Calendar saved-feed indicator (P1 #8)** — already 90% there.
6. Remove dev-only `DEV_USER_ID` from MoreScreen footer once #1 is done.
