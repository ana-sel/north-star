# Infrastructure

## Stack

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo (SDK 51) |
| Backend | Supabase (Postgres, Auth, Edge Functions) |
| State | Zustand |
| Build / Deploy | EAS Build + EAS Submit |

## Supabase

- **Auth** — email/password via `@supabase/supabase-js`
- **Database** — Postgres; migrations in `backend/supabase/migrations/`
- **Edge Functions** — Deno, in `backend/supabase/functions/`
- **Storage** — not used (no media uploads)

## Mobile app

- Entry: `mobile/index.ts` → `App.tsx` → `AppShell.tsx`
- Features are self-contained under `src/features/`
- API/DB calls live in `src/data/`; never directly in components
- Secure tokens stored with `expo-secure-store`

## Environments

- **Dev** — local Supabase instance or staging project
- **Prod** — EAS production build pointing to production Supabase project
