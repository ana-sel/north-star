# North Star — V1 Design (Sleep Log + AI Note)

> A private personal navigation app. This document covers **only V1**: a calm sleep
> tracker with a gentle AI-written note, Google login, and correct time-zone handling.
> Everything is designed so V2 (energy, mood, qualities) and V3 (chat, planning) can be
> added later without rebuilding.

---

## 0. TL;DR — what you'll build and run

| Concern | Choice for V1 | Why |
|---|---|---|
| Where it runs | **Android app** (Expo React Native, installable now and publishable to Google Play later) | Matches your goal: real install flow today and Play Store-ready path |
| Frontend | **Expo + React Native + TypeScript** | You already have this in the repo (`mobile/`), one codebase for Android now and iOS later |
| Login | **Google sign-in via Supabase Auth** | Free, others can sign up, you write almost no auth code |
| Database + API | **Supabase (hosted Postgres)** free tier | Auto-generated secure API, each user only sees their own rows |
| AI note | **AI from day one** — cloud Edge Function calling free hosted model (Gemini / Groq), with rule-based fallback | Free tier with privacy choice; gentle note is core product from day one, not an afterthought |
| Cost | **£0 / month** | Free tiers + your own laptop for AI |

The plan keeps **everything in a single free platform** (Supabase) so friends can use the app any time. The **AI is in the cloud** (free hosted model via Edge Function), which means:
- ✅ Nothing to run at home
- ✅ One platform to maintain
- ✅ Choose privacy mode if needed (Mode 2: local private AI)

---

## 1. The one big architecture decision (read this)

You said two things that slightly pull in opposite directions:

1. *"Maybe better to have it locally so I don't pay for anything."*
2. *"I'd love this app to be used by other people — Google auth."*

**Simplified:** Everything lives in the cloud (Supabase). This means:
- ✅ Always on — friends can log in anytime
- ✅ Nothing running at home — no tunnel, no laptop uptime requirement
- ✅ Still free — uses free-tier AI hosted models
- ✅ Privacy option — if you want zero external AI calls, Mode 2 runs local AI server

This gives you a free, shareable app with simple maintenance.

```mermaid
flowchart TD
  subgraph Phone["📱 Android phones (yours + future users)"]
    APP["North Star Android app\n(Expo / React Native)"]
  end

    subgraph Cloud["☁️ Supabase (always on)"]
        Auth["Auth\n(Google sign-in)"]
        DB[("Postgres DB\nprofiles, sleep_entries")]
        API["Auto REST API\n+ Row Level Security"]
        Func["Edge Function\n(generates notes)"]
    end

    subgraph AI["🤖 AI (free tier)"]
        Model["Hosted Model\nGemini / Groq"]
    end

    APP -->|"login"| Auth
    APP -->|"read/write my data"| API
    API --- DB
    APP -->|"get sleep note"| Func
    Func -->|"send numbers"| Model
    Model -->|"return note"| Func
    Func -. "fallback: rule-based" .-> Func
```

> **Privacy modes:** Mode 1 (above) uses free hosted AI. Mode 2 lets you run local private AI on your laptop—see architecture.html § 03b.

---

## 2. Scope of V1 (kept deliberately small)

**In V1:**
- Google login.
- Set your **home time zone once** during onboarding.
- Log a night's sleep: **went to bed** time + **woke up** time.
- See your sleep as a **bar chart** for the last 7 days.
- See a short **AI note** under the chart (e.g. wake time, bedtime, total, one gentle line).
- A plain **history list** of past nights.
- Shift time zone when travelling (so hours stay accurate).

**Not in V1** (comes later): energy, mood, qualities, values, planning, chat, Kanban.

> Your written roadmap lists energy + mood inside V1. Your message asked to *start with
> just sleep*. I've scoped the first build to **sleep only**, but the database and screens
> are designed so energy + mood drop in with almost no rework (see §6 notes).

---

## 3. Screens & navigation (V1)

Three tabs, bottom nav, calm and uncluttered.

```mermaid
flowchart LR
    Login["Login\n(Google)"] --> Onboard["Onboarding\nset home time zone"]
    Onboard --> Today
    Today["① Today\n(log sleep)"] <--> Week["② Week\n(chart + AI note)"]
    Week <--> History["③ History\n(list)"]
    Today -. settings .-> Settings["Settings\nchange time zone"]
```

### Wireframe — ① Today (log a night's sleep)

