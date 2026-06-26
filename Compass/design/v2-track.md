# Compass — V2 Design (Capture & Browse)

> **Builds on:** [v1-sleep.md](v1-sleep.md)
> **Theme:** *Capture & Browse* — keep the calm of V1, add the data backbone the rest of the app reasons over, introduce the navigation shape that survives all the way to V4.
> **Next:** [v3-plan.md](v3-plan.md) adds Direction (mission, qualities, goals, map, conversation).

---

## 0. The architectural decision: 4 mode-tabs + floating Chat

The app is a "one life" app, so it has many surfaces (sleep, body, habits, mood, money, goals, mission, qualities, tasks, trends, history, world…). Structuring by *feature* makes 5 bottom tabs cramped and turns Today into a dashboard for everything. We structure by **mode of engagement** instead:

| Tab | Mode | Holds |
|---|---|---|
| **Today** | *Glance* — how today is going | Briefing (3–4 cards max) |
| **Log** | *Capture* — record something | Sleep · Habits · Body · Money quick |
| **Map** | *Direction* — the long view | Year · Month · Projects · Map *(mostly placeholder in V2; full in V3)* |
| **You** | *Browse* — your life data | Trends · History · Money detail · Settings *(Identity in V3, World in V4)* |

### Pillar naming (current)

V2 now follows the V4 naming set for pillars:

- `health`
- `inner`
- `admin`
- `family`
- `joy`
- `money`
- `contrib`

Legacy aliases (`sleep`, `body`, `mind`, `heart`, `craft`, `spirit`) may still appear in older examples, but new schema/UI decisions should use the current set above.

**Floating Chat pill** — bottom-right of every screen, ChatGPT-style. Tap opens a bottom sheet. Chat is not a tab because it's a *companion that follows you*, contextual to the screen you came from. *V2 ships the pill + sheet shell only; conversational logic arrives in V3.*

```
┌──────────────────────────────────┐
│  Compass                     ⚙  │   ← Today
│                                  │
│  [today's content]               │
│                                  │
│                              ┌──┐│
│                              │💬││   ← floating chat pill
│                              └──┘│
├──────────────────────────────────┤
│  ☾ Today  ◈ Log  ◇ Map  ◯ You   │
└──────────────────────────────────┘
```

### What V2 ships

| Area | Change |
|---|---|
| **Navigation** | New — 4 mode-tabs + floating Chat pill (sheet shell) |
| **Today tab** | Redesigned — calm briefing, 3–4 cards |
| **Log tab** | New — Sleep dial (V1, preserved) · Habits · Body (redesigned) · Money quick |
| **Map tab** | Skeleton — Year/Month/Projects/Map sub-tabs; Year + Map = placeholder; Month = horizontal kanban; Projects = simple list |
| **You tab** | New — Trends (with range selector) · History · Money detail (Quiet-Capital-style sub-app) · Settings |
| **Chat pill** | Shell only — opens sheet with "Conversation arrives in V3" + composer disabled |
| **Mood + Energy** | 1–10 score rows captured in Log → Sleep (same save, same row) |
| **Body redesign** | Focus-first inputs + explicit ✕ per field (exclude from save), BMI auto, calorie+macro grouping, body feel scale, "Today I noticed" chips, note |
| **Money detail** | Ported from `D:\My Archive\quiet-capital` in Compass's calm beige language |

### Stays from V1
- Google login · timezone auto-detect · sleep dial · sleep target strip · target modal · profile/privacy settings · sign out.

### Defers to V3
- Quality practice live on Today (V2 = placeholder card)
- Mission statement · goals · qualities system · map visualisation · chat conversational logic · Identity (skills/edu/family/values) in You

### Defers to V4
- Habit/quality integration detection
- "What blocks happiness" longitudinal analysis
- World tab in You · Cartographer voice

---

## 1. Tab 1 — Today

Calm briefing, no entry forms. Maximum 4 cards. Today is *the home screen*, structurally enforced to stay lean.

