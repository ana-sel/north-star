# Compass V1 — Locked Product & Engineering Plan

> **Status:** LOCKED for V1 implementation
> **Primary target:** Android APK first, then Google Play public V1
> **Canonical plan:** this file overrides stale V1/infrastructure notes elsewhere
> **Implementation rule:** do not add features that are not explicitly listed here. Put them in the parking lot.

> **Content freeze:** [COMPASS-V1-CONTENT-FREEZE (1).md](COMPASS-V1-CONTENT-FREEZE%20(1).md) supersedes this plan wherever the V1 Foundations, featured Growth Paths, daily Habits, or ownership rules differ. The frozen set is 13 Foundations, exactly 14 featured Paths, and exactly 9 curated daily Habit templates.

---

## 0. How to use this file

This plan is intentionally explicit so a less-capable coding AI can implement it without inventing product decisions.

### Source-of-truth order

If two files disagree, use this order:

1. **`PLAN.md` / this document** — V1 scope, behavior, architecture, keep/cut decisions.
2. **HTML wireframes** — visual contract for screens that are included in V1.
3. **Design tokens / shared CSS** — colors, spacing, visual language.
4. **Product specs** — supporting behavior/content when they do not conflict with this plan.
5. **Current React Native implementation** — useful code, but not a product/design source of truth.

### Non-negotiable implementation behavior

- Work **phase by phase**, in the order below.
- After each phase: run TypeScript checks, tests, and an Android build/smoke test.
- Do not perform opportunistic redesigns or add extra tabs/screens.
- Do not replace local-first architecture with an online-first architecture.
- Do not reintroduce Supabase.
- Do not remove user data during migrations without an explicit migration.
- Do not make medical, diagnostic, treatment, or guaranteed-outcome claims.
- Do not use emoji as the production icon system.
- Do not create a global “how good am I?” score.
- Do not use shame, broken-streak language, leaderboards, countdown pressure, or gamified punishment.

---

# 1. Product promise

Compass is a **private personal navigation app** that helps a person orient themselves, practise qualities they value, maintain a small set of foundations and rituals, plan a few real-life actions, and notice useful patterns.

Core idea:

> **A compass, not a map.**

Compass should feel calm, intelligent, adult, warm and beautiful. It should not feel like therapy notes, a productivity dashboard, a beige habit spreadsheet, or a game demanding constant engagement.

### V1 personal priority

The first real-world use case is helping the owner move attention and identity back into her own life while working through limerence/idealisation and comparison. Compass does this as **self-guided practice**, not as treatment.

The product mechanisms supporting that priority are:

- reality vs story (`See clearly` Foundation)
- attention return (`Steady your attention` Foundation)
- self-regulation skills (`Regulate` Foundation)
- self-relationship
- **Self-possession**
- **Non-attachment**
- **Boundaries**
- **Reciprocity**
- **Presence**
- building a personally meaningful life through Agency, Follow-through, Craftsmanship and Play

User-facing copy must never say Compass “cures” or “treats” limerence.

---

# 2. Locked V1 decisions

| Decision | V1 answer |
|---|---|
| Platform | **Android first** |
| App stack | **React Native + Expo + TypeScript** |
| Local DB | **SQLite is the primary working database** |
| Cloud | **Cloudflare only: Workers + D1 + R2 + Workers AI** |
| Supabase | **REMOVE / DO NOT USE** |
| AI | **MUST HAVE in V1** |
| AI strategy | Local code decides when AI is worth calling; cache results; strict quotas |
| Cloud DB role | Small metadata/auth/quota/backup index only; do **not** mirror every historical event into D1 |
| Long-term history | Local SQLite + compressed R2 backup/history |
| Auth | Use a proven auth library/service layer on Cloudflare; **do not hand-roll password/session crypto**. Preferred: Better Auth + D1. Local features must remain usable before sign-in. |
| Navigation | **Today · Log · Plan · You** |
| Log sub-tabs | **Sleep · Habits only** |
| You sub-tabs | **Progress · Paths only**; Foundations opens from Paths |
| Discover | OUT |
| Self / Identity | OUT |
| Body page | OUT |
| Energy page | OUT |
| Money | OUT |
| Goals tree / Map | OUT |
| Circular sleep clock | **MUST HAVE** |
| Paths active cap | **3 total active growth/foundation journeys**; ideally 1 primary + 2 light |
| Daily deliberate practice | **ONE theme per day** |
| Same quality on consecutive days | **No** |
| Habits | Morning + evening rituals, built one habit at a time |
| Habit progress | Repetitions + rhythm; no punishment for missed days |
| Design | Restore HTML visual fidelity; keep warm-neutral palette + meaningful accent colors |
| Monthly infra target | Architect toward near-zero non-AI cost; 10k users should not force a conventional large hosted DB |

---

# 3. V1 information architecture

## Bottom navigation

```text
Today      Log      Plan      You

Log:       Sleep | Habits
You:       Progress | Paths
Paths:     Walking now | Browse
           └── Foundations (sub-screen)
```

No additional bottom tab or top-level lens in V1.

## Explicit removals from current app navigation

Current `Log` has `Sleep · Week · History · Habits`.

Change to:

```text
Sleep · Habits
```

Sleep history/trend is shown **inside Sleep** and/or **Progress**, not as permanent sub-tabs.