```
┌──────────────────────────────┐
│  North Star            ⚙︎     │   ← settings (time zone)
├──────────────────────────────┤
│  Tuesday, 10 June            │
│  🌍 Europe/Vilnius (home)    │   ← active time zone, tap to shift
│                              │
│  How did you sleep?          │
│                              │
│   Went to bed                │
│   ┌────────────┐             │
│   │  23:10  ▾  │  ⟲ yesterday│
│   └────────────┘             │
│                              │
│   Woke up                    │
│   ┌────────────┐             │
│   │  06:45  ▾  │  ⟲ today    │
│   └────────────┘             │
│                              │
│   = 7h 35m                   │   ← live duration
│                              │
│   ┌────────────────────────┐ │
│   │      Save night        │ │
│   └────────────────────────┘ │
├──────────────────────────────┤
│  ●Today    Week    History   │   ← bottom tabs
└──────────────────────────────┘
```

### Wireframe — ② Week (chart + AI note)

```
┌──────────────────────────────┐
│  This week                   │
│  Avg sleep: 6h 52m           │
│                              │
│  9h ┤                        │
│  7h ┤ ▆   ▆ ▇   ▆ ▇ ▅        │   ← 7-day bar chart
│  5h ┤ █ ▄ █ █ ▃ █ █          │
│  3h ┤ █ █ █ █ █ █ █          │
│     └ M T W T F S S          │
│                              │
│  ┌──────────────────────────┐│
│  │ 🤖 Note                   ││
│  │ You averaged 6h 52m this  ││
│  │ week. Your latest night   ││
│  │ was 7h 35m (bed 23:10,    ││
│  │ woke 06:45). Your longer  ││
│  │ nights cluster on the     ││
│  │ weekend — gentle, no need ││
│  │ to change anything yet.   ││
│  └──────────────────────────┘│
├──────────────────────────────┤
│  Today    ●Week    History   │
└──────────────────────────────┘
```

### Wireframe — ③ History (plain list)

```
┌──────────────────────────────┐
│  History                     │
├──────────────────────────────┤
│  Today      7h35  bed 23:10 ›│
│  Yesterday  6h15  bed 00:05 ›│
│  Sun        7h20  bed 22:40 ›│
│  Sat        8h05  bed 23:30 ›│
│  Fri        5h40  bed 01:10 ›│
│  Thu        6h50  bed 23:55 ›│
│  Wed        7h10  bed 23:20 ›│
│  …                           │
├──────────────────────────────┤
│  Today    Week    ●History   │
└──────────────────────────────┘
```

---

## 4. Component structure (frontend)

```
src/
  App.tsx                  # app entry + tab shell
  index.ts                 # Expo bootstrap
  lib/
    supabase.ts            # Supabase client (URL + anon key)
    time.ts                # time-zone & duration helpers (the careful bit)
    ai.ts                  # calls laptop Ollama; falls back to ruleNote()
  auth/
    AuthGate.tsx           # shows Login until signed in, then the app
    LoginScreen.tsx        # "Continue with Google" button
  features/
    today/
      TodayScreen.tsx      # the log form
      SleepForm.tsx        # bed/wake time pickers + live duration
    week/
      WeekScreen.tsx       # chart + AI note card
      SleepBarChart.tsx
      AiNoteCard.tsx
    history/
      HistoryScreen.tsx
    settings/
      SettingsScreen.tsx   # change active time zone
  data/
    sleep.ts               # read/write sleep_entries via Supabase
    profile.ts             # read/write profile (home + active time zone)
  components/
    BottomTabs.tsx
    TimePicker.tsx
```

**Data flow (one direction, easy to reason about):**

```mermaid
flowchart LR
    UI["Screen component"] -->|"calls"| Data["data/*.ts"]
    Data -->|"supabase-js"| API["Supabase API"]
    API --> DB[("Postgres")]
    UI -->|"render note"| AI["lib/ai.ts"]
    AI -->|"http"| Ollama["laptop Ollama"]
    AI -. "fallback" .-> Rule["ruleNote()"]
```

---

## 5. Time-zone handling (the part that must be right)

**Rule of thumb: store everything in UTC, remember which zone it was logged in, and
display it back in that zone.** This keeps hours accurate even when you travel or DST changes.

- During onboarding you set a **home time zone** (an IANA name like `Europe/Vilnius`).
- The app keeps an **active time zone** in your profile. It defaults to home.
- When you travel, you open Settings and switch the active zone (e.g. to `Asia/Tokyo`).
  You keep logging normally; new nights are stamped with the new zone.
- Each saved night stores:
  - `sleep_start_utc`, `sleep_end_utc` — absolute instants in **UTC**.
  - `tz` — the IANA zone that was active when you logged it.
- **Duration** = `end_utc − start_utc`. It's an absolute difference, so it's always
  correct regardless of zone or DST.
- **Display**: each night is shown converted into **its own stored `tz`**, so "bed 23:10"
  still means 23:10 local-at-the-time — not shifted by later travel.

