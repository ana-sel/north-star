# Compass — Foundations · interaction & content spec

> The **floor**: the minimum toolkit every adult deserves and almost no one was
> taught. Governed by [`spec-00-principles.md`](spec-00-principles.md) (see §6 The
> Foundations). Sits beneath the aspirational [`spec-you.md`](spec-you.md) Paths &
> Qualities — you don't need to finish Foundations first, but they're the ground
> you can always return to.

---

## 0. What Foundations are (and are not)

Foundations are ten **domains of basic life capability**. Each contains a plain
explanation, the core tools, and a short **Foundation journey** (a 3-camp
mini-path) you can walk when ready.

| Foundations ARE | Foundations are NOT |
|---|---|
| A gentle floor everyone deserves | A test you pass or fail |
| Tools for real situations | A judgement that you're behind / broken |
| Revisitable — life reopens them | A one-time checklist |
| Self-paced, self-claimed | Ranked or scored against others |

**Framing rule (principles §1.2, §3):** never imply someone is a failed adult for
not having these. The message is *"almost no one was taught this — here's the
tool,"* never *"you should already know this."*

---

## 1. The safe order (this matters)

The Foundations have a **gentle recommended sequence** because of the window of
tolerance (principles §1.3, §2.7): you must be able to **regulate** before deep
**feeling** work, and feel safely before **relational** and **hard-things** work.

```
  Inner floor (do first)        Outer floor              Life floor
  1 Regulate  ─┐                4 Communicate            7 Tend the body
  2 Feel & name ├─ gateway      5 Relate                 9 Live practically
  3 Self-relationship ─┘        6 Know yourself          10 Make meaning
                                                          8 Handle hard things*
```
- **1 Regulate is the gateway.** Several journeys (esp. **8 Handle hard things**)
  are *gated*: if regulation isn't there yet, Compass gently routes you to it
  first — never forces the hard material.
- Autonomy still rules (principles §1.6): the app **recommends** an order; the
  person may choose any domain. It just won't push someone into deep water.
- **Foundations are never “finished”** (principles §11). They're ongoing capacities
  that deepen for life — you don't master Regulate then leave it; you carry it
  forward as you add Feel & name (which is *itself* a regulation tool). The tiers
  are **emphasis and starting order, not locked prerequisites**. So you're never
  “stuck at Regulate for months” — you develop a few in parallel, gently, within
  the focus budget (spec-you §1.2).
- **Only one hard gate:** deep *Handle hard things* needs a baseline of Regulate
  first (safety). Everything else is open.

## 1a. Are Foundations required?
**Default-on, never forced, not a prerequisite.**
- Onboarding gently begins you on the ground (Regulate). Foundations are the
  assumed baseline everyone is *invited* to — built in by default.
- You **can** start a Growth path without “finishing” Foundations — autonomy is
  absolute (principles §1.6). But if a Growth path leans on a shaky foundation,
  Compass offers a gentle nudge, never a block: *“The Warmth path goes deeper if
  you can regulate first — start there, or carry on?”*
- Foundations can be **declined**. The honest stance: the ground holds you; most
  who skip it struggle higher up — but the choice is yours.
- Practically, the **focus budget** means a person on 2 Growth paths simply has
  little room to also run Foundations — so the app nudges toward the ground *before*
  the hands are full, rather than policing it after.

## 1b. The baseline rituals — scaled to the day

Foundations' embodied anchors form the **default morning & evening routine** every
adult deserves. It isn't one fixed list — it **scales with the day's pace**
(Full / Lighter / Rest, spec-today §5). The **sleep + wake target is the spine of
every day** — the one non-negotiable that holds the rest. Rituals are the daily
engine (spec-practice-model §2) and live in **Log · Habits**.

### Rest day — the bare minimum (just survive today)
For depressed, heartbroken, running-on-empty days. No productivity is expected — the
most anyone can do is *get through today*. Nothing to solve.
- **Morning:** wake by your target · **light** (open the curtains, stand at the
  window, just look out — anything) · a glass of water · **three grounding breaths**
  · *then back to bed is completely fine.*
- **Evening:** **three grounding breaths** · to bed at your target.
- **Sleep/mood tracking is optional** — the card stays, but you're never made to log.
- Copy: *"Just today. You don't have to solve anything. Getting through is enough."*