```
┌──────────────────────────────────┐
│  Compass                     ⚙  │
├──────────────────────────────────┤
│  Wednesday, 24 June · UTC+1      │
│                                  │
│  🌙 A scene has appeared         │ ← only when world scene unlocks (V1 rule)
│     The river ran clearer the    │   tap → scene viewer (V4 expands this)
│     morning after rest.          │
│     Tap to view →                │
│                                  │
│  🧠 Today's quality              │ ← V2: placeholder "Unlocks in V3"
│     "Quality practice arrives    │   V3: live quality card, ☐ Practised
│      in V3."                     │
│                                  │
│  ✦ What needs you today          │ ← 1–3 items, in priority order
│     ● Log sleep                  │   pulled from rules:
│     ● Renew passport · ROI 5     │   – unlogged sleep first
│     ● 10-min walk outside · ROI 4│   – then top Today-column kanban cards
│                                  │   – tap → opens the right surface
│                                  │
│  + Quick log                     │ ← one row, four icons
│     [💤] [✓] [🍽] [💷] [☺]      │   tap → opens Log sub-tab directly
│                                  │
│                              ┌──┐│
│                              │💬││
│                              └──┘│
├──────────────────────────────────┤
│  ☾ Today  ◈ Log  ◇ Map  ◯ You   │
└──────────────────────────────────┘
```

### Card rules

| Card | Empty state | Tap behaviour |
|---|---|---|
| Scene | Hidden until earned (3+ sleep logs — V1 rule) | Opens scene viewer |
| Today's quality (V2) | Placeholder "Unlocks in V3" if feature flag off; hidden otherwise | None |
| What needs you today | "Today is clear — nice." if nothing to surface | Each row taps into the relevant surface (Log → Sleep, Map → Task, Money → Expense, etc.) |
| Quick log row | Always present | Each icon opens the relevant Log sub-tab pre-positioned |

### What's removed from V1's Today
- The inline sleep form → moves to **Log → Sleep** (same V1 dial, just relocated).
- Mood/energy → captured as 1–10 score rows at the bottom of Log → Sleep (same save action).
- Pattern observation → moves to **You → Trends** (surfaces in the relevant tile drill-down).

### Quick log row icons

| Icon | Opens | Sub-tab |
|---|---|---|
| 💤 | Log | Sleep (V1 dial) |
| ✓ | Log | Habits |
| 🍽 | Log | Body |
| 💷 | Log | Money (quick) |

---

## 2. Tab 2 — Log

Sub-tabs across the top. *Capture only* — no charts here.

```
┌──────────────────────────────────┐
│  Log                         ⚙  │
├──────────────────────────────────┤
│  Sleep · Habits · Body · Money
│                                  │
│  [active sub-tab content]        │
└──────────────────────────────────┘
```

### 2.1 Log → Sleep

**Exactly the V1 dial.** Same SVG, same drag handles, same snap-10-min, same target strip on top, same target modal, same "Save night" CTA, same gentle insight card. Nothing changes about the entry experience the user already loves.

```
┌──────────────────────────────────┐
│  TARGET STRIP                    │
│  🌙 23:00 → ☀ 07:00  · 8h target│ ← tap to open target modal
│                                  │
│  How did you sleep?              │
│                                  │
│       [ 24h SLEEP DIAL ]         │ ← drag 🌙 and ☀ handles
│         5h 40m sleep             │
│                                  │
│  Gentle note                     │
│  5h 40m is below your 8h goal.   │
│  Shorter sleep can soften…       │
│                                  │
│  [ Save night ]                  │
└──────────────────────────────────┘
```

### 2.2 Log → Habits

Active habits as `habit-card`s. Tap the tick circle → marks done → reveals easy/hard rating buttons.

```
┌──────────────────────────────────┐
│  Active · 2 of 3                 │
│                                  │
│  ◯  Morning walk          easy  │
│      Health · 8 min         hard │
│                                  │
│  ●  Drink water           ✓ done│
│      Health · all day         ◓◓ │
│                                  │
│  ◯  Read one page                │
│      Inner · before bed          │
│                                  │
│  + Add a habit                   │
└──────────────────────────────────┘
```

- Max 3 active habits. Browse library + add custom in **You → Habits library** (V2).
- Pillar dot on the left edge.
- Easy/hard rating feeds the integration signal (V4).

### 2.3 Log → Body (redesigned)

Five sections. **Every field has a ✕** to mark as "not measured today" → field greys and writes `NULL` (not `0`) to the row. Prefills from last entry; first time = empty (not 0).