```mermaid
sequenceDiagram
    participant U as You
    participant App
    participant DB as Postgres
    U->>App: bed 23:10, woke 06:45 (active tz = Europe/Vilnius)
    App->>App: convert local times -> UTC using tz
    App->>DB: store start_utc, end_utc, tz="Europe/Vilnius"
    Note over App,DB: Later, in Tokyo
    U->>App: open Week view
    App->>DB: fetch nights
    DB-->>App: rows with utc + tz
    App->>App: render each night in ITS stored tz
    App-->>U: bed 23:10 (Vilnius), correct duration
```

> Use the browser's built-in `Intl.DateTimeFormat` / `Temporal` (or a tiny lib like
> `date-fns-tz`) for the conversions in `lib/time.ts`. Never store "23:10" as a bare
> string — always UTC + zone.

---

## 6. Database schema (Supabase / Postgres)

Supabase already gives you an `auth.users` table for login. You add two tables.

```mermaid
erDiagram
    USERS ||--|| PROFILES : has
    USERS ||--o{ SLEEP_ENTRIES : logs

    USERS {
        uuid id PK
        text email
    }
    PROFILES {
        uuid user_id PK_FK
        text display_name
        text home_tz "IANA, set once"
        text active_tz "IANA, changes when travelling"
        timestamptz created_at
    }
    SLEEP_ENTRIES {
        uuid id PK
        uuid user_id FK
        timestamptz sleep_start_utc
        timestamptz sleep_end_utc
        text tz "IANA at time of logging"
        timestamptz created_at
        smallint energy "nullable - for V2"
        smallint mood "nullable - for V2"
    }
```

`energy` and `mood` are added now as **nullable** columns so V2 needs no migration —
V1 simply ignores them.

**SQL to create the tables (run in Supabase SQL editor):**

```sql
create table profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_tz     text not null,
  active_tz   text not null,
  created_at  timestamptz not null default now()
);

create table sleep_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  sleep_start_utc timestamptz not null,
  sleep_end_utc   timestamptz not null,
  tz              text not null,
  energy          smallint,   -- V2 (nullable now)
  mood            smallint,   -- V2 (nullable now)
  created_at      timestamptz not null default now(),
  check (sleep_end_utc > sleep_start_utc)
);

create index sleep_entries_user_start_idx
  on sleep_entries (user_id, sleep_start_utc desc);
```

**Row Level Security — this is what makes "each user sees only their own data" true:**

```sql
alter table profiles      enable row level security;
alter table sleep_entries enable row level security;

create policy "own profile"
  on profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own sleep"
  on sleep_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

With RLS on, even though everyone hits the same API, the database refuses to return
another person's rows. You don't have to write that check in your app code.

---

## 7. API (you mostly get this for free)

With Supabase you usually **don't hand-write API endpoints** — `supabase-js` talks to the
auto-generated REST API, and RLS keeps it safe. Conceptually the operations are:

| Action | Operation (via supabase-js) | Notes |
|---|---|---|
| Sign in | `supabase.auth.signInWithOAuth({ provider: 'google' })` | Opens Google consent |
| Get my profile | `select * from profiles where user_id = me` | RLS enforces "me" |
| Set home/active tz | `upsert profiles` | Onboarding + Settings |
| Save a night | `insert into sleep_entries (...)` | Times already converted to UTC |
| Last 7 days | `select ... order by sleep_start_utc desc limit 7` | Feeds chart + note |
| Full history | `select ... order by sleep_start_utc desc` | Paginated list |

The **only** custom endpoint is the AI note, because that runs on your laptop:

```
POST  http://<your-cloudflare-tunnel-url>/sleep-note
body  { "nights": [ {start, end, tz, durationMin}, ... ] }
resp  { "note": "You averaged 6h 52m this week ..." }
```

`lib/ai.ts` calls this; if it times out or fails (laptop off), it calls `ruleNote()`
locally and the user never sees an error.

```mermaid
sequenceDiagram
    participant App
    participant Ollama as Laptop /sleep-note
    App->>Ollama: POST nights (3s timeout)
    alt laptop on
        Ollama-->>App: { note: "..." }
        App-->>App: show LLM note
    else laptop off / slow
        App-->>App: ruleNote(nights)  // built-in
    end
