# Compass — "You" universe · interaction & content spec

> Source of truth for **what each screen does** before we write code.
> Covers the four You tabs: **Paths · Identity · Discover · Progress**.
> Companion specs (Today, Log, Plan, Money) follow the same format.
> **Governed by [`spec-00-principles.md`](spec-00-principles.md) — read that first.**

---

## 0. The coaching model (why this exists)

Compass helps you **become a grounded, authentic adult** and grow the qualities you're drawn to — by recognising them as **seeds already in you**, not as things you lack in others. (See principles §2.5 — admiration is a mirror; §1.4 — no rumination/comparison.) The app's job is to **name → define → show where you are → offer the practice → let *you* confirm integration.**

Every growable thing (Quality, Emotional tool, Path) moves through the same **integration states**:

| State | Meaning | Where it lives |
|---|---|---|
| **Drawn to** | A seed you've noticed in yourself. Capped, non-hoardable | tiny "drawn to" shelf (≤ 3) |
| **Practising** | Active — a daily cue **or** a Path behind it (either is fine) | Identity + Paths + Today |
| **Integrated** | **You** confirmed it's part of you now — permanent | Identity (gold), Progress |
| **Paused** | Temporarily set down, history kept, no pressure | Identity (dimmed) |

**"Drawn to" is anti-limerence by design.** It is *not* a wishlist of what you lack. When you notice a quality you're drawn to, Compass reframes it (*“this is a seed already in you”*) and offers only two doors: **practise it now** or **let it rest**. Hard cap of 3 so it can never become a rumination shelf.

**Coaching = curated choice.** Libraries are opinionated and *capped* (see limits). You can always **+ Add custom**, but the app keeps focus narrow — you can only deliberately grow a few things at once, and that's healthy.

### 0.1 Earning is self-claimed, never app-awarded (see §4 of principles)
A practice/Path completing does **not** auto-earn a quality. Compass asks: **“Does this feel like you now?”**
- **Yes, part of me** → becomes Integrated (permanent).
- **Not yet — still growing** → *no loss, no penalty.* “Good — honesty is the practice.” Keeps quietly going and **eases** tracking pressure; optional one-liner: “what will it look like when it's true?”
- **I'm not sure** → extends the observation window; leans to your pace.

### 0.2 A quality can grow with or without a Path
Forming a quality may sit behind a **Path** (a full journey with camps) **or** just a **gentle daily cue**. Not everything needs a journey.

### 0.3 The hierarchy & the one-home rule (the untangle)
Everything in the You universe fits **one** hierarchy — one concept, one home:

```
Tools  →  Journeys  →  Qualities  →  Identity
(atoms)   (the work)   (who you       (who you
                        become)         are)
```
- **Tools** = atomic skills/practices (breathing, NVC, self-compassion). They are *used by* journeys — never a journey themselves.
- **Journeys** = the only "paths." Two kinds: **Foundations** (the floor, tiered) and **Growth paths** (chosen, grouped by domain). Each grows one or more **Qualities**.
- **Qualities** = the character outcome a journey builds.
- **Identity** = where earned qualities + integrated tools + the durable self live.

**The four tabs = four verbs:**

| Tab | Verb | Question | Owns |
|---|---|---|---|
| **Paths** | Doing | What am I walking? | Journeys (Foundations + Growth) — only interactive journey home |
| **Identity** | Being | Who am I? | Values · Qualities (mirror) · integrated Tools · skills · education · people |
| **Discover** | Reflecting | What am I learning? | Check-ins · AI patterns · deep question · stable self-knowledge |
| **Progress** | Measuring | How's it going? | Charts · streaks · goals — data only |

**One-home ownership (lives in / appears read-only in):**

| Concept | Lives in | Appears (read-only) in |
|---|---|---|
| Journeys · Foundations · Growth paths | **Paths** | Progress (momentum), Today (anchor) |
| Qualities — forming | **Identity** (mirror of Paths) | Paths (what a path builds) |
| Qualities — earned | **Identity** (permanent) | Progress |
| Values · skills · education · people | **Identity** | — |
| Tools — full library | reference sheet | opened from Identity / Paths / Foundations |
| Tools — integrating / integrated | **Identity** (capabilities) | Today (if it has a daily cue) |
| Reflection · patterns · check-ins | **Discover** | — |
| Numbers · charts · streaks · goals | **Progress** | — |

