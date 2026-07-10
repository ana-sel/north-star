# Compass — Agent Instructions

Compass is a private personal navigation app: a compass, not a map. It helps users orient their life gently through sleep, habits, energy, planning, money, identity, and a living world/story system.

Keep agent context lean. Do not read long docs unless the task requires them.

## Read deeper docs only when needed

- For emotional UX, identity, habits, paths, qualities, AI guidance, or gamification:
  read `docs/product/compass-principles.md`
- For retention, habit loops, story, camps, streaks, rewards:
  read `docs/product/engagement-model.md`
- For infrastructure, Supabase, privacy, auth, database, AI functions:
  read `docs/architecture/infrastructure.md`
- For colours, spacing, typography, components, navigation:
  read `docs/design/design-system.md`

## Context discipline

- Inspect only files relevant to the task.
- Do not scan the whole repository unless explicitly asked.
- Prefer small safe changes.
- Do not rewrite unrelated code.
- Do not duplicate components, styles, hooks, services, copy, or data models.
- Reuse existing project patterns before creating new ones.
- Ask before adding new production dependencies.
- Keep screens thin and move reusable logic into hooks/services/components.

## Product rules

Compass should be engaging, but not manipulative.

Allowed:
- light gamification,
- paths,
- camps,
- story progression,
- visual world growth,
- gentle streaks,
- soft rewards,
- meaningful reflections.

Not allowed:
- leaderboards,
- global user levels,
- shame,
- punishment for missed days,
- fake urgency,
- addiction-style dark patterns,
- “fix yourself” language,
- diagnosis or therapy claims.

Missed-day tone:
- Use: “Welcome back. Nothing’s lost.”
- Avoid: “You broke your streak.”

## UI/code standards

- Use shared design tokens for colour, spacing, radius, shadows, typography.
- Use shared UI components before creating new ones.
- Keep feature code inside feature folders.
- Keep API/database calls out of visual components.
- Keep date/time and habit logic centralised.
- Use typed models for domain objects.
- Handle loading, empty, error, and offline states gently.

## Agent response format

Before large changes, provide:
1. What you inspected.
2. Proposed change.
3. Files affected.
4. Risks/unknowns.
5. Step-by-step plan.

After implementation, provide:
1. Summary.
2. Files changed.
3. How to test.
4. Anything not done.