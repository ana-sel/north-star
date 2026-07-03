# Compass — Habits · architecture, meaning & the 108 model

> The single source of truth for how a **habit** is defined, added, ordered,
> tracked, and given meaning. Sits under [`spec-practice-model.md`](spec-practice-model.md)
> (habits = the daily automatic engine, §2A) and
> [`spec-foundations.md`](spec-foundations.md) §1b (the baseline rituals). Governed
> by [`spec-00-principles.md`](spec-00-principles.md) — especially §1.5 (no shame),
> §11 (the Middle Way). Where this file and a wireframe disagree, **this file wins**;
> the wireframe is updated to match.

---

## 0. Scope — what this resolves

The habit system spans **Log · Habits** (logging + manage), onboarding (first tiny
habit), and Paths/Foundations (which drop habits into rituals). This spec freezes the
**domain model, ordering rules, progress model, edge cases, meaning layer (reason +
benefits + media), and the 108-repetition model** so implementation can begin without
drift. It does **not** redefine rituals, pace, or the practice/quality engine — those
live in `spec-practice-model.md` and are referenced, never duplicated.

---

## 1. Two-layer data model

A habit is **never** free-typed content. Curated meaning lives on a shared template;
the user owns only an instance.

### `habit_template` (curated, shared, read-only to users)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | text | e.g. "Drink water on waking" |
| `icon` | text | shared icon key (`ic-drop`…) |
| `default_dose` | text | smallest starting dose (spec-practice-model §2b) |
| `default_cadence` | enum | `daily` / `3x_wk` / `5x_wk` / `weekly` |
| `default_cycle` | int | reps to mastery — default **108** (§6) |
| `pillar_primary` | enum | one of the 7 canonical pillars (v4-world) |
| `pillar_secondary` | enum? | **optional, max one** (§7) |
| `reason` | text | one line, mechanism-based (§5) |
| `benefits` | jsonb | array of `{text, horizon, confidence}` (§5) |
| `media` | jsonb | `{glyph, story[], video?}` refs (§8) |
| `anchor_hint` | text | "Best in morning", "2 minutes", "low load" (fit hint) |

### `user_habit` (the instance the person owns)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | RLS-scoped |
| `template_id` | uuid? | null = fully custom habit |
| `ritual_id` | text | which ritual it belongs to (morning/evening/…) |
| `order_index` | int | **per ritual** (§3) |
| `pace_level` | enum | `all` / `active` / `full` (maps to Rest/Lighter/Full visibility) |
| `cadence` | enum | may differ from template default |
| `cycle_target` | int | 21 / 40 / 66 / 108 (§6) |
| `reps_done` | int | lifetime completions toward mastery |
| `dose_current` | text | current step of the gradual escalation |
| `created_at` | timestamptz | |
| `archived_at` | timestamptz? | null = active |

### `habit_log` (one row per completion — the single source for all metrics)
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `user_habit_id` | uuid | |
| `done_at_utc` | timestamptz | |
| `tz` | text | IANA at time of logging (consistency with sleep model) |

**Rule:** `reps_done` and rhythm/streak are **both derived from `habit_log`** — never
stored as independent counters that can drift.

Custom habits (`template_id = null`) carry no `reason`/`benefits`/`media` and simply
skip the meaning layer — the text name stands alone.

---

## 2. Two flows, cleanly separated

- **Log flow** (default view): pick it up, tick it off, put it down. No management
  controls inline. This protects the calm daily surface.
- **Manage flow**: entered via the **✎ Manage** control on a ritual header → opens the
  **bottom sheet**. All add / reorder / edit / archive happens here.

Never mix them. Adding a habit is a deliberate act, not a logging act.

---

## 3. Ordering — deterministic rules

1. `order_index` is stored **per ritual**, never global.
2. **Pace filtering hides rows; it never rewrites order.** Rest/Lighter/Full only
   change visibility (`pace_level`), leaving `order_index` untouched.
3. Reordering (drag/drop in the Manage sheet) writes only within the **same ritual**.
4. Reorder happens against the **full list** (all pace levels visible in Manage), so
   hidden rows keep a stable position when pace changes.
5. Save timing: order persists **on drop**, optimistic-updated in UI.

---

## 4. Edge-case behaviour matrix (frozen)

| Event | Reps | Rhythm/streak | Order | Notes |
|---|---|---|---|---|
| **Move to another ritual** | kept | kept | new `order_index` = end of target ritual | history intact |
| **Archive (active streak)** | frozen | **paused, not zeroed** | removed from ritual view | reversible |
| **Restore from archive** | resumes | resumes from pause | appended to end | no penalty |
| **Change cadence mid-cycle** | carries over | recalculates **forward only** | unchanged | past isn't rewritten |
| **Change cycle target** (e.g. 66→108) | carries over | unchanged | unchanged | progress bar rescales |
| **Delete custom habit** | gone | gone | siblings reflow | confirm required (destructive) |
| **Missed day** | **never subtracts reps** | rhythm dips only | unchanged | anti-guilt rule (§6) |

---

## 5. The meaning layer — reason & benefits

Doing a habit without a reason is pointless. Every **template** carries a governed
reason block, revealed at the right moment (progressive disclosure, §9).

### Reason quality rule (all three required)
- **Specific** — names a mechanism ("morning light anchors circadian timing").
- **Immediate** — one near-term felt outcome ("steadier wake-up in a few days").
- **Honest** — "supports / associated with", **never** "cures / guarantees".

