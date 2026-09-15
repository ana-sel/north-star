# Compass

Compass is a private personal navigation app: a compass, not a map. It helps people orient their life through small practices, habits, sleep, planning, and honest reflection.

## Repository Guide

- [PLAN.md](PLAN.md) is the locked V1 product and implementation contract.
- [ARCHITECTURE.md](ARCHITECTURE.md) is the canonical technical architecture.
- [docs/product](docs/product) contains canonical product rules and content boundaries.
- [docs/design/wireframes](docs/design/wireframes) is the visual contract.
- [docs/archive](docs/archive) contains superseded plans, old architecture, and research only.

## Mobile App

The Expo React Native app lives in `apps/mobile`.

```powershell
Set-Location apps/mobile
npm install
npx tsc --noEmit
npm start
```

The app is local-first. SQLite remains the primary working datastore.