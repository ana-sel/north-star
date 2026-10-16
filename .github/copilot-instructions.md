# Compass Workspace Instructions

Compass is a private, local-first personal navigation app. It helps people orient their lives through sleep, habits, planning, reflection, growth paths, and foundations. It should feel calm, adult, warm, and useful: a compass, not a map.

## Sources of truth

Use the narrowest relevant source and resolve conflicts in this order:

1. The user's current request and clarifications.
2. The referenced task section in a Markdown file.
3. `PLAN.md` for locked V1 scope, behavior, architecture, and implementation gates.
4. `COMPASS-V1-CONTENT-FREEZE (1).md` for frozen Foundations, Paths, habits, and ownership rules. It supersedes `PLAN.md` where it explicitly differs.
5. HTML wireframes for included-screen visual contracts.
6. The relevant section of `docs/product/product-guide.md`, including Design System for visual tokens and components.
7. Existing code, which is implementation evidence rather than product authority.

Treat `docs/archive/` as historical context only. Do not restore Supabase or other archived architecture from those files.

## Markdown tasks

- Work is defined in Markdown. Use the exact file and heading named by the user.
- If no task file is named, use the relevant section of `PLAN.md`; do not scan every planning document looking for extra scope.
- Preserve the task wording. Map each requirement, bullet, and gate to implementation and proof without inventing ticket metadata or acceptance criteria.
- Do not mark tasks complete or edit planning documents unless the user explicitly asks.
- When a task conflicts with a locked source, surface the conflict before implementation.

## Working approach

- Read root `AGENTS.md`, then only the deeper product, design, or architecture docs relevant to the task.
- Inspect the owning code path, nearest peer, nearest meaningful tests, and affected producer/consumer boundary before editing.
- State one local hypothesis and one focused check, then make the smallest grounded change.
- Keep screens thin; put reusable behavior in existing hooks, services, data modules, or components.
- Reuse existing models, tokens, components, and persistence patterns. Do not duplicate them.
- Do not add production dependencies without asking first.
- Do not rewrite unrelated code or disturb existing worktree changes.
- For a large change, present the inspected context, proposed change, files, risks, and steps, then wait for approval.
- After the first substantive edit, run the narrowest relevant executable check before widening the change.

## Product boundaries

- Preserve the V1 navigation: `Today · Log · You`; Log contains Sleep and Habits, and You contains Progress and Paths. There is no Plan screen.
- Trello owns practical tasks. Today may show up to three cards from the user-authorized `Today — max 3` list; never embed Trello credentials in the APK or present local task data as Trello cards.
- Keep the app local-first. SQLite is the primary working database; Cloudflare is the only planned cloud platform.
- Keep local features usable before sign-in and when offline.
- Never reintroduce Supabase.
- Do not add deferred screens or features because an existing screen feels sparse.
- Avoid diagnosis, treatment, guaranteed outcomes, shame, punishment, broken-streak language, leaderboards, global user levels, fake urgency, and addiction-style mechanics.
- Use factual, gentle language. For missed days, prefer: “Welcome back. Nothing’s lost.”
- Do not expose private journal, reflection, or prompt content in logs or monitoring.

## Mobile engineering

- The main app is `apps/mobile`: React Native, Expo, and strict TypeScript.
- Keep date, timezone, sleep, habit cadence, journey progression, and task-selection logic centralized and independently testable.
- Preserve persisted user data. Schema changes require an explicit migration and migration-focused tests.
- Handle loading, empty, error, and offline states without blocking local workflows unnecessarily.
- Use shared design tokens and UI components; do not use emoji as the production icon system.
- Keep accessibility fallbacks for gesture-driven controls, especially sleep time entry.
- Do not combine an Expo/framework upgrade with unrelated feature or UI work.

## High-risk boundaries

- Local date and timezone behavior around midnight and travel.
- Overnight sleep duration and 10-minute dial snapping.
- Habit cadence: non-daily habits must not be judged as daily.
- Journey persistence, cumulative camp thresholds, pause or resume, and the active cap.
- SQLite migrations and preservation of existing records.
- AI secrets, quotas, caching, local fallback, and private user context.
- Gesture controls must retain accessible native or input alternatives.

## Validation

Run checks from `apps/mobile` and scale them to the change:

- TypeScript: `npx tsc --noEmit`
- Jest: `npm run test:content` or a focused Jest test path
- Dependency health when relevant: `npx expo-doctor`
- Android runtime/build checks when behavior, native integration, or a phase gate requires them

Use the gate in the referenced `PLAN.md` phase as part of the definition of done. Report commands actually run and anything not verified.

## Git and shared actions

- Do not commit, push, open a pull request, deploy, publish, or mutate a shared environment unless explicitly asked.
- Never bypass hooks or checks, force-push, or discard user changes.
- Use a short descriptive branch name and an imperative commit subject unless the user specifies another convention.
- Before reviewing or committing, distinguish content changes from line-ending-only noise and leave unrelated files alone.
