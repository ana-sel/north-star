# Compass — V4 Design (World Tab + Cartographer + Full Pattern Library)

> **Builds on:** [v3-plan.md](v3-plan.md)
> **Scope:** Dedicated World tab · Chat becomes Cartographer's journal · full scene library · mature pattern detection · world personalisation.

---

## 0. What V4 adds

| Feature | Detail |
|---|---|
| **World tab** | Dedicated screen — the full living landscape, navigable |
| **Chat → Cartographer's journal** | Reflection space; Cartographer writes, user responds |
| **Full scene library** | All 14+ cross-pillar discovery scenes available |
| **Contribution mature** | Nourishing/draining ratio tracked over time; Cartographer can distinguish |
| **World personalisation** | Character naming; world season; personal visual choices |
| **Pattern maturity** | All cross-pillar dependencies detectable with confirmed confidence |

Final tab structure: **Chat · Today · Plan · Track · World**

---

## 1. The World system — complete architecture

### Two parallel layers

| Layer | What it is | Where it lives |
|---|---|---|
| **Data layer** | Raw logs, times, notes, scores | Track / Plan / History screens |
| **World layer** | Visual expression of confirmed patterns | World tab + scene cards in Today |

The world layer **never invents**. It only reflects what the data layer has confirmed.

---

### The 4 energy types

Energy is the invisible interpretation engine — not a tab, not a view. The Track tab stays as Sleep / Habits / Body / Money. Energy reads all of them and translates into world state.

| Energy type | What it measures | Primary app sources | World expression |
|---|---|---|---|
| **Physical** | Body power, sleep, recovery, movement | Track → Sleep, Track → Body | Cottage light, road firmness, weather clarity |
| **Mental** | Focus, decisions, cognitive load, open loops | Track → Habits, Plan open tasks | Library lamps, map clarity, fog density |
| **Emotional** | Mood, patience, warmth, relational quality | Mood scores, Family logs | Hearth brightness, river flow, garden colour |
| **Spiritual** | Purpose, meaning, alignment, service | Contribution logs, Inner reflection | Stars, lighthouse visibility, horizon clarity |

**Hierarchy:** Physical is the ground. Without it, the other three become fragile. The app will not surface spiritual observations when physical energy is critically low.

---

### The 7 world regions

| Pillar | Region | Visual elements | Fed by |
|---|---|---|---|
| Health / Body | Moonlit cottage, garden, well, path | Cottage light, garden bloom, well water level | Sleep + Body |
| Inner / Mind | Still grove, small lake, quiet room | Water disturbance, leaf stillness, light quality | Mood, reflection |
| Money / Capital | Quiet market, treasury, stone bridge | Market activity, bridge open/closed, treasury lamp | Money logs, plan goals |
| Family | Hearth house, long table, lantern path | Hearth warmth, lanterns lit, path visibility | Family quality logs |
| Joy / Beauty | River, open water, mountain path | River flow, path openness, light on water | Joy events, beauty |
| Contribution | Town square, workshop, bridge to others | Square presence, bridge strength, workshop light | Contribution logs + signal |
| Plan / Navigation | Lighthouse, map room, compass tower, roads | Lighthouse visibility, road condition, map clarity | Open loops, goals |

---

### Energy as world atmosphere

The world never shows numbers. It shows state.

| Energy state | World condition |
|---|---|
| Physical high | Clear sky, firm road, cottage warmly lit |
| Physical low | Heavy weather, soft ground, dim cottage |
| Mental high | Map clear, lighthouse visible, library bright |
| Mental low | Fog near library, map obscured, unclear roads |
| Emotional high | Hearth warm, river flowing, garden in colour |
| Emotional low | Hearth dim, river still, garden grey |
| Spiritual high | Stars visible, horizon open, lighthouse beam reaches far |
| Spiritual low | Overcast, horizon hidden, lighthouse dim |

---

### Observation system — per tracking area

Every area has its own quiet observation line. Sleep has had this since V1. The same pattern extends to all areas.

| Area | Example observation | Cross-pillar signal |
|---|---|---|
| Sleep | *"bedtime shifted · shorter night"* | Physical energy level, impulse control |
| Body | *"lower movement · tension noted"* | Physical recovery, mental reset capacity |
| Habits | *"food planned · decision load lighter"* | Mental energy, impulse signal |
| Money | *"purchase deferred · unclear day"* | Emotional + mental energy state |
| Plan | *"three threads unresolved this week"* | Mental load, sleep interference risk |
| Inner | *"quieter than the previous week"* | Emotional energy, family quality signal |
| Family | *"the hearth was easier to sit beside"* | Emotional energy restoration |
| Joy | *"something entered the day before evening"* | Emotional recharge, mental fog reduction |
| Contribution | *"the traveller stayed only as long as the light remained"* | Spiritual energy, emotional signal |

---

### Scene discovery — confidence thresholds

Scenes are earned by data, not scheduled.

