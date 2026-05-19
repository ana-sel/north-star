# Changelog

All notable changes to this project. Date format: YYYY-MM-DD. Versions are
loose milestones, not semver — this is a personal-use app.

## [Unreleased]

### Added
- VTIMEZONE / `DTSTART;TZID=...` support in the ICS parser. Named IANA
  zones (`Europe/London`, `America/Los_Angeles`, …) are resolved through
  `dateutil.tz`, with UTC fallback for unknown zones.
- Chat command autocomplete in `ChatScreen` — typing `/` surfaces the
  available slash commands with descriptions.
- "Save URL for next time" / "Forget saved URL" affordance on
  `CalendarScreen`, backed by the authenticated `/calendar/settings`
  endpoints.

## 2026-05-19 — Calendar recurrences

### Added
- ICS parser expands `RRULE`, `EXDATE`, `RDATE` recurrences within the
  request window via `python-dateutil`. Capped at 366 instances per
  series. Backed by 7 new tests.
- `python-dateutil==2.9.0.post0` to backend requirements.

## 2026-05-19 — Per-user iCal persistence

### Added
- `users.user_settings JSONB` column (migration `0008_user_settings`).
- `GET/PUT /calendar/settings` and `GET /calendar/ics-stored` —
  authenticated endpoints to save a secret iCal URL encrypted-at-rest
  with Fernet, and to fetch the feed without re-pasting the URL.
- `encrypt_str` / `decrypt_str` helpers in `app/utils/crypto.py`.
- Mobile API helpers in `mobile/src/api/calendar.ts`.

### Security
- Plaintext iCal URL is never returned to the client; only an
  `ics_url_set` boolean is exposed.

## 2026-05-19 — Config secrets fix

### Fixed
- `JWT_SECRET` and `ENCRYPTION_KEY` from `.env` are now actually loaded.
  `pydantic-settings` field names were `jwt_secret_key` /
  `files_encryption_key` and did not match the canonical env names;
  `validation_alias` resolves both. Previously the container ran with
  the default JWT secret.

## 2026-05-19 — Docker stack live

### Added
- `.env` at repo root with real `POSTGRES_PASSWORD`, `JWT_SECRET`,
  `ENCRYPTION_KEY` (gitignored).
- `docker-compose.yml` pinned to project name `north-star` to preserve
  the existing `north-star_postgres_data` volume.
- `llava` model pulled into the Ollama container for OCR.
- `daily_budget_limit_gbp` seeded for all 13 agent policies (monthly/10).

### Changed
- Migrated 9 API files from `class Config: from_attributes = True` to
  Pydantic v2's `model_config = ConfigDict(from_attributes=True)`.
- Meta health endpoint moved `/health` → `/healthz` (the `/health`
  router was shadowing it).
- Dockerfile `HEALTHCHECK` updated to the new path.

## 2026-05-18 — MVP must-haves + nice-to-haves

### Added
- Mobile Calendar (read-only ICS) and Wearables import screens with
  nav wiring.
- Migration `0007_merge_users_mission` (merged the parallel `0006_*`
  heads and added the missing `users.mission_data` column).
- `/audit/budget` endpoint + tests.
- Wearables bulk-import endpoint + tests.
- `/habit` chat command disambiguation.

### Fixed
- Two `test_phase5._check_budget` tests that did not disable global
  budget caps.

## Earlier history

See `git log` — phases 1–10 (capture, scanner, encryption, embeddings,
charts, scheduler, JWT auth, Kanban DnD, warm styling, sleep tracking,
plan screen, dead-code cleanup).