Current `You` already has `Progress · Paths`; keep exactly those.

---

# 4. The V1 daily loop

The whole app must support this loop:

```text
Open Today
→ see how you are arriving
→ see one Path/Foundation practice
→ see a small ritual preview
→ see 1–3 real tasks
→ optionally receive one useful Compass AI note
→ live the day
→ return and mark what actually happened
→ see honest progress over time
```

A good V1 should already feel complete with no Discover, Self, Body, Energy or Money screens.

---

# 5. Today screen — V1 contract

Visual target: `docs/design/wireframes/screens/today.html`.

Keep the visual richness of the HTML target; do not reproduce the current mostly-empty beige screen.

## Today sections, in this order

1. **Today's practice hero**
   - domain color
   - Growth Path or Foundation name
   - one executable practice
   - `It counts when…`
   - voice pair expandable if it exists
   - Done / Not today
   - no daily empty-cell attendance grid
   - completed state becomes warmer/more complete, **not grey/struck through**

2. **Arrival / sleep summary**
   - latest sleep duration vs personal target
   - optional morning mood/energy values may remain attached to the sleep log
   - do not create a separate Energy page

3. **Today's pace**
   - Full / Lighter / Rest
   - user controls this; sleep may inform it but never diagnoses it
   - pace filters ritual load; it does not erase anything

4. **Morning + Evening ritual preview**
   - compact preview, not full habit management
   - tap opens `Log · Habits`

5. **From the Plan**
   - maximum 1–3 current tasks visible
   - tap opens Plan

6. **Compass AI note**
   - short, specific, evidence-based from the user's own logged data
   - cached; not regenerated on every screen open
   - rule-based fallback if network/AI fails

## Today exclusions

- Discover prompt
- personality/identity diagnosis
- separate energy history
- global wellness score
- fake “pattern spotted” reward animation
- money/FIRE cards
- large task list

---

# 6. Sleep — V1 contract

Visual target: `docs/design/wireframes/screens/log-sleep.html`.

## Circular sleep clock is mandatory

Implement the 24-hour circular dial in V1.

Required behavior:

- two draggable handles: **bed** and **wake**
- 24-hour wrap, including overnight spans
- snap to **10-minute increments**
- live duration calculation
- numeric text underneath (`23:00 → 07:00`, `8h 00m`)
- separate target dial/sheet using the same component
- accessible alternative controls: tapping the displayed times opens a native time picker
- if gesture handling fails, the numeric/native time controls still allow complete logging

Preferred RN implementation:

- `react-native-svg`
- `react-native-gesture-handler`
- shared `SleepDial` component used by both log and target
- do not add heavyweight animation just for the dial

## Sleep V1 fields

- sleep start
- wake time
- timezone
- calculated duration
- optional mood
- optional morning energy
- optional short note
- sleep target stored in **SQLite/user_prefs**, not AsyncStorage

## Sleep history

Inside Sleep:

- latest entries
- simple 7-day summary
- delete/edit an entry

Do not keep Week and History as top-level Log sub-tabs.

## Language

Prefer factual comparison with a user's own target:

- Good: `6h 40m — 1h 20m below your target.`
- Good: `Your sleep varied more this week than last week.`
- Avoid: medical/causal claims such as “this will damage X” or “this means your nervous system is Y.”

---

# 7. Foundations — V1 content and behavior

**Foundations stay in V1.** They are the floor, separate from the curated Growth Path library.

All 13 Foundations remain browseable and startable.

## Foundation list

### Tier 1 — The ground

1. `body` — **Tend the body**
2. `regulate` — **Regulate**
3. `attention` — **Steady your attention**

### Tier 2 — Your inner world

4. `feel` — **Feel & name**
5. `clear` — **See clearly**
6. `self` — **Self-relationship**
7. `know` — **Know yourself**

### Tier 3 — Other people

8. `communicate` — **Communicate**
9. `relate` — **Relate**

### Tier 4 — Meeting life

10. `hard` — **Handle hard things**
11. `word` — **Keep your word**
12. `practical` — **Live practically**

### Tier 5 — Meaning

13. `meaning` — **Make meaning**

## V1 simplification

The current HTML hard-gates `Handle hard things` until Regulate is “Steady”. **Do not hard-lock it in V1.** It may show a gentle recommendation such as “Regulate can be a useful companion here,” but the app must not pretend there is a medically required sequence.

## Foundation mechanics

Foundations reuse the same journey machinery as Growth Paths:

- three camps: **Watching → Doing → Under pressure**
- a current practice
- returns
- one active theme per day
- pause/resume
- final state is **Steady** (self-confirmed)

Do not auto-award `Steady`.

---

# 8. Growth Paths — locked V1 library

The full project currently contains 41 Path definitions. **Do not delete the full catalog content.** For V1, expose only the following 15 in Browse using a `V1_PATH_IDS` allow-list. The remaining Path content stays dormant for later releases.

This is a deliberate product cut, not an engineering limitation.

## V1 Growth Paths (15)

### A. Inner anchor / anti-limerence priority