```
┌──────────────────────────────────┐
│  Body                Sat 24 Jun  │
├──────────────────────────────────┤
│  Weight              BMI         │
│  ╔════════╗ ✕      22.3          │
│  ║ 72.4kg ║         Healthy ✓    │ ← auto from height + weight
│  ╚════════╝                      │
├──────────────────────────────────┤
│  Nutrition                        │
│  Cal     Protein  Carbs   Fat    │
│ ╔════╗  ╔════╗  ╔════╗  ╔════╗   │
│ ║2140║✕ ║115g║✕ ║220g║✕ ║65g ║✕  │
│ ╚════╝  ╚════╝  ╚════╝  ╚════╝   │
├──────────────────────────────────┤
│  Movement                        │
│  Steps              Outdoor      │
│  ╔════════╗ ✕      ╔═══════╗ ✕   │
│  ║ 8 420  ║         ║ 25 min║    │
│  ╚════════╝         ╚═══════╝    │
├──────────────────────────────────┤
│  Body feel                       │
│  ◯ relaxed  ● easy  ◯ tight  ◯ sore
│  ↳ Area (if tight/sore):         │
│     back · neck · knees · hips · jaw
├──────────────────────────────────┤
│  Today I noticed (optional)      │
│  + headache  + period  + cold    │
│  + low energy  + allergies  + …  │
├──────────────────────────────────┤
│  Note                            │
│  [_____________________________] │ ← 280-char free text
├──────────────────────────────────┤
│  [ Save ]                        │
└──────────────────────────────────┘
```

| Field | Source | Default |
|---|---|---|
| Weight | last `body_logs.weight_kg`, else empty | empty |
| BMI | auto: `weight_kg / (height_m * height_m)` | needs `profiles.height_cm` |
| BMI status | rule: <18.5 underweight · 18.5–24.9 healthy ✓ · 25–29.9 over · 30+ obese | — |
| Calories, protein, carbs, fat | last entry, else empty | empty |
| Steps, outdoor | last entry, else empty | empty |
| Body feel | last entry, else "easy" | easy |
| Area | only shown if tight/sore selected | — |
| Today I noticed | empty chip selector | — |
| Note | empty | — |

> **Why ✕-toggle instead of zero?** A blank weight field saved as `0` would poison Trends with fake data. ✕ writes `NULL`. Trends ignores `NULL`s.

### 2.4 Log → Money (quick)

Quick expense logger. **Detail / budgets / net worth live in You → Money** — this surface is for fast capture only.

```
┌──────────────────────────────────┐
│  Quick log                       │
│                                  │
│  ╔═══════════╗                   │
│  ║ £ 14.20   ║                   │ ← large auto-focused input
│  ╚═══════════╝                   │
│                                  │
│  Category                        │
│  Food · Roof · Move · Essentials │ ← horizontal pill chips
│  Living · Investing · Giving · Aspire
│                                  │
│  Note (optional)                 │
│  [lunch — bakery]                │
│                                  │
│  [ Log expense ]                 │
│                                  │
│  ───────────────                 │
│  Today · 2 expenses              │
│  £14.20  Food     lunch — bakery │
│  £8.50   Move     bus           │
│  ─                               │
│  Food budget · £200 / £450 left  │ ← live status from Money budget
│  Within plan ✓                   │
└──────────────────────────────────┘
```

The 8 categories use Quiet Capital's colour palette (see §6).

### 2.5 Note on Mood + Energy

Mood and Energy are captured **within Log → Sleep**, not as a separate sub-tab. They appear as 1–10 score rows below the insight card, saved together with the sleep log entry. This keeps the gesture minimal — one save for one night’s data.

Scores are stored in `daily_state` (one row per `user_id + date`) and surface in You → Trends alongside the sleep chart.

---

## 3. Tab 3 — Map (skeleton in V2)

Sub-tabs: **Year · Month · Projects · Map**

V2 ships:
- **Year** — placeholder card: *"Goals arrive in V3"*
- **Month** — horizontal kanban (lifted from the V2 plan tab in the prior design). 7 columns side-by-side, scroll horizontally.
- **Projects** — simple project list with progress bars (V3 adds want/have-to badges)
- **Map** — placeholder: *"Now → Mission visualisation arrives in V3"*

Map's real purpose only lights up in V3. In V2 it exists structurally so the navigation shape doesn't change between versions.

---

## 4. Tab 4 — You (browse your life)

Apple-Health-style browse screen. A scrolling list of sections, each opens its own detail surface.

```
┌──────────────────────────────────┐
│  You                         ⚙  │
├──────────────────────────────────┤
│  📊 Trends                       │ → range selector + tile drill-down
│      Sleep · Mood · Energy ·     │
│      Habits · Body · Money       │
│                                  │
│  📜 History                      │ → past entries, all pillars
│                                  │
│  💷 Money                        │ → full Quiet-Capital sub-app
│      Budget · Transactions ·     │
│      Worth · Freedom · Property  │
│                                  │
│  ⚙ Settings                      │ → profile · privacy · sign out
└──────────────────────────────────┘
```

