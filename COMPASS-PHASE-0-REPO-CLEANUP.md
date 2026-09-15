# Compass — Phase 0 Repository Cleanup & Canonicalisation

## Purpose

This document is the **implementation contract for Phase 0 only**.

Your job is to clean and reorganise the Compass repository **without changing product behaviour**.

Do **not** start building new V1 features in this phase.

The repository currently contains:
- duplicated / stale architecture documents
- old Supabase plans
- several competing V1 plans
- research material mixed into implementation files
- generated build artefacts
- dead / unused code
- duplicated documentation
- loose screenshots / archives in the repository root

The goal is to leave one clean repository where another coding AI can immediately answer:

1. **What are we building?** → `/PLAN.md`
2. **How is it built?** → `/ARCHITECTURE.md`
3. **What product rules are canonical?** → `/docs/product/*`
4. **What visual design must be followed?** → `/docs/design/wireframes/*`
5. **What is historical only?** → `/docs/archive/*`

---

# NON-NEGOTIABLE RULES

## 1. Do not change app behaviour

Phase 0 is structural cleanup and documentation canonicalisation.

Allowed:
- move files
- rename files
- delete generated artefacts
- archive superseded documents
- remove confirmed dead / unreachable code
- update imports after moves
- fix references caused by moves
- update `.gitignore`
- rewrite canonical documentation

Not allowed:
- redesign screens
- change Today behaviour
- implement new Habits
- implement Foundations
- implement Cloudflare
- implement AI
- change Path progression
- change SQLite behaviour
- rewrite V1 UI
- upgrade Expo
- introduce new libraries unless required solely to keep the existing app building after file moves

## 2. Preserve anything uncertain

If unsure whether a file is obsolete:

**ARCHIVE IT. DO NOT DELETE IT.**

Use `docs/archive/`.

Only delete files that are clearly:
- generated
- dependency folders
- build logs
- duplicate archives
- confirmed dead implementation with no imports / runtime usage

## 3. Existing APK must still build and launch

At the end of Phase 0:
- install dependencies from a clean checkout
- run TypeScript / lint checks if configured
- build or launch the Android app
- confirm the current existing app still opens
- confirm bottom navigation still works
- confirm SQLite data can still be read
- confirm no new feature behaviour was introduced

If cleanup breaks the app, fix the cleanup before proceeding.

---

# TARGET REPOSITORY STRUCTURE

```text
Compass/
├── README.md
├── PLAN.md
├── ARCHITECTURE.md
├── AGENTS.md
├── .gitignore
│
├── apps/
│   └── mobile/
│       ├── src/
│       ├── assets/
│       ├── android/
│       ├── app.json
│       ├── eas.json
│       ├── babel.config.js
│       ├── index.ts
│       ├── package.json
│       ├── package-lock.json
│       └── tsconfig.json
│
├── workers/
│   └── compass-api/
│       └── README.md
│
├── docs/
│   ├── product/
│   │   ├── principles.md
│   │   ├── foundations.md
│   │   ├── paths.md
│   │   ├── habits.md
│   │   ├── practice-model.md
│   │   └── engagement-model.md
│   │
│   ├── design/
│   │   ├── design-system.md
│   │   └── wireframes/
│   │
│   ├── architecture/
│   │   └── decisions/
│   │
│   └── archive/
│       ├── old-plans/
│       ├── old-architecture/
│       └── research/
│
└── scripts/
```

Exact folder naming may differ slightly if the existing code requires it, but the **separation of responsibilities must remain**.

---

# PHASE 0A — MECHANICAL CLEANUP

## Step 0 — Create a safety point

Before making changes:

```bash
git status
git add -A
git commit -m "chore: checkpoint before v1 repository cleanup"
git tag pre-v1-cleanup
```

If the repository is intentionally dirty, do not lose work. Commit or stash it first.

## Step 1 — Remove duplicate project nesting

Do not leave:

```text
Compass/Compass/mobile/...
```