| ID | Quality | Why it stays |
|---|---|---|
| `stillness` | **Stillness** | Canonical first Path; teaches pause/return and the Path model |
| `presence` | **Presence** | Return to the room/life in front of you instead of living in mental loops |
| `selfpossession` | **Self-possession** | Stay yourself around approval, attraction and comparison |
| `nonattachment` | **Non-attachment** | Want without requiring; central to stepping out of grasping/idealisation |
| `resilience` | **Resilience** | Come back to life while something still stings |
| `boundaries` | **Boundaries** | Keep self-respect and limits when attachment makes that difficult |
| `reciprocity` | **Reciprocity** | Notice whether care/effort actually flows both ways |

### B. Soft strength / relating

| ID | Quality | Why it stays |
|---|---|---|
| `authority` | **Quiet authority** | Say it once; adult, calm self-respect without aggression |
| `warmth` | **Warmth** | Let care be visible without performance |
| `tenderness` | **Tenderness** | Practise softness toward what is fragile rather than armoring automatically |
| `courage` | **Emotional courage** | Say/show what is true even when being seen feels exposing |

### C. Build your own life

| ID | Quality | Why it stays |
|---|---|---|
| `agency` | **Agency** | Find the move you can make; antidote to waiting for life to happen |
| `followthrough` | **Follow-through** | Continue after novelty/excitement disappears |
| `curiosity` | **Curiosity** | Explore, learn, and build a life larger than the current mental loop |
| `play` | **Play** | A life cannot become only healing + optimisation; aliveness matters |

## Public-default behavior

- Onboarding may continue to suggest **Stillness** as the first Growth Path.
- Do **not** automatically assign Non-attachment or any relationship-focused Path to all users.
- For the owner's private test profile, a useful starting trio is:
  - `clear` Foundation — See clearly
  - `nonattachment` Growth Path
  - `selfpossession` Growth Path

This private test trio is **not** the public default.

## Active-focus cap

There is one shared active focus budget:

> **Maximum 3 active journeys total across Foundations + Growth Paths.**

Starting a fourth opens a gentle chooser: pause one existing journey or cancel.

Suggested shape: 1 primary + 2 light.

## Daily practice rotation

- only **one deliberate theme** is offered on Today per day
- active pool rotates by “least recently practised”
- the same journey is **never offered two days in a row**
- user may choose another active eligible journey for today
- habits are daily; Paths/Foundations are deliberately spaced

## Camps — freeze the missing numeric rule

Current code has camp fields but no advancement rule. V1 freezes a simple shared rule:

- **Camp 1 · Watching:** 3 returns
- **Camp 2 · Doing:** next 6 returns (9 cumulative)
- **Camp 3 · Under pressure:** next 6 returns (15 cumulative)
- after 15 returns: show a reflection/claim opportunity
- **Integrated / Steady is always self-claimed**, never automatic
- user may continue practising indefinitely instead of claiming

One journey can record at most one counted return per local day.

The return count opens camps; it does **not** claim that the person's character has changed by a scientifically precise amount.

## Trail design

Do not use a 14-day attendance grid with empty cells.

Show only real returns on a trail/route. Gaps are normal because practice is spaced.

After an absence:

> **Welcome back. Nothing's lost.**

---

# 9. Habits — locked V1 system

Habits are the **daily automatic engine**. Paths/Foundations are deliberate practice. Keep those concepts separate.

## Habit rules

- morning + evening rituals
- build one habit at a time
- maximum 3 habits in a “building” state at once
- missed days never subtract reps
- track **repetitions + rhythm** separately
- default cycle target: **108 reps**
- optional user cycle: 21 / 40 / 66 / 108
- completion can be unticked on the same day
- archive preserves history
- cadence-aware progress; never assume every habit is daily
- no strikethrough on completion in production UI

## V1 starter template library (12)

These are the only curated starter templates needed for V1. Custom habits may still be added.

| ID | Habit | Ritual | Starting dose | Default cadence | Pace | Main role |
|---|---|---|---:|---|---|---|
| `water_waking` | **Drink water on waking** | Morning | 1 glass / ~2 min | Daily | Rest | tiny first anchor |
| `morning_light` | **Morning light** | Morning | 5 min → 10 min | Daily | Lighter | sleep/wake rhythm + outside world |
| `grounding_breaths` | **Three grounding breaths** | Morning | 30 sec | Daily | Rest | pause before reactivity |
| `morning_walk` | **Morning walk** | Morning | 10 min → 20 min | 3×/wk | Lighter | movement + leave the mental loop |
| `silent_sit` | **Silent sit** | Morning | 2 min → 5 min | 3×/wk | Full | Stillness / attention return |
| `phone_free_start` | **First 15 minutes phone-free** | Morning | 15 min → 30 min | Daily | Lighter | attention ownership; less immediate checking |
| `one_priority` | **Choose one priority for today** | Morning | 1 min | Daily | Full | agency + Plan bridge |
| `create_build` | **Create or build for 10 minutes before consuming** | Morning | 10 min | 3×/wk | Full | build one's own life; creativity/craft |
| `real_connection` | **Reach toward one real person you value** | Evening / anytime | one message/call/plan | 2×/wk | Full | real reciprocal life outside fixation |
| `wind_down` | **Dim lights · begin wind-down** | Evening | 10 min | Daily | Lighter | consistent evening cue |
| `screen_free_bed` | **Screen-free before bed** | Evening | 15 → 30 → 45 → 60 min | 5×/wk | Lighter | protect wind-down time |
| `journal_one_line` | **Journal · one true line** | Evening | 2 min | 3×/wk | Full | name what mattered; self-reflection |