### Lighter day — the bare minimum + a little
Mentally okay, just low energy or a slightly heavier mood.
- Everything in **Rest**, plus:
  - **Log sleep & mood** (still optional, but encouraged — it helps).
  - **One line of intention** for the day.
  - **A small walk** during the day.
  - **Evening:** a **gratitude / prayer**, and the **no-screens** wind-down.

### Full day — the routine + the work
- Everything in **Lighter**, plus the **one theme practice** (spec-practice-model)
  and your plan tasks.

> The routine **grows into** the day, never the reverse: a hard day is allowed to be
> only the bare minimum — and that is a complete, valid day.

### Everything builds gradually (the no-screens example)
Habits are **never dropped in at full size** (spec-practice-model §2b). *No-screens
before bed* starts at **15 min**, then eases **30 → 45 → 60** over weeks — not all at
once. Same for a walk (5 → 10 → 20 min) or a sit (1 → 3 → 5 min). Gradual escalation
lives inside the foundation/path that owns the habit.

- **Paths add to this** — a path drops its habit(s) into these rituals, **one at a
  time, gradually**. Users can also **add their own**; all logged identically.
- **Sleep/mood logging is always optional** on every day — encouraged, never forced.


---

## 2. Where Foundations live (IA)

- A dedicated **Foundations home** screen — *not* a 5th competing "You" lens.
- **Entry points:**
  - From **Paths** — a quiet "Start with the Foundations" beneath aspirational paths (the floor under the mountain).
  - From **Onboarding / Today** — offered gently to newcomers as "the ground to stand on."
  - A Foundation journey, once started, behaves like any **Path** (camps, anchor cue, appears in Today) and its earned capability surfaces in **Identity → Emotional maturity / Qualities**.
- Foundation journeys reuse the **Path** machinery (spec-you §2) — same camps, same self-claimed completion (§0.1 there). They're just tagged `Foundation`.

---

## 3. Foundations home — element interaction spec

| Element | On click | Opens / goes to | Shows | Limit | On delete |
|---|---|---|---|---|---|
| Header | — | — | "Foundations · the ground to stand on" | — | — |
| Gentle intro line | — | — | "Almost no one was taught these. Start anywhere; start small." | — | — |
| **Recommended next** card | Opens that domain | domain detail sheet | the one domain Compass gently suggests next | 1 shown | — |
| **Domain card** (×10) | Opens **domain detail sheet** | sheet | name, one-line, your coverage state | — | — |
| Domain **coverage dot** | — (display) | — | Not explored / Exploring / Practising / Steady | — | — |
| Locked/gated domain (e.g. Hard things before Regulate) | Tap → explains gently | sheet | "Let's build steadiness first — start with Regulate" + shortcut | — | — |
| **Start this Foundation** (in sheet) | Activates the Foundation journey | becomes an active Path; Today gets its cue | first camp | respects Active Paths ≤ 3 (spec-you §1.2) | Abandon = spec-you §1.3 |
| **Coverage** self-claim control | Set how you feel about a domain | inline | 4 states, self-chosen | — | can always lower again, no penalty |
| Tool link (in sheet) | Opens that tool | Emotional tools (spec-you §5.4) | tool detail | — | — |
| Crisis/really-hard signal | Pauses growth, shows care + resources | referral sheet (principles §7) | human help, not the app | — | — |

### 3.1 Coverage model (self-claimed, never a score)
Per domain, one of four **self-chosen** states — no numbers, no % of "adulthood":
`Not yet explored → Exploring → Practising → Steady`.
- The person sets it (or it nudges up when a journey completes and they confirm).
- **Steady can reopen.** Life reactivates domains — a loss reopens *Handle hard
  things*; a new relationship reopens *Relate*. That's normal, shown warmly, never
  as regression.

---

## 4. The ten Foundations (content)

Each: **what it is · why it matters · the capability · tools · the Foundation
journey (3 camps) · signs present / signs missing.** Tools link to the Emotional
tools & Values libraries in spec-you §5.

### 1 · Regulate  *(the gateway)*
- **What:** settle your own nervous system on purpose.
- **Why:** unregulated, you react from survival — everything else floods you.
- **Capability:** return yourself toward calm; know your window of tolerance.
- **Tools:** physiological sigh · box breathing · 5-4-3-2-1 grounding · orienting · cold water · self-holding.
- **Journey — "The Steadying":** Camp 1 *Notice your state* (activated / shutdown / settled) → Camp 2 *One reliable off-ramp* (your go-to tool) → Camp 3 *Catch it earlier* (regulate before the flood).
- **Present:** can calm down deliberately. **Missing:** 0-to-100, long recovery, shutdowns.

