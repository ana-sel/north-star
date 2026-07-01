# Compass — Today · interaction & content spec

> The one screen a person opens every day. Its whole job is to stay **calm** and
> answer *"what, if anything, is mine to do today?"* — never to pile on.
> Governed by [`spec-00-principles.md`](spec-00-principles.md) (esp. §1.5 no shame,
> §2.6 self-compassion, principle 11 the Middle Way) and the **two-engine practice
> model** in [`spec-practice-model.md`](spec-practice-model.md). Today is where that
> model is *felt*: **daily ritual habits** (the tiny baseline that repeats) **+ one
> theme quality** for today (the one thing you're growing) **+ a few tasks**. It
> never asks you to *grow* more than one quality at a time.

---

## 0. The promise of Today
- **One quality to grow, plus your tiny daily rituals** — never a wall of practices.
  Everything else is context, your own planned day, or optional signals you can ignore.
- **Two engines, two rhythms** (spec-practice-model §2): *ritual habits* repeat
  **daily** (the baseline — breath, a kind line, a feeling word); the *theme quality*
  is **one per day**, rotated from your small pool (never two days running).
- **A hard day makes Today ask for less, not more** (gentle-day reduction).
- **As you finish, Today goes quiet** — completed sections collapse; a done day
  visibly empties. (Taoist emptying; reward is calm, not confetti.)
- Today **mirrors and links**; the real editing lives in Paths, Plan, Log.

---

## 1. The load model — four bands (top → bottom)

```
1 · ARRIVAL      (passive context — one glance)      always, light
2 · TODAY'S FOCUS(daily rituals + ONE theme quality)  rituals + 1 theme
3 · YOUR DAY     (your own logistics)                 bounded, collapsible
4 · SIGNALS      (optional nudges)                    ignorable, dismissible
```

- **Band 2 holds both engines:** the tiny **daily rituals** (the baseline that
  repeats, spec-foundations §1b) and **one theme quality** for today (the growth
  work — one, never a stack). The rituals are light and quick; the theme is the
  one deliberate thing.
- Band 3 is *your* planned life (from Plan), not the app's agenda — surfaced a few,
  the rest stays in Plan.
- Bands 1 & 4 never demand action.

---

## 2. Band 1 · Arrival (context, passive)

| Element | On click | Opens / goes to | Shows | Behaviour |
|---|---|---|---|---|
| Date · timezone | — | — | "Friday · 27 June · UTC+1" | display |
| **Sleep & mood** — unlogged | Tap → opens **sleep sheet** | inline bottom-sheet | "How did you sleep?" prompt | one tap opens the sheet |
| **Sleep sheet** | fill → Save | closes on save | bed + wake (→ duration) · mood (5) · energy (5). **No target box** (that's a Setting) | Save writes the log + suggests a pace (§5) |
| **Sleep & mood** — logged | Tap → edit | Log → Sleep entry | duration + mood/energy (weather + battery) | read/edit |
| **Today's pace** selector | pick Full / Lighter / Rest | inline | the day-intensity control | drives §5 |

Arrival is *how you're arriving today* — it sets tone and it's the input that decides
how much Today should ask for (§5). It is never a checklist.

> **Removed: the "Scene" card.** It promised narrative/story content that doesn't
> exist yet — noise, not signal. Reintroduce only if/when there's real content.

---

## 3. Band 2 · Today's focus (daily rituals + one theme quality)

The heart. It holds **both engines** of the practice model
([`spec-practice-model.md §2`](spec-practice-model.md)):

1. **Your daily rituals** — the tiny baseline that repeats every day (breath, a kind
   line, a feeling word, a beauty hit — spec-foundations §1b). These are *habits*:
   many can coexist because each is tiny and automatic. Shown as a light, quick strip.
2. **Today's theme** — the **one** quality you're growing today, rotated from your
   small pool (spec-practice-model §2a: never the same quality two days running).
   This is the one deliberate, expanded practice with its if-when intention.

This band *replaces and unifies* the old separate "Inner work" + path-linked morning
habits, and it supersedes the earlier "1 primary + 2 light = 3 growth practices"
budget: you don't grow three qualities a day — you keep small rituals and grow **one**
theme.

| Element | On click | Opens / goes to | Shows | Limit | Behaviour |
|---|---|---|---|---|---|
| **Today's theme** (expanded quality) | tap row → mark done / *not today*; tap source → journey | Paths → that journey | the one quality: its cue / implementation-intention (if-when → steps), source journey | **1** | done / not-today (with gentle reason), reversible |
| **Morning / Evening ritual card** (Fabulous-style) | tap a **circle** → tick that habit; tap the card → open the ritual | Log · Habits | the ritual's name + anchor time + progress, and a row of **connected completion circles** (one per tiny habit) | the baseline (two cards) | reversible ticks; circles fill as you go |
| Source label (e.g. "Stillness Path") | Tap → that journey/quality | Paths / Identity | — | — | — |
| **Empty state** (no theme yet) | Tap → start | Foundations / Paths | "Start on the ground → Foundations" invite | — | never blank/nagging |
| Focus complete | — | — | section collapses; "That's your focus done" | — | quiets down |

- **The one implementation-intention** (the "Today's challenge" pattern) belongs to
  the **theme** only — never several challenges at once. Rituals are tiny ticks.
- **Rituals vs theme are visually distinct:** the two ritual **cards** (morning /
  evening, with their completion circles) read as quiet *maintenance*; the theme is
  the single highlighted card (it's *growth*).
- **The rituals live once.** The morning/evening ritual is shown here as cards — there
  is **no separate "evening ritual" row** in *Your day* (that was duplication). The
  cards mirror Log · Habits; the day's **pace** (§5) scales how many circles show.
- **"Not today" ≠ failure:** the theme can be gently declined with an optional reason
  ("resting," "no space today") — it simply rotates on. No shame, no broken streak
  (principles §1.5).

> There is no "add a 4th practice" here because the model itself is one-theme-per-day.
> Starting more *paths* is fine (they add to the rotating pool and the ritual
> baseline) — but any given **day** still surfaces just one theme + the tiny rituals.


---

## 4. Band 3 · Your day (logistics, collapsible)

Your *own* planned life — not the app's growth agenda. Bounded and collapsible.

| Element | On click | Opens / goes to | Shows | Limit | On delete |
|---|---|---|---|---|---|
| **Tasks from the plan** | tap task → toggle done | — | today's planned tasks with pillar tags | surface **≤ 3**; "N more in Plan →" | edit/delete in Plan |
| Task header "From the plan" | Tap → Plan | Plan → today | count done | — | — |
| `N more in Plan →` | Tap → Plan | Plan | — | — | — |

- **No ritual row here.** The evening (and morning) ritual is shown as a **card in
  Band 2** (with its completion circles) — *Your day* holds only your own planned
  tasks, so rituals aren't duplicated.
- **Lifestyle basics** (water, walk, etc.) are part of the **ritual cards** in Band 2
  (they're the person's baseline habits) — they do not reappear as tasks here.
- Tasks are the person's own; Today shows a calm few and defers the rest to Plan.

---

## 5. Today's pace — Full / Lighter / Rest

One clear control (not vague chips). Compass **suggests** a pace from your logged
energy; **you** choose. Self-compassion (principles §1.5, §2.6) made concrete.

| Mode | Focus (Band 2) | Your day (Band 3) | Signals (Band 4) | Routine kept |
|---|---|---|---|---|
| **Full** | one theme practice | shown | shown | full baseline + theme |
| **Lighter** | no theme (rest the practice) | dimmed, deferrable | hidden | bare minimum **+** intention · small walk · gratitude · no-screens |
| **Rest** | none | hidden | hidden | **bare minimum only** — wake+light · water · 3 breaths · bed at target |

- The **routine each mode keeps** is defined in [`spec-foundations.md §1b`](spec-foundations.md)
  — the baseline *scales to the day*. Rest = the bare minimum to *get through today*;
  Lighter adds a little; Full adds the theme practice + tasks.
- On save, **energy ≤ 4 → Compass pre-selects Lighter** and says *"Your energy is
  low — Compass suggests a lighter day. You choose."* Never forced; you can bump
  back to Full or down to Rest.
- The three are **distinct**, not duplicates. **Sleep/mood logging is optional on
  every mode** — encouraged, never forced (especially Rest).

### 5.1 Rest days do NOT abandon what you're building  *(the important rule)*
- **Streaks are held, not broken.** A rest day is *protected recovery* — the chain
  isn't broken, paths keep their momentum, nothing is lost. Copy: *"Nothing is
  lost. Your streaks are held and your paths wait for you — rest is part of the
  practice, not a break from it."* + a **“Streaks protected today”** badge.
- Grounding: rest is part of habit formation and growth (recovery is when
  integration happens); punishing rest breeds shame and the False Self (principles
  §1.1, §1.5). Taoist *wu wei* — seasons and stillness are legitimate.
- A planned rest ≠ a missed day. Only *unacknowledged* abandonment might lapse a
  streak — and even then it's met with repair, never shame (principles §1.5).

The inverse is fine: a great-energy day may gently offer *"room for one more?"* —
still an invite, never a push.

### 5.2 Even Rest keeps a minimal rhythm  *(nervous-system predictability)*
Rest ≠ formless nothing. Drop the striving and obligations, **keep the quiet anchors
that regulate the nervous system** — framed as *care, not achievement* (no ticks, no
streaks, all skippable). Crucially, these are **the user's OWN routine, softened —
tied to the app's real data**, not generic wellness advice:
- **Keep your sleep rhythm** — pulls the person's **sleep target** ("wind down ~22:30,
  wake ~06:30"). Consistent wake + light is the strongest circadian anchor. → Log · Sleep.
- **Morning ritual · gentle** — their *actual* morning ritual, shown as the lightest,
  pressure-free version. → Log · Habits.
- **Evening ritual · gentle** — their *actual* evening ritual, "no checklist tonight."
  → Log · Habits.

Rest mode shows a small **"A gentle rhythm"** card beneath the rest message — their
routine, offered gently, never required. (No streak on these; the point is rhythm,
not achievement.)

*Why:* circadian science (regular wake/light steadies mood & energy; total collapse
= "social jet-lag"); polyvagal theory (predictability = a cue of safety); behavioural
activation (empty low days deepen rumination; tiny gentle actions lift); habit science
(keep the *tiny* version alive). And the wisdom traditions all say **rest has form** —
Sabbath (structured, ritual rest), the Benedictine Horarium, Taoist natural rhythm,
the Buddhist breath/*sati* thread, Ayurvedic *dinacharya*. The Middle Way between
grinding and collapse. **Tying it to the person's own targets/rituals is both more
meaningful and better science than generic suggestions.**

---

## 6. Band 4 · Signals (optional, dismissible, bottom)

| Element | On click | Opens / goes to | Shows | Limit | On dismiss |
|---|---|---|---|---|---|
| **Weekly check-in ready** | Tap → begin | Discover → check-in | "3 questions · 2 min · due today" | when due only | hides for the day |
| **Coach nudge** (AI) | Add to plan / Not now | Plan (if added) | one contextual suggestion tied to a goal | **≤ 1** at a time | "Not now" dims it |

Signals never stack, never nag, always ignorable. Suppressed on gentle days (§5).

---

## 7. States of Today

| State | What Today looks like |
|---|---|
| **New / nothing active** | Arrival + a warm Band-2 invite ("Start on the ground → Foundations") + maybe today's plan. No empty guilt. |
| **Normal** | Arrival · tiny daily rituals + one theme quality · a few tasks · maybe 1 signal. |
| **Gentle day** | Arrival · rituals only (theme rests) · tasks dimmed/deferrable · signals off. |
| **All done** | Sections collapsed · a quiet *"You've done enough today."* |

---

## 8. Cross-links & rules
- Band 2 follows the **two-engine practice model** (spec-practice-model §2): daily
  ritual habits + exactly **one** rotated theme quality; the theme never repeats two
  days running (§2a gap rule).
- Nothing is deleted on Today (it mirrors) — ticks are reversible; tasks/practices are
  edited at source (Plan / Paths / Log).
- Voice per principles §3 — warm, unhurried; "when you're ready," "resting counts."
- Completion → **calm**, never confetti-spam (principles §3).

## 9. Still to decide (later)
- Exact **gentle-day threshold** (≤5 vs a 2-day trend) and whether the user can set it.
- Whether **Scene** is core or an optional delight that can be turned off.
- Morning vs evening **layout shift** (does Today re-order as the day progresses?).