### Important content note

The “reason” text for every curated habit must be reviewed before public launch.

Use:

- `supports`
- `may help`
- `is associated with`
- factual descriptions of the action

Avoid:

- `cures`
- `treats`
- `resets your nervous system`
- guarantees
- unsupported causal claims

## Onboarding first habit

Keep the current product principle: onboarding starts with **one tiny habit only**.

V1 deterministic default:

> **Drink water on waking**

The user may skip it. Do not seed all 12 habits into a new account.

## V1 habit-management UI

Use the HTML `log-habits.html` as the visual target, but cut the expensive media layer.

Include:

- Morning / Evening ritual cards
- check/uncheck
- Manage bottom sheet
- add curated template
- add custom habit
- edit cadence/dose/ritual
- reorder within ritual
- archive/restore
- reason card: text + small confidence label if reviewed
- reps + rhythm

Defer:

- Lottie animations
- illustrated story cards
- video
- complex “fit scores”
- automatic AI habit prescription

---

# 10. Plan — V1 contract

Plan must remain intentionally small.

Do **not** build the old Flow + Goals + Map system in V1.

Single Plan screen with segments:

```text
Today | Later | Done
```

Required actions:

- add task
- edit task
- move Today ↔ Later
- mark done / undo
- delete
- optional date
- optional `done_when`

Today surfaces only 1–3 tasks.

Keep `goal_id`/future planning concepts out of the UI. A future schema field may remain reserved, but no Goals screen.

---

# 11. Progress — V1 contract

Visual target: `docs/design/wireframes/screens/you-progress.html`, simplified to V1 data.

## Show

- Sleep: 7-day and 30-day average/trend
- Habits: cadence-correct rhythm + total reps
- Practices: returns by active Path/Foundation
- Plan: tasks completed
- Week / Month selector
- small charts/tiles using the existing accent system
- optional **weekly Compass AI reflection**

## Never show

- one composite wellness score
- one maturity/person score
- path integration percentage
- false causation (`X caused Y`) based on weak observational data
- habit completion denominator assuming every habit is 7×/week

---

# 12. AI — V1 MUST HAVE

AI is part of the core product, but it must be **bounded, useful, private-aware and cheap**.

## V1 AI features

### A. Today · Compass note

One short note based on structured recent data.

Example input shape:

```ts
{
  sleep: {
    targetMinutes,
    latestMinutes,
    average7dMinutes,
    variability7dMinutes,
    nightsLogged
  },
  habits: {
    expected7d,
    completed7d,
    strongestRitual,
    buildingHabitIds
  },
  practice: {
    todayJourneyId,
    recentReturns,
    activeJourneyIds
  },
  plan: {
    todayCount,
    completed7d
  },
  pace: 'full' | 'lighter' | 'rest',
  optionalUserNote?: string
}
```

Do **not** upload the entire SQLite DB.

### B. Progress · weekly reflection

- one short summary of notable changes
- observation, not diagnosis
- state uncertainty honestly
- user can disagree/dismiss it

### C. Local fallback

If AI is unavailable, show deterministic local observations. The app must never become unusable because the model/API is down.

## When AI is called

Local code decides if a new call is worthwhile.

Default V1 policy:

- do not call on every app open
- Today insight: maximum **1 newly generated result per user/day**
- Weekly reflection: maximum **1/week**
- cache generated response locally
- reuse cache until meaningful input changed
- user may explicitly refresh if server quota allows

## AI cost controls

Cloudflare Worker enforces server-side quota by user/account, not the phone alone.

D1 stores only usage counters such as:

- `user_id`
- period/day
- request type
- count
- model/version
- token/usage metadata if available

Do not store raw private prompt text in application logs.

## AI model

Use **Cloudflare Workers AI** behind the Worker.

- model name is an environment/config value
- mobile code never calls the model provider directly
- mobile app never contains provider secrets
- select a small/fast model for ordinary Compass notes
- reserve larger models only if a real quality difference justifies cost

## AI safety / wording

The AI prompt must explicitly require:

- no diagnosis
- no claims that Compass is therapy/medical treatment
- no guaranteed outcomes
- no pretending correlations prove causes
- no authoritative personality labels
- no telling the user they are “broken”, deficient, or behind
- concise adult language
- use the person's own targets/preferences where possible

If optional free text is sent, make that explicit to the user. Never silently upload journal/free-text content.

---

# 13. Locked cloud architecture

## Target architecture

```text
┌─────────────────────────────────────────────┐
│ Android app                                 │
│ React Native + Expo + TypeScript            │
│                                             │
│ SQLite = primary working data store         │
│ SecureStore = auth/session secrets          │
│ local rules = trigger/cost-control/fallback │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────┐
│ Cloudflare Worker                           │
│                                             │
│ /auth     → proven auth layer               │
│ /ai       → Workers AI                      │
│ /backup   → R2                              │
│ /account  → subscription / user metadata    │
└──────────┬───────────────────────┬──────────┘
           │                       │
           ▼                       ▼
     D1 (small/hot)          R2 (large/cold)
     users/sessions          compressed backups
     devices                 historical snapshots
     quotas                  user exports
     subscriptions
     backup manifests
```

## Why this is locked

Compass writes a lot of small historical events (sleep, habit completions, practice returns). Most of them are only needed by the person using the phone.