*V3 adds:* 🧬 Identity (skills · education · family · values)
*V4 adds:* 🌳 World (Cartographer scenes + regions)

### 4.1 You → Trends

Range selector across the top: **Week · Month · Year · All**.

Below: a 2×3 grid of *tiles* for key life signals. Each tile shows last-week direction (▲ / ▼ / flat) and a 3-line sparkline. Tap a tile → drill-down chart.

```
┌─────────┬─────────┐
│ 💤 Sleep │ ☺ Mood │
│ 6h 48m  │ ok / 7  │
│   ▲     │  flat   │
├─────────┼─────────┤
│ ⚡ Energy│ ✓ Habits│
│ ok / 7  │ 18 / 21 │
│   ▼     │   ▲     │
├─────────┼─────────┤
│ 🏃 Body │ 💷 Money│
│ 8 420   │  £142   │
│   ▲     │  ▼ -8%  │
└─────────┴─────────┘
```

**Drill-down for Sleep uses V1's exact chart layout** — bar chart with above-goal green gradient, dashed goal line, day labels, hours/times pill toggle. Range selector at top toggles W/M/Y/All by re-running the same render.

Each other tile drill-down uses the same chart shape with data appropriate to that signal.

### 4.2 You → History

Vertical scroll list of past entries. Mixed timeline: each row shows date · pillar tag · short summary. Tap → opens the entry in its Log surface for edit.

### 4.3 You → Money

This is the heaviest sub-app. It's a port of the [Quiet Capital](D:/My%20Archive/quiet-capital/QUIET_CAPITAL_UX_SPEC.md) feature set into Compass's calm beige language. See §6.

Sub-tabs inside Money:

| Sub-tab | Purpose |
|---|---|
| **Overview** | Dashboard: net worth · this month's pace · savings rate · financial calm score |
| **Budget** | 8 categories with progress bars + status labels |
| **Transactions** | Full list, filter/sort, import/export, slide-panel add/edit |
| **Setup** | Income sources · donut allocation · sliders |
| **Worth** | Net worth hero + area chart + asset breakdown |
| **Freedom** | FIRE calculator + what-if scenarios |
| **Property** | Rent-vs-buy analysis |

### 4.4 You → Settings

Same V1 structure: Profile · Focus areas · Privacy · Sign out. **Plus one V2 addition:** `Height` field (powers BMI in Log → Body).

---

## 5. The Chat pill (V2 shell)

Always present, bottom-right. Calm beige circle with `💬` icon, subtle 1px line border, soft shadow.

```
                              ┌────┐
                              │ 💬 │  ← 48px circle
                              └────┘
                                z-index: above tabs, below modals
```

Tap → bottom sheet slides up.

```
┌──────────────────────────────────┐
│  ─                               │ ← drag handle
│                                  │
│  💬 Chat                         │
│                                  │
│  ╭──────────────────────────╮    │
│  │ Conversation arrives in  │    │
│  │ V3. We'll know your      │    │
│  │ mission, goals, and      │    │
│  │ qualities by then.       │    │
│  ╰──────────────────────────╯    │
│                                  │
│  [Type a message…]      ↑ disabled
└──────────────────────────────────┘
```

The pill exists from V2 so users learn the gesture early. V3 wires up conversational logic.

---

## 6. Money — Quiet Capital integration in Compass language

We don't embed the existing Quiet Capital app. We **port** its data model and screens into Compass natively, adapted to the calm beige aesthetic.

### Adopted from Quiet Capital
- **8 budget categories** with custom colours (verbatim, they suit the beige palette beautifully):

| # | Compass name | QC palette | Hex |
|---|---|---|---|
| 1 | Roof | Slate Blue | `#6987a8` |
| 2 | Move | Warm Taupe | `#8a7e72` |
| 3 | Food | Muted Sage | `#5a9e7a` |
| 4 | Essentials | Steel Blue | `#7889a8` |
| 5 | Living | Antique Gold | `#c9a057` |
| 6 | Investing | Soft Teal | `#4a998a` |
| 7 | Giving | Dusty Rose | `#a87d94` |
| 8 | Aspire | Warm Bronze | `#9a8c7a` |

