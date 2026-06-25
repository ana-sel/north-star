# Compass — V4 Design (World, Cartographer, Pattern Maturity)

> **Builds on:** [v3-plan.md](v3-plan.md)
> **Theme:** *Reflection* — the World tab joins You, the Cartographer voice unifies every surface, the integration detection algorithm matures, and the full "what blocks happiness" analysis lands.

---

## 0. What V4 ships (within the 4-tab architecture)

V2 set the navigation shape. V3 deepened Map and activated Chat. V4 doesn't add tabs either — it adds **one section to You** (World) plus a **voice layer** that operates across every screen.

| Tab | V3 | V4 additions |
|---|---|---|
| **Today** | live quality, scene card | Scene card reads from full world state (V4); Cartographer voice flavours the pattern observation |
| **Log** | unchanged | Habit + quality integration signals start writing (research-backed algorithm) |
| **Map** | full goals, mission, map | "What blocks happiness?" deep version — longitudinal patterns |
| **You** | + Identity | **+ World** (Cartographer scenes + 7 regions) |
| **Chat pill** | Mission / Goal / Free modes | + Cartographer journal mode (mode #4) |

### Final You sections

```
┌──────────────────────────────────┐
│  You                         ⚙  │
├──────────────────────────────────┤
│  📊 Trends                       │  V2
│  📜 History                      │  V2
│  💷 Money                        │  V2
│  🧬 Identity                     │  V3
│  🌳 World         ← V4 new       │  → Cartographer scenes + 7 regions
│  ⚙ Settings                      │
└──────────────────────────────────┘
```

---

## 1. The World system

### Two parallel layers

| Layer | What it is | Where it lives |
|---|---|---|
| **Data layer** | Raw logs, times, notes, scores | Log · You → Trends · You → History |
| **World layer** | Visual expression of confirmed patterns | You → World · scene cards on Today |

The world layer **never invents**. It only reflects what the data layer has confirmed.

### Canonical pillar names (current)

The canonical pillar naming set used by product/data schema is:

- `health`
- `inner`
- `admin`
- `family`
- `joy`
- `money`
- `contrib`

Some narrative tables below use legacy region-language labels (Sleep, Body, Mind, Heart, Craft, Spirit) as metaphors for world regions. New implementation work should use the canonical set above.

### The 4 energy types

Energy is the interpretation engine — not a tab, not a view. The Log tab stays as Sleep / Habits / Body / Money / Mood. Energy reads all of them and translates into world state.

| Energy type | What it measures | Primary sources | World expression |
|---|---|---|---|
| **Physical** | Body power, sleep, recovery, movement | Log → Sleep, Log → Body | Cottage light, road firmness, weather clarity |
| **Mental** | Focus, decisions, cognitive load, open loops | Log → Habits, Map open cards | Library lamps, map clarity, fog density |
| **Emotional** | Mood, patience, warmth, relational quality | Log → Mood, family qualities | Hearth brightness, river flow, garden colour |
| **Spiritual** | Purpose, meaning, alignment, service | Quality logs, mission progress | Stars, lighthouse visibility, horizon clarity |

**Hierarchy:** Physical is the ground. Without it, the other three become fragile. The app will not surface spiritual observations when physical energy is critically low.

### The 7 world regions

| Pillar | Region | Visual elements | Fed by |
|---|---|---|---|
| Health | Moonlit cottage, garden, well, path | Cottage light, garden bloom, well water level | Sleep + body logs |
| Inner | Library, lake, quiet room | Water disturbance, light quality | Mood, reflection, habits |
| Admin | Compass room, route board, task markers | Map readability, route clarity | Open loops, planning progress |
| Family | Hearth house, long table, lantern path | Hearth warmth, lanterns lit | Family quality logs |
| Joy | Workshop, bridge to others | Workshop light, bridge strength | Joy quality logs + craft signal |
| Money | Quiet market, treasury, stone bridge | Market activity, bridge open/closed, treasury lamp | Money logs, plan goals |
| Contrib | Lighthouse, map room, compass tower | Lighthouse visibility, map clarity | Contribution quality + mission progress |

### Energy as world atmosphere

The world never shows numbers. It shows state.

| Energy state | World condition |
|---|---|
| Physical high | Clear sky, firm road, cottage warmly lit |
| Physical low | Heavy weather, soft ground, dim cottage |
| Mental high | Map clear, lighthouse visible, library bright |
| Mental low | Fog near library, map obscured, unclear roads |
| Emotional high | Hearth warm, river flowing, garden in colour |
| Emotional low | Hearth dim, river still, garden grey |
| Spiritual high | Stars visible, horizon open, lighthouse beam reaches far |
| Spiritual low | Overcast, horizon hidden, lighthouse dim |

---

## 2. The Cartographer (voice layer)

A consistent narrator persona that flavours observational copy across the app. Same person speaking on Today's pattern card, in scene unlocks, and in the Chat pill (when in the new "Journal" mode — see §5).

### Voice rules (verbatim from prior spec)

| Rule | Description |
|---|---|
| **Quiet** | Never exclamatory. No "Amazing!" No "Great job!" |
| **Observational** | States what is, lets the user decide what to do. |
| **Concrete** | Names specific data: *"Your sleep window has been narrower for 4 nights."* Never vague. |
| **Soft authority** | Uses *seems · appears · the pattern suggests*. Never *you should*. |
| **Hierarchical** | Skips spiritual observations when physical is low. |
| **Cross-pillar** | Connects across pillars when the data confirms it — never as guess. |
| **Anti-fanfare** | A confirmed trend is acknowledged in one sentence. No celebration. |

### Where the Cartographer speaks

| Surface | Example copy |
|---|---|
| Today → Pattern observation | *"Mood and energy have been steady this week. A quiet sign things are settling."* |
| You → Trends drill-down note | *"Above your goal on 4 of the last 7 nights."* |
| Scene unlock | *"The river ran clearer the morning after rest."* |
| Chat → Journal mode | The Cartographer writes a short reflection daily; the user can respond. |

---

## 3. Habit + quality integration detection (research-backed)

**Source:** Lally, P. et al. (2010) *How are habits formed: Modelling habit formation in the real world*, European Journal of Social Psychology, 40(6), 998-1009.

Key empirical findings used:

- **Median time to automaticity: 66 days** (range 18–254 days for the same behaviour across individuals).
- **Initial repetitions matter most** — early consistency predicts long-term integration better than late consistency.
- **Missing a single day does not reset the curve** — the model is forgiving.
- **Easy/hard self-report at the moment of doing** is a stronger signal than completion alone.

### The Compass integration model

For each active habit and quality, V4 computes an **integration score** 0–100:

```
score = blend(
  consistency:    rolling 28-day done-rate,
  easy_ratio:     fraction of done-days rated "easy" over last 14,
  age_factor:     days since first log, asymptoting at 66
)
```

When score crosses **70** for two consecutive weeks, the habit/quality is marked **integrated** and:
- Visually changes on Log → Habits (or Map → Qualities): from `◯` outline to a softer filled badge.
- The Cartographer may reference it in scene copy (*"A path that used to be soft has firmed."*).
- The user can choose to **let it run quietly** (no daily tick required) or keep it visible.

The score is **never used to shame**. A drop in score never produces a "you're slipping" message; it produces a quiet observation if at all.

### Privacy
- Integration scores are computed in a user-scoped Postgres function — no raw habit data ever reaches the Edge Function.
- The Cartographer's scene-copy generator receives only the **integration state code** (`integrated`, `building`, `quiet`) plus the pillar — no specific habit names.

---

## 4. "What blocks happiness" — full analysis

V3 ships a basic surfacing of the button. V4 lights it up.

### Inputs

| Source | Signal |
|---|---|
| `daily_state.mood` | Mood scores over time |
| `daily_state.energy` | Energy scores over time |
| `quality_logs.rating` | Easy/hard distribution per active quality |
| `goals.motivation` | Ratio of `have_to` vs `want` |
| Open `plan_cards` count | Cognitive load proxy |
| Map conflicts (V3) | Active conflicts |
| Sleep window variance | Recovery stability |
| Body feel distribution | Body-level stress |

### Output

A scrollable analysis page (opened from Map → Map → "What blocks happiness?"):

```
┌──────────────────────────────────┐
│  What blocks happiness           │
├──────────────────────────────────┤
│  Pattern · Have-to load          │
│  60% of your active goals are    │
│  have-to. The Cartographer notes │
│  this often precedes lower mood. │
│  ↳ Open chat about this →        │
│                                  │
│  Pattern · Conflict              │
│  Money and Water trip pull       │
│  against each other. A compromise│
│  conversation may help.          │
│  ↳ Open chat about this →        │
│                                  │
│  Pattern · Recovery              │
│  Sleep variance is high this     │
│  month. Body feel: tight more    │
│  often than easy.                │
│  ↳ See Sleep trend →             │
└──────────────────────────────────┘
```

Each pattern card is a confirmed observation, not a guess. If the signal is below threshold, the pattern is not shown. If no patterns are confirmed, the page reads: *"Nothing's pressing right now. That itself is something."*

### Privacy
- All pattern computation happens in a user-scoped Postgres function.
- The Edge Function only generates per-pattern *copy variants* from a small set of pattern codes — never receives any user data.

---

## 5. Chat — Cartographer journal mode (mode #4)

V3 ships Mission / Goal / Free. V4 adds **Journal**.

```
┌──────────────────────────────────┐
│  💬 Chat                  ✕      │
│  Mode: Mission · Goal · Free ·   │
│        [Journal]   ← V4 new      │
│                                  │
│  ╔══════════════════════════╗    │
│  ║ Cartographer · today     ║    │
│  ║ Mood and energy steady   ║    │
│  ║ this week. A quiet sign  ║    │
│  ║ things are settling.     ║    │
│  ║                          ║    │
│  ║ What feels different     ║    │
│  ║ this week vs last?       ║    │
│  ╚══════════════════════════╝    │
│  ╔══════════════════════════╗    │
│  ║                      You ║    │
│  ║ I noticed I'm less anxious║   │
│  ║ in the mornings.         ║    │
│  ╚══════════════════════════╝    │
│  ╔══════════════════════════╗    │
│  ║ Cartographer             ║    │
│  ║ Sleep window narrowed —  ║    │
│  ║ wake time more consistent║    │
│  ║ for 5 days. The two are  ║    │
│  ║ often related.           ║    │
│  ╚══════════════════════════╝    │
│                                  │
│  [Reflect or reply…]        ↑    │
└──────────────────────────────────┘
```

The Cartographer **writes first** in journal mode (one daily prompt). The user can respond or skip. Responses are stored in `chat_messages` under mode `journal`.

---

## 6. Full scene library (14+ scenes)

Each scene = one cross-pillar pattern confirmed by the algorithm. Scenes unlock automatically and append to a permanent log under You → World → Scenes.

| # | Scene name | Pattern that unlocks it |
|---|---|---|
| 1 | The river ran clearer | Sleep ≥7h for 3 nights + mood ≥ok |
| 2 | A path firmed | Habit reaches integration |
| 3 | Lanterns relit | Family quality practised after 14-day gap |
| 4 | The market quieted | Money spending below budget for full month |
| 5 | Fog lifted from the library | Open cards reduced 50% in two weeks |
| 6 | The lighthouse beam reached further | Goal moved from active to done, mission-aligned |
| 7 | Garden colour returned | Mood ok+ for 7 consecutive days |
| 8 | The hearth warmed | Family quality practised 7+ days |
| 9 | A bridge held | Conflict resolved (compromise saved from chat) |
| 10 | The well filled | Health signal: body feel relaxed/easy 5+ days |
| 11 | The cottage light steadied | Sleep window variance reduced |
| 12 | The horizon opened | Contrib quality + mission practised same week |
| 13 | The map gained detail | First time using Map → Map → Now path |
| 14 | A road was laid | First habit reaches integration in a new pillar |

Each scene has 1–3 prose variants. The Edge Function selects a variant based on pillar + recent pattern detail; never personal data.

---

## 7. World personalisation

You → World shows the live map of the user's life as a calm illustrated landscape. V4 adds:

- **Character naming** — the user gives their on-world figure a name (optional, default unnamed).
- **World season** — auto-rotates with calendar season; the visual palette shifts accordingly (spring greens, autumn coppers, winter steel).
- **Personal landmark** — one optional custom point of meaning the user places on the map.

All visuals are SVG generated client-side; nothing leaves the device for personalisation.

---

## 8. Database schema additions (V4)

```sql
-- Integration scores (computed view, refreshed nightly)
create materialized view habit_integration as
  -- score blend per (user_id, habit_id, date)
  ...;

create materialized view quality_integration as
  -- same shape per (user_id, quality_id, date)
  ...;

-- Scene log
create table scenes_unlocked (
  user_id      uuid not null references auth.users(id) on delete cascade,
  scene_code   text not null,
  variant      smallint not null,
  unlocked_at  timestamptz not null default now(),
  pattern_json jsonb,                -- the confirming pattern snapshot
  primary key (user_id, scene_code, unlocked_at)
);

-- World state cache (recomputed on relevant log)
create table world_state (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  physical     smallint check (physical between 1 and 5),
  mental       smallint check (mental between 1 and 5),
  emotional    smallint check (emotional between 1 and 5),
  spiritual    smallint check (spiritual between 1 and 5),
  season       text not null,
  character_name text,
  landmark     jsonb,
  updated_at   timestamptz not null default now()
);

-- Chat mode extension
alter table chat_messages
  drop constraint chat_messages_mode_check,
  add constraint chat_messages_mode_check
    check (mode in ('mission','goal','free','journal'));
```

---

## 9. Build order (V4 — additive on V3)

1. Habit + quality integration algorithm + materialized views.
2. Visual marks for integrated habits/qualities in Log + Map.
3. `world_state` table + recompute triggers on Log writes.
4. You → World scaffold (region map SVG, 4 energy state visuals).
5. Scene unlock engine + `scenes_unlocked` table + scene library content authoring (14 scenes × 1–3 variants).
6. Scene card on Today reads from latest unlock.
7. "What blocks happiness?" full version (pattern Postgres functions + analysis page).
8. Chat → Journal mode (Cartographer prompts daily; user response saves to `chat_messages`).
9. Cartographer voice templates across Today pattern + Trends notes + scene copy.
10. World personalisation (character naming, season auto-rotate, landmark).

---

## 10. Privacy & GDPR (unchanged guarantees)

- Edge Function still receives **only** pillar + pattern code + state code. Never habit names, never goal text, never journal body.
- Materialized views are computed in user-scoped Postgres; only counters and codes ever leave the row.
- `scenes_unlocked.pattern_json` stays in Postgres for audit; never transmitted to AI.
- Cartographer copy is generated from templates + a small variant pool; no per-user model fine-tuning.

---

## 11. Reference

- V1: [v1-sleep.md](v1-sleep.md) · V2: [v2-track.md](v2-track.md) · V3: [v3-plan.md](v3-plan.md)
- Source: Lally, P. et al. (2010) — habit formation
- Wireframe: [wireframes/v4-world.html](wireframes/v4-world.html) *(to be authored)*