**De-dup rule:** a concept that reads like several things lives **once**. Boundaries = a *Tool* (taught inside the Communicate foundation); Grief = the *Handle-hard-things* foundation journey; Stillness = a *Quality* grown by an Inner growth path. Each is surfaced elsewhere read-only, never duplicated.

---

## 1. Shared interaction conventions

These apply across all four tabs so behaviour is consistent.

### 1.1 The "Show all / Add more" picker
Any `+ Add` or `Show all` opens a **library sheet** (bottom sheet on phone):
- Items **grouped by family**, with a **search** field at top.
- Each row: name + one-line definition; tap the row → expands the full definition, "shows up as", and practices.
- Primary action per row: **Add** (→ your set). If already added: **Added ✓** (tap to remove).
- Sheet header shows your **current count vs. limit** (e.g. "Forming 2 / 3").
- Closing: swipe down, tap outside, or **Done**.

### 1.2 The active-focus budget (the anti-overwhelm rule)
The real constraint isn't how many things you've *chosen* — it's **how many daily practices land on Today.** Foundations, Growth paths, quality cues and tools all create daily cues, so they **share one budget**, never separate stacking caps.

**Active focus = 3 daily touchpoints max — ideally 1 primary + 2 light.**
- **Primary** (1): the journey you're really walking — a Foundation *or* a Growth path — with its anchor habit.
- **Light** (≤ 2): small supporting cues — a quality practice or a foundation habit.
- "Active" = shows a cue on **Today**. Everything else (Drawn-to / Saved / Paused / Not-started) shows **nothing** on Today.
- Adding a 4th doesn't block — Compass asks with care: *“Your hands are full. Want to let something settle or finish first?”* → **Pause** · **Complete** · or swap.
- Pacing (Middle Way, principles §11): favour **one primary at a time**, deepened to a *steadier* self-claimed point before adding another. Adding sooner is allowed but meets a gentle reflective pause, never a wall.

**Other (non-daily) caps stay — these don't touch Today:**
| Set | Limit | Why |
|---|---|---|
| Core **Values** | 7 | Values are few by definition |
| **Drawn to** (seeds) | 3 | Not a wishlist — anti-rumination/limerence |
| **Energy: gives / drains** | 8 each | Sharp self-knowledge, not a dump |
| **Skills / People / Education** | soft (≤ 12) | Reference lists, not focus lists |

> Supersedes the old per-type caps (Active Paths 3 / Qualities forming 3 / Tools 3) — those **stacked to 9 daily cues**, which is exactly the overwhelm we're avoiding.

