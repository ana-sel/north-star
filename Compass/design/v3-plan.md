# Compass — V3 Design (Plan Tab + All 7 World Regions + Onboarding)

> **Builds on:** [v2-track.md](v2-track.md)
> **Scope:** Plan tab · 7 life pillars · Margulan month flow · all 7 world regions · full Cartographer · onboarding story with dial.

---

## 0. What V3 adds

| Feature | Detail |
|---|---|
| **Plan tab** | Year · Month · Projects · Map views |
| **7 life pillars** | Health · Inner · Money · Family · Joy · Contribution · Plan — as data, not layout |
| **Margulan month flow** | Need to do → Planned → My side → Waiting → Today mirror → Done → Review |
| **All 7 world regions** | Every pillar has an active region |
| **Lighthouse navigable** | Map room accessible; roads connect regions |
| **Full Cartographer** | Margin-note library active; cross-pillar dependency detection for all 14+ links |
| **Onboarding story** | World intro → character → dial-based sleep goal → first entry |
| **Family + Contribution tracking** | Two new logging areas |

---

## 1. Plan tab — 4 views

View switch: **Year · Month · Projects · Map**

Pillar filter chips run across all views: **All · Health · Inner · Money · Family · Joy · Contribution · Admin**

### Year view
- Goals grouped by pillar (colour-coded stripes)
- Two lanes: "This year" + "Moved later"
- Each card: title, pillar badge, priority label

### Month view (Margulan-based)
- 7 lanes in order: Need to do · Planned · My side · Waiting · Today mirror · Done · Review
- "Today mirror" surfaces month items active today — they live here, not duplicated into Today
- Cards move forward through lanes as work progresses

### Projects view
- Large project containers, each linked to a pillar
- Progress bar (% of sub-cards done)
- "Next action" shown per project

### Map view (dependency map)
- Dependency links between cards: *Freedom number → Land decision*
- Highest-leverage links shown first
- Pillar filter applies — see only relevant dependencies

See [wireframes/v3-plan.html](wireframes/v3-plan.html) for the interactive prototype.

---

## 2. Life pillars — the data model

Pillars are a **field** on every card, not a hardcoded screen layout.

| ID | Display name | Colour token | World region |
|---|---|---|---|
| `health` | Health / Body | `#77936f` (olive-green) | Cottage, garden, well, path |
| `inner` | Inner / Mind | `#937caf` (muted violet) | Still grove, small lake |
| `money` | Money / Capital | `#7395ad` (steel-blue) | Quiet market, treasury, stone bridge |
| `family` | Family | `#b77980` (dusty rose) | Hearth house, long table, lantern path |
| `joy` | Joy / Beauty | `#c99554` (warm amber) | River, open water, mountain path |
| `contrib` | Contribution | `#8d8f63` (sage) | Town square, workshop, bridge to others |
| `admin` | Plan / Navigation | `#958572` (warm grey) | Lighthouse, map room, compass tower, roads |

---

## 3. Schema additions

```sql
-- plan_cards
create table plan_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  note        text,
  pillar      text not null,   -- health|inner|money|family|joy|contrib|admin
  status      text not null,   -- need_to_do|planned|my_side|waiting|today_mirror|done|review
  horizon     text not null,   -- year|month|project
  project_id  uuid references plan_cards(id),   -- sub-card parent
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- plan_dependencies
create table plan_dependencies (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  from_card uuid not null references plan_cards(id) on delete cascade,
  to_card   uuid not null references plan_cards(id) on delete cascade,
  note      text
);

-- family_logs  (enables hearth/family world region)
create table family_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  quality     smallint,   -- 1–5: draining to nourishing
  note        text,
  created_at  timestamptz not null default now()
);

-- contribution_logs  (enables town square region; nourishing/draining split)
create table contribution_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  logged_at    timestamptz not null default now(),
  description  text,
  restored     boolean,   -- true = nourishing, false = draining (asked after every entry)
  note         text
);
```

RLS: same pattern as V1/V2 for all new tables.

---

## 4. Onboarding story

The full onboarding flow replaces the minimal V1 login → auto-detect flow. Timezone still auto-detects; the story is additive.

| Step | What happens | World state |
|---|---|---|
| 1 | Empty landscape at dusk. *"This is yours. It grows with you."* | Dark, unmapped |
| 2 | Small figure (the Cartographer) walks in from the right. Pauses. Looks at the horizon. No words. | Character appears |
| 3 | *"Where would you like to begin?"* — 7 pillar icons as destinations on the map | Choice moment |
| 4 | Character walks toward chosen region | Animation |
| 5 | Sleep dial appears. *"Set your rhythm. The cottage will remember."* | Dial interaction |
| 6 | Timezone shown: *"You're in London time — does that look right?"* One-tap confirm | Auto-detected |
| 7 | *"Log when you woke up today. That's enough to start."* | First entry |
| 8 | One small light appears in the cottage | World seed |

**Skip is always available** — small unobtrusive text link, no guilt, no prompt explaining the skip.

---

## 5. World scope in V3

All 7 regions become active as data accumulates. Nothing appears before the data confirms it.

| Region | Activates when | Key world signals |
|---|---|---|
| Cottage + garden | Sleep + Body data (V1/V2) | Light, garden, road firmness |
| Still grove + lake | Mood/reflection logged | Water stillness, leaf quality |
| Quiet market + bridge | Money tracked (V2) | Market activity, bridge open/closed |
| Hearth house + lanterns | Family logs (V3) | Hearth warmth, lantern visibility |
| River + open path | Joy logs (V2) | River flow, path openness |
| Town square + workshop | Contribution logs (V3) | Square presence, bridge strength |
| Lighthouse + roads | Plan used + goals progressing | Lighthouse visibility, road condition |

The Cartographer now has a full margin-note library. All 14+ cross-pillar dependencies are detectable. See [v4-world.md](v4-world.md) for the complete rules.

---

## 6. Build order for V3

1. Plan tab: Year view + pillar filter chips
2. Plan tab: Month view (Margulan 7-lane board)
3. Plan tab: Projects + Map views
4. `plan_cards` + `plan_dependencies` tables with RLS
5. `family_logs` + `contribution_logs` tables
6. Activate remaining 4 world regions (Market, Hearth, Town square, Lighthouse)
7. Full cross-pillar pattern detection (all 14 dependency links)
8. Cartographer margin-note library (all scene types)
9. Onboarding story flow (world intro → character → dial → first entry)