Therefore:

- **SQLite keeps the full live history locally.**
- **D1 does not become a second copy of every row forever.**
- **R2 holds compressed backup/history objects.**

This keeps database growth and long-term infrastructure cost low.

## D1 V1 responsibilities

D1 should contain only server-needed metadata:

1. auth tables (managed by chosen auth layer)
2. `devices`
3. `ai_usage`
4. `subscriptions`
5. `backup_manifests`
6. optional server config/feature flags

Do not create cloud copies of `habit_completions`, `journey_returns`, or every sleep row in D1 for V1.

## R2 V1 responsibilities

- latest user backup
- previous backup versions (bounded retention)
- exported user data if needed

Backup object should include:

```json
{
  "format_version": 1,
  "schema_version": 1,
  "exported_at": "ISO-8601",
  "tables": { "...": [] }
}
```

Compress before upload.

For V1 use Cloudflare transport + at-rest encryption. **Do not invent custom cryptography.** Client-side end-to-end encrypted backups can be a later feature only after a real key-recovery design exists.

## Backup policy

- never on every tick
- upload after meaningful changes and at most roughly once/day by default
- manual `Back up now` button
- local app always works if cloud is unavailable

## Sync

**Full real-time/multi-device bidirectional sync is NOT required for V1.**

V1 = backup/restore.

V1.1 = incremental multi-device sync with conflict resolution.

Prepare local IDs/timestamps now so V1.1 does not require a data rewrite.

---

# 14. Local SQLite target

The current schema contains useful work but also dormant V2 concepts and split storage.

## V1 tables

Keep/migrate toward:

1. `schema_meta`
2. `user_prefs`
3. `sleep_entries`
4. `habits`
5. `habit_completions`
6. `tasks`
7. `journey_progress`
8. `journey_returns`
9. `ai_insights`
10. `sync_outbox` (optional but recommended for future sync readiness)

## Journey schema migration

Replace Growth-Path-specific persistence with generic journey persistence so Foundations and Growth Paths share one engine.

### `journey_progress`

Minimum fields:

```text
journey_type      foundation | path
journey_id        bundled content ID
status            active | seeded | integrated | resting
current_camp      1..3
started_at
camp1_closed_at
camp2_closed_at
camp3_closed_at
claimed_at
notes
updated_at
PRIMARY KEY (journey_type, journey_id)
```

For a Foundation, `integrated` is presented to the user as **Steady**.

### `journey_returns`

```text
id UUID
journey_type
journey_id
local_date
logged_at UTC
Timezone
camp_at_return
note nullable
UNIQUE (journey_type, journey_id, local_date)
```

Migrate existing `path_progress` and `path_returns` rows to `journey_type='path'` before dropping old tables.

## Fix current split-brain storage

Move `compass:sleep-target` out of AsyncStorage and into `user_prefs`.

Use AsyncStorage only if there is a UI preference that truly does not belong in SQLite. Do not keep the same product state in two stores.

## Dates/timezones

One date utility only.

- UTC timestamp for actual event time
- IANA timezone stored with the event
- local date derived by the shared time utility
- never use `toISOString().slice(0,10)` for “today” logic

This must be fixed before cloud backup/public release.

---

# 15. Visual design — locked direction

The concept is **not** being recolored into a new brand.

Keep the warm-neutral system and restore the missing visual hierarchy/accent density.

## Canonical neutral tokens

```text
Background  #F6F5F2
Card        #FFFEFC
Greige      #F0ECE5
Line        #E2DFD9
Muted       #65645F
Ink         #24231F
Steel       #7E8E9F
Olive       #768471
Button      #3C3A34
```

## Path domain colors

```text
Inward      #9B8FD6
Together    #CF8F94
Craft       #D3AA62
Frontier    #7FA8B8
```

## Existing pillar accents

```text
Health      #77936F
Inner       #937CAF
Admin       #958572
Family      #B77980
Joy         #C99554
Money       #7395AD
Contrib     #8D8F63
```

## Visual rule

Warm neutrals are the canvas, not the whole painting.

Target roughly:

> **80% quiet neutral / 20% semantic color and depth**

Current APK feels bland because too many screens use only background/card/ink with large empty spaces.

Restore:

- white cards against warm background
- semantic icons
- Path domain colors
- subtle shadows
- compact information density
- charts/rings/trails
- section dividers
- colored progress states
- dark hero/AI cards where the HTML uses them

## Icons

Do not use `☀`, `≡`, `◎`, `•`, `⚙` emoji/text glyphs as production navigation icons.

Create a shared local SVG icon component matching the SVG path language in `docs/design/wireframes/shared/you.css`, using `react-native-svg`.

## Shared components to create before screen polishing

```text
src/components/
  Icon.tsx
  ScreenHeader.tsx
  SegmentedTabs.tsx
  Card.tsx
  Pill.tsx
  Check.tsx
  EmptyState.tsx
  AIInsightCard.tsx
  JourneyCard.tsx
  JourneyTrail.tsx
  RitualCard.tsx
  SleepDial.tsx
```

Do not let every screen recreate its own slightly-different card/header/tab styles.

---

# 16. Language / legal / safety rules

Compass is a self-guided wellbeing/productivity/reflection tool, not a medical device or therapy service.

## Keep these phrases/concepts

