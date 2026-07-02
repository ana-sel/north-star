# Compass — onboarding & first-run guidance spec

> How we teach a person to use Compass **without** turning the daily screens into a
> manual. Governed by [`spec-00-principles.md`](spec-00-principles.md) (esp. "needs
> Compass *less* over time", regulation before insight, no shame) and
> [`spec-today.md`](spec-today.md) (Today must stay calm — never pile on).
> Early-stage note: this is intentionally written now, before we build onboarding,
> so day-to-day screens stay clean and first-run learning has a home.

---

## 0. The core rule

**Permanent helper text is a smell.** If a screen needs a sentence explaining how to
use it *every day forever*, either the interface is unclear or the sentence is
onboarding in the wrong place. Explanation is a **first-run cost**, paid once, then
removed — not rent charged on every visit.

This is why the daily screens drop lines like *"tap a circle to tick it"* or
*"rotated from your pool, so it never turns into a grind."* Those teach a
**concept** or a **gesture** — both belong to onboarding, not the permanent UI.

---

## 1. Where guidance is allowed to live

Ordered from most to least preferred. Prefer the earliest that fits.

1. **Self-evident design** — a checkbox looks tappable; a dial looks draggable.
   The best explanation is none. Spend design effort here first.
2. **First-run coach marks** — a one-time, dismissible overlay the *first* time a
   person lands on a screen (Today, a ritual, the theme card, the sleep dial).
   Shown once, never again. Skippable. Stored per-screen as "seen".
3. **Empty / zero states** — when there's genuinely nothing yet (no rituals, no
   plan), the empty space itself carries a warm one-liner + a single next action.
   This disappears the moment real content exists.
4. **Progressive reveal inside a sheet** — a short subtitle *inside* an opened
   sheet (e.g. the quality picker's "pick any from your pool") is acceptable,
   because the sheet is an occasional, deliberate action — not the daily surface.
5. **A quiet "?" / help affordance** — for the rare deep explanation, tuck it
   behind an icon. Never auto-expanded.

> The daily bands of Today (Arrival, Focus, Your Day, Signals) get **level 1 only**.
> Anything they'd want from levels 2–4 must be moved out.

---

## 2. First-session flow (draft — to refine)

The goal of session one is **regulation and orientation**, not feature tour.
A person should leave the first session feeling *"this is calm and mine"*, having
done exactly one small real thing.

1. **Welcome** — what Compass is *and is not* (mirror, not mould). One screen.
2. **A single real action** — log tonight's sleep, or name one quality they'd like
   to grow. Not a form marathon; one genuine touch.
3. **Set the tiny baseline** — help them pick 1–3 ritual habits (the repeating
   floor), framed as *"start absurdly small"*.
4. **Seed the pool** — pick 1–3 theme qualities. Explain rotation **once, here**:
   one per day, never two days running, so it never becomes a grind.
5. **Hand over the compass** — drop them on a calm Today with a first-run coach
   mark on the theme card and the ritual track. Then get out of the way.

Onboarding **defers** anything not needed to start (energy/mood in V2, planning in
V3). Never front-load future features.

---

## 3. Coach-mark inventory (what needs a first-run hint)

| Surface | One-time hint (concept or gesture) | Trigger |
|---|---|---|
| Theme card | "One quality a day, rotated from your pool — tap ✓ when practised, **Change** to swap." | first Today |
| Ritual track | "Tap a node to tick it, or open the ritual to run it in order." | first Today |
| Sleep dial | "Drag the moon & sun to set last night's sleep." | first sleep log |
| Change sheet | (already inline subtitle — no coach mark) | — |
| Pace selector | "Pick the shape of today — a hard day asks for less, not more." | first Today |

Each hint: shown once, dismissible, stored as seen, re-showable from Settings →
"Replay tips" (so a returning-after-months user can re-learn without shame).

---

## 4. Tone rules for any guidance copy
- Warm, plain, short. No exclamation marks, no cheerleading, no "pro tip".
- Teach the **why** once (rotation prevents grind), never nag it.
- Never imply the person is behind, slow, or doing it wrong.
- Prefer verbs the person does ("tap", "drag", "pick") over app-speak.

---

## 5. Open questions (revisit before build)
- Do coach marks live as a shared overlay component, or per-screen?
- Where is "seen" state stored — local only, or synced so a new device re-teaches?
- Does the first session gate the app, or can a person skip straight to Today?
- Minimum viable onboarding for the V1 (sleep-only) release vs. full flow later.
