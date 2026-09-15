# Mobile App — Quick Start

This is the React Native + Expo app for Compass.

## Setup

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Supabase account (free tier works)
- Google OAuth app

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase
Copy `.env.example` to `.env.local` and fill in your credentials:
```bash
cp .env.example .env.local
```

Get these from Supabase Dashboard → Settings → API Keys:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 3. Start Expo
```bash
npm start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app (physical device)

## Project Structure

```
src/
├── App.tsx           # Root component
├── types/            # TypeScript types
├── lib/              # Utilities (time, AI, supabase)
├── hooks/            # React hooks
├── styles/           # Design system
├── auth/             # Login/auth screens
├── features/         # Feature modules (sleep, energy, mood, planning)
├── components/       # Shared components
└── data/             # Data access layer
```

See `ARCHITECTURE.md` for full structure.

## Build & Deploy

### Test Build
```bash
npm run build:android
```

### Play Store
```bash
npm run submit:android
```

See `PLAY_STORE_RELEASE_CHECKLIST.md` before submission.

## Development

### Type Check
```bash
npm run type-check
```

### Lint
```bash
npm run lint
```

### Test
```bash
npm test
```

## Key Libraries

- **Expo Router** — Navigation
- **Supabase JS** — Backend & auth
- **Zustand** — State management
- **date-fns-tz** — Timezone handling
- **React Native Date Picker** — Date/time UI

## Documentation

- **Architecture**: `ARCHITECTURE.md` — Detailed folder structure & patterns
- **Backend**: `../backend/README.md` — Supabase setup
- **Design**: `../compass-v1-design.md` — Full product spec
- **Architecture diagram**: `../architecture.html` — Visual overview

## Common Tasks

### Add a new screen
1. Create file in `src/features/[feature]/screens/[Name]Screen.tsx`
2. Export from `src/features/[feature]/index.ts`
3. Add route in navigation

### Add a new component
1. Create file in `src/components/[Name].tsx`
2. Export from `src/components/index.ts`
3. Import where needed

### Add a new feature (V2/V3)
1. Create `src/features/[new-feature]/` folder
2. Create `screens/` and `components/` subfolders
3. Create data access in `src/data/[new-feature].ts`
4. Add to navigation
5. No changes to existing code needed ✅

## Troubleshooting

### "Module not found" error
- Run `npm install` again
- Clear cache: `npm start -- --clear`

### Supabase connection fails
- Check `.env.local` has correct URL and key
- Verify network connectivity
- Check browser console for errors

### TypeScript errors
- Run `npm run type-check` to see all errors
- Check `tsconfig.json` for path aliases

## Support

- Expo docs: https://docs.expo.dev
- Supabase docs: https://supabase.com/docs
- React Native docs: https://reactnative.dev