Move the current React Native app to:

```text
apps/mobile/
```

Update any relative scripts, docs, paths, CI config, EAS config or imports affected by the move.

## Step 2 — Remove generated dependency/build artefacts

These must not remain committed:

```text
node_modules/
.expo/
.venv/
*.log
android/.gradle/
android/app/build/
android/build/
dist/
build/
*.zip
```

From the current tree specifically remove / untrack:

```text
mobile/node_modules/
mobile/.expo/
mobile/eas-build.log
mobile/eas-build2.log
mobile/eas-build3.log
mobile/eas-build4.log
mobile/eas-build5.log
Compass.zip
docs.zip
```

Do **not** delete `android/` itself without checking whether the app relies on committed native configuration.

## Step 3 — Create one root `.gitignore`

Ensure root `.gitignore` contains at minimum:

```gitignore
node_modules/
.expo/

.env
.env.*
!.env.example

*.log

android/.gradle/
android/app/build/
android/build/

dist/
build/

.venv/

*.zip

.DS_Store
Thumbs.db
```

---

# PHASE 0B — CANONICAL DOCUMENTATION

## Rule: only one active V1 plan

The only active implementation contract is:

```text
/PLAN.md
```

Move older V1 / strategy / architecture plans to:

```text
docs/archive/old-plans/
```

Likely candidates include:

```text
docs/plan-compound-energy.md
docs/plan-kaizen-foundations.md
docs/plan-leverage-control.md
docs/plan-strategy-architecture.md
docs/product/v1 plan.md
```

At the top of every archived plan add:

```markdown
> SUPERSEDED.
> Historical design/research only.
> Do not implement.
> The canonical V1 contract is `/PLAN.md`.
```

## Rule: only one active architecture document

The canonical technical architecture is:

```text
/ARCHITECTURE.md
```

It must state clearly:

```text
Mobile:
- Expo
- React Native
- TypeScript

Local data:
- SQLite
- local-first
- mobile database remains the primary working datastore

Backend:
- Cloudflare Workers

Cloud metadata / quotas / auth support:
- Cloudflare D1

Backup / historical cloud storage:
- Cloudflare R2

AI:
- Cloudflare Workers AI

Supabase:
- NOT USED in the target architecture

Authentication:
- Cloudflare/D1 architecture
- Better Auth is a preferred candidate only
- auth library must pass a compatibility spike before implementation
- no hand-rolled password cryptography
```

Move obsolete Supabase architecture documents to:

```text
docs/archive/old-architecture/
```

Likely candidates:

```text
docs/architecture/infrastructure.md
docs/architecture/infrastructure.html
mobile/ARCHITECTURE.md
```

If any contain still-valid implementation details, copy only those valid facts into `/ARCHITECTURE.md` before archiving them.

---

# PRODUCT DOCUMENT REORGANISATION

Create / consolidate:

```text
docs/product/principles.md
docs/product/foundations.md
docs/product/paths.md
docs/product/habits.md
docs/product/practice-model.md
docs/product/engagement-model.md
```

## `principles.md`

Keep:
- Compass, not a map
- no shame for missed days
- practices over identity judgement
- local-first / privacy-respecting philosophy
- adult, calm, intelligent language
- no diagnosis
- no guaranteed medical / mental-health outcomes
- no streak punishment
- integration is self-claimed

## `foundations.md`

Foundations are **not Growth Paths**.

Canonical 13 Foundations:

### Tier 1 — The ground
- Tend the body
- Regulate
- Steady your attention

### Tier 2 — Inner world
- Feel & name
- See clearly
- Self-relationship
- Know yourself

### Tier 3 — Other people
- Communicate
- Relate

### Tier 4 — Meeting life
- Handle hard things
- Keep your word
- Live practically

### Tier 5 — Meaning
- Make meaning

Document:
- Foundations are the floor every adult deserves
- they may reuse the same 3-camp machinery as Growth Paths
- they can become Today's theme
- they may drop practices into Habits
- they must not duplicate concepts already owned elsewhere
- no Foundation is used to diagnose or grade a person