- **A compass, not a map.**
- **Welcome back. Nothing's lost.**
- **It counts when…**
- **Three at a time, so this stays a life and not another project.**
- `Drawn to` as a non-hoardable seed concept if it appears later
- practice based on actions the user controls, not outcomes

## V1 language edits

Do not use `I am becoming someone who…` as a mandatory template for every Path. Mix with:

- `I can…`
- `I'm practising…`
- direct practice language

## Claims review required before Play release

Audit every string in:

- Foundations
- Path practices/meaning
- habit reason/benefit copy
- Sleep notes
- AI system prompt/examples
- Play Store description
- onboarding

Rules:

- no diagnosis
- no treatment/cure claims
- no guaranteed mental-health or physical-health outcomes
- observational correlations are labelled as observations
- generic self-help exercises are presented as options to try

---

# 17. Monetisation — public V1, after private APK works

Price direction already discussed: **£1.99/month**.

Do not block the first personal APK on billing work.

## Proposed simple launch model

### Free

- local Today/Sleep/Habits/Plan/Paths/Foundations/Progress
- limited AI trial/allowance (server-configurable)

### Compass Plus — £1.99/month

- frequent AI Compass notes (within sensible quota)
- weekly AI reflection
- cloud backup/restore

No annual plan, family plan or complex tiers in V1.

Keep quotas server-configurable in D1/Worker so pricing can change without shipping a new APK.

Billing and Play receipt verification is implemented **after private beta confirms the core loop is worth paying for**.

---

# 18. Repository/documentation cleanup — DO FIRST

The uploaded project contains large generated/dependency folders. Clean these before serious implementation.

## Remove from project archive / source control

These are generated and must not be part of a handoff ZIP/repo:

```text
mobile/node_modules/
mobile/.expo/
mobile/android/.gradle/
mobile/android/local.properties
mobile/eas-build.log
mobile/eas-build2.log
mobile/eas-build3.log
mobile/eas-build4.log
mobile/eas-build5.log
```

`node_modules` alone accounts for tens of thousands of files in the current archive. Dependencies should be restored from `package-lock.json` with `npm ci`.

Add/keep ignore rules for `*.log`, `.gradle`, `.expo`, `node_modules`, `local.properties`, build artifacts and secrets.

## Research archive

`Compass/design/Margulan principles/` is research/source material, not runtime application code. It also contains very long filenames that can break extraction/tooling.

**Move it out of the application repository** into a separate backed-up research archive. Do not destroy the original material; keep only distilled product principles in the app/docs repo.

---

# 19. Files to CREATE / UPDATE / DELETE

This section is implementation bookkeeping. Do not skip it.

## CREATE

### Root / docs

- **`PLAN.md`** — this file; canonical V1 contract
- **`docs/design/spec-foundations.md`** — currently referenced but missing; derive from `foundations.html`, and record the V1 no-hard-gate decision
- optionally `docs/product/ai-policy.md` — concise AI privacy/claims/quotas contract if separation helps

### Mobile

- `mobile/src/components/*` shared component kit listed in §15
- `mobile/src/features/foundations/FoundationsScreen.tsx`
- `mobile/src/features/sleep/components/SleepDial.tsx`
- `mobile/src/data/foundations.ts`
- `mobile/src/data/ai.ts` or a clear AI repository/service module
- `mobile/src/data/backup.ts`
- SQLite migration(s) for `journey_*`, `ai_insights`, and storage fixes

### Backend

Replace the empty/stale Supabase concept with:

```text
backend/worker/
  src/index.ts
  src/routes/ai.ts
  src/routes/auth.ts
  src/routes/backup.ts
  src/routes/account.ts
  src/lib/auth.ts
  src/lib/ai.ts
  src/lib/r2.ts
  src/lib/usage.ts
  src/db/schema.sql
  wrangler.toml
  package.json
```

Exact internal naming may vary, but responsibilities may not.

## UPDATE

### Product/design docs

- `docs/product/v1 plan.md` → replace with a short pointer to root `PLAN.md` or delete after all references are changed
- `docs/product/engagement-model.md` → add frozen camp targets and V1 scope
- `docs/design/spec-practice-model.md` → active cap = 3 across Foundations + Growth Paths; one daily theme; V1 camp targets
- `docs/design/spec-habits.md` → freeze the 12 V1 templates; defer Lottie/story/video from V1
- `docs/design/spec-you.md` → mark Discover/Self deferred; freeze V1 15-Path allow-list; keep full catalog as future content
- `docs/design/design-system.md` → add four Path-domain colors if missing
- `docs/architecture/infrastructure.md` → rewrite Supabase architecture to Cloudflare/SQLite/D1/R2/Workers AI
- `docs/architecture/infrastructure.html` → update or clearly mark as outdated until regenerated

### Mobile documentation/config

- `mobile/README.md` → remove Supabase setup; document local SQLite + Cloudflare Worker setup
- `mobile/ARCHITECTURE.md` → rewrite stale Supabase/V1-sleep-only architecture
- `mobile/.env.example` → remove Supabase variables; add only public Worker API base URL/environment values. Secrets live only in Worker environment.
- `mobile/package.json` → remove Supabase dependency; add SVG/required packages; add reliable `typecheck`, `test`, `lint` scripts
- `mobile/app.json` / `eas.json` → review before production build and Expo SDK upgrade