### 1.3 Delete / remove behaviour (universal rules)
| Item type | On delete |
|---|---|
| **No history** (just added, never practised) | Remove immediately, no confirm |
| **Has history** (practising, has progress) | Confirm sheet → **Pause** (keep history, dim) · **Archive** (hide, keep data) · **Delete** (destroys history — red, requires hold-to-confirm) |
| **Integrated / Earned** | **Cannot be deleted** (it's part of you). Can **Hide** from the active portrait only |
| **Active Path** | "Abandon path?" → warns streak + camp progress is lost; offers **Pause** instead |
| **Completed Path** | Cannot delete — it has become an Earned quality |

### 1.4 Lens header (every You screen)
Read-only orientation: icon badge + tab name + purpose line. **Not** interactive.

---

## 2. PATHS  (`plan-trails.html`) — "What am I walking?"

The **only** interactive home for paths, camps, and anchor habits.

### 2.1 Element interaction spec
| Element | On click | Opens / goes to | Shows | Limit | On delete |
|---|---|---|---|---|---|
| Lens header | — | — | "Paths · journeys you're walking now" | — | — |
| Section "Active paths · N of M" | — | — | count of active vs allowed | max **3** active | — |
| **Active path card** (body) | Opens **Path detail sheet** | sheet slides up | full path: virtue, camps timeline, effort, anchor habit, CTA | — | via detail → Abandon (§1.3) |
| Anchor-habit **checkbox** (on card) | Toggles today's anchor done/undone | inline, no nav | ✓ state + "done today/tap when done" | 1 anchor per path | — |
| **Earned** chips | Tap → quality detail | Identity → that quality | name + weeks | — | cannot delete (permanent) |
| Section "Available paths" | — | — | browsable library (curated) | — | — |
| **Available path card** | Opens **Path detail sheet** (preview mode) | sheet | what it works on, duration, camps, "Start path" | — | — |
| Locked path (🔒) | Tap → explains unlock condition | toast/sheet | "Unlocks after Boundaries" | — | — |
| **Show all paths** (add) | Opens **Paths library** picker | library sheet | all paths grouped by family (§5.3) | start respects max 3 | — |
| Detail sheet → **Start path** | Activates path | back to Active list; path appears; Today gets anchor | confirmation + first camp | if at 3 active → "Replace…" | — |
| Detail sheet → **View today's anchor** | Jumps to Today | Today screen, anchor highlighted | — | — | — |
| Camp **completion celebration** | Appears on camp finish | full-screen overlay | camp message + quote + "Continue to Camp N" | — | dismiss only |
| Path **complete** (final camp) | Path retires → becomes Earned quality | moves to Earned shelf + Identity | "X is now part of you" | — | n/a (permanent) |

### 2.2 Path detail sheet — contents
1. **Hero**: type (Inner / Material / Relational / Craft / Spirit), name, the virtue statement, value tags.
2. **Effort**: duration, days/week, anchor habit, est. minutes/day (4-col grid).
3. **What this path works on**: 1–3 qualities it grows (links to Qualities library).
4. **How it unfolds**: 3 camps, each with a name, days, and the shift it produces.
5. **CTA**: `Start path` (or `View today's anchor` if active) + secondary `Drawn to` (save the quality it grows as a seed, ≤ 3).

---

## 3. IDENTITY  (`you-identity.html`) — "Who am I?"

Read-only **portrait** + the two growable cores (Qualities, Emotional maturity). No charts, no daily checkboxes.

### 3.1 Element interaction spec
| Element | On click | Opens / goes to | Shows | Limit | On delete |
|---|---|---|---|---|---|
| Portrait masthead | Tap → edit identity line / avatar | edit sheet | name, identity line, "weeks with Compass" | identity line ≤ 60 chars | — |
| **Values** section header `Manage` | Opens **Values library** picker | library sheet | all values grouped (§5.1) | max **7** | per §1.3 (no history → instant) |
| Value chip | Tap → definition popover | popover | value name + meaning | — | long-press → remove |
| Values `+ add` | Opens Values library | library sheet | grouped + search + custom | max 7 → else Replace | — |
| **Qualities** — Earned row | Tap → quality detail | detail sheet | definition, weeks, the path that earned it | — | cannot delete (Hide only) |
| Qualities — **Forming row** | Tap → quality detail (practising) | detail sheet | definition, practice cue, meter, source Path | max **3** forming | Pause / Abandon (keeps or drops via §1.3) |
| Forming row **meter** | — (display) | — | integration % | — | — |
| `Qualities forming now` + add | Opens **Qualities library** picker | library sheet | all qualities by family (§5.2) | max 3 forming → Replace | — |
| **Emotional maturity** stats band | — (display) | — | tools / integrated / in-progress counts | — | — |
| **Tool row** (e.g. Self-parenting) | Tap → tool detail | detail sheet | what it is, why, the practice steps, meter | practising max **3** | Pause / Archive / Delete (§1.3) |
| Tool **badge** | — (display) | — | Integrating / Integrated / Paused | — | — |
| `Add a tool to practise` | Opens **Tools library** picker | library sheet | all tools grouped (§5.4) | practising max 3 → Replace | — |
| **Emotion families** chip | Tap → that family's emotion list | emotions sheet | all emotions in family + definitions (§5.5) | — | — |
| `Explore wheel` | Opens **emotion wheel** | full sheet | interactive wheel, core → nuanced | — | — |
| **Skills** chip / `+ add` | add → Skills library | library sheet | grouped skill suggestions + custom | soft ≤ 12 | long-press remove |
| **Education** row / `+ Add` | add → form | form sheet | qualification, institution, year | — | swipe → delete (confirm) |
| **People** chip / `+ add` | add → person form | form sheet | name, role (from roles list), optional note | soft | long-press remove (confirm) |

### 3.2 Quality detail sheet — contents
1. **Name + state** (Drawn to / Practising / Integrated).
2. **Definition** (one rich sentence).
3. **Shows up as** — 3–4 observable behaviours.
4. **The longing it resolves** — the shadow note ("resolves feeling shallow/performative").
5. **Practices** — 2–3 concrete ways to grow it (these can become a Path's camps or a daily cue).
6. **Source** — which Path develops it (if any) + integration meter.
7. **CTA**: `Start practising` (→ Forming; with a Path *or* just a daily cue) · `Drawn to` (save as a seed, ≤ 3) · for Integrated: read-only.
8. **Exemplars (optional, off by default — see §6):** archetype/character models, never a real fixation object.

---

## 4. DISCOVER  (`you-discover.html`) — "What am I learning?"

Subjective reflection + the **only** home of AI interpretation.

### 4.1 Element interaction spec
| Element | On click | Opens / goes to | Shows | Limit | On delete |
|---|---|---|---|---|---|
| **Weekly check-in** invite → `Begin` | Starts 3-question flow | inline state change | progress bar, question, textarea | 3 questions fixed | — |
| Question `Next / Finish` | Advances / completes | inline → Done state | summary of answers | each answer free text | — |
| `skip` | Skips a question | inline | "—" recorded | — | — |
| Completed check-in (Done card) | Tap → full reflection | reflection detail | all answers, date | — | from detail: Delete (confirm) |
| **AI pattern** "What Compass is noticing" | — (display) | — | the pattern + dot viz + source | one surfaced at a time | dismiss = "Doesn't seem right" |
| `This resonates` | Confirms pattern | inline; feeds model | marks resonance | — | — |
| `Doesn't seem right` | Dismisses pattern | inline; next pattern queued | — | — | removes from view |
| **This month's question** textarea | Type → autosaves draft | inline | the question + your answer | 1 question / month | clearing text = no entry |
| `Save` | Saves the month's answer | inline; into self-portrait history | confirmation | — | editable until month ends |
| **Energy: gives** chip / `+ add` | add → Energy library | library sheet | curated energisers + custom (§5.6) | max **8** | long-press remove |
| **Energy: drains** chip / `+ add` | add → Energy library | library sheet | curated drains + custom (§5.6) | max **8** | long-press remove |
| `Progress →` link | Jumps to Progress | Progress tab | — | — | — |
| **Past check-in** row | Tap → full reflection | reflection detail | full answers + mood tag | — | from detail: Delete (confirm) |

---

## 5. PROGRESS  (`you-progress.html`) — "What do the numbers say?"

Data only. No AI narrative (that's Discover). No editing (it reflects logged data).

### 5.1 Element interaction spec
| Element | On click | Opens / goes to | Shows | Limit | On delete |
|---|---|---|---|---|---|
| **Period tabs** (Week/Month/3M) | Switches range | re-renders all data | selected range | 3 fixed | — |
| Hero stat tile | Tap → that metric's detail | metric detail/section scroll | value + trend | — | — |
| **Sleep** Hours/Times toggle | Swaps chart view | inline | bar chart ↔ timeline | — | — |
| Sleep chart bar/row | Tap → that night's log | Log → Sleep entry (read) | that night's detail | — | edit lives in Log |
| **Mood & energy** cards | Tap → trend detail | metric detail | score, 7-day dots, trend | — | — |
| **Energy pattern** category card | Tap → category detail | category breakdown | logs, drivers, history | — | — |
| `By the numbers` callout | — (display) | — | factual weekly stats | — | — |
| **Habit streak** row | Tap → habit detail | Log → that habit | streak, 7-day dots | — | manage in Log |
| **Paths momentum** `Open Paths →` | Jumps to Paths | Paths tab | — | — | — |
| Path chip | Tap → path detail | Paths → detail sheet | — | — | — |
| **Material goal** card | Tap → goal detail | goal detail / Plan | progress, source, history | — | edit in Plan |
| `Want to know what this means? →` | Jumps to Discover | Discover tab | — | — | — |

> Nothing on Progress is deleted here — it's a mirror. Edits/deletes happen at the source (Log, Plan, Paths).

---

# CONTENT LIBRARIES (the full curated lists)

Curated & opinionated. Each set is capped (§1.2); `+ Add custom` always available.

## 5.1 Values library  (pick ≤ 7)
Grouped; ~30 options.

- **Integrity & truth:** Honesty · Integrity · Courage · Justice · Accountability
- **Connection:** Love · Loyalty · Kindness · Belonging · Family · Service
- **Growth:** Curiosity · Mastery · Wisdom · Discipline · Resilience
- **Freedom & agency:** Freedom · Autonomy · Adventure · Simplicity
- **Inner life:** Presence · Stillness · Faith · Meaning · Self-respect
- **Creation:** Craft · Beauty · Creativity · Excellence
- **Stability:** Security · Health · Order · Stewardship

## 5.2 Qualities library  (forming ≤ 3) — the heart of the app
The character qualities you admire and want to embody. Each: **definition · shows up as · practise · resolves the longing for**. ~34 across 6 families.

### Family — Depth & Presence
- **Depth** — substance over surface; able to dwell with feeling, complexity and meaning. *Shows up as:* real questions, comfortable silences, unafraid of hard topics. *Practise:* one deep question/day; read slowly; resist the quick take. *Resolves:* feeling shallow or performative.
- **Presence** — fully here, not half-elsewhere. *Shows up as:* undivided attention, no phone in conversation. *Practise:* single-task; 3 conscious breaths before entering a room. *Resolves:* feeling scattered / absent from your own life.
- **Stillness** — pausing before reacting; the gap between stimulus and response is yours. *Practise:* 5-min silent sit; name the urge before acting. *Resolves:* reactivity, regret.
- **Groundedness** — rooted, hard to knock over. *Practise:* feet-on-floor body check; return to values under pressure. *Resolves:* being easily destabilised.
- **Equanimity** — steady through highs and lows. *Practise:* "this too will pass"; non-attachment to outcome. *Resolves:* emotional whiplash.
- **Self-possession** — belongs to themselves; not swayed by approval. *Practise:* act before seeking validation; sit with disapproval. *Resolves:* people-pleasing, looking for permission.

### Family — Strength & Authority
- **Quiet authority** — commands respect without raising the voice. *Shows up as:* speaks less, lands more; calm in conflict. *Practise:* slow down speech; state, don't justify. *Resolves:* feeling unseen / needing to prove.
- **Safe (non-aggressive) strength** — powerful *and* gentle; presence that makes others feel safe, not threatened. *Shows up as:* protective not domineering; strength in service of others. *Practise:* soften the body while holding the line; power *with*, not *over*. *Resolves:* fear of your own force, or its misuse.
- **Courage** — acts in spite of fear. *Practise:* one uncomfortable true thing/day. *Resolves:* avoidance, self-betrayal.
- **Composure** — calm under pressure. *Practise:* slow exhale before responding; name the stakes honestly. *Resolves:* panic, flooding.
- **Integrity** — whole; word matches action. *Practise:* keep small promises to yourself first. *Resolves:* self-distrust.
- **Decisiveness** — chooses and commits. *Practise:* 70%-info rule; set a decision deadline. *Resolves:* chronic indecision.
- **Boundaried** — a clear yes and a clean no. *Practise:* "no" without a paragraph of excuse. *Resolves:* over-giving, resentment. *(See tool: Boundaries.)*

### Family — Warmth & Relation
- **Warmth** — makes others feel safe and seen. *Practise:* genuine interest; remember small details. *Resolves:* feeling cold/distant.
- **Tenderness** — gentle with what's fragile. *Practise:* soften toward error — others' and yours. *Resolves:* harshness.
- **Generosity** — gives freely, without scorekeeping. *Practise:* give one thing daily expecting nothing. *Resolves:* scarcity, grasping.
- **Attunement** — reads and meets others' states. *Practise:* name what the other might feel before replying. *Resolves:* missing people.
- **Playfulness** — lightness, ease, fun. *Practise:* one un-serious moment/day; follow delight. *Resolves:* over-seriousness, rigidity.
- **Hospitality** — creates belonging. *Practise:* make one person feel welcome today. *Resolves:* loneliness, exclusion.
- **Loyalty** — stays. *Practise:* show up for someone when it's inconvenient. *Resolves:* fear of being left / leaving.

### Family — Mind & Wit
- **Dry wit** — understated, intelligent humour. *Shows up as:* the well-timed light line; never cruel. *Practise:* observe absurdity; under-state, don't over-explain. *Resolves:* taking yourself too seriously.
- **Curiosity** — genuine interest in the world and people. *Practise:* ask one more question before concluding. *Resolves:* boredom, judgement.
- **Discernment** — good judgement; sees clearly. *Practise:* separate fact / story / feeling. *Resolves:* being fooled, naïveté.
- **Eloquence** — says it well, plainly. *Practise:* cut every third word; one clear sentence. *Resolves:* feeling inarticulate.
- **Intellectual humility** — holds views lightly; can be wrong. *Practise:* "what would change my mind?" *Resolves:* defensiveness.

### Family — Beauty & Craft
- **Aesthetic sensibility** — an eye for beauty; notices and makes things lovely. *Practise:* photograph one beautiful thing/day; arrange a space with care. *Resolves:* numbness, drabness.
- **Taste** — a refined sense of quality. *Practise:* study what's excellent; choose fewer, better things. *Resolves:* feeling unrefined.
- **Craftsmanship** — does things well, with care, to the last detail. *Practise:* finish one thing properly today. *Resolves:* sloppiness, half-doneness.
- **Creativity** — makes new things. *Practise:* make something small daily; ship before ready. *Resolves:* feeling barren / blocked.
- **Reverence for art** — moved by, devoted to beauty. *Practise:* sit with one artwork/piece of music weekly, undistracted. *Resolves:* disenchantment.

### Family — Spirit & Discovery
- **Spirit of discovery** — adventure; goes toward the unknown. *Practise:* one new thing/route/idea weekly. *Resolves:* stuckness, smallness.
- **Wonder** — awe; childlike openness. *Practise:* look up; let yourself be amazed. *Resolves:* cynicism.
- **Devotion** — gives self to something larger. *Practise:* a daily act for your "why". *Resolves:* aimlessness.
- **Faith / trust in life** — trust in a larger order. *Practise:* surrender one outcome you can't control. *Resolves:* anxiety, over-control.
- **Wholeheartedness** — all-in; not hedged. *Practise:* commit fully to one thing today. *Resolves:* half-living, self-protection.
- **Reverence** — treats life as sacred. *Practise:* one ritual of gratitude/respect daily. *Resolves:* taking things for granted.

## 5.3 Paths library  (active ≤ 3)
Each path **grows 1–3 Qualities** and runs ~3 camps. Curated ~14.

- **Inner / Presence:** The Stillness Path · The Noticing Path · The Presence Path · The Equanimity Path
- **Healing:** The Boundaries Path · The Restoration Path · The Grief Path · The Self-Worth Path
- **Strength:** The Courage Path · The Quiet Authority Path · The Safe-Strength Path
- **Relational:** The Warmth Path · The Attunement Path
- **Craft / Spirit:** The Craft Path · The Beauty Path · The Discovery Path

*(Each entry in the real library carries: type, duration, anchor habit, camps, the qualities it builds, unlock condition.)*

## 5.4 Emotional maturity tools library  (practising ≤ 3)
Adult inner tools. Each: what it is · why · practice steps · integration meter. ~16.

- **Awareness:** Emotion vocabulary · Naming feelings · Trigger mapping · Self-witnessing
- **Self-relationship:** Self-parenting · Reparenting the inner child · Self-compassion · Inner-critic work
- **Regulation:** Nervous-system regulation (box breathing, grounding, orienting, cold water) · Distress tolerance · Window of tolerance
- **Relational:** Nonviolent Communication (observe · feel · need · request) · Boundaries · Repair after rupture · Active listening
- **Depth:** Trauma processing · IFS (parts work) · Shadow work

## 5.5 Emotions library  (reference; ~80 across 8 families)
For the vocabulary tool + emotion wheel. Families → sample members:

- **Joy:** happy, content, delighted, proud, grateful, hopeful, playful, serene, elated, amused, inspired
- **Sadness:** down, lonely, grief, disappointed, hurt, melancholy, despair, wistful, heavy
- **Anger:** annoyed, frustrated, resentful, indignant, irritated, furious, contempt, bitter
- **Fear:** anxious, nervous, worried, overwhelmed, insecure, dread, panic, scared, vulnerable
- **Love:** affection, tenderness, longing, compassion, warmth, desire, devotion
- **Shame:** embarrassed, guilty, inadequate, exposed, self-conscious, humiliated
- **Surprise:** startled, amazed, confused, curious, shocked
- **Disgust:** averse, repulsed, disapproval, judgmental, uncomfortable

*(Real wheel: 8 cores → ~3 nuance rings each. "Recognised" count tracks how many you've correctly identified over time.)*

## 5.6 Energy library  (gives ≤ 8 · drains ≤ 8)
Curated suggestions; custom add.

- **Gives:** good sleep · morning walk · sunlight · deep work · nature · real connection · creative flow · movement · stillness · learning · music · cold water · hydration · purposeful work
- **Drains:** rushed mornings · long meetings · context switching · social media · open-ended days · too many decisions · conflict · people-pleasing · poor sleep · clutter · doom-scrolling · saying yes when you mean no

## 5.7 Small reference lists
- **Skill categories:** Craft/trade · Creative · Technical · Physical · Communication · Domestic · Intellectual
- **Education types:** Degree · Diploma · Certification · Course · Apprenticeship · Self-taught
- **Relationship roles:** partner · parent · child · sibling · close friend · mentor · chosen family
- **Mood scale:** 1–10 with emoji anchors (low → great)
- **Energy scale:** Drained · Low · Okay · Good · Charged

---

## 6. Resolved design decisions (were open questions)

1. **Earned qualities → self-claimed.** A Path/practice completing does *not* auto-earn. Compass asks *“Does this feel like you now?”* with gentle handling of **No / Not sure** (see §0.1). Self-honesty > badges.
2. **“Admired” → renamed “Drawn to”, capped at 3, anti-limerence.** Not a hoardable wishlist of lack; reframed as *seeds already in you*; only two doors (practise now / let it rest). (Principles §1.4, §2.5.)
3. **Quality ↔ Path decoupled.** A forming quality may sit behind a Path *or* just a daily cue.
4. **Exemplars — cautious yes, guarded.** OFF by default. When on, default to **archetypes/characters** (“the quiet mentor”, “the wise elder”), not real people. If a real person is ever noted, the app reframes to the mirror (*“what moves you in them is proof of it in you”*) and **never** toward proximity-seeking, comparison, or “become like them.” Exemplars point back to the self, never toward another person — this protects limerence-prone and comparison-prone users.

## 7. Still to decide (later)
- ~~Where **Foundations** live in the IA~~ → **resolved** in [`spec-foundations.md`](spec-foundations.md): their own gentle home (not a 5th lens), reachable from Paths + onboarding; Foundation journeys reuse the Path machinery.
- Whether the **emotion wheel** is its own screen or a sheet.
- Gentle **crisis-signal** copy + which resources to surface per region.