```

---

## 8. The AI note (free + private) — from day one

The gentle note ships **in the very first release**. It is never a "phase 2" feature.
There are two layers; the app always shows a note, no matter what.

**Layer 1 — local LLM (the day-one default):**
1. Install **Ollama** on your Windows laptop (free).
2. Pull a small model, e.g. `llama3.2:3b` or `phi3:mini` (runs on a normal laptop).
3. A tiny local service receives the `/sleep-note` request, prompts Ollama with the
   numbers, and returns 2–3 calm sentences.
4. Expose it to your phone with a free **Cloudflare Tunnel** (no port-forwarding,
   no fixed IP needed).

**Layer 2 — rule-based fallback (always present, invisible):**
A small deterministic function in `lib/ai.ts` builds a sentence from the numbers
(average sleep, latest night's bedtime/wake/duration, one gentle observation).
It runs instantly and offline. The app calls the LLM first with a short timeout; if the
laptop is off or slow, it quietly uses this instead. The user never sees an error and
never sees an "AI is unavailable" state — there is always a note.

> This is what "AI from day one" means in practice: the intelligent note is core, but it
> degrades gracefully to a still-useful rule-based line so the product is never broken.

**Prompt guardrails** (so it stays calm and non-judgmental, matching your vision):
- Never say "you failed" / "you should". Only gentle observation + optional tiny suggestion.
- Keep to 2–3 sentences.
- Always include the concrete numbers (so it's grounded, not vague).
- Frame patterns as hypotheses ("possible pattern", "worth watching") — never as facts.

---

## 9. Build order (small, safe steps)

1. **Hello Android app**: Expo app runs on your phone with Expo Go / dev build.
2. **Login**: wire Supabase Google auth; show a signed-in screen.
3. **Onboarding**: set `home_tz`, save profile.
4. **Log sleep**: Today screen → save to `sleep_entries` (UTC + tz).
5. **AI note, both layers**: ship `ruleNote()` *and* the Ollama `/sleep-note` endpoint
   together, with the timeout-and-fallback wiring. AI is live from this step on.
6. **History**: list past nights in their stored tz.
7. **Week**: bar chart of last 7 nights + average, with the AI note card on top.
8. **Travel**: Settings screen to change `active_tz`.
9. **Release path**: create `aab` with EAS Build → internal test track → production in Google Play.

Operational checklist for this release flow lives in: `mobile/PLAY_STORE_RELEASE_CHECKLIST.md`.

> The Ollama layer goes in at step 5, not at the end — that's the "AI from day one"
> commitment. The rule-based fallback is written in the same step so the note is always
> present, even before the laptop service is running.

Each step is independently testable and leaves you with a working app.

---

## 9b. How the simple sleep app grows (without rebuilding)

V1 is deliberately tiny, but every choice is made so the full vision — the **Track** and
**Plan** tabs you mocked up in [future-design/](future-design/) — drops in later without
a rewrite. The growth is additive, never destructive.

```mermaid
flowchart LR
    V1["V1 — Today / Week / History\nsleep + energy + mood + AI note"]
    V2["V2 — Track tab\nadd habits, body, money sub-views"]
    V3["V3 — Plan tab\npillars + Margulan month board"]
    V4["V4 — Chat + More\nprivate thinking room, deeper tools"]
    V1 --> V2 --> V3 --> V4
```

| What V1 builds | What it grows into | Why no rebuild |
|---|---|---|
| `sleep_entries` with nullable `energy`, `mood` | Track → Sleep / Body sub-views | Columns already exist; just surface them |
| The bottom-tab shell (Today / Week / History) | The 5-tab shell (Chat / Today / Plan / Track / More) | Tabs are data-driven; add entries, don't restructure |
| `lib/ai.ts` note (LLM + fallback) | Every future insight (habit, money, pattern notes) | One AI seam reused everywhere; same guardrails |
| One `entries` pattern + RLS | New tables (`habits`, `money`, `cards`) follow the same shape | Same per-user RLS recipe copied per table |
| "Possible pattern" insight card | Patterns tab (weak / repeated / confirmed signals) | The hypothesis framing is baked in from day one |

**Three rules that protect future growth:**
1. **One AI seam.** All notes go through `lib/ai.ts` (LLM first, rule-based fallback).
   New trackers reuse it — you never bolt AI on twice.
2. **Pillars are data, not layout.** When Plan arrives, the life pillars
   (Health / Inner / Money / Family / Joy / Contribution / Admin) become a colour + filter
   field on cards — exactly as in [future-design/plan-tab.html](future-design/plan-tab.html).
3. **Additive schema only.** New features add nullable columns or new tables; they never
   change or drop what V1 wrote. Old data always keeps working.

> Keep V1 boring on purpose. The job of the first release is to make the daily logging
> habit stick and prove the AI-note seam — the Track and Plan tabs are already designed,
> so they slot into the same shell when you're ready.

---

## 10. Naming

The detailed roadmap calls it **North Star**; your workspace has a **Compass** folder.
Both fit the "direction-shower / life supporter" idea. Pick one and keep it — this doc
uses **North Star** as the working title. Easy to change later (it's just a string).

---

## 11. What you owe nobody money for

- Supabase free tier: auth + Postgres + API.
- Cloudflare Tunnel: free public URL to your laptop.
- Ollama + open model: free local AI.
- Expo + EAS (starter usage): free to build and test Android packages.
- Note for launch: Google Play Console requires a **one-time** developer fee (~$25).
- Total while building: **£0/month**, fully shareable, AI stays private on your machine.
```
