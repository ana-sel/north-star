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