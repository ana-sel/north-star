# TODO — post-MVP gaps

Captured 2026-05-19 after the `feat: complete MVP must-haves + post-MVP nice-to-haves` push.
Updated after the autonomous-execution pass this session.

## Requires your action (one-off, manual)

- [ ] Verify `llava` pull finished: `docker exec northstar-ollama ollama list` should show it. (Started in background; ~3.9GB downloaded by end of session — likely finished by the time you read this.)
- [ ] Live end-to-end OCR test against real `llava`: `curl -F image=@some_pic.png http://localhost:8000/diary/ocr` once the pull completes.

## Done this session (autonomous pass — infra + code)

- [x] `.env` generated at repo root with real `POSTGRES_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY`. Gitignored.
- [x] `docker-compose.yml` project name pinned to `north-star` to preserve the existing `north-star_postgres_data` volume (would have orphaned data otherwise).
- [x] Full Docker stack built and brought up: postgres + ollama + backend, all healthy. Smoke test on `GET /healthz` → 200 OK.
- [x] Fixed routing collision: meta health endpoint moved from `/health` (shadowed by the `/health` router) to `/healthz`. Dockerfile `HEALTHCHECK` updated.
- [x] Pydantic v2 migration across all 9 API files (`class Config: from_attributes = True` → `model_config = ConfigDict(from_attributes=True)`). Deprecation warnings gone.
- [x] `daily_budget_limit_gbp` seeded for all 13 agent policies (= monthly / 10, e.g. healing=£0.10/day, review=£0.40/day). `app/seed.py` updated so future runs apply this automatically.

## Done in previous pass this session (commit `361f901`)

- [x] Migration `0007_merge_users_mission`: merged the two parallel `0006_*` heads + added the missing `users.mission_data` column.
- [x] `backend/tests/test_audit_budget.py` (3 tests) + `backend/tests/test_wearables.py` (4 tests).
- [x] Mobile Calendar screen + Wearables import screen + nav wiring.
- [x] `/habit` command disambiguation.
- [x] Fixed 2 pre-existing `test_phase5._check_budget` tests that didn't disable global caps.

Full backend suite: **199/199 passing.**

## Done in this continuation pass (uncommitted at time of writing)

- [x] `backend/app/config.py`: `JWT_SECRET` / `ENCRYPTION_KEY` env-var names now resolve via `pydantic.Field(validation_alias=...)`. Previously the `.env` real secrets were silently ignored, leaving the container on default JWT secret.
- [x] Backend image rebuilt and `northstar-backend` recreated; `/healthz` → 200.
- [x] Encrypted iCal URL persistence (per user):
  - Migration `0008_user_settings`: adds `users.user_settings JSONB DEFAULT '{}'`.
  - `app/utils/crypto.py`: added `encrypt_str` / `decrypt_str` Fernet helpers (passthrough when key empty).
  - `app/api/calendar.py`: `GET /calendar/settings`, `PUT /calendar/settings`, `GET /calendar/ics-stored`. Plaintext URL is never sent back to the client.
  - `backend/tests/test_calendar_settings.py` (5 tests): default-empty, encrypted-roundtrip (with explicit Fernet key), clear-with-null, 404 on missing, 401 unauth.
- [x] Mobile API helpers added in `mobile/src/api/calendar.ts` (`getCalendarSettings`, `putCalendarSettings`, `getStoredCalendarFeed`).

Backend suite now: **215/215 passing.**

## Deferred / not in scope yet

- [x] Mobile auth wiring — was already in place (`AuthProvider` + `LoginScreen` + `expo-secure-store`); the previous TODO entry was stale.
- [x] Calendar settings UI: `CalendarScreen` now offers "Save URL for next time" / "Replace saved URL" / "Load saved" / "Forget saved URL" using the existing JWT from `useAuth`.
- [x] Calendar parser: RRULE expansion (DAILY/WEEKLY, COUNT, BYDAY, EXDATE, RDATE via python-dateutil). 7 new tests in `tests/test_calendar_rrule.py`.
- [x] Calendar parser: VTIMEZONE / `DTSTART;TZID=...` support via `dateutil.tz.gettz`. Unknown zones fall back to UTC. 4 new tests in `tests/test_calendar_tzid.py`.
- [x] Chat command autocomplete in `ChatScreen` — typing `/` surfaces matching commands with usage + description; tap to insert. Backed by a `COMMAND_DEFS` catalogue in `utils/chatCommands.ts` that also drives `/help` text.
- [x] `CHANGELOG.md` initialised.

Nothing currently deferred. Next iteration: real iCal write-back via CalDAV; richer recurrence (BYMONTHDAY / BYSETPOS edge cases); mobile chat autocomplete keyboard-nav.