### 2 · Feel & name
- **What:** identify and articulate what you feel.
- **Why:** unnamed feelings run you; naming calms them ("name it to tame it" — affect labeling).
- **Capability:** feelings as information — "I feel X, I need Y."
- **Tools:** emotion wheel (spec-you §5.5) · body-scan for where it sits · the "what am I feeling / needing?" pause.
- **Journey — "The Vocabulary":** Camp 1 *Notice a feeling is here* → Camp 2 *Find its true name* → Camp 3 *Ask what it needs.*
- **Present:** precise feeling-words, knows the need under it. **Missing:** numb, or only "fine / stressed / angry."

### 3 · Self-relationship
- **What:** the way you treat and speak to yourself.
- **Why:** your inner voice becomes your baseline mood; a cruel one is chronic suffering.
- **Capability:** a kinder inner voice; self-parenting; meeting your own needs.
- **Tools:** self-compassion break · inner-child check-in · reparenting phrases · catch-the-critic.
- **Journey — "The Kind Voice":** Camp 1 *Hear how you speak to yourself* → Camp 2 *One kinder line* → Camp 3 *Parent the younger self.*
- **Present:** talks to self like a friend. **Missing:** harsh self-talk, self-neglect, perfectionism.

### 4 · Communicate
- **What:** say needs and boundaries cleanly; ask honestly; repair.
- **Why:** most conflict is poor communication, not bad people; unspoken needs → resentment.
- **Capability:** direct asks, clean boundaries, repair after rupture.
- **Tools:** NVC (observe · feel · need · request) · the clean "no" · the repair sentence · "I" statements.
- **Journey — "The Honest Ask":** Camp 1 *Name the need* → Camp 2 *Ask without blame* → Camp 3 *Say a clean no.*
- **Present:** asks directly, boundaries without guilt. **Missing:** hinting, exploding, silence, people-pleasing.

### 5 · Relate
- **What:** navigate closeness, conflict, trust, consent.
- **Why:** humans are wired for connection; secure relating is learnable (earned secure attachment).
- **Capability:** stay close *and* stay yourself; conflict without catastrophe.
- **Tools:** attachment awareness · turning toward "bids" · conflict repair · consent basics.
- **Journey — "The Secure Base":** Camp 1 *Your attachment pattern* → Camp 2 *Stay in conflict without fleeing or attacking* → Camp 3 *Repair after rupture.*
- **Present:** can be close and separate. **Missing:** cling or avoid; conflict feels like the end.

### 6 · Know yourself
- **What:** your values, needs, triggers — and what's *yours* vs inherited.
- **Why:** without self-knowledge you live someone else's life on borrowed shoulds.
- **Capability:** say who you are and what you want.
- **Tools:** values sort (spec-you §5.1) · needs inventory · trigger mapping · "whose voice is this?"
- **Journey — "The Inventory":** Camp 1 *Your values* → Camp 2 *Your needs* → Camp 3 *Yours vs inherited.*
- **Present:** clear sense of self. **Missing:** chameleon, chronic "I don't know what I want."

### 7 · Tend the body
- **What:** basic bodily self-maintenance as non-negotiable.
- **Why:** the body is the substrate — sleep, movement, food, rest set the floor for mood and mind.
- **Capability:** keep yourself resourced.
- **Tools:** sleep anchor · daily movement minimum · eating basics · real rest. *(Ties to Log — Sleep / Body / Energy.)*
- **Journey — "The Basics":** Camp 1 *Sleep anchor* → Camp 2 *Daily movement* → Camp 3 *Real rest (a true break, not a scroll).*
- **Present:** body is resourced. **Missing:** running on empty, ignoring signals.

