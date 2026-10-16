# Compass

Compass is a private personal navigation app: a compass, not a map. It helps people orient their life through small practices, habits, sleep, planning, and honest reflection.

## Start Here

- [PLAN.md](PLAN.md) is the locked V1 product and implementation contract.
- [COMPASS-V1-CONTENT-FREEZE (1).md](COMPASS-V1-CONTENT-FREEZE%20(1).md) freezes V1 Foundations, Paths, Habits, and ownership rules where they differ from the plan.
- [ARCHITECTURE.md](ARCHITECTURE.md) is the canonical technical architecture.
- [docs/product/product-guide.md](docs/product/product-guide.md) gathers product principles, practices, content summaries, engagement guidance, and [design tokens](docs/product/product-guide.md#design-system).
- [nav-modular.html](docs/design/wireframes/nav-modular.html) previews the screens in a browser.

## Specialist References

- [docs/architecture/COMPASS-V1-AI-CONTRACT.md](docs/architecture/COMPASS-V1-AI-CONTRACT.md) defines AI behavior; [docs/architecture/COMPASS-V1-AI-BACKEND-DESIGN.md](docs/architecture/COMPASS-V1-AI-BACKEND-DESIGN.md) defines the future API boundary.
- [Mobile App](#mobile-app) covers setup and checks; [ARCHITECTURE.md#compass-api-target](ARCHITECTURE.md#compass-api-target) describes the future API target.
- [FIRE/README.md](FIRE/README.md) covers the separate finance workbook and report tools.

## Historical Records

- [ARCHITECTURE.md#phase-1-data-decisions-historical](ARCHITECTURE.md#phase-1-data-decisions-historical) retains the Phase 1 data decisions as historical context.
- [COMPASS-PHASE-0-REPO-CLEANUP.md](COMPASS-PHASE-0-REPO-CLEANUP.md) is a historical cleanup task, not the current product contract.
- [docs/archive](docs/archive) contains superseded plans, old architecture, and research only.

## Mobile App

The React Native + Expo app lives in `apps/mobile`. SQLite stores working data on the device; Trello owns practical tasks, and Cloudflare is the planned cloud platform. Local features work without sign-in.

With Node.js 18+ and npm 9+, run these commands from `apps/mobile`:

```powershell
Set-Location apps/mobile
npm install
npm start
```

Open the development build on an Android device or emulator. The HTML [wireframe preview](docs/design/wireframes/nav-modular.html) is a design reference, not the running mobile app.

The mobile code lives in `src/`: `AppShell.tsx` owns Today · Log · You navigation; `features/` holds feature screens and logic; `data/` owns local persistence; `lib/` holds shared time and other helpers; `styles/` and `ui/` provide tokens and controls. `tests/` contains Jest contract and domain-logic tests.

To check or run the Android app, from `apps/mobile`:

```powershell
npx tsc --noEmit
npm run test:content
npm run android
```

For an EAS Android build, use `npm run build:android`. Build and release gates are in the relevant phase of [PLAN.md](PLAN.md); [ARCHITECTURE.md](ARCHITECTURE.md) describes the local-first/cloud boundary.