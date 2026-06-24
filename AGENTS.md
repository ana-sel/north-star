# Agent Instructions — Compass

Private personal navigation app. V1 = sleep tracking; V2 = energy/mood; V3 = planning.

## Source of Truth
- Architecture decisions: `Compass/architecture.html` — follow it; do not reintroduce
  removed approaches (no local Ollama, no Cloudflare Tunnel).
- V1 product spec: `Compass/compass-v1-design.md`
- App structure & feature pattern: `Compass/mobile/ARCHITECTURE.md`
- Backend schema & RLS: `Compass/backend/README.md`

## Stack
- Expo 51 + React Native 0.74 + TypeScript (strict). Backend: Supabase. State: Zustand.

## Commands (run in `Compass/mobile`)
| Task | Command |
|------|---------|
| Typecheck (ALWAYS before committing) | `npx tsc --noEmit` |
| Install deps | `npm install --legacy-peer-deps` |
| Start | `npm start` |

## Validation Rules
- `npx tsc --noEmit` is the source of truth for errors — the editor diagnostics miss
  unused imports and wrong library APIs. Never commit without a clean tsc run.
- `npm install` needs `--legacy-peer-deps` (testing-library wants React 19, app is on 18).

## Library Gotchas
- `date-fns-tz` is v2: use `zonedTimeToUtc`, `utcToZonedTime`, `formatInTimeZone`.
  The v3 names `fromZonedTime`/`toZonedTime` fail to import.
- React 17+ JSX transform: do NOT `import React` solely for JSX (triggers noUnusedLocals).
- supabase-js v2 has no `.from(...).on(...)` realtime API — do not use that pattern.
- Local domain types import via relative path (`../types/index`), never `@types/*`
  (that alias collides with the reserved TS `@types/` namespace).

## Conventions
- IDs are UUIDs everywhere.
- Auth lives in `AuthGate` + `useAuthStore` (Zustand). There is no `useAuth` hook.
- Feature-based folders under `src/features/<feature>/{screens,components}`; add new
  versions as new feature modules — never refactor V1 to bolt on V2/V3.
- Use the design system in `src/styles/theme.ts`; no hard-coded colors/spacing.
- Concise one-line `//` comments, not JSDoc banners. Keep code compact; remove dead code.

## GDPR / Privacy
- Only duration numbers may reach the AI Edge Function — never `user_id` or personal data.
- Store the minimum: sleep times (UTC) + the IANA timezone they were logged in.
- Row-Level Security must isolate every user's rows.

## Git
- Never stage/commit/push without explicit approval from the user.
