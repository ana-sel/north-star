# Compass — V1 Design (Sleep Foundation)

> **Scope:** Google login · sleep logging · 7-day chart · AI note · history list · world seed.
> V2–V4 are in separate files. Shared tech stack: [infrastructure.html](infrastructure.html).

---

## 0. What V1 builds and ships

| Concern | Choice | Why |
|---|---|---|
| Platform | Android app (Expo + React Native + TypeScript) | Installable now, Play Store-ready path |
| Login | Google sign-in via Supabase Auth | Free, multi-user, almost no auth code |
| Database | Supabase hosted Postgres, free tier | Auto API, per-user RLS, zero maintenance |
| AI note | Edge Function → free hosted model (Gemini / Groq) + rule-based fallback | AI from day one, never breaks |
| Timezone | Auto-detected from device (IANA) — no setup screen | Zero friction; editable in Settings |
| Cost | £0 / month | Free tiers throughout |

---

## 1. Scope (deliberately small)

**In V1:**
- Google login.
- Timezone auto-detected from device — editable in Settings.
- Log a night's sleep: bed time + wake time.
- 7-day bar chart of sleep hours.
- Short AI note under the chart.
- Plain history list of past nights.
- World seed: after 3 logs, "A scene has appeared" card appears in Today (cottage region only).

**Not in V1:** energy, mood, habits, body, money, planning, world tab, Cartographer active.

---

## 2. Screens

Three tabs: **Today · Week · History**

```
LOGIN → (auto-detect timezone) → TODAY

TODAY ─── WEEK ─── HISTORY
              ↓
           SETTINGS (change active timezone)
```

### Today — log a night

```
┌──────────────────────────────┐
│  Compass               ⚙    │
├──────────────────────────────┤
│  Wednesday, 24 June          │
│                              │
│  TARGET                      │
│  🌙 23:00 – 07:00 ☀️         │   ← goal strip (dial sets this)
│       8 hours                │
│                              │
│  [dial: drag 🌙 or ☀️]       │   ← circular time dial
│  5h 40m sleep                │
│                              │
│  HISTORY                     │
│  Today     5h 40m  00:50→06:30  │
│  Yesterday 6h 20m  00:10→06:30  │
│  Mon 22    7h 20m  23:40→07:00  │
│                              │
├──────────────────────────────┤
│  ●Today  Trends  History     │
└──────────────────────────────┘
```

### Trends (Week view)

```
┌──────────────────────────────┐
│  Avg sleep · this week       │
│  6h 48m                      │
│                              │
│  [Sleep chart]               │
│  Hours ● / Times  ← toggle  │
│  Week ● / Month   ← toggle  │
│  ‹ Mon 22 – Sun 28 Jun ›     │
│                              │
│  [bar chart / window chart]  │
│                              │
├──────────────────────────────┤
│  Today  ●Trends  History     │
└──────────────────────────────┘
```

### History — plain list

```
┌──────────────────────────────┐
│  History                     │
├──────────────────────────────┤
│  Today     5h 40m  00:50→06:30│
│  Yesterday 6h 20m  00:10→06:30│
│  Mon 22    7h 20m  23:40→07:00│
│  Sun 21    7h 45m  23:15→07:00│
│  …                           │
├──────────────────────────────┤
│  Today  Trends  ●History     │
└──────────────────────────────┘
```

See [wireframes/v1-sleep.html](wireframes/v1-sleep.html) for the interactive prototype.

---

## 3. Component structure

```
src/
  App.tsx                  # entry + tab shell
  lib/
    supabase.ts            # Supabase client
    time.ts                # timezone & duration helpers
    ai.ts                  # Edge Function call + rule-based fallback
  auth/
    AuthGate.tsx           # login gate
    LoginScreen.tsx
  features/
    sleep/
      screens/
        TodayScreen.tsx    # dial + history list
        WeekScreen.tsx     # chart + AI note card
        HistoryScreen.tsx
      components/
        SleepDial.tsx      # circular bed/wake dial, snaps 10 min
        SleepForm.tsx      # bed/wake pickers + duration
        AiNoteCard.tsx
    settings/
      SettingsScreen.tsx   # change active timezone
  data/
    sleep.ts               # read/write sleep_entries
    profile.ts             # read/write profile (timezone)
  components/
    BottomTabs.tsx
```

---

## 4. Time-zone handling

Store UTC. Remember the zone. Display in the original zone.

