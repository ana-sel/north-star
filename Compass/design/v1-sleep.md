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
| Timezone | Auto-detected from device (IANA) — no setup screen | Zero friction; not editable (device is always correct) |
| Cost | £0 / month | Free tiers throughout |

---

## 1. Scope (deliberately small)

**In V1:**
- Google login.
- Timezone auto-detected from device.
- Log a night's sleep: bed time + wake time.
- Sleep target (bed + wake clock times) — tap the target strip to set.
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
              ↑
           SETTINGS (⚙) — profile + privacy + sign out
```

### Today — log a night

```
┌──────────────────────────────┐
│  Compass               ⚙    │
├──────────────────────────────┤
│  Wednesday, 24 June · UTC+1  │
│                              │
│  TARGET  (tap to set)        │   ← opens target modal
│    🌙          ☀️            │
│  23:00        07:00          │
│          8 hours             │
│                              │
│  How did you sleep?          │
│  [Went to bed]  [Woke up]    │   ← time pickers
│       5h 40m time asleep     │
│                              │
│  [Save night]                │
├──────────────────────────────┤
│  ●Today  Week  History       │
└──────────────────────────────┘
```

Tapping the **TARGET** strip opens a modal with the same card layout as the sleep form, but with "Target bed" / "Target wake" labels and a "Save target" button. Target times are stored as local clock hours (see `mobile/ARCHITECTURE.md` — Time storage convention).

### Settings (⚙ overlay)

Tapping ⚙ slides a full-screen overlay. No timezone picker — device timezone is used silently.

```
┌──────────────────────────────┐
│  Settings              ✕    │
├──────────────────────────────┤
│  PROFILE                     │
│  Name     Ana                │
│  Email    ana@example.com    │
│                              │
│  PRIVACY                     │
│  Compass stores only your    │
│  sleep times. Never shared.  │
│                              │
│  [Sign out]                  │
└──────────────────────────────┘
```

### Trends

```
┌──────────────────────────────┐
│  Avg sleep · this week       │  ← label updates: "this week" or "this month"
│  6h 48m                      │  ← average recalculated from selected period
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

The average label and value both update when the Week / Month toggle changes:
- **Week selected** → "Avg sleep · this week" · avg of logged nights in that week
- **Month selected** → "Avg sleep · this month" · avg of weekly averages in that month

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
      SettingsScreen.tsx   # profile info + sign out
  data/
    sleep.ts               # read/write sleep_entries
    profile.ts             # read/write profile (timezone)
  components/
    BottomTabs.tsx
```

---

## 4. Time handling

See `mobile/ARCHITECTURE.md` — **Time storage convention** for the canonical two-pattern rule.

Short summary:
- Sleep log entries → UTC to Supabase; displayed via `utcToLocal(d, timezone)`.
- Sleep target times → local clock hours to AsyncStorage; displayed via `utcToLocal(d, timezone)`. Stays "23:00" in any timezone.
- Timezone auto-detected from device on every launch; stored on each entry as the IANA zone at time of logging.

---

## 5. Database schema

```sql
-- profiles
create table profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_tz      text not null,   -- IANA, auto-detected on first launch
  active_tz    text not null,   -- IANA, matches device timezone at log time
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
8. Settings: profile info + sign out
9. Target strip: tap to open target modal, save to AsyncStorage
10. World seed: "A scene has appeared" card after 3 logs
11. EAS Build → internal test track → Play Store

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