- **Transactions** (date, amount, type, category, note, currency).
- **Asset model** (cash, investments, property, other) with `asset_definitions` catalogue (ISA, SIPP, etc.).
- **Net worth snapshots** (monthly) for area chart.
- **FIRE settings** (age, target age, expenses, withdrawal rate, expected return, goal).
- **Budget targets + presets** (Save More / Balanced / Spend More).
- **Donut + allocation sliders** in Setup.
- **Rent-vs-buy calculator** with UK / LT defaults.
- **Financial calm score** (renamed from QC's "Calm Score") — 0–100 derived from savings rate, stability, runway, FIRE progress.

### Adapted to Compass

| Quiet Capital | Compass adaptation |
|---|---|
| Dark zinc theme | Beige `--bg #F6F5F2` + `--card #FFFEFC` cards |
| Geist Sans | Inter (matches rest of app) |
| Recharts | Same library; muted palette overrides |
| "Off Track" | Same neutral wording, fits Compass tone |
| Amber for warning | Replaced with Compass `--steel` |
| 6-link top navbar | Folded into 6 sub-tabs *within* You → Money |

### Schema additions (Money domain only)

```sql
-- transactions, budget_categories, budget_targets,
-- assets, asset_definitions, networth_snapshots,
-- user_finance_settings, scenarios, income_sources,
-- property_details, category_mappings
-- (mirrors quiet-capital backend; field names preserved
--  for portability of QC data via a one-time import)
```

A **CSV importer** ingests Quiet Capital's existing `transactions.csv` so the user doesn't lose history.

---

## 7. Database schema additions (V2)

```sql
-- Mood + Energy (captured in Log → Sleep, saved with the night entry)
create table daily_state (
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  mood         smallint check (mood between 1 and 10),   -- 1=low … 10=great
  energy       smallint check (energy between 1 and 10), -- 1=flat … 10=buzzing
  note         text,
  timezone     text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, date)
);

-- Habits
create table habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  pillar       text not null check (pillar in
                 ('health','inner','admin','family','joy','money','contrib')),
  source       text not null check (source in ('library','custom')),
  cue          text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table habit_logs (
  habit_id     uuid not null references habits(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  done         boolean not null,
  rating       text check (rating in ('easy','hard')),
  primary key (habit_id, date)
);

-- Body (all numeric fields NULL-able for ✕-toggle)
create table body_logs (
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  weight_kg    numeric(5,2),
  calories     integer,
  protein_g    integer,
  carbs_g      integer,
  fat_g        integer,
  steps        integer,
  outdoor_min  integer,
  body_feel    text check (body_feel in ('relaxed','easy','tight','sore')),
  area         text,
  noticed      text[],            -- array of chip codes
  note         text,
  primary key (user_id, date)
);

-- Profile addition for BMI
alter table profiles add column height_cm integer;

-- Money (mirrors Quiet Capital — see §6)
-- ... full schema in v2-track-money-schema.sql (separate file at build time)

-- RLS on every table: row.user_id = auth.uid()
```

---

## 8. Build order

1. Bottom-nav refactor: 4 tabs (Today / Log / Map / You), keep V1's settings + sleep components routed under Log → Sleep.
2. Floating Chat pill component (V2 = sheet shell only).
3. `daily_state` table (mood/energy captured via Log → Sleep score rows).
4. Today redesign: 3–4 cards, quick-log row.
5. Log → Habits (habits + habit_logs schema, habit-card, library picker, custom add).
6. Log → Body (body_logs schema, ✕-toggle field component, BMI auto, Today-I-noticed chip selector).
7. Log → Money quick (transactions schema + minimal Money root).
8. Map skeleton (Year + Map placeholders, Month kanban, Projects list).
9. You → Trends with W/M/Y/All selector + V1 sleep chart drill-down.
10. You → History (mixed-pillar timeline).
11. You → Money detail port: Overview · Budget · Transactions · Setup · Worth · Freedom · Property. CSV importer for QC data.
12. Settings → height_cm field.

---

## 9. Research-required (deferred to V4)

- Mood-energy + sleep load reduction logic (no invented heuristics).
- Habit integration detection (Lally et al. 2010 baseline → personal model).
- "Today's quality" rotation algorithm.

---

## 10. Stays GDPR-clean

- AI Edge Function still receives only structured numbers and codes; never `user_id`, never note text, never money amounts in transactions (only category-level aggregates if needed).
- All Money detail computation happens client-side or in user-scoped Postgres functions.
- RLS isolates every user's rows on every new table.

---

## 11. Reference

- V1: [v1-sleep.md](v1-sleep.md)
- Money source: `D:\My Archive\quiet-capital\QUIET_CAPITAL_UX_SPEC.md`
- Wireframe: [wireframes/v2-track.html](wireframes/v2-track.html)