| Scene type | Trigger | Cartographer tone |
|---|---|---|
| Single-area observation | 3+ logs in one area show a direction | Tentative — soft, open language |
| Single-area pattern | 7+ logs confirm consistent signal | Observational — stated as world fact |
| Cross-pillar correlation | 2 areas both logged ≥5 times, pattern detectable | Named — connection shown |
| Cross-pillar confirmation | 10+ logs per area, holds over 2+ weeks | Confirmed — written in the map margin |

**Delivery rules:**
- Maximum **one scene per 48 hours**
- Scenes queue — they never expire, arrive one at a time
- No scene on day 1
- One button only: "Continue" or "Return"

---

### Cross-pillar dependency web

The app detects these from real data — never assumes them in advance.

| Cause | Effect | Detectable after |
|---|---|---|
| Sleep duration low | Money impulse signals increase | 5 sleep + 3 money logs |
| Sleep consistent | Plan execution rate improves | 7 sleep + plan activity |
| Sleep low | Habit completion drops | 5 sleep + habit logs |
| Sleep low | Family / emotional quality drops | 5 sleep + mood notes |
| Body movement logged | Sleep onset improves | 5 body + 7 sleep logs |
| Body movement logged | Mental fog reduces next day | 5 body + habit / plan logs |
| Habits complete (food) | Money impulse reduces | 7 habit + 5 money logs |
| Open plan loops | Sleep quality drops (rumination) | 5 open-loop weeks + sleep |
| Money unresolved | Plan blocked / stalled | Plan + money logs |
| Money unresolved | Sleep disrupted (financial anxiety) | 5 money concern + sleep |
| Inner reflection logged | Plan decisions improve | 5 inner + plan logs |
| Family draining | Emotional energy depletes | 5 family quality logs |
| Family draining | Sleep disrupted (unresolved conflict) | Family + sleep logs |
| Joy event logged | Mental fog reduces next day | 3 joy + habit / plan logs |
| Contribution (nourishing) | Spiritual / purpose signal rises | 5 contribution + inner logs |
| Contribution (draining) | Emotional depletion visible | 5 contribution logs with signal |

---

### The contribution detection problem

Nourishing giving and obligation giving look identical from outside. After every contribution log, one question: *"Did that restore you or cost you?"* (two taps, no text). The Cartographer tracks the ratio over time and can then distinguish the two.

---

### Hard rules — the World must never break these

| Rule | Reason |
|---|---|
| World never fills faster than data confirms | Trust — the user knows what they logged |
| No scene on day 1 | Earned, not given |
| No cross-pillar scene without both streams logged | Never invent a connection the data doesn't confirm |
| Unmapped regions stay visibly empty | Honest emptiness creates pull — user wants to map more |
| Patterns disappear if data stops | The world reflects now, not past glory |
| One scene per 48 hours maximum | Scarcity preserves meaning |
| Contribution always asks nourishing/draining | The only area where the signal can silently invert |

---

## 2. The Cartographer

**Who:** A small, precise figure with a coat and a notebook. Always looking at something — never at the user. A Cartographer makes maps. The user's life is the territory. The app draws the map as they live.

**Role:** *"I found this in your world. Look."* — never *"Here is what you should do."*

### When it appears
- A scene has generated (data threshold met)
- A cross-pillar pattern has confirmed
- A region has grown or changed significantly

### When it stays silent
- Fewer than 3 logs in any area
- Data insufficient to confirm a pattern
- A scene was already shown within 48 hours

### Voice rules

Past tense. Third-person about the world. Maximum 2 sentences. Never "you."

| ✓ Correct | ✗ Never |
|---|---|
| *"The cottage was warmer after the third steady night."* | *"You slept better — great progress!"* |
| *"The market quieted. Nothing was decided from urgency."* | *"Your spending improved because of better sleep."* |
| *"The water in the grove was less disturbed than before."* | *"Try going to bed earlier tonight."* |
| *"The lighthouse was visible again. Not closer — just no longer hidden."* | *"You're on a 5-day streak!"* |

### What the Cartographer never does
- Says "you should"
- Cheers, congratulates, or scolds
- Shows percentage scores, streak counters, or reward badges
- Appears uninvited more than once per 48 hours
- Speaks when data is insufficient

---

## 3. World personalisation (V4)

- **Character name** — user can name the Cartographer (optional; defaults to no name)
- **World season** — user picks starting season; season shifts with real calendar
- **Landmark names** — user can name places in their world (the cottage, the market)
- None of these change the underlying pattern detection — personalisation is visual only

---

## 4. Build order for V4

1. World tab: full landscape SVG with all 7 regions navigable
2. Chat tab → Cartographer's journal: Cartographer writes, user can respond or just read
3. Full scene library: all 14+ cross-pillar scenes authored and tested
4. Contribution nourishing/draining: track ratio over time, Cartographer distinguishes
5. World personalisation: character naming, season, landmark names
6. Pattern maturity: review all confidence thresholds with real user data and calibrate
