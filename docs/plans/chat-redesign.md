# Chat redesign — Capture chamber + Safe Auto triage

**Status**: Slices 0–3 implemented and committed. Next up: Slice 4 (Diary + Lessons).
**Owner**: Ana (product), Copilot (implementation).
**Scope**: only the **Chat** tab and the data/auth plumbing it depends on. Other screens are out of scope for this plan.
**Source audit**: [../../audit/SUMMARY.md](../../audit/SUMMARY.md) — flagged DEV_USER_ID as P0, Chat as a basic MVP that doesn't yet feel safe or intelligent.

---

## How to read this file

The bulk of this document (Section B onward) is Ana's spec, pasted verbatim. Section A is the **implementation roadmap** — the short version of how Copilot (or another AI) should pick this up incrementally without breaking the running app.

When in doubt, the spec wins. The roadmap exists to make the spec landable in small, reviewable PRs.

---

## A. Implementation roadmap (Copilot's plan)

### Guardrails

- **Do not restart the app.** No `expo init`, no rewriting `App.tsx`, no replacing navigation.
- **Do not hide existing screens.** Other tabs (Today, Plan, Track, More) keep working unchanged.
- **Do not regress login.** Login + register + AuthContext + localStorage/SecureStore branch are already shipped and must keep working.
- **No automatic external AI calls** during this work. Local + approval-only.
- **Branching:** one PR per phase. Each PR must keep the app launchable.

### The seven slices

Each slice is a self-contained PR. Stop after each one for review before starting the next.

| #  | Slice                                  | Phase in spec | Why it's first / next                                                                                                           |
|----|----------------------------------------|---------------|---------------------------------------------------------------------------------------------------------------------------------|
| 0  | ~~**Pre-work: auth scope for Chat only**~~ ✅ | §13           | Spec is unsafe without it. Replace `DEV_USER_ID` with `useAuth().userId` in Chat + Capture API call, and reject the request server-side if the JWT user disagrees. Other 24 screens stay on DEV_USER_ID until later — that's a separate roadmap (see [audit/SUMMARY.md #1](../../audit/SUMMARY.md)). |
| 1  | ~~**Chat skeleton: Safe Auto + visible state lines**~~ ✅ | §1, §11, §16, "Final UX" | Rename the screen to **Capture** (header only — bottom tab still says "Chat"). New subtitle, three pills (Local / Mission filter / External AI), bigger multiline composer, primary button label is `Send`. Below the response: one-line interpretation `Treated as: … · Change`. **No new modes shown yet, no triage logic yet** — this is purely UI. |
| 2  | ~~**Triage classifier (server-side, deterministic first)**~~ ✅ | §2 (Modes), §"AI Triage" | Backend route that takes a message + minimal context and returns `{ kind: "talk" \| "sort" \| "diary" \| "decision" \| "log" \| "review", confidence, reason }`. v1 = rules-based (regex / keyword / structural cues). v2 (later) can swap to a local model. The UI just renders the interpretation line and three action chips. **No drafts created yet.** |
| 3  | ~~**Draft model + draft tray (Sort mode only)**~~ ✅ | §4, §5      | DB table `drafts` + endpoints. In Sort mode, the AI produces drafts; the tray collapses to "I found N items — Recommended sorting is ready" with `Accept / Review / Not now`. The bottom-sheet filter exists, pre-filled, with `Keep / Later / Archive insight / Delete`. Talk / Diary modes never auto-create drafts. |
| 4  | **Diary + Lessons (gentle)**             | §3, §6       | Diary mode saves to existing diary table only on explicit `Save as diary`. Add a `learning_events` table + `Save lesson` chip. No pattern claims. Sensitive-by-default. |
| 5  | **Decision workspace**                   | §9, §"Auto-action policy" | New `decisions` table + a minimal Decision-brief UI when triage classifies a message as high-impact money/property/health/legal/life. Never creates an action card. |
| 6  | **Pattern intelligence (read-only)**     | §7, §8       | Add a `life_events` timeline (write-only at first — populated by existing logs + new draft/lesson/decision events). One single hypothesis card (sleep → energy → completion) on Review mode. Confidence levels and `Yes / Maybe / No` confirm. Defer the big engine. |
| 7  | **Practice / qualities**                 | §10          | Optional. Lowest priority. Skip until the rest is solid. |