### Benefits — two horizons + confidence
Each benefit is `{text, horizon, confidence}`:
- **horizon**: `today` (felt fast) or `compounding` (felt after repetition).
- **confidence**: `strong` / `emerging` / `traditional` — shown as a small tag, so
  ancient wisdom and modern evidence sit **side by side as paths to test**, never as
  ranked truth.

### Governance
- Content is **authored/approved by you**, stored on the template. The AI never
  generates health claims at runtime.
- No medical-sounding promises. One owner signs off wellbeing language.
- GDPR: reason/benefit content is generic template data — **no user data** is ever
  sent anywhere to render it (consistent with AGENTS privacy rule).

---

## 6. The 108 model — repetitions over "66 days"

Compass tracks **mastery by repetition**, not calendar days. Default cycle = **108
reps** (Compass mode); user may choose **21 / 40 / 66 / 108**.

**Dual tracking, always shown together:**
- **Repetitions** — counts toward the cycle target (the *mastery arc*). Monotonic:
  a rep is never removed by a missed day.
- **Rhythm** — recent consistency (last 7 / last 30). The *momentum signal* that can
  dip and recover.

This split is the **anti-guilt mechanism**: life interruptions cost rhythm, never
mastery. For variable-cadence habits (e.g. 3×/wk), a rep = one logged completion —
cadence sets the *expected* rhythm window, not the rep count.

**Reflective loop:** after **7 reps**, one tiny optional prompt — *"What changed, if
anything?"* — keeps agency with the person, not dogma from science or tradition
(principles §1.6).

---

## 7. Pillars — light, not a web

Everything affects everything, but showing that is overwhelming. So:
- Each template has **1 primary pillar** and **at most 1 secondary** (canonical 7:
  health, inner, admin, family, joy, money, contrib — v4-world).
- Displayed as **tiny tags**, never a diagram or matrix.
- Pillars are organisational/visual only — **never gating** (v3-plan §2).
- The world layer (V4) reflects pillar activity as atmosphere; it reads these tags
  but **never invents** connections.

---

## 8. Media tiers — animation + story + optional video

The felt "why" is delivered in three tiers; each template declares what it uses. All
degrade gracefully and honour **reduced-motion**.

| Tier | What | Cost / constraint | When it plays |
|---|---|---|---|
| **1 · Motion glyph** (always) | <1.2s Lottie (water ripple, breath wave, sun sweep) | tiny, offline, free; `lottie-react-native` | on select + on completion |
| **2 · Story card** (the reason) | 3–4 swipeable illustrated stills, one line each | free, offline, no streaming | on first add + "Why this matters" replay |
| **3 · Video** (opt-in, curated) | true short video for a few flagship habits only | **not bundled** (binary bloat), **not self-hosted** (breaks £0); free-tier CDN, **Wi-Fi-only lazy load** | user taps play; Story card is the always-available fallback |

**Motion rules:** semantic only (breath = expand/contract, water = refresh, sun =
warm sweep); duration < 1.2s; no loops unless the user taps replay; reduced-motion →
Story stills; no network → Story stills; no media at all → the text reason still
stands alone.

---

## 9. UX load control (anti-overwhelm)

- **Progressive disclosure:** the first **3 habits** a user adds show the full
  experience (glyph + story, video if present). After that, meaning collapses by
  default behind "Why this matters".
- **Build one at a time** (spec-practice-model §2b): a new habit is added only once
  the current one is steady.
- **Guardrails:** max **1 new habit per ritual per week**; max **3 "building" habits**
  at once; the rest wait in a **backlog/parked** state.
- **Add flow (single deterministic path):** pick template → see Why (reason +
  benefits + glyph/story) → choose ritual + pace → place in order.
- **Empty/overload states** are designed: gentle guidance when there are no habits,
  and a calm "you're building enough right now" when the cap is reached.

---

## 10. Accessibility & technical readiness

- **Drag/drop:** a proven RN approach (e.g. draggable FlatList) — chosen now, not at
  build time.
- **Animations:** Lottie JSON (small, vector, performant), with a reduced-motion
  fallback path.
- **Every UI action maps to a stored event** (`habit_log`, `order_index`,
  `archived_at`…) — no implicit state.
- **RLS:** every `user_habit` and `habit_log` row is user-scoped (AGENTS privacy).

---

## 11. MVP cut line

**Now (V1 of the habit system):**
- Two-layer model + `habit_log`
- Manage sheet: add / reorder (drag) / archive
- Reason card (text + benefits + confidence tags)
- Tier-1 motion glyph + Tier-2 story card
- Reps + rhythm dual tracking; cycle target selectable (default 108)
- Pillars as tags (primary + optional secondary)

**Later (enhancement layer — no data-model rework needed):**
- Tier-3 video for flagship habits
- Reflective-loop analytics surfaced in Discover
- Fit-score hints, anchor-boundary reorder locks
- Backlog/parked habit management UI

**Caps for the release:** ≤ 12 starter templates · one animation-style system · one
scoring model (reps + rhythm, no alternates) · evidence tags informational only (no
ranking engine).

---

## 12. Open (minor, non-blocking)
- Exact starter-template list (≤ 12) — content task, not architecture.
- Whether the reflective prompt fires again at later rep milestones (e.g. 27, 54).
- Default cycle wording in onboarding ("108 · the body's count" vs neutral).
