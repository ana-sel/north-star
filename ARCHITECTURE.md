# Compass Architecture

This is the canonical technical architecture for Compass. Product scope is defined in [PLAN.md](PLAN.md).

## Mobile

- Expo
- React Native
- TypeScript
- Local-first operation
- SQLite is the primary working datastore on the device

The mobile application is in `apps/mobile`. User-facing components do not make direct database or API calls; data access remains in the data and library layers.

## Cloud Target

- **Cloudflare Workers** hosts the future API.
- **Cloudflare D1** stores cloud metadata, quotas, and auth support.
- **Cloudflare R2** stores encrypted/compressed backup and historical cloud data.
- **Cloudflare Workers AI** provides bounded AI features.

D1 must not become a mirror of every historical mobile event. SQLite remains the normal working datastore; cloud data supports account, quota, backup, and recovery use cases.

## Supabase

Supabase is **not used** in the target architecture. The former Supabase setup and infrastructure notes are historical material in `docs/archive/old-architecture`.

## Authentication

The Cloudflare/D1 direction is locked. Better Auth is the preferred candidate, but it is not a frozen dependency.

Before Phase 7, run a maximum half-day to one-day compatibility spike against the exact Worker/D1 stack:

- If Better Auth works cleanly, use it.
- If it does not, choose another maintained Worker-compatible authentication solution.
- Do not switch the backend architecture because an auth library is inconvenient.
- Do not hand-roll password hashing, sessions, or cryptography.

Local features must remain usable before sign-in.

## Compass API (target)

Target:
- Cloudflare Workers
- D1
- R2
- Workers AI

Authentication:
- Better Auth is a candidate, not a frozen dependency.
- Phase 7 must begin with a compatibility spike.
- If Better Auth + D1 is awkward, select a maintained Worker-compatible solution.
- Do not switch the project to Supabase solely because an auth library is inconvenient.

No backend implementation belongs in Phase 0.

## Phase 1 Data Decisions (historical)

This records the fresh V1 baseline. Once user data exists, persisted-shape changes require an explicit migration and migration-focused tests under [PLAN.md](PLAN.md).

### Canonical runtime state

- `user_prefs` is the sole persistence location for product preferences such as the sleep target and onboarding state.
- `journey_progress` and `journey_returns` are the canonical journey tables. They use `journey_type` (`path` or `foundation`) and `journey_id`.
- Event timestamps are stored in UTC with an IANA timezone where the event is assigned to a local day. Local `YYYY-MM-DD` values are derived through `src/lib/time.ts`.

### Clean V1 schema

The app schema includes `sleep_entries`, `habits`, `habit_completions`, `journey_progress`, `journey_returns`, and `user_prefs`. `schema_meta` stores the schema version. Trello owns task data; no local task table is created.

`energy_entries`, `goals`, `journal_notes`, `path_progress`, and `path_returns` are intentionally absent because frozen V1 has no runtime need for them. AsyncStorage has no persistence role.

### Initialization and version policy

Compass has no production local data yet. A fresh database creates the V1 schema. A matching version reuses existing records; an unknown version fails without deleting them until a migration is provided. Reinstalling the development APK is not a substitute for a migration after user data exists.