- Timezone **auto-detected from device** on first launch — no setup screen.
- `home_tz` saved to profile silently on first sync.
- `active_tz` defaults to `home_tz`; user can shift in Settings when travelling.
- Every entry stores `sleep_start_utc`, `sleep_end_utc`, and `tz` (IANA at time of logging).
- Duration = `end_utc − start_utc` — always correct across DST and travel.
- Display: each entry renders in its own stored `tz` — "bed 23:10" means 23:10 local-at-the-time.

---

## 5. Database schema

```sql
-- profiles
create table profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_tz      text not null,   -- IANA, auto-detected on first launch
  active_tz    text not null,   -- IANA, editable in Settings
  created_at   timestamptz not null default now()
);

-- sleep_entries
create table sleep_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  sleep_start_utc timestamptz not null,
  sleep_end_utc   timestamptz not null,
  tz              text not null,
  energy          smallint,   -- nullable, surfaced in V2
  mood            smallint,   -- nullable, surfaced in V2
  created_at      timestamptz not null default now(),
  check (sleep_end_utc > sleep_start_utc)
);

create index sleep_entries_user_start_idx
  on sleep_entries (user_id, sleep_start_utc desc);

-- RLS
alter table profiles      enable row level security;
alter table sleep_entries enable row level security;

create policy "own profile" on profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sleep"   on sleep_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

`energy` and `mood` are added now as nullable — V2 simply surfaces them without migration.

---

## 6. API (mostly auto-generated)

| Action | Operation | Notes |
|---|---|---|
| Sign in | `supabase.auth.signInWithOAuth({ provider: 'google' })` | Opens Google consent |
| Get profile | `select * from profiles where user_id = me` | RLS enforces ownership |
| Set timezone | `upsert profiles` | Auto-detected on first launch · editable in Settings |
| Save a night | `insert into sleep_entries (...)` | Times already converted to UTC |
| Last 7 days | `select ... order by sleep_start_utc desc limit 7` | Feeds chart + note |
| Full history | `select ... order by sleep_start_utc desc` | Paginated list |

Custom endpoint — AI note:
```
POST /functions/v1/generate-note
body { "nights": [{start_utc, end_utc, tz, duration_minutes}, ...] }
resp { "note": "You averaged 6h 48m this week ..." }
```

If the function fails or times out, `lib/ai.ts` falls back to `ruleNote()` locally. The user always sees a note — never an error state.

---

## 7. AI note — from day one

Two layers, always present:

1. **Cloud LLM** — Edge Function calls Gemini / Groq free tier. Sends numbers only (no name, no login). Returns 2–3 calm sentences.
2. **Rule-based fallback** — deterministic, instant, offline. Same guardrails as the LLM.

Guardrails (both layers):
- Never "you failed" / "you should"
- 2–3 sentences only
- Always include the concrete numbers
- Frame patterns as hypotheses — never as facts

---

## 8. The world seed (V1 only touches this)

After 3 sleep logs, a quiet card appears in Today:

> **A scene has appeared**  
> *View*

Tapping it shows a 10–20 second animated scene: the cottage, one small light on, the Cartographer walks past in the distance. One line of text. "Continue."

The world is otherwise unmapped and visibly empty. The Cartographer does not speak. This is the only world touch in V1.

See [v4-world.md](v4-world.md) for the full world architecture.

---

## 9. Build order

1. Expo app runs on device with Expo Go
2. Supabase Google auth wired; signed-in screen works
3. Timezone auto-detect on first launch; profile saved
4. Today screen: sleep dial + save to `sleep_entries`
5. AI note: `ruleNote()` + Edge Function `generate-note` together (both live from day 1)
6. History: list past nights in stored timezone
7. Week/Trends: bar chart + AI note card + chart toggle + week nav
8. Settings: change `active_tz`
9. World seed: "A scene has appeared" card after 3 logs
10. EAS Build → internal test track → Play Store

---

## 10. Version overview

| Version | What it adds | File |
|---|---|---|
| **V1** | Sleep · chart · AI note · world seed | this file |
| **V2** | Track tab · energy/mood · habits · body · money · 3 regions | [v2-track.md](v2-track.md) |
| **V3** | Plan tab · 7 pillars · all regions · onboarding story | [v3-plan.md](v3-plan.md) |
| **V4** | World tab · Cartographer · full pattern library | [v4-world.md](v4-world.md) |

Three rules that protect future growth:
1. **One AI seam** — `lib/ai.ts` is reused by every tracker; never bolt AI on twice
2. **Pillars are data** — colour + filter field on cards, never hardcoded layout
3. **Additive schema only** — new features add columns/tables; never drop what V1 wrote
