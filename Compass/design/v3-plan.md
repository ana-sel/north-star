# Compass — V3 Design (Direction & Conversation)

> **Builds on:** [v1-sleep.md](v1-sleep.md) · [v2-track.md](v2-track.md)
> **Theme:** *Direction* — the app starts thinking with you. Mission, qualities, goals, the Now → Mission map, and a real Chat companion.
> **Next:** [v4-world.md](v4-world.md) — the Cartographer interprets the full picture.

---

## 0. What V3 ships (within the 4-tab architecture)

V2 set the navigation shape (Today · Log · Map · You + floating Chat pill). V3 doesn't add tabs — it *deepens* each tab and finally activates the Chat pill.

| Tab | V2 (shipped) | V3 additions |
|---|---|---|
| **Today** | calm briefing; Quality card = placeholder | **Quality card goes live** (today's rotating quality + practice tick + easy/hard) |
| **Log** | Sleep dial · Habits · Body · Money quick · Mood | unchanged |
| **Map** | Year/Map = placeholder; Month kanban; Projects list | **Year, Map, Qualities, Mission go live**; goal CRUD with motivation + filter + gap |
| **You** | Trends · History · Money detail · Settings | + **Identity** (skills · education · family · values) |
| **Chat pill** | shell only — "arrives in V3" | **live** — Mission / Goal / Free modes, contextual to current screen |

### Stays from V1 + V2
- Everything in V2 stays exactly as shipped. V3 is purely additive at the surface level (one card flips from placeholder to live, the Map tab fills in, the Chat pill activates, You gains Identity).

### Defers to V4
- Habit/quality integration detection (research dependency — Lally et al. 2010 baseline).
- Longitudinal "what blocks happiness" analysis (V3 ships a basic surfacing).
- World tab in You · Cartographer voice throughout.

---

## 1. Today — the Quality card goes live

```
┌──────────────────────────────────┐
│  Compass                     ⚙  │
├──────────────────────────────────┤
│  🌙 SCENE                       │  ← V1, unchanged
│                                  │
│  🧠 Today's quality   ← V3 live  │
│     Patience                     │
│     "When stuck today, think:    │
│      I'll find a way."           │
│     ☐ Practised                  │
│     ↳ After tap: easy / hard     │
│                                  │
│  ✦ What needs you today          │  ← V2, unchanged
│                                  │
│  + Quick log row                 │  ← V2, unchanged
│                              ┌──┐│
│                              │💬││  ← V2 pill, V3 activates
│                              └──┘│
├──────────────────────────────────┤
│  ☾ Today  ◈ Log  ◇ Map  ◯ You   │
└──────────────────────────────────┘
```

The quality cue line is authored alongside each quality definition (see §3). Rotation is one quality per day, deterministic (least-recently-shown wins ties).

---

## 2. The 7 pillars (taxonomy)

Every habit, goal, quality and plan card carries a pillar tag. Pillars are visual + organisational, not gating.

| Pillar | Token | Hex | Examples |
|---|---|---|---|
| Health | `--p-health` | `#77936f` | sleep rhythm, movement, recovery |
| Inner | `--p-inner` | `#937caf` | self-regulation, reflection, emotional processing |
| Admin | `--p-admin` | `#958572` | planning, open loops, paperwork, logistics |
| Family | `--p-family` | `#b77980` | relationships, partner/family warmth |
| Joy | `--p-joy` | `#c99554` | play, craft, curiosity, delight |
| Money | `--p-money` | `#7395ad` | spending, saving, security |
| Contrib | `--p-contrib` | `#8d8f63` | service, meaning, contribution |

Already in `src/styles/theme.ts` from V2 prep. V3 wires them into Map.

---

## 3. Qualities & values (the standalone system)

Qualities = traits the user wants to build/strengthen (patience, courage, kindness, focus, honesty…). **Separate from habits**:

- A habit is *a thing you do*.
- A quality is *a way of being*.

### Library + custom (mirror of V2 habits)

| Field | Description |
|---|---|
| Name | "Patience" |
| Definition | One sentence — *"The willingness to wait without forcing."* |
| Cue line | One sentence shown on Today — *"When stuck today, think: I'll find a way."* |
| Pillar | One of 7 |
| Source | `library` / `custom` |

### Daily practice
- **Max 3 active qualities** at once (matches habits limit).
- One quality rotates onto Today each day (least-recently-shown wins ties).
- Tap *Practised* → choose `easy` or `hard`.
- Easy/hard trend feeds the integration signal (deferred to V4).

### Where qualities live in the UI
- **Today** — the live card (above).
- **Map → Qualities** — manage active list, browse library, add custom.

---

## 4. Mission statement

Default: `"Live a happy life."` Editable text on `profiles.mission`.

### Where mission lives
- **Map → Mission** — view, edit, see history (last 5 versions).
- **Map → Map** — anchor at right side of the Now → Mission visualisation.
- **Add-goal flow** — referenced in step 3 ("does this goal serve your mission?").
- **Chat → Mission mode** — discovery conversation. On confirm, writes `profiles.mission`.

### Discovery is conversational, not forced

A new user starts with the default mission. The Chat pill in Mission mode is *one* path to refining it. There is no onboarding screen that demands a mission statement. Users can run V3 for months on the default — no shame.

---

## 5. Goals — the add-goal flow

Goal CRUD lives in **Map → Year** (annual goals) and **Map → Projects** (multi-year). The add-goal flow is a 4-step overlay.

### Step 1 — Title + pillar + target date

```
Title         [Learn SQL well enough to ship a feature]
Target date   [2026-12]
Pillar        Joy · Admin · Money · Health · Family · Contrib · Inner
```

### Step 2 — Motivation gate (logged, never blocking)

```
Why this goal?

○ I want this
   Internal pull. Curiosity, joy, growth.

○ I have to do this
   External pressure or obligation. Logged so you can
   see the load over time — not blocking.
```

Both choices add the goal. `have_to` goals are visually muted in Year / Map (greyed, dashed paths) and surface in the load analysis.

### Step 3 — Mission filter

```
Does this goal…
Your mission: "Live a happy life."
Tick at least one.

☐ make me happy
☐ help others
☐ improve my environment
```

≥1 required to save. The three options come from the qualitative sources behind happiness research (autonomy / relatedness / competence simplified into user-facing language).

### Step 4 — Qualities & skills gap (informational, not gating)

AI proposes 2–3 qualities and 2–3 skills that would support this goal. For each, the user sees one of three badges:

| Badge | Meaning |
|---|---|
| **Have** | Already in your active qualities or `profiles.skills` |
| **Missing** | Not in your active qualities / skills |
| **Unknown** | AI suggested it but can't verify from your profile |

A tip below: *"Activating Discipline as a daily quality would support this goal. You can do that after saving."*

Then **[Back] [Add goal]**. Nothing blocks.

---

## 6. Map — the Now → Mission visualisation

Sub-tab: **Map → Map**.

```
┌──────────────────────────────────────────┐
│  ● Now                Mission · Live a   │
│                       happy life      ●  │
│                                          │
│      Money ────────────────────          │
│                            ⚠             │
│      Health ╌╌╌╌╌╌╌╌╌╌╌╌╌               │
│                                          │
│      Water trip ───────────────          │
│                  ⚠                       │
│      Passport · · · · · · · · · ·  ← have-to (dashed grey)
│                                          │
│  Legend                                  │
│  ● Goal  ╌ Have-to  ⚠ Conflict           │
│                                          │
│  [ ⚐ What blocks happiness? ]            │
└──────────────────────────────────────────┘
```

- Each goal becomes a **path** from Now to Mission.
- Path colour = pillar.
- Have-to goals are **dashed and greyed**.
- Conflict glyphs `⚠` sit between conflicting paths.
- The **"What blocks happiness?"** button opens a basic surfacing in V3; V4 ships the full longitudinal version.

### Conflict rules (V3 basic version)

| Type | Detection |
|---|---|
| **Time** | Two goals with overlapping target dates that need significant focus |
| **Direction** | Goals with opposing implications (e.g. *save more* + *long trip*) |
| **Resource** | Goals competing for the same finite resource (money, hours, attention) |

Conflicts **never block**. They surface a compromise suggestion in Chat → Goal mode.

---

## 7. Chat — pill activates, three modes

The floating Chat pill from V2 wakes up. Tap → bottom sheet slides up. Contextual to the screen you came from.

```
┌──────────────────────────────────┐
│  ─                               │ ← drag handle
│  💬 Chat                  ✕      │
│                                  │
│  Mode:  [Mission] [Goal] [Free]  │ ← mode picker
│                                  │
│  ╔══════════════════════════╗    │
│  ║ Compass                  ║    │
│  ║ What does a good day     ║    │
│  ║ look like for you…       ║    │
│  ╚══════════════════════════╝    │
│  ╔══════════════════════════╗    │
│  ║                      You ║    │
│  ║      One where I don't…  ║    │
│  ╚══════════════════════════╝    │
│  ╔══════════════════════════╗    │
│  ║ Compass                  ║    │
│  ║ Mission · suggestion     ║    │
│  ║ "A rested life with one  ║    │
│  ║  thing I'm proud of and  ║    │
│  ║  people I love."         ║    │
│  ║ [ Refine ] [ Save ]      ║    │
│  ╚══════════════════════════╝    │
│                                  │
│  [Reply or ask anything…]     ↑  │
└──────────────────────────────────┘
```

### The three modes

| Mode | Purpose | Side effects |
|---|---|---|
| **Mission** | Discovery conversation toward a mission statement | On confirm → writes `profiles.mission` |
| **Goal** | Break down or refine a goal · resolve a conflict · plan next step | Can insert `plan_cards`; never modifies a goal without confirm |
| **Free** | Open reflection · journaling · ask anything | No writes |

### Contextual entry
- From **Today** → Free mode default
- From **Map → Year** with a goal selected → Goal mode, that goal pre-loaded
- From **Map → Mission** → Mission mode
- From **Log → Sleep** → Free mode with sleep context attached
- From **You → Trends → Sleep** → Free mode with trend context attached

### Privacy
- Free-text journaling stays on-device (Expo SecureStore + local SQLite mirror; sync optional with explicit toggle).
- Only structured signals (counts, durations, codes) reach the Edge Function.
- Chat history is RLS-protected like every other table.

---

## 8. You — Identity section added

```
┌──────────────────────────────────┐
│  You                         ⚙  │
├──────────────────────────────────┤
│  📊 Trends                       │  ← V2
│  📜 History                      │  ← V2
│  💷 Money                        │  ← V2
│  🧬 Identity        ← V3 new     │  → profile, skills, education,
│                                  │     family, values
│  ⚙ Settings                      │  ← V2 (mission editor added)
└──────────────────────────────────┘
```

### Identity sub-screen

```
┌──────────────────────────────────┐
│  Identity                        │
│                                  │
│  Name           Ana              │
│  Email          ana@example.com  │
│  Height         168 cm           │  ← V2
│  Mission        Live a happy…    │  ← V3
│                                  │
│  Skills         + add            │
│  ● TypeScript   ● Cooking        │
│  ● Public speaking               │
│                                  │
│  Education      + add            │
│  ● BSc Computing — 2018          │
│                                  │
│  Family         + add            │
│  ● M. — partner                  │
│  ● Mum, Dad                      │
│                                  │
│  Values         + add            │
│  ● Honesty  ● Curiosity          │
│  ● Kindness                      │
└──────────────────────────────────┘
```

Stored on `profiles` as JSONB columns: `skills`, `education`, `family`, `values`. These power the qualities/skills gap analysis in the add-goal flow.

---

## 9. Database schema additions (V3)

```sql
-- Mission (single value per user, stored on profiles)
alter table profiles add column mission text default 'Live a happy life.';
alter table profiles add column skills jsonb default '[]'::jsonb;
alter table profiles add column education jsonb default '[]'::jsonb;
alter table profiles add column family jsonb default '[]'::jsonb;
alter table profiles add column values jsonb default '[]'::jsonb;

-- Qualities
create table qualities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  definition   text,
  cue          text,
  pillar       text not null,
  source       text not null check (source in ('library','custom')),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table quality_logs (
  quality_id   uuid not null references qualities(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  practised    boolean not null,
  rating       text check (rating in ('easy','hard')),
  primary key (quality_id, date)
);

-- Goals
create table goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  pillar          text not null,
  target_date     date,
  motivation      text not null check (motivation in ('want','have_to')),
  makes_me_happy  boolean not null default false,
  helps_others    boolean not null default false,
  improves_env    boolean not null default false,
  status          text not null default 'active'
                   check (status in ('active','done','paused','dropped')),
  created_at      timestamptz not null default now()
);

create table goal_qualities (
  goal_id      uuid not null references goals(id) on delete cascade,
  quality_id   uuid not null references qualities(id) on delete cascade,
  state        text not null check (state in ('have','missing','unknown')),
  primary key (goal_id, quality_id)
);

create table goal_skills (
  goal_id      uuid not null references goals(id) on delete cascade,
  skill        text not null,
  state        text not null check (state in ('have','missing','unknown')),
  primary key (goal_id, skill)
);

-- Chat
create table chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  mode         text not null check (mode in ('mission','goal','free')),
  context      jsonb,            -- screen, ids of referenced rows
  role         text not null check (role in ('user','assistant')),
  body         text not null,
  created_at   timestamptz not null default now()
);

-- Plan cards (Map → Month kanban; reused from V2 schema)
-- (already in V2)

-- RLS on every new table: row.user_id = auth.uid()
```

---

## 10. Build order (V3 — additive on V2)

1. `qualities` + `quality_logs` schema + Map → Qualities sub-tab + library/custom flow.
2. Activate Today's Quality card (rotation algorithm, tick + easy/hard).
3. `goals` + `goal_qualities` + `goal_skills` schema.
4. Add-goal flow: 4-step overlay (Map → Year → "+ Add a goal").
5. Map → Year, Map → Map (Now → Mission SVG, conflict glyphs, legend, "what blocks happiness" basic).
6. Map → Mission editor (text input + history).
7. Profile JSONB columns (skills, education, family, values) + Identity sub-screen.
8. Chat pill activates: bottom sheet, Mission/Goal/Free modes, contextual entry.
9. `chat_messages` schema + RLS.
10. Edge Function: gpt-4o-mini for Chat. Strip PII at boundary (only ids → indirection through Postgres RPC).
11. Goal breakdown via Chat → Goal mode (inserts plan_cards).
12. Conflict detection (time / direction / resource) → surfaces in Map and offers compromise in Chat.
13. Mission discovery flow via Chat → Mission mode → writes `profiles.mission` on confirm.
14. Qualities/skills gap suggestion in add-goal step 4 (AI suggestion + comparison to profile).

---

## 11. Privacy & GDPR

- `chat_messages.body` may contain free-text reflections — RLS isolates per user.
- Edge Function receives **only**: mode, sanitized context blob (no PII), conversation tail (last N messages, also user-isolated).
- Goal titles + mission text never leave Postgres without explicit user action (e.g. export).
- The qualities/skills gap suggestion can run in two modes — client-side rule-based (default) or AI-augmented (opt-in toggle in Settings).

---

## 12. Research-required (still deferred to V4)

- Habit/quality integration detection algorithm (Lally et al. 2010 baseline → personal model).
- Full "what blocks happiness" longitudinal analysis (V3 ships a basic surfacing only).
- Cross-pillar pattern confirmation thresholds.

---

## 13. Reference

- V1: [v1-sleep.md](v1-sleep.md) · V2: [v2-track.md](v2-track.md)
- Money: ported in V2; unchanged in V3
- Wireframe: [wireframes/v3-plan.html](wireframes/v3-plan.html)
