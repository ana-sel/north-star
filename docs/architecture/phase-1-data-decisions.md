# Phase 1 Data Decisions

## Canonical runtime state

- `user_prefs` is the sole persistence location for product preferences such as the sleep target and onboarding state.
- `journey_progress` and `journey_returns` are the canonical journey tables. They use `journey_type` (`path` or `foundation`) and `journey_id`.
- Event timestamps are stored in UTC with an IANA timezone where the event is assigned to a local day. Local `YYYY-MM-DD` values are derived through `src/lib/time.ts`.

## Clean V1 schema

The seven frozen-V1 product tables are `sleep_entries`, `habits`, `habit_completions`, `tasks`, `journey_progress`, `journey_returns`, and `user_prefs`. `schema_meta` stores the development schema marker.

`energy_entries`, `goals`, `journal_notes`, `path_progress`, and `path_returns` are intentionally absent because frozen V1 has no runtime need for them. AsyncStorage has no persistence role.

## Development reset policy

Compass has no production local data. On opening a database whose schema marker is not `clean-v1`, the runtime drops the known development tables and recreates the clean V1 schema. It never copies legacy rows or falls back to legacy tables. Clearing app storage or reinstalling the development APK is also a supported reset path.

## Remaining Phase 1 limits

- `tasks.completed_at` is a UTC timestamp without a stored event timezone. It is therefore safe for trailing-time reporting but cannot be assigned to an historical local calendar day with the same precision as sleep, habits, and journeys. A future migration must add `completed_timezone` before local-day task analytics are introduced.
