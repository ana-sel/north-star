# Compass — V2 Design (Track Tab + Energy + 3 World Regions)

> **Builds on:** [v1-sleep.md](v1-sleep.md)
> **Scope:** Track tab · energy & mood · habits · body signals · money patterns · 3 world regions active · first cross-pillar Cartographer scenes.

---

## 0. What V2 adds

| Feature | Detail |
|---|---|
| **Track tab** | 4 sub-views: Sleep · Habits · Body · Money |
| **Energy & mood** | Surfaces V1's nullable columns — user can now log both |
| **Habit tracking** | Active habits only (max 3); done / not done; no shame framing |
| **Body signals** | Weight, protein, steps, tension, fatigue — light, optional |
| **Money signals** | Spending log, impulse flag, calm-vs-stress decisions |
| **World** | 3 regions active: Cottage · Grove · River |
| **Weather system** | Emotional state drives sky and atmosphere in the world |
| **Cartographer** | Appears after first confirmed cross-pillar pattern |

---

## 1. Track tab — 4 sub-views

View switch: **Sleep · Habits · Body · Money**

Tab stays labelled "Track." The 4 sub-views are the logging surfaces. Energy is the invisible interpretation layer above them all — it is never shown as a number or tab.

### Sleep sub-view
- Sleep signal card: last night duration, 7-day avg, energy score
- Quick log shortcut (goes to Today dial)
- 7-day bar chart
- Observation line + insight card when pattern accumulates

### Habits sub-view
- Only active habits shown — hard limit of 3 active at a time
- Done / not done toggle per habit (no guilt; no streak pressure)
- 7-day completion rate per habit
- Gentle insight once pattern is detectable (≥7 logs)

### Body sub-view
- Light fields: weight (kg), protein target (g), steps, outdoor time
- Body signal log: tension (1–5), fatigue note, illness / period / pain flag
- Nothing required — all optional
- Insight if body signals correlate with sleep data

### Money sub-view
- Spending entry: amount, category, note
- Impulse flag: was this planned or reactive?
- Decisions to defer on low-sleep / low-energy days
- Pattern insight once ≥5 money + 5 sleep logs exist

See [wireframes/v2-track.html](wireframes/v2-track.html) for the interactive prototype.

---

## 2. Schema additions

All tables follow the same RLS pattern as V1: `user_id = auth.uid()`.

```sql
-- habits
create table habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- habit_logs
create table habit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  habit_id    uuid not null references habits(id) on delete cascade,
  logged_date date not null,
  done        boolean not null,
  created_at  timestamptz not null default now()
);

-- body_logs
create table body_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  weight_kg   numeric,
  protein_g   integer,
  steps       integer,
  tension     smallint,   -- 1–5
  note        text,
  created_at  timestamptz not null default now()
);

-- money_logs
create table money_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_at   timestamptz not null default now(),
  amount      numeric not null,
  currency    text not null default 'GBP',
  category    text,
  impulse     boolean,   -- true = reactive / unplanned
  note        text
);
```

Also surface V1's nullable columns in the Sleep log form:
```sql
-- already exists in sleep_entries, just show in UI:
-- energy  smallint  (1–10)
-- mood    smallint  (1–10)
```

---

## 3. Cross-pillar patterns active in V2

The app detects these from real data — never assumes them. Patterns appear only when both streams are logged.

| Cause | Effect | Requires |
|---|---|---|
| Sleep duration low | Habit completion drops | 5 sleep + 5 habit logs |
| Sleep low | Money impulse signals increase | 5 sleep + 3 money logs |
| Sleep consistent | Energy score improves | 7 sleep logs |
| Body movement logged | Sleep onset improves next night | 5 body + 7 sleep logs |
| Habits complete (food planned) | Money impulse reduces | 7 habit + 5 money logs |
| Body tension logged | Mood score drops | 5 body + mood in sleep_entries |

When a pattern confirms, the Cartographer surfaces a scene. See [v4-world.md](v4-world.md) for full scene rules.

---

## 4. World scope in V2

3 regions become active. The other 4 remain unmapped and visibly empty.

| Region | Pillar | Activates when | World signals |
|---|---|---|---|
| **Moonlit cottage** | Health / Body | Sleep + Body data accumulates | Cottage light, road firmness, garden bloom |
| **Still grove + lake** | Inner / Mind | Mood notes + reflection logged (energy/mood in sleep_entries) | Water disturbance, leaf stillness |
| **River + open path** | Joy / Beauty | Joy events logged (V2 adds joy field, see below) | River flow, path openness, light on water |

**Weather system:** emotional state (mood score trend) drives sky and atmosphere across all active regions. High mood → clearer sky. Low mood → soft rain, muted colour.

Add a lightweight `joy_logs` table to enable the River region:
```sql
create table joy_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  logged_at   timestamptz not null default now(),
  description text,
  note        text
);
```

---

## 5. Build order for V2

1. Surface `energy` and `mood` fields in Today's sleep log form
2. Create `habits` + `habit_logs` tables; build Habits sub-view
3. Create `body_logs` table; build Body sub-view
4. Create `money_logs` + `joy_logs` tables; build Money + Joy log
5. Add cross-pillar pattern detection service (runs on each save, compares streams)
6. Build "A scene has appeared" card delivery infrastructure
7. Activate Grove + River world regions when threshold met
8. Weather system: read mood score trend, apply to world atmosphere