### Mobile runtime

- `src/AppShell.tsx` → Log only Sleep/Habits; You only Progress/Paths; Foundations accessible from Paths; proper icons
- `src/App.tsx` → keep local onboarding gate; cloud login is not the app entry gate
- `features/onboarding/OnboardingScreen.tsx` → add one tiny habit step; review copy; keep Stillness optional
- `features/today/TodayScreen.tsx` → implement complete V1 Today contract
- `features/sleep/*` → circular dial + integrated history; remove separate Week/History nav
- `features/habits/HabitsScreen.tsx` → match ritual target, cadence/reps/rhythm/manage flow; remove strikethrough done state
- `features/paths/PathsListScreen.tsx` → V1 allow-list, live camp data, Foundations card, cap enforcement
- `features/paths/PathDetailScreen.tsx` → real live camp state, pause/resume, self-claim only after camp 3
- `features/paths/pathsContent.ts` → preserve full 41 but export/use `V1_PATH_IDS`; fix ghost integrated IDs
- `features/plan/PlanFlowScreen.tsx` → Today/Later/Done only
- `features/progress/ProgressScreen.tsx` → cadence-correct metrics + real chart data + weekly AI reflection
- `features/settings/SettingsScreen.tsx` → sleep target, AI/privacy, export/backup/account, wipe data
- `src/lib/time.ts` → only path for local-date/timezone logic
- `src/lib/ai.ts` → replace “local-only forever” implementation with local fallback + Worker client separation
- `src/lib/db/schema.sql` / migrations → target schema in §14
- `src/styles/theme.ts` → match canonical tokens/domain colors; reduce current radius inflation where HTML target is tighter

## DELETE after references are removed

### Supabase/dead auth

```text
backend/supabase/
mobile/src/lib/supabase.ts
mobile/src/auth/AuthGate.tsx
mobile/src/auth/LoginScreen.tsx
mobile/src/auth/Onboarding.tsx
mobile/src/auth/index.ts
mobile/src/hooks/useAuthStore.ts
```

If `mobile/src/hooks/index.ts` becomes empty, delete it too.

Remove `@supabase/supabase-js` from `package.json`.

Remove Supabase variables from `.env.example` and stale types from `src/types`.

### Empty/deferred feature scaffolding

Delete empty folders that imply V1 scope that no longer exists:

```text
mobile/src/features/energy/
mobile/src/features/mood/
mobile/src/features/planning/
```

Do not create placeholder screens for deferred features.

### Sleep leftovers

Once the integrated Sleep/Progress implementation is working, remove or repurpose:

```text
features/sleep/screens/WeekScreen.tsx
features/sleep/screens/HistoryScreen.tsx
```

Do not delete until replacement functionality is tested.

---

# 20. Expo / Android technology upgrade

Current mobile project is Expo SDK 51 / RN 0.74.

Do not combine a framework upgrade with the first big UI refactor.

Sequence:

1. make local V1 behavior/design coherent on current working build
2. commit/checkpoint
3. upgrade Expo in an isolated phase to an **API-36-capable stable SDK** for Play release (target current stable, expected SDK 57 unless compatibility requires another supported API-36 build)
4. run Expo doctor / dependency alignment
5. rebuild Android native project as required
6. regression-test SQLite, gestures, SecureStore, sleep dial, auth, Worker calls
7. produce APK for private test
8. produce AAB only when release checklist passes

---

# 21. Implementation phases and gates

## Phase 0 — Freeze & clean

- add this `PLAN.md`
- remove generated/dependency junk from handoff repo
- remove/move research archive from runtime repo
- update stale README/architecture references enough that Supabase is no longer presented as the plan

**Gate:** clean `npm ci` from scratch works.

---

## Phase 1 — Data correctness before pretty UI

- one timezone/local-date implementation
- sleep target → SQLite prefs
- journey schema + migration
- live camp rules
- cap enforcement
- habit cadence-correct calculations
- fix Plan SQLite query issues
- fix Today refresh after changing Paths

**Gate:** existing data survives migration; unit tests cover dates/camp thresholds/cadence.

---

## Phase 2 — Shared design system

Build shared components + token mapping before rewriting screens.

- proper SVG icons
- cards/header/tabs/pills/checks
- domain colors
- shadows/radii matching HTML

**Gate:** one component gallery/demo or Storybook-like dev screen visually matches tokens.

---

## Phase 3 — Sleep

- SleepDial
- target dial
- save/edit/delete logs
- integrated history
- no Week/History top tabs

**Gate:** test overnight, same-day, 10-min snapping, timezone change, screen reader/native picker fallback.

---

## Phase 4 — Habits

- curated 12-template content
- Morning/Evening ritual UI
- Manage sheet
- add/edit/reorder/archive
- cadence/dose
- reps + rhythm
- pace filtering
- onboarding first habit

**Gate:** non-daily habit is not penalised as if daily; archive/restore retains history.

---

## Phase 5 — Paths + Foundations

- V1 15-path allow-list
- all 13 Foundations
- generic journey persistence
- 3 active total cap
- real live camps/trails
- 3/6/6 return progression
- pause/resume
- self-claim integration/steady
- no empty-day practice grid

**Gate:** Stillness + one Foundation can be walked end-to-end with real data.

---

## Phase 6 — Today + Plan + Progress

