# TODO — post-MVP gaps

Captured 2026-05-19 after the `feat: complete MVP must-haves + post-MVP nice-to-haves` push.
Status updated after the second pass this session.

## Requires your action (env / services / data — agent cannot do these)

- [ ] Create `.env` from `.env.example` with real `POSTGRES_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY` before `docker compose up`.
- [ ] Pull `llava` model into Ollama (free, just bandwidth):
  ```
  docker exec northstar-ollama ollama pull llava
  ```
- [ ] Seed `daily_budget_limit_gbp` values on `agent_policies` rows (otherwise per-agent daily limits are NULL = no enforcement; monthly already enforced).
- [ ] Build + smoke-test the Docker stack: `docker compose build && docker compose up -d`.

## Done this session

- [x] Apply migration `0006_must_haves` + new `0007_merge_users_mission` to local dev DB (`alembic upgrade head`).
- [x] Fix pre-existing schema drift: `User.mission_data` had no migration → added in `0007_merge_users_mission.py` (also merges the two parallel `0006_*` heads into one).
- [x] Per-agent `daily_budget_limit_gbp` enforcement — **already wired** in `gateway._check_budget` (tier 1 of 4).
- [x] `AIBudgetScreen` loading + error states — **already present** in original screen.
- [x] Tests for `GET /audit/budget` — `backend/tests/test_audit_budget.py` (3 tests).
- [x] Tests for `POST /wearables/import` — `backend/tests/test_wearables.py` (4 tests).
- [x] Mobile Calendar screen — `mobile/src/screens/CalendarScreen.tsx` + API client + nav entry + MoreScreen row.
- [x] Mobile Wearables import screen — `mobile/src/screens/WearablesImportScreen.tsx` + API client + nav entry + MoreScreen row.
- [x] `/habit` command disambiguation: now lists all substring matches when multiple hit, requires more specificity.
- [x] Fixed 2 pre-existing failing tests in `test_phase5.py` (`_check_budget` unit tests didn't disable global caps).

## Deferred / not in scope yet

- [ ] iCal URL encrypted storage in user settings (currently re-pasted each session).
- [ ] Calendar parser: RRULE expansion, full VTIMEZONE handling (basic non-TZ events work).
- [ ] Chat command autocomplete in `ChatScreen`.
- [ ] CHANGELOG / release notes file.
- [ ] Live end-to-end OCR test against real `llava` (unit tests mock Ollama).
- [ ] Pydantic deprecation warnings — `class Config` → `ConfigDict` migration across ~9 files.