## `paths.md`

Keep the **full 41-Path catalogue** as the master map.

Do not physically delete non-V1 Paths.

Define:

```text
FULL_PATH_CATALOG = 41
V1_FEATURED_PATHS = 15
ACTIVE_JOURNEY_CAP = 3
```

V1 featured Growth Paths:

### Inner anchor / limerence-priority
1. Stillness
2. Presence
3. Self-possession
4. Non-attachment
5. Resilience
6. Boundaries
7. Reciprocity

### Soft strength / relating
8. Quiet Authority
9. Warmth
10. Tenderness
11. Emotional Courage

### Building a life
12. Agency
13. Follow-through
14. Curiosity
15. Play

Reasoning:
- limerence healing is a major V1 personal priority
- Compass should help build a larger life, not make limerence the centre of every day
- the V1 set should cover Inward, Together, Craft and Frontier
- Curiosity remains because it is the Frontier flagship and supports learning / exploration / building
- the full 41-path world remains available for future versions

## `habits.md`

Separate:

```text
HABIT_TEMPLATE_LIBRARY
```

from:

```text
DEFAULT_USER_HABITS
```

New users must **not** receive 10–12 mandatory habits.

V1 habit template library:

### Morning / daytime
- Water on waking
- Morning daylight
- Brief grounding breaths
- Morning walk / movement
- Short silent sit
- First 15 minutes phone-free
- Choose one priority for today
- Create/build before passive consumption

### Evening / connection
- Reach toward one real person
- Dim lights / begin wind-down
- Screen-free period before sleep
- One true line journal

Important:
- onboarding starts with one tiny habit only
- avoid turning anti-limerence behaviour into obsessive tracking
- do not create a permanent "didn't check the person" streak
- Paths provide psychological practices; Habits should build the life underneath them

---

# PATH CONTENT SOURCE CLEANUP

If both exist:

```text
paths-data.js
pathsContent.ts
```

then:

1. determine which file is generated from the other
2. document that relationship
3. keep only one hand-edited source of truth
4. generate the derived file when needed
5. add a clear header to the generated file:

```text
GENERATED FILE — DO NOT HAND EDIT
SOURCE: <canonical source path>
```

Do not maintain two manually edited Path catalogues.

---

# RESEARCH ARCHIVE CLEANUP

Move:

```text
design/Margulan principles/
```

to:

```text
docs/archive/research/margulan/
```

If the research archive is extremely large, it may be kept outside Git entirely.

Do **not** delete research unless explicitly instructed.

Distil only product-relevant principles into:

```text
docs/product/principles.md
```

---

# LOOSE ROOT FILES

Review examples:

```text
log-energy.html
screen-habits-tree.png
.sel.png
Compass.zip
docs.zip
```

Actions:
- `log-energy.html` → archive if Energy is not in V1
- `screen-habits-tree.png` → `docs/design/reference/` if useful
- `.sel.png` → inspect; delete if accidental/temp
- `Compass.zip` → delete from repo
- `docs.zip` → delete from repo

Root should remain intentionally small.

---

# DEAD CODE CLEANUP

Candidates:
- old Supabase client/config
- unused `AuthGate`
- unused Login screen
- old onboarding system
- empty energy screens
- empty mood screens
- empty planning feature folders
- preview/demo auth user

Before deleting:
1. search all imports / references
2. verify running app does not use it
3. remove only if unreachable
4. run TypeScript/build afterward

Do not delete active SQLite schema or existing functioning screens.

---

# CLOUDFLARE PLACEHOLDER

Create:

```text
workers/compass-api/README.md
```

Content:

```markdown
# Compass API

Target:
- Cloudflare Workers
- D1
- R2
- Workers AI

Authentication:
- Better Auth is a candidate, not a frozen dependency.
- Phase 7 must begin with a compatibility spike.
- If Better Auth + D1 is awkward, select a maintained Worker-compatible solution.
- Do not switch the project to Supabase solely because an auth library is inconvenient.

No backend implementation belongs in Phase 0.
```