- full Today composition
- pace
- ritual preview
- 1–3 Plan tasks
- simplified Plan
- cadence-correct Progress

**Gate:** user can live one complete day without needing any deferred screen.

---

## Phase 7 — Cloudflare AI

- Worker skeleton
- D1 schema
- proven auth layer
- Workers AI route
- usage quotas
- local structured context builder
- local fallback/caching
- Today AI note
- weekly Progress reflection

**Gate:** AI secret never exists in APK; airplane/offline mode still works.

---

## Phase 8 — R2 backup/restore

- export schema/versioned JSON
- compress
- upload manifest + R2 object
- restore on clean install/account
- manual backup
- bounded automatic backup frequency

**Gate:** install on fresh device/emulator, restore, verify counts and recent records.

---

## Phase 9 — Android upgrade & private beta

- Expo/API target upgrade
- build clean APK
- use personally for **at least 7–14 days**
- record only genuine friction/bugs
- do not add deferred features because the app feels “empty” on day 1

**Gate:** no data loss/crashes; Today is useful; circular dial feels good; AI note adds value rather than noise.

---

## Phase 10 — Public release + monetisation

- privacy policy
- terms/disclaimer
- account deletion/export flow
- Play billing £1.99/month
- receipt verification
- server-configurable AI quotas
- store copy/screenshots
- crash/error monitoring that does not capture private journal/prompt content

**Gate:** release checklist signed off; claims review complete.

---

# 22. Minimum test matrix

## Unit tests

- sleep duration across midnight
- sleep dial angle ↔ time conversion
- 10-minute snapping
- local date around midnight/timezone
- habit cadence expectation calculation
- reps never decrease
- Path/Foundation active cap = 3
- same journey not selected two days running
- camp thresholds 3 / 9 / 15 cumulative
- integration not auto-awarded
- AI `shouldGenerateInsight` caching/quota logic

## Integration tests

- onboarding → first habit → optional Stillness → Today
- log sleep → Today summary updates
- tick habit → Progress changes
- start Path → Today practice appears without remount bug
- complete journey returns → camps advance
- pause/resume journey
- Plan Today task → Today card → complete → Progress
- Worker down → local fallback
- backup → wipe/install → restore

## Manual Android tests

- physical phone gestures for SleepDial
- small/large font sizes
- dark system mode behavior (V1 may force app palette if necessary, but must remain legible)
- no keyboard overlap in sheets/forms
- offline mode
- poor network / timeout
- timezone travel
- app killed/reopened during edits

---

# 23. V1 acceptance criteria by screen

## Today

- no large meaningless empty beige area
- one clear primary practice
- real data from Sleep/Habits/Plan/Paths
- AI note cached and bounded
- visual hierarchy matches HTML spirit

## Sleep

- circular dial is present and usable
- target dial works
- 10-minute snap works
- history exists without extra top nav

## Habits

- two real ritual cards
- curated templates + custom habit
- no strikethrough-shame completion treatment
- reps + cadence-correct rhythm

## Plan

- user can manage Today/Later/Done without Goals/Map

## Paths

- only locked 15 Growth Paths exposed in V1 Browse
- all 13 Foundations available through Foundations
- 3 active total cap
- trails use real returns
- camps actually advance
- final state is self-claimed

## Progress

- no fake percentages
- no global score
- data is derived from real local records

## Cloud/AI

- no Supabase runtime dependency
- no provider secret in APK
- D1 remains metadata-sized
- R2 carries backup/history objects
- AI unavailable does not break app

---

# 24. Explicit V1 parking lot

Do not implement these until V1 is stable unless this plan is deliberately revised:

- Discover
- Self / Identity portrait
- Body logging page
- separate Energy page/history
- Money/FIRE
- Goals tree
- Plan Map / complex planning AI
- World visualisation
- widgets
- full multi-device live sync
- social/community features
- leaderboards
- AI chatbot
- AI therapist framing
- automatically generated health claims
- 41 visible Growth Paths
- extra Path families merely to make Browse feel full
- Lottie/story/video habit media
- annual/family/business subscriptions
- iOS launch

---

# 25. Final definition of “V1 done”

V1 is done when a new Android user can:

1. onboard calmly
2. start one tiny habit
3. optionally start Stillness or choose a Foundation/Path
4. log sleep with the circular dial
5. use morning/evening rituals
6. see one meaningful daily practice
7. plan a few real actions
8. see honest progress
9. receive a useful bounded AI Compass note
10. back up/restore their Compass
11. use the app offline except for AI/cloud functions
12. leave for a week and return to **“Welcome back. Nothing's lost.”**

Nothing else is required to call Compass V1 a real product.

---

# 26. Instruction to the implementing AI

Do not “improve” this plan by expanding it.

When you encounter an unclear implementation detail:

1. choose the smallest implementation that satisfies this file and the existing HTML design,
2. preserve local-first behavior,
3. preserve user data,
4. write a short decision note,
5. continue.

Ask for a product decision only if the choice would change user-visible behavior, privacy, billing, or V1 scope.

At the end of every phase, report exactly:

```text
DONE
- files changed
- behavior now working
- tests/build run

NOT DONE / BLOCKED
- exact issue

NEXT PHASE
- only the next locked phase from PLAN.md
```

Do not begin the next phase before the current gate passes.