### 8 · Handle hard things  *(gated on Regulate)*
- **What:** meet grief, failure, uncertainty, endings — without collapsing or numbing.
- **Why:** pain is unavoidable; the skill is *being with* it, not avoiding it (acceptance).
- **Capability:** stay with difficulty and come through.
- **Tools:** allow-the-wave · grief basics · self-compassion in failure · tolerating uncertainty.
- **Journey — "The Weathering":** Camp 1 *Let it be here (allow, don't fix)* → Camp 2 *Comfort yourself through it* → Camp 3 *Find the meaning after.*
- **Safety:** requires some **Regulate** first; on trauma/crisis signals → pause + referral (principles §7). Not unsupervised trauma work.
- **Present:** can sit with pain. **Missing:** numb, avoid, or spiral.

### 9 · Live practically
- **What:** money, decisions, admin, planning a real life.
- **Why:** logistics overwhelm bleeds into everything; avoidance here becomes dread.
- **Capability:** life runs, not chaos.
- **Tools:** budget basics · decision frames (70% rule · values-aligned choice) · a simple admin system · planning. *(Ties to Money + Plan tabs.)*
- **Journey — "The Groundwork":** Camp 1 *Money basics* → Camp 2 *A decision you've been avoiding* → Camp 3 *One simple system that holds.*
- **Present:** life is handled. **Missing:** avoidance, chaos, background dread.

### 10 · Make meaning
- **What:** connect to purpose, service, beauty, awe.
- **Why:** humans need a *why* (Frankl); comfort alone leaves emptiness.
- **Capability:** a felt sense of direction.
- **Tools:** the "why" · acts of service · a beauty/awe practice · values-as-direction (ACT).
- **Journey — "The Why":** Camp 1 *What actually matters to you* → Camp 2 *One act of service* → Camp 3 *A daily hit of beauty or awe.*
- **Present:** life has direction. **Missing:** emptiness despite comfort, going through motions.

---

## 4a. Dosage design — how much, how often (all ten)

The precise "how much / how often" per foundation. Each declares whether it feeds the
**habit engine** (daily rituals) or the **quality pool** (gapped practice) or both
(spec-practice-model §2). These two are the template for the other eight — and the two
that build the morning/evening baseline (§1b).

### Foundation 1 · Regulate — *mostly habit, plus a light skill practice*
**Feeds:** habit engine (daily anchor) **+** a gapped skill practice.

| Piece | Dose & rhythm | Gradual escalation |
|---|---|---|
| **Daily habit — three grounding breaths** (AM & PM) | **daily**, ~30 sec, in the baseline ritual | 3 breaths → 1 min slow breathing → 3-min box breathing → optional midday reset |
| **Skill practice** — run one tool *while calm*, and catch activation earlier | **~2–3×/week** (gapped) **+ situationally** whenever activated | the *"The Steadying"* journey: notice state → one off-ramp → catch it sooner |

- **Tools taught:** physiological sigh (double-inhale, long exhale — fastest to calm,
  Balban 2023) · box breathing (4-4-4-4) · 5-4-3-2-1 grounding · orienting (scan for
  safety cues — polyvagal) · cold water (dive reflex) · hand-on-heart.
- **Embodies:** the breath habit automates in ~4–6 weeks; the *capacity* to self-settle
  becomes a trait. The point of practising *while calm* is so the tool is available
  under stress. Never "finished" — it deepens.
- **Why gapped for the skill, daily for the breath:** the tiny breath anchor needs
  daily repetition to automate (Lally); the deliberate skill-building benefits from
  spacing + real-life situational reps.

### Foundation 7 · Tend the body — *almost pure habit engine*
**Feeds:** habit engine only (the physical baseline; little "quality" here).

| Daily habit | Dose | Gradual escalation |
|---|---|---|
| **Wake at target + get light** | daily · the circadian keystone | shift wake/bed **15 min per week** toward target — never jump |
| **A glass of water on waking** | daily · the classic first tiny habit | start here (Fabulous); stack the rest onto it |
| **Daily movement** (a walk) | daily | 5 → 10 → 20 min |
| **Wind-down / no-screens** | evening | **15 → 30 → 45 → 60 min** over weeks |
| **To bed at target** | daily · the sleep spine | (held steady by the wake anchor) |

- **Gapped quality practice:** *none required* — body work is habit, not a "quality."
  Optional light theme-day: *"honour one body need today"* (rest · move · nourish).
- **Tools taught:** sleep hygiene (consistent times, light, cool-dark room,
  no-screens) · movement minimum · eating basics (regular meals, protein, hydration)
  · real rest (a true break, not a scroll).
- **Embodies:** these become permanent automatic anchors — the body baseline every
  other foundation stands on.

### Foundation 3 · Self-relationship — *habit + quality (both)*
**Feeds:** a tiny daily habit **and** the rotating quality pool.

| Piece | Dose & rhythm | Gradual escalation |
|---|---|---|
| **Daily habit — one kind line to yourself** (in the baseline ritual) | **daily**, ~15 sec | notice tone → one kinder line → a full self-compassion break |
| **Quality practice — "kindness to self"** (rotated in the pool) | **~2–3×/week** (theme-of-day) | catch-the-critic → reparent the younger self → steady warm baseline |

- **Tools:** self-compassion break (Neff) · inner-child check-in · reparenting
  phrases · catch-the-critic.
- **Embodies:** the inner voice softens over ~8–12 weeks; this is slow trait work,
  not a quick automation — the daily line seeds it, the gapped practice deepens it.

### Foundation 2 · Feel & name — *quality-leaning, with a tiny daily anchor*
**Feeds:** quality pool **+** a micro daily check.

| Piece | Dose & rhythm | Gradual escalation |
|---|---|---|
| **Daily habit — a one-word feeling check** (log · mood) | **daily**, ~10 sec | one word → name + where it sits in the body → name + the need under it |
| **Quality practice — "naming"** (rotated) | **~2–3×/week** | notice a feeling is here → find its true name → ask what it needs |

- **Tools:** emotion wheel (spec-you §5.5) · body-scan · the "what am I feeling /
  needing?" pause.
- **Embodies:** granularity grows over ~6–10 weeks; the daily one-word check builds
  the habit of *turning toward*, the gapped practice builds the vocabulary.

### Foundation 6 · Know yourself — *quality only (episodic)*
**Feeds:** the quality pool — no daily habit.

| Piece | Dose & rhythm | Gradual escalation |
|---|---|---|
| **Quality practice — "self-inquiry"** (rotated, reflective) | **~1–2×/week** (gapped) | your values → your needs → what's yours vs inherited |

- **No daily habit:** self-knowledge is *reflective*, not a reflex to drill — forcing
  it daily makes it rumination (principles §1). Better spaced.
- **Tools:** values sort (spec-you §5.1) · needs inventory · trigger mapping ·
  "whose voice is this?"
- **Embodies:** clarity accrues over months; treat as periodic inventory, revisited.

### Foundation 4 · Communicate — *quality + situational reps*
**Feeds:** the quality pool **+** real-life situational practice.

| Piece | Dose & rhythm | Gradual escalation |
|---|---|---|
| **Quality practice — "clean asking"** (rotated, often rehearsal) | **~2×/week** + **whenever a real ask arises** | name the need → ask without blame → say a clean no |

- **Practise in life, not in a vacuum:** the pool slot is for rehearsal /
  reflection; the real reps happen in actual conversations. Situational, like Regulate.
- **Tools:** NVC (observe · feel · need · request) · the clean "no" · the repair
  sentence · "I" statements.
- **Embodies:** ~8–12 weeks of real asks before it feels natural; skill + exposure.

### Foundation 5 · Relate — *quality + situational reps*
**Feeds:** the quality pool **+** real relationship moments.

| Piece | Dose & rhythm | Gradual escalation |
|---|---|---|
| **Quality practice — "secure relating"** (rotated) | **~1–2×/week** + **in real interactions** | your attachment pattern → stay in conflict without fleeing/attacking → repair after rupture |

- **Deeply situational:** you can't schedule closeness; the slot is for noticing your
  pattern and one "turn toward a bid." Real growth is in the relationships themselves.
- **Tools:** attachment awareness · turning toward bids (Gottman) · conflict repair ·
  consent basics.
- **Embodies:** earned-secure attachment is slow (months–years); go gently, no rush.

### Foundation 8 · Handle hard things — *quality only, mostly situational (gated on Regulate)*
**Feeds:** the quality pool — but largely arises when life brings the hard thing.

| Piece | Dose & rhythm | Gradual escalation |
|---|---|---|
| **Quality practice — "weathering"** (rotated when relevant) | **as life brings it** + gentle practice ~1×/week | let it be here (allow, don't fix) → comfort yourself through it → find the meaning after |

- **Gated:** requires some **Regulate** first (§1 hard gate). On trauma/crisis signals
  → pause + referral (principles §7). Never unsupervised trauma work.
- **Not a daily drill:** you don't manufacture hardship to practise; you meet it with
  more skill each time. The pool slot is for building capacity *before* the storm.
- **Tools:** allow-the-wave · grief basics · self-compassion in failure · tolerating
  uncertainty.
- **Embodies:** capacity grows across real losses over a long arc.

### Foundation 9 · Live practically — *habit + task-driven*
**Feeds:** a light daily/weekly habit **+** concrete tasks (ties to Money + Plan tabs).

| Piece | Dose & rhythm | Gradual escalation |
|---|---|---|
| **Habit — a small admin/money touch** (Plan / Money tab) | **daily or weekly**, tiny | check one number → a weekly money review → a simple system that holds |
| **Quality practice — "facing the avoided"** (rotated when needed) | **~1×/week** | money basics → one avoided decision → one system |

- **Task-driven, not emotional drill:** most of this is *doing* (budget, admin,
  decisions), so it lives in Plan/Money as tasks, with a light habit to keep it warm.
- **Tools:** budget basics · decision frames (70% rule · values-aligned choice) ·
  a simple admin system · planning.
- **Embodies:** "life runs" once the systems hold — weeks to set up, then maintenance.

### Foundation 10 · Make meaning — *habit + quality (both)*
**Feeds:** a tiny daily habit **and** the quality pool.

| Piece | Dose & rhythm | Gradual escalation |
|---|---|---|
| **Daily habit — a daily hit of beauty or awe** (in the baseline) | **daily**, ~1 min | notice one beautiful thing → a short awe pause → a small daily practice |
| **Quality practice — "living the why"** (rotated) | **~1–2×/week** | what actually matters to you → one act of service → direction as a habit |

- **Tools:** the "why" · acts of service · a beauty/awe practice · values-as-direction
  (ACT).
- **Embodies:** direction becomes a felt background over months; the daily awe hit is
  the easiest keystone to start with.

### Summary — at a glance
| # | Foundation | Feeds | Daily habit? | Quality slot |
|---|---|---|---|---|
| 1 | Regulate | both | 3 breaths AM/PM | ~2–3×/wk + situational |
| 2 | Feel & name | quality + micro | one-word check | ~2–3×/wk |
| 3 | Self-relationship | both | one kind line | ~2–3×/wk |
| 4 | Communicate | quality + situational | — | ~2×/wk + real asks |
| 5 | Relate | quality + situational | — | ~1–2×/wk + real moments |
| 6 | Know yourself | quality only | — | ~1–2×/wk (reflective) |
| 7 | Tend the body | habit only | wake/water/walk/wind-down/bed | none |
| 8 | Handle hard things | quality (gated) | — | as life brings + ~1×/wk |
| 9 | Live practically | habit + tasks | tiny admin touch | ~1×/wk when needed |
| 10 | Make meaning | both | daily beauty/awe | ~1–2×/wk |

**Reading the table:** the **morning/evening baseline (§1b)** is assembled from the
*daily-habit* column (breath, kind line, feeling check, body anchors, beauty hit).
The **rotating practice pool (spec-practice-model §2)** draws from the *quality slot*
column — and you practise **one theme per day**, never grinding all at once.

### The shape of the design
Two rules run through all ten: **daily habits stay tiny and automate** (breath, water,
one kind line, a feeling word, an awe hit); **qualities are gapped and often
situational** — you practise one theme a day, and the deepest ones (Communicate,
Relate, Handle hard things) grow mostly in real life, not in a scheduled drill.
Reflective work (Know yourself) is spaced on purpose so it stays inquiry, not
rumination (principles §1). Nothing here is ever "finished" — habits become the
baseline, qualities become traits.

---

## 5. Cross-links
- Foundation journeys **are Paths** (spec-you §2) tagged `Foundation`; completion is
  **self-claimed** (spec-you §0.1) and can grow a **Quality** or integrate a **Tool**.
- Tools referenced here are defined in **spec-you §5.4**; values in **§5.1**;
  emotions/wheel in **§5.5**.
- Everything here obeys **spec-00-principles** — especially regulate-before-insight
  (§1.3), no shame (§1.5), autonomy (§1.6), and referral on crisis (§7).

## 6. Still to decide (later)
- Exact **onboarding** flow: how much of the Foundations to surface on day one vs.
  let the person discover them.
- Whether **coverage** is ever shown as a single gentle "wholeness" view across all
  ten (risk: reads as a score — must be handled very carefully, or skipped).
- Region-specific **crisis resources** list for the referral sheet.