---

# DESIGN SOURCE OF TRUTH

Preserve:

```text
docs/design/wireframes/
```

These HTML wireframes are the **visual contract**.

Ensure `docs/design/design-system.md` states:
- warm neutral background is intentional
- white cards create contrast
- accents provide semantic colour
- Path domain colours must remain visible
- deployed APK must not collapse into beige-only UI
- target HTML hierarchy / spacing / density should be followed closely
- Android implementation may adapt only where native interaction/accessibility requires it

Do not redesign Compass in Phase 0.

---

# V1 FEATURES — DO NOT IMPLEMENT IN PHASE 0

Frozen for later in `/PLAN.md`:

```text
Bottom navigation:
- Today
- Log
- Plan
- You

Log:
- Sleep
- Habits

You:
- Progress
- Paths

Foundations:
- accessible from Paths

Must-have:
- circular sleep clock
- Path practice loop
- rituals / habits
- simple Plan
- Progress
- Foundations
- V1 featured Paths
- bounded AI
- Cloudflare architecture
```

Out of V1:

```text
Discover
Self
Body page
Energy page
Money
Goals tree
Plan Map
full multi-device sync
complex AI chat
full analytics platform
```

---

# AUTH DECISION — DOCUMENT ONLY

Authentication is **not implemented in Phase 0**.

Update `/ARCHITECTURE.md`:

```text
Cloudflare/D1 remains locked.

Better Auth is preferred but unproven on the exact Worker/D1 stack.

Before Phase 7:
- run a maximum half-day to one-day auth compatibility spike

If Better Auth works cleanly:
- use it

If not:
- select another maintained Worker-compatible authentication library

Do not:
- switch backend architecture because of auth-library inconvenience
- hand-roll password hashing or cryptography
```

---

# FINAL CLEANUP CHECKLIST

## Repository
- [ ] no nested `Compass/Compass/` project structure
- [ ] mobile app lives under `apps/mobile/`
- [ ] generated dependency/build files are not committed
- [ ] root `.gitignore` is correct
- [ ] no ZIP archives are tracked
- [ ] no EAS build logs are tracked
- [ ] research is separated from implementation

## Documentation
- [ ] `/PLAN.md` is the only canonical V1 implementation plan
- [ ] `/ARCHITECTURE.md` is the only canonical technical architecture
- [ ] Supabase is clearly marked historical / not used
- [ ] old plans live under `docs/archive/old-plans/`
- [ ] old architecture lives under `docs/archive/old-architecture/`
- [ ] `docs/product/foundations.md` exists
- [ ] `docs/product/paths.md` exists
- [ ] `docs/product/habits.md` exists
- [ ] `docs/product/principles.md` exists
- [ ] HTML wireframes remain intact
- [ ] canonical docs link to one another correctly

## Code
- [ ] current app still builds
- [ ] current app still launches
- [ ] SQLite still works
- [ ] no new features added
- [ ] no runtime behaviour intentionally changed
- [ ] dead code removed only after reference checks

---

# FINAL COMMIT

Once all checks pass:

```bash
git add -A
git commit -m "chore: canonicalise Compass repository structure"
git tag v1-clean-baseline
```

Then stop.

Do **not** start Phase 1 automatically.

Report:
1. files moved
2. files archived
3. files deleted
4. canonical docs created/updated
5. dead code removed
6. build/test result
7. any ambiguity requiring a product decision

---

# SUCCESS CONDITION

Phase 0 is successful when a new coding AI can open the repository and, within two minutes, understand:
- what Compass V1 is
- what is explicitly out of scope
- what technology is locked
- where product truth lives
- where design truth lives
- which documents are historical only
- where the mobile app lives
- where the future Cloudflare backend will live

**Do not optimise beyond this goal.**
