# Mobile App Architecture

## Overview

This is a **scalable React Native + Expo + TypeScript** architecture designed to grow from V1 (sleep tracking) through V3 (planning).

## Design Principles

1. **Feature-based folder structure** — Each feature (sleep, energy, mood, planning) is self-contained
2. **V1/V2/V3 ready** — Features added as complete modules without refactoring core
3. **Shared infrastructure** — Common utilities, hooks, and components at the root level
4. **Type-safe** — Full TypeScript for caught errors at build time
5. **Offline-first** — LocalStorage for cache, Supabase for server truth
6. **Accessible** — WCAG-compliant components and navigation

## Directory Structure

```
mobile/
├── src/
│   ├── lib/                    # Shared utilities (no React)
│   │   ├── supabase.ts        # Supabase client
│   │   ├── time.ts            # Timezone logic
│   │   └── ai.ts              # AI note generation
│   │
│   ├── types/                  # TypeScript types
│   │   └── index.ts           # Domain types
│   │
│   ├── styles/                 # Design system
│   │   └── theme.ts           # Colors, spacing, typography
│   │
│   ├── hooks/                  # React hooks (reusable state logic)
│   │   ├── useAuth.ts         # Authentication state
│   │   ├── useProfile.ts      # User profile
│   │   └── ...
│   │
│   ├── auth/                   # Authentication feature
│   │   ├── LoginScreen.tsx
│   │   ├── AuthGate.tsx
│   │   └── Onboarding.tsx
│   │
│   ├── components/             # Shared components
│   │   ├── BottomTabs.tsx
│   │   ├── Button.tsx
│   │   └── ...
│   │
│   ├── data/                   # Data access layer
│   │   ├── sleep.ts           # Sleep operations
│   │   ├── profile.ts         # Profile operations
│   │   └── ...
│   │
│   ├── features/               # Feature modules (V1, V2, V3)
│   │   ├── sleep/             # V1: Sleep tracking
│   │   │   ├── screens/
│   │   │   │   ├── TodayScreen.tsx
│   │   │   │   ├── WeekScreen.tsx
│   │   │   │   └── HistoryScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── SleepForm.tsx
│   │   │   │   ├── SleepChart.tsx
│   │   │   │   └── AINoteCard.tsx
│   │   │   └── index.ts       # Feature exports
│   │   │
│   │   ├── energy/            # V2: Energy tracking (same pattern)
│   │   ├── mood/              # V2: Mood tracking (same pattern)
│   │   └── planning/          # V3: Planning (same pattern)
│   │
│   ├── App.tsx                 # Root component
│   └── index.ts               # Entry point
│
├── app.json                    # Expo config
├── eas.json                    # EAS build config
├── package.json
├── tsconfig.json
└── README.md
```

## Data Flow

### Authentication
```
App → AuthGate → (check supabase.auth.getSession())
  ├→ Not signed in → LoginScreen → Google OAuth → Supabase Auth
  └→ Signed in → Onboarding (if new) → App Shell
```

### Sleep Tracking (V1)
```
TodayScreen
  ├→ SleepForm (pick bed/wake times)
  ├→ save to Supabase (sleep_entries table)
  ├→ fetch last 7 nights
  ├→ compute stats
  └→ WeekScreen displays chart + AI note

AINoteCard
  ├→ call generateNote() from lib/ai.ts
  ├→ (try: call Edge Function)
  ├→ (fallback: rule-based note)
  └→ display note
```

### Timezone Handling

Two distinct patterns — never mix them:

**Sleep log entries (real events) → store UTC**
```
User logs 23:10 bed, 06:45 wake in Vilnius timezone
  ├→ Save: sleep_start_utc, sleep_end_utc (UTC), timezone="Europe/Vilnius"
  └→ Display: utcToLocal(utcDate, timezone) → shows original local time
```

**User preferences (clock times) → store local clock hours**
```
User sets sleep target: 23:00
  ├→ Save: { h: 23, m: 0 }  ← getHours()/getMinutes(), NOT getUTCHours()
  └→ Restore: d.setHours(23, 0); utcToLocal(d, timezone) → always shows 23:00
```
Preferences use local hours so the target stays "23:00 wherever I am" when travelling.
Sleep log entries use UTC so the exact moment is never lost.

## Feature Module Pattern

Each feature (sleep, energy, mood, planning) follows the same structure:

### Feature Exports (`features/sleep/index.ts`)
```typescript
export { TodayScreen, WeekScreen, HistoryScreen } from './screens';
export { SleepForm, SleepChart, AINoteCard } from './components';
```

### Adding a New Feature (e.g., Energy for V2)
1. Create `src/features/energy/` with the same structure
2. Add screens and components
3. Create data access in `src/data/energy.ts`
4. Add navigation route
5. No changes needed to core architecture

## State Management

Use **Zustand** for app state:
- Auth state (user, profile, loading)
- UI state (selected date, timezone filter)
- Cache (recent entries)

Example:
```typescript
// useAuthStore.ts
const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

## Key Utilities

### `lib/time.ts`
- `localToUTC()` — Convert local time to UTC
- `utcToLocal()` — Convert UTC back to local time
- `calculateDuration()` — Always correct, timezone-aware
- `calculateAverageSleep()` — Aggregate stats

### `lib/ai.ts`
- `generateNote()` — Call Edge Function or fallback
- `generateRuleBasedNote()` — Always-working fallback
- Handles timeouts, errors, missing data gracefully

### `lib/supabase.ts`
- Singleton client with auth token management
- Real-time subscriptions ready
- Secure storage for tokens

## Data Layer Pattern

Each data module (sleep, profile) exports async functions:

```typescript
// data/sleep.ts
export async function saveSleepEntry(entry: SleepEntry): Promise<void>
export async function getSleepLastWeek(userId: string): Promise<SleepEntry[]>
export async function getFullHistory(userId: string): Promise<SleepEntry[]>
```

Never fetch directly from UI components; always go through data layer.

## Testing Strategy

- **Unit tests** — Lib functions (time.ts, ai.ts)
- **Component tests** — Screens, forms
- **Integration tests** — Data + UI flow

Run: `npm test`

## Deployment

### Build
```bash
npm run build:android  # Build for Google Play
npm run build:ios     # Build for App Store
```

### Submit
```bash
npm run submit:android
npm run submit:ios
```

See `PLAY_STORE_RELEASE_CHECKLIST.md` for pre-release steps.

## Adding V2 (Energy + Mood)

1. Create `features/energy/` and `features/mood/` folders
2. Use identical component structure as sleep
3. Add new data access in `data/energy.ts`, `data/mood.ts`
4. Add navigation routes
5. Reuse shared components (BottomTabs, Button, etc.)
6. Update types in `types/index.ts` (already has placeholders)

No refactoring of V1 code needed. ✅

## Adding V3 (Planning)

1. Create `features/planning/` folder
2. Add Goal and Task screens/components
3. Create `data/goals.ts`, `data/tasks.ts`
4. Add navigation routes
5. Reuse design system and utilities

## IDE Setup (VS Code)

### Extensions
- ES7+ React/Redux/React-Native snippets
- TypeScript Vue Plugin
- Prettier - Code formatter
- ES Lint

### Settings (`.vscode/settings.json`)
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Next Steps

1. Run `npm install`
2. Create `.env.local` from `.env.example`
3. Add Supabase credentials
4. Run `npm start` to test in Expo Go
5. Begin with auth screens (LoginScreen, AuthGate)
