---
name: 'Compass React Native and TypeScript'
description: 'Scoped engineering guidance for the Compass Expo mobile app, including UI, domain logic, SQLite persistence, and Jest tests.'
applyTo: 'apps/mobile/**/*.{ts,tsx,js,json}'
---

- Follow the strict TypeScript, Expo, React Native, Jest, and module patterns already used in `apps/mobile`.
- Keep screens focused on composition and interaction; place reusable domain logic in existing logic, data, hook, or service modules.
- Reuse types from `src/types`, design tokens from `src/styles`, and shared controls from `src/ui` before adding alternatives.
- Keep SQLite access behind the existing data layer. Any persisted-shape change requires an explicit migration and proof that existing data survives.
- Centralize local-date and timezone, sleep duration, habit cadence, and journey progression rules; test their boundary cases without rendering full screens when possible. Trello cards are read-only in Compass.
- Preserve offline behavior and provide gentle loading, empty, and error states.
- Keep gesture-driven interactions accessible through native or numeric alternatives.
- Use React effects for synchronization, not derived state. Avoid speculative memoization and one-use abstractions.
- Match nearby tests and add the smallest case that proves the changed behavior plus the most relevant unchanged path.
- Validate focused tests first, then `npx tsc --noEmit`; run Android or Expo checks when native or runtime behavior is affected.
