# North Star — UI Audit (May 19, 2026)

Auditor: GitHub Copilot (Claude) walking through the running web build at `http://localhost:8081/` after the auth fix that unblocked login.

Logged in as `test@northstar.app` (newly created during this session).
Backend: `northstar-backend` container, port `127.0.0.1:8000`.

## Purpose

Hand this folder to another AI / reviewer. It contains:

- `README.md` (this file) — navigation map, audit method, top-level findings.
- `screens/` — one Markdown file per screen with screenshot, observed behavior, button inventory, bugs.
- `images/` — raw screenshots referenced by the per-screen docs.
- `SUMMARY.md` — prioritised list of issues found across the app.

## Navigation map

Top-level: `RootStack` (native stack)

- `Tabs` — the bottom-tab navigator (default landing)
  - `Chat` — `ChatScreen`
  - `Today` — `TodayScreen`
  - `Plan` — `PlanScreen`
  - `Track` — `TrackScreen`
  - `More` — nested `MoreStack` (native stack)
    - `MoreHome` (`MoreScreen`) — directory of secondary destinations
    - `ApprovalsList` (`ApprovalsListScreen`)
    - `ApprovalDetail` (`ApprovalDetailScreen`, modal) — params: `approvalId`
    - `Goals` (`GoalsScreen`)
    - `Compass` (`CompassScreen`) — Life Compass
    - `MissionEditor` (`MissionEditorScreen`)
    - `Review` (`ReviewScreen`)
    - `Diary` (`DiaryScreen`)
    - `Files` (`FilesScreen`)
    - `Search` (`SearchScreen`)
    - `Productivity` (`ProductivityInsightsScreen`)
    - `Learning` (`LearningInsightsScreen`)
    - `Healing` (`HealingInsightsScreen`)
    - `Research` (`ResearchInsightsScreen`)
    - `AuditLogs` (`AuditLogsScreen`) — AI audit logs
    - `AIBudget` (`AIBudgetScreen`) — AI spend cap
    - `Calendar` (`CalendarScreen`) — iCal import
    - `WearablesImport` (`WearablesImportScreen`)
    - `Settings` (`SettingsScreen`)
- `CardDetail` (`CardDetailScreen`, modal) — root-level modal pushed from any tab. Params: `cardId`.
- `LoginScreen` — rendered by `AuthGate` when there is no token.

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