### Concrete first-slice deliverable (Slice 0 + Slice 1, as one tiny PR)

The smallest useful PR is **Slice 0 + Slice 1 combined**, because Slice 1 is meaningless without Slice 0 (you'd be capturing into the shared dev account).

Files touched:
- `backend/app/api/agents.py` — Capture endpoint reads user from JWT, ignores any `user_id` in the body. Returns 401 if no JWT.
- `mobile/src/api/agents.ts` (or wherever `captureThought` lives) — drop `user_id` from request body.
- `mobile/src/screens/ChatScreen.tsx` — header rename, subtitle, three pills, multiline composer (52→160 expanding), `Treated as:` line placeholder reading "Treated as: Talk · No drafts created" hardcoded for now (Slice 2 replaces with real triage).
- Tests: add `tests/test_capture_auth.py` covering "no JWT → 401", "JWT for user A → cannot write as user B".

Acceptance for the first PR:
- Logged-in user captures a thought → server records it on their real `auth.users` id, not `00000000…`.
- The Chat screen visually matches the layout in §11 of the spec, even though triage is still a placeholder string.
- All existing backend tests still pass. App still launches on web + Expo Go.

### What we explicitly defer

- Local-model triage (Slice 2 starts deterministic).
- Pattern engine math (Slice 6 ships only the timeline write path + one hand-built hypothesis).
- Practices/qualities (Slice 7).
- Migration of the other 24 screens off `DEV_USER_ID` — tracked separately in [audit/SUMMARY.md](../../audit/SUMMARY.md) as P0 #1.

### What's left to do (as of May 20, 2026)

- **Slice 4 — Diary + Lessons**: Diary mode saves to existing diary table on explicit `Save as diary`. New `learning_events` table + `Save lesson` chip. Sensitive-by-default.
- **Slice 5 — Decision workspace**: `decisions` table + Decision-brief UI for high-impact triage.
- **Slice 6 — Pattern intelligence**: `life_events` timeline + one hypothesis card (sleep → energy → completion).
- **Slice 7 — Practice / qualities**: Optional, lowest priority.
- **Polish**: Sort-mode AI bubble could say "Caught. I've drafted these from your list." instead of the generic line. Browser smoke-test the tray pills end-to-end once container is rebuilt with latest triage fix.

---

## B. Full spec (verbatim from Ana, May 19, 2026)

> The two blocks below are Ana's words. They are the source of truth. The roadmap above must serve them, not replace them.

### B.1 — Chat philosophy and UX (long-form)

My honest opinion: the Chat tab is conceptually correct, but it is **not yet at your level**. It currently feels like a simple input screen with an AI behind it. Your level should feel like a **private intelligent capture chamber**: calm, precise, protective, and quietly powerful.

The audit says the current Chat screen has a header, "Mission aligned" / "Local-first AI" badges, a single-line input, slash-command hint, and then a draft-card preview after the Capture Agent responds. That is a good MVP, but still basic. The Capture Agent already creates a draft card, and the intake filter already scores against the mission filter with decisions like keep / archive / delete, so the logic exists — it just needs to be presented with much more elegance and clarity.

#### What Chat should be

Not just:

```text
Chat with AI
```

But:

```text
Capture → Understand → Filter → Place
```

This tab should answer one question:

> "What is in my head, and where does it belong?"

So the screen should be renamed internally as:

```text
Chat / Capture
```

The bottom tab can still say **Chat**, but the screen title should feel more intentional:

```text
Capture
```

#### Current problem

The current screen has too much empty space and too little ritual.

It says:

```text
Capture thoughts, ask agents, create cards.
```

That is functional, but not emotionally strong.

Your version should say something like:

```text
Write anything. I will sort it before it becomes part of your system.
```

That one sentence matters. It tells the user:

```text
You can unload your mind safely.
Nothing becomes active without your approval.
The app will help you think.
```

That is much more your level.

#### Final Chat layout

I would make the Chat tab like this:

```text
Capture

Private · Local-first · Mission filter on

Write anything.
I will sort it before it becomes a card.

[ large input ]

Quick capture:
Thought · Task · Wish · Diary · Sleep · Expense

Recent drafts:
- Go to Japan with family
- Want a Ferrari
- Track sleep

Bottom composer:
What is on your mind?
```

#### The best Chat interaction

**Step 1 — User writes naturally**

```text
I want to go to Japan with my family. I also want a Ferrari. I need to track sleep.
```

User should not need to choose "task" or "wish" first. The app should understand.

**Step 2 — AI creates draft items, not active cards**

```text
I found 3 items.

1. Go to Japan with family
Likely genuine want · Family · Needs filter

2. Want a Ferrari
Possible status / ego impulse · Needs reflection

3. Track sleep
Habit candidate · Health & Energy
```

These are **drafts**. Not active cards yet.

**Step 3 — Tap draft → Filter sheet opens**

Bottom sheet, not a new screen.

```text
Intake Filter

Type:
Want / Need / Obligation / Impulse

Mission check:
Happiness
Freedom
Clarity
Self-refinement
Solitude
Meaning
Contribution

Decision:
Keep
Later
Archive insight
Delete
```

This is where your app becomes special.

#### Buttons

```text
What's on your mind?                         Sort
```

Quick chips (small and optional):

```text
Thought
Task
Wish
Diary
Sleep
Expense
```

#### After "Sort"

The AI response should not be long like ChatGPT. It should be structured:

```text
Captured

3 drafts created

[Draft card]
Japan with family
Genuine want · Family · Meaning
Button: Filter

[Draft card]
Ferrari
Possible fake want · Status / comparison
Button: Reflect

[Draft card]
Track sleep
Habit candidate · Health & Energy
Button: Add habit
```

#### The Chat tab should have 3 modes (subtle chips, not loud)

```text
Auto
Ask
Capture
Diary
```

But do not show all modes heavily. Use a small pill:

```text
Mode: Auto
```

The app can auto-switch based on content.

#### Visual changes for Chat

**Stronger top section**

```text
Capture

Private by default.
Nothing becomes active until you approve it.
```

Under that, small pills:

```text
Local-first
Mission filter on
External AI off
```

**The empty state should not be empty**

```text
Start with anything:

"I feel overwhelmed."
"I need to decide about land."
"I want to buy something."
"I slept badly."
"I want to plan Japan."
```

**The input should be multiline**

```text
Minimum height: 52
Expands up to 160
Then scrolls internally
```

**Draft cards need type colour (quiet, refined)**

```text
Wish        rose / gold
Task        blue
Habit       green
Diary       purple
Money       deep blue
Insight     soft brown
Fake want   muted red
```

**Use fewer emojis.** Your level is cleaner: `Private · Local · Mission · Draft · Filter`.

#### Filter sheet design

```text
Go to Japan with family

Detected type:
Genuine want

Mission alignment:
Happiness        strong
Family/meaning   strong
Freedom          neutral
Clarity          good

Suggested placement:
Life area: Family
Horizon: 2026
Board: Year
Status: This Year

Decision:
Keep
Later
Archive insight
Delete
```

For Ferrari:

```text
Want a Ferrari

Detected type:
Impulse / possible status want

Reflection:
Do I like speed?
Would this support freedom?
Do I want it because others have it?
Would this add pressure?

Suggested decision:
Archive as insight

Insight:
"I may want status objects when I feel comparison or pressure."
```

#### What not to do

- Do not make Chat a full Trello board.
- Do not put all filters permanently on the screen.
- Do not ask the user 10 questions before every card.
- Do not create active cards automatically.
- Do not make it look like a chatbot transcript only.

Chat should be fast:

```text
Write → Sort → Drafts → One-tap filter
```

#### Technical issue for Chat

Before using this with real private data, the Chat tab must stop using `DEV_USER_ID`. The audit says captured cards currently land on the shared dev account. Fix:

```text
Capture Agent request uses authenticated user
Draft cards belong to authenticated user
Backend derives user from JWT
No user_id accepted from frontend
```

#### Final Chat principle

```text
Everything can be captured.
Nothing becomes active without filtering.
Every fake want becomes insight.
Every real want finds its place.
```

---

### B.2 — Full technical spec (modes, drafts, lessons, decisions, patterns)

> Verbatim copy of the longer spec block intended for the coding AI.

#### 1. Core Philosophy

The Chat tab must **not** behave like a generic AI chat and must **not** turn every message into tasks.

```text
Talk when I need care.
Sort when I need structure.
Diary when I need reflection.
Decision when I need caution.
Log when I need data.
Review when I need patterns.
```

The most important rule:

```text
Feelings are cared for, not filtered.
Tasks/wishes are filtered.
Money/property/health decisions are slowed down.
Patterns are hypotheses, not judgments.
Lessons are learning events, not failures.
```

The app must never make the user feel judged, broken, lazy, or "not good enough."

#### 2. Main Chat Modes

```ts
type ChatMode =
  | "talk"
  | "sort"
  | "diary"
  | "decision"
  | "log"
  | "review";
```

**Talk** — default. Feelings, comfort, questions. No drafts auto-created. Button: `Reply`. After response, chips: `Save as diary`, `Create drafts`, `Save lesson`, `Create gentle practice`, `Analyse pattern`, `Just talk`.

**Sort** — brain dumps. Extract draft items (not active cards). Button: `Create drafts`.

**Diary** — sensitive/private. Save only if user chooses. Do not turn pain into tasks. Button: `Reflect`. Actions: `Save entry`, `Analyse gently`, `Create one grounding action`, `Do not save`.

**Decision** — money/property/health/legal/family/career/life direction. Decision brief, not an action. Button: `Analyse carefully`.

**Log** — quick data. Button: `Save log`.

**Review** — pattern analysis (hypotheses, not judgments). Button: `Find patterns`.

#### 3. Context Selector

```ts
type ChatContextScope =
  | "conversation_only"
  | "recent_state"
  | "diary_patterns"
  | "money_property"
  | "health_habits"
  | "full_pattern_history";
```

Display at top of Chat:

```text
Mode: Talk
Context: This conversation only
No drafts will be created unless you ask.
```

| Mode     | Default context                           |
| -------- | ----------------------------------------- |
| Talk     | conversation_only                         |
| Sort     | mission + life areas only                 |
| Diary    | current entry only                        |
| Decision | relevant domain only (e.g. money_property)|
| Log      | no deep context                           |
| Review   | selected pattern history                  |

For emotional messages, do **not** automatically use all personal history. Ask first.

#### 4. Drafts

Proposed structured items. **Not active cards.** AI may suggest drafts only when:

```text
1. User is in Sort mode;
2. User taps "Create drafts" after Talk/Diary;
3. User uses command like /sort;
4. App asks permission and user confirms.
```

```ts
type DraftType =
  | "task"
  | "goal"
  | "project"
  | "habit"
  | "diary_entry"
  | "decision"
  | "practice"
  | "insight"
  | "lesson"
  | "expense"
  | "pattern_signal"
  | "research";

type DraftState =
  | "new"
  | "needs_filter"
  | "needs_clarification"
  | "ready_to_place"
  | "converted_to_card"
  | "archived_insight"
  | "saved_lesson"
  | "deleted";
```

Each draft shows: title, type, category/life area, privacy, suggested destination, confidence/reason, primary action, secondary actions.

#### 5. Intake Filter

Bottom sheet (not full page). Opens on tap. Applies to tasks/goals/wishes/habits/projects/money decisions/commitments. **Does not apply to raw feelings.**

```ts
type IntakeType =
  | "want"
  | "need"
  | "obligation"
  | "impulse"
  | "someone_else_expectation"
  | "unclear";

type IntakeDecision =
  | "keep"
  | "later"
  | "archive_as_insight"
  | "delete"
  | "delegate"
  | "split"
  | "clarify";
```

Fake wants should often become **archived insights**, not deleted.

#### 6. Lessons Learned / Learning Events

Do **not** frame as "Mistakes" in UI.

```ts
interface LearningEvent {
  id: string;
  userId: string;
  title: string;
  date: string;
  category:
    | "overload"
    | "impulse"
    | "avoidance"
    | "spending"
    | "decision"
    | "relationship"
    | "health"
    | "productivity"
    | "emotional";
  whatHappened: string;
  context?: string;
  signalMissed?: string;
  emotionBefore?: string;
  emotionAfter?: string;
  lesson: string;
  newRule?: string;
  linkedCards?: string[];
  linkedPatterns?: string[];
  privacyLevel: "private" | "sensitive";
}
```

#### 7. Pattern Intelligence Layer

Backend domain: **Insights Engine** / **Pattern Intelligence**. Generates hypotheses, not verdicts.

```ts
type PatternConfidence =
  | "weak_signal"
  | "possible_pattern"
  | "repeated_pattern"
  | "strong_pattern"
  | "confirmed_by_user";
```

Good: "Possible pattern: on low-sleep days, task completion seems lower. Evidence: 5 low-sleep days, 4 had low energy, 3 had task carryover. Does this feel true? [Yes] [Maybe] [No]"

Bad: "You fail because you sleep badly."

#### 8. Unified Event Timeline

```ts
type EventType =
  | "mood_log" | "energy_log" | "sleep_log" | "food_log"
  | "habit_log" | "expense_log" | "diary_entry" | "chat_reflection"
  | "decision_log" | "learning_event" | "productivity_session"
  | "practice_session" | "task_completed" | "task_carried_over"
  | "pattern_confirmed";

interface LifeEvent {
  id: string;
  userId: string;
  type: EventType;
  timestamp: string;
  source: "chat" | "today" | "track" | "plan" | "diary" | "manual" | "agent";
  privacyLevel: "public" | "private" | "sensitive" | "never_external";
  tags: string[];
  data: Record<string, any>;
  note?: string;
  linkedCardId?: string;
  linkedGoalId?: string;
  linkedDecisionId?: string;
  linkedLessonId?: string;
}
```

#### 9. Decision Workspace

```ts
type DecisionCategory =
  | "money" | "property" | "health" | "family"
  | "career" | "relationship" | "life_direction";

interface DecisionRecord {
  id: string;
  userId: string;
  title: string;
  category: DecisionCategory;
  status: "open" | "waiting_for_facts" | "ready_to_decide" | "decided" | "review_later";
  options: string[];
  knownFacts: string[];
  assumptions: string[];
  missingFacts: string[];
  risks: string[];
  emotionalFactors: string[];
  financialImpact?: string;
  nextSmallestStep?: string;
  finalDecision?: string;
  outcomeReview?: string;
  privacyLevel: "private" | "sensitive";
}
```

For land/property/money: never rush, ask for numbers, separate emotion from asset value, create next-step drafts (not final action).

#### 10. Practice / Qualities

Invitations, not diagnoses. Never say "You need to improve patience." Instead: "A quality that could support you here is gentleness. Would you like to practise it today?"

```ts
interface PracticeSession {
  id: string;
  userId: string;
  quality: string;
  situation: string;
  phrase: string;
  linkedCardId?: string;
  reflection?: string;
  score:
    | "forgot" | "noticed_after" | "noticed_during"
    | "practised_once" | "practised_several_times" | "felt_natural";
  date: string;
}
```

#### 11. UI Changes for Chat

Header:

```text
Chat / Capture
Mode: Talk
Context: This conversation only
No drafts will be created unless you ask.
```

Badges: `Private · Local-first · Mission filter on`.

Mode selector (segmented): `Talk | Sort | Diary | Decision | Log | Review` — or `Talk | Sort | Diary | Decision` with "more modes" menu for Log/Review.

| Mode     | Main button       |
| -------- | ----------------- |
| Talk     | Reply             |
| Sort     | Create drafts     |
| Diary    | Reflect           |
| Decision | Analyse carefully |
| Log      | Save log          |
| Review   | Find patterns     |

#### 12. Examples of Correct Behaviour

**Emotional longing.** Input: "I miss him. I feel unstable today." Correct: "This sounds emotional, not logistical. I will not turn this into tasks unless you ask. I hear longing, grief, and a need for comfort. [Just talk] [Save as diary] [Analyse gently] [Create grounding practice]". Incorrect: "Drafts created: Heal attachment, Practise discipline, Improve emotional control".

**Brain dump.** Input: "I need to check insurance, book blood test, plan Japan, and fix laptop." Correct: "4 drafts found: Check insurance — Admin/money task; Book blood test — Health task; Plan Japan — Family project; Fix laptop — Admin task".

**Money/property decision.** Input: "Maybe I should sell my land." Correct: "This is a high-impact property/money decision. I recommend Decision mode. [Open Decision mode] [Just talk]". Incorrect: "Task created: Sell land."

**Lesson learned.** Input: "I overloaded today with too many tasks and did almost nothing." Correct: "This sounds like overload, not laziness. Possible lesson: when you feel behind, you may try to compensate by planning too much. [Save lesson] [Create rule] [Just talk]".

**Spending pattern.** Input: "Spent £38 on clothes. Felt low before buying." Correct: "Expense saved. Possible tag: emotional spending / low mood. [Planned] [Impulse] [Worth it] [Review later]".

#### 13. Privacy and Auth Requirements

Before using real private data:

```text
- Remove DEV_USER_ID from Chat and all screens.
- Frontend must use authenticated user context.
- Backend must derive user_id from JWT/session.
- Do not trust user_id sent from frontend.
- Drafts, diary entries, lessons, logs, decisions, and insights must belong to authenticated user only.
- Privacy settings must persist and control AI Gateway behaviour.
```

Sensitive content: diary, emotional entries, health, money, property, lessons, decisions default to private or sensitive.

External AI: no sensitive data goes external without Local AI Gateway, redaction, approval, and audit log.

#### 14. Implementation Order

**Phase 1 — Chat safety and modes.** ChatMode state, Context selector, primary button by mode, prevent automatic drafts in Talk/Diary, post-response chips.

**Phase 2 — Draft system.** Draft model, drafts only in Sort or after approval, draft tray, bottom-sheet filter, actions keep/later/archive insight/delete.

**Phase 3 — Lessons.** LearningEvent model, "Save lesson" action, "Create rule", Lessons section in Review/More later.

**Phase 4 — Decision mode.** DecisionRecord model, Decision workspace for high-impact, no direct action cards.

**Phase 5 — Pattern intelligence.** LifeEvent timeline, basic loops (sleep→energy→mood→productivity, mood→spending, food/protein→energy/focus, carryover count→task size/avoidance), hypotheses, user confirmation.

**Phase 6 — Practice/qualities.** PracticeSession model, optional "Create gentle practice", never as criticism.

#### 15. Acceptance Criteria

```text
1. Chat defaults to Talk mode.
2. Talk mode never creates drafts automatically.
3. Sort mode intentionally creates draft suggestions.
4. Diary mode treats content as sensitive and does not turn pain into tasks.
5. Decision mode creates decision briefs, not rushed actions.
6. Log mode saves structured data.
7. Review mode can surface pattern hypotheses.
8. Drafts have types and states.
9. Feelings are not mission-filtered.
10. Tasks/wishes/habits/projects are filtered before becoming active.
11. Fake wants can become archived insights.
12. Lessons can be saved from chat.
13. Pattern insights use careful language: "possible pattern," "worth watching," not judgment.
14. User confirms what becomes a card, habit, lesson, decision, diary entry, or insight.
15. No DEV_USER_ID remains in Chat flow.
```

#### 16. Final UX Principle

```text
I can speak freely.
The app will not punish me with tasks.
The app will not judge my feelings.
The app will help me sort when I ask.
The app will slow me down for big decisions.
The app will remember lessons if I choose.
The app will notice patterns gently over time.
```

---

### B.3 — Safe Auto correction (the user-facing simplification)

The best version is not:

```text
User chooses lots of modes and filters manually.
```

The best version is:

```text
AI quietly does the sorting.
User sees a simple recommendation.
User confirms, edits, or says no.
```

The visible UI should be simple:

```text
What's on your mind?
```

After writing, AI says:

```text
I treated this as: Emotional reflection
No drafts created.

Suggested next step:
Save as diary, or just continue talking.
```

Or:

```text
I treated this as: Planning / sorting
I found 4 possible items.

Recommended:
Start with sleep tracking and move land decision after freedom-number calculation.

[Accept recommendation] [Review items] [Ignore]
```

#### AI Triage

Instead of forcing mode selection, the app reads the message and classifies it internally:

```text
Emotional reflection
Brain dump
Decision
Log
Diary
Expense
Practice/quality
Lesson learned
Planning
Question
```

Then it tells the user what it did in one small line:

```text
Treated as: Emotional reflection · No drafts created
```

The user can always tap `Change`, but should not need to.

#### Visible Chat layout

```text
Chat

Talk freely. I will suggest, not activate.

[ What's on your mind? ]

[Send]
```

After AI replies (emotional):

```text
I treated this as: Emotional reflection
Context used: This message only
No drafts created.

I hear heaviness and longing. This is not a task.

Suggested:
[Continue talking] [Save as diary] [Analyse gently]
```

After AI replies (planning):

```text
I treated this as: Planning / sorting
Context used: Mission + current priorities

I found 5 possible items.

Recommended:
1. Keep: Track sleep
2. Keep: Define freedom number
3. Delay: Land decision until freedom number is done
4. Archive insight: Ferrari/status impulse

[Accept recommended sorting] [Review items] [Keep talking]
```

#### Do not show all drafts immediately

Show a summary first:

```text
I found 5 items.
Recommended sorting is ready.
```

Buttons: `Accept recommendation` · `Review items` · `Not now`.

Only show detailed drafts when user taps `Review items`.

#### Best flow for mixed thoughts

User writes: "I feel weird today. I want to buy expensive clothes, but I also need to think about land. I slept badly."

AI replies:

```text
I treated this as: mixed reflection + money signal
Context used: recent sleep + money rules

What I notice:
- low sleep may be affecting mood
- the clothes idea may be emotional/status spending
- land decision is too important for today's low-energy state

Recommended:
1. Log sleep as low-quality day.
2. Do not make land decision today.
3. Save "expensive clothes urge" as spending-pattern signal.

[Accept] [Review] [Just talk]
```

#### Auto-action policy

| Type                    |               AI can do automatically? | User confirmation        |
| ----------------------- | -------------------------------------: | ------------------------ |
| Emotional reflection    |                               No tasks | Ask before saving        |
| Sleep/energy/mood log   |                          Yes, if clear | Small confirmation/toast |
| Simple admin task       |                          Suggest draft | Confirm                  |
| Habit suggestion        |                                Suggest | Confirm                  |
| Money/property decision |                         Never auto-act | Decision brief + confirm |
| Diary entry             | Never auto-save unless setting enabled | Confirm                  |
| Lesson learned          |                                Suggest | Confirm                  |
| Pattern insight         |                  Suggest as hypothesis | User confirms            |
| External AI use         |     Never automatic for sensitive data | Approval required        |

#### Filters should be mostly invisible

AI pre-fills:

```text
My suggested filter result:

Keep — high alignment
Reason: supports family, joy, meaning.
Suggested place: Year 2026 → Family

[Accept] [Edit] [Reject]
```

For Ferrari:

```text
My suggested filter result:

Archive as insight — low alignment
Reason: likely status/comparison impulse, weak freedom support.

[Archive insight] [Keep anyway] [Discuss]
```

#### Best ROI scoring (silent factors)

```text
mission alignment
health impact
money/freedom impact
urgency
dependency value
energy required
emotional risk
carryover count
current sleep/energy/mood
financial risk
```

Visible output stays simple:

```text
Best next move:
Start with sleep tracking.

Why:
It affects almost every other area.
```

#### Final Chat UX (only these visible elements)

```text
1. Main input
2. Small line showing AI interpretation
3. AI response
4. Recommended action
5. Optional "Review details"
```

Suggested header:

```text
Chat

Talk naturally. I will suggest, not activate.
```

Small settings chip:

```text
Safe Auto
```

When tapped:

```text
Safe Auto settings:
- Emotional messages: no drafts
- Money/property: decision brief only
- Logs: save with confirmation
- Planning: suggest drafts
- External AI: approval required
```

#### Final answer (Ana's words)

```text
You speak.
It understands.
It recommends.
You confirm.
```

The filter, pattern analysis, ROI scoring, lessons, and decisions should mostly happen in the background, with only the final recommendation shown unless the user asks for details.
