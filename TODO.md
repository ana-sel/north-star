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

## Deferred / not in scope yet

- [ ] iCal URL encrypted storage in user settings (currently re-pasted each session).
- [ ] Calendar parser: RRULE expansion, full VTIMEZONE handling.
- [ ] Chat command autocomplete in `ChatScreen`.
- [ ] CHANGELOG / release notes file.
