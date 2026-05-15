# North Star — Full Project Specification for VSCode Claude

## Purpose of this file

This document is the complete specification for building a private AI-powered mobile app called **North Star**.

It is written so another AI inside VSCode, Claude Code, Cursor, Copilot, or any coding assistant can understand the full product, architecture, design, data model, AI agents, security model, and MVP build plan without asking additional questions.

The app should be built as a **real mobile app from the start**, not as a website that may later be wrapped.

---

# 0. High-Level Product Summary

## Product name

Working name:

**North Star**

Alternative possible names:

- Life Kaizen AI
- My Path AI
- Personal AI OS
- Inner Navigation OS

Use **North Star** as the internal project name.

---

## One-sentence definition

**North Star is a private AI-powered mobile app that helps the user capture thoughts, convert them into structured cards, break big goals into executable goal trees, filter decisions through a personal mission, manage tasks through Kanban boards, track habits, health, sleep, food, money, diary entries, files, and progress, and receive daily guidance from specialised AI agents responsible for time, focus, energy, health, money, productivity, learning, healing, research, and review.**

---

## What the app combines

The app should feel like a combination of:

- ChatGPT app
- Trello app
- Planyway/calendar planning
- Habit tracker
- Health/sleep tracker
- Money/FIRE dashboard
- Diary/reflection app
- Personal AI coach
- Private file/document vault
- Goal-tree operating system

It should be one integrated app, not many separate apps.

---

## Core promise

The app does **not** help the user do more.

It helps the user:

- reduce mental noise,
- empty thoughts from the head,
- remove false goals,
- protect energy,
- make better decisions,
- plan realistically,
- track reality,
- notice patterns,
- build freedom,
- choose the next correct action.

Core principle:

```text
Capture everything.
Filter honestly.
Split intelligently.
Focus narrowly.
Track reality.
Review patterns.
Protect energy.
Build freedom.
```

---

# 1. Core Philosophy

## 1.1 Everything starts from chat

The main screen of the app should be an AI chat screen.

The user can type or speak messy thoughts such as:

```text
I feel tired. I need to finish my app, lose weight, track sleep,
finish CS50 AI, manage my flat renovation, stop wasting evenings,
and I feel emotionally heavy today.
```

The app should then:

1. Detect the user's state.
2. Extract thoughts/tasks/goals.
3. Create cards.
4. Link cards to goals.
5. Run the mission filter.
6. Assign life area.
7. Assign responsible agent.
8. Put cards into Inbox, Goal Tree, or Kanban.
9. Suggest realistic next actions.
10. Update daily/weekly/monthly review data.

---

## 1.2 One thought = one card

Every thought, dream, task, worry, plan, idea, obligation, or desire should become a card.

Examples:

| Raw input | Card created |
|---|---|
| "I want to build an AI app" | Build North Star |
| "I need to lose weight" | Lose weight safely |
| "I should sleep earlier" | Improve sleep rhythm |
| "I need to pay renovation cost" | Pay renovation instalment |
| "I feel sadness again" | Reflect on sadness wave |
| "I want to finish CS50 AI" | Continue CS50 AI course |
| "Maybe I should sell land" | Decide whether to sell land |
| "I need to stop opening too many projects" | Reduce open project overload |

Nothing important should stay floating in the user's head.

---

## 1.3 Big cards must be split, but the main goal must stay

A big goal should **not** disappear when it is split.

The parent card remains as a reference. Smaller cards become children.

Hierarchy:

```text
Vision
  └── Goal
       └── Project
            └── Milestone
                 └── Task
                      └── Subtask
                           └── Focus Block
```

A focus block should be small enough to complete in one focused session, usually:

```text
30 minutes
60 minutes
90 minutes
one day maximum
```

Example:

```text
Build North Star
│
├── Define product vision
│   ├── Write mission filter
│   ├── Define agents
│   └── Define MVP
│
├── Build mobile app
│   ├── Create React Native project
│   ├── Create navigation
│   ├── Create chat screen
│   └── Create Today screen
│
├── Build backend
│   ├── Create FastAPI project
│   ├── Create database
│   ├── Create auth
│   └── Create card API
│
└── Add AI agents
    ├── Add Mission Agent
    ├── Add Focus Agent
    ├── Add Review Agent
    └── Add AI budget control
```

Each child card must keep:

```text
parentId
rootGoalId
level
```

So even when the user does a tiny task like:

```text
Create chat input component
```

the app knows it belongs to:

```text
Build North Star → Build mobile app → Create chat screen
```

---

# 2. Personal Mission Filter

## 2.1 User mission

The app must allow the user to create/edit a personal mission.

Initial default mission:

```text
To live a happy life.
I explore the world’s hidden energies and rules,
share clarity with those who seek it,
build my freedom to live meaningfully,
and refine myself in chosen solitude.
```

Do not hard-code Margulan's mission as the only filter. His mission can be used as inspiration, but the app must support the user's custom mission.

---

## 2.2 Mission filter questions

Every card/goal should be scored against the mission.

| Filter | Question |
|---|---|
| Happiness | Does this support a happier, calmer, more meaningful life? |
| Hidden Rules | Does this help me understand deeper patterns of life, people, systems, money, health, or myself? |
| Clarity | Does this create clarity for me or others? |
| Freedom | Does this increase financial, emotional, physical, time, or location freedom? |
| Self-Refinement | Does this refine my body, mind, skills, discipline, taste, or character? |
| Chosen Solitude | Does this respect privacy, peace, independence, and low-noise living? |
| Meaning | Does this make life more intentional rather than random? |

Each score can be 0–10.

The system can calculate a total mission alignment score.

---

## 2.3 Mission decisions

After filtering, a card can receive one of these decisions:

```text
keep
delete
later
delegate
split
clarify
archive
```

Definitions:

| Decision | Meaning |
|---|---|
| keep | Belongs in the user's life now or soon |
| delete | False goal, social pressure, noise, or not aligned |
| later | Aligned but wrong time |
| delegate | Someone else should do it |
| split | Too big, needs child cards |
| clarify | Too vague, needs more detail |
| archive | Not active but worth preserving |

Example:

| Card | Result |
|---|---|
| Build AI North Star | keep + split |
| Go to random social event because of pressure | delete/review |
| Study AWS AI | keep |
| Buy random influencer course | clarify/later |
| Track sleep | keep |
| Analyse raw bank screenshot externally | never external |

---

# 3. App Type and Platform

## 3.1 It must be a real mobile app from the start

The app should not start as a plain website.

It should be built with:

```text
React Native + Expo
```

Reasons:

- real mobile app experience,
- Android app from the start,
- iOS later if needed,
- can create APK for private installation,
- can create AAB for Google Play later,
- supports camera/file upload/notifications/local storage,
- good fit for vibe coding and AI-assisted development,
- TypeScript ecosystem.

---

## 3.2 Target platforms

Initial target:

```text
Android personal/private install
```

Future targets:

```text
Google Play Store
iOS App Store
Web companion app
```

Do not optimise for iOS first.

---

## 3.3 App navigation

Use a calm mobile navigation structure.

Bottom tabs:

```text
Chat | Today | Plan | Track | More
```

| Tab | Contains | Notes |
|-----|----------|-------|
| **Chat** | Capture + Intake Filter | Filter is embedded in chat flow |
| **Today** | Global Today | Energy/mood/sleep stats, top 1–3 tasks, do-not-do list, Focus Agent |
| **Plan** | Segmented: Year · Month · Projects | Multi-level boards + Compass/Pillars from header |
| **Track** | Segmented: Habits · Health · Money | Each as a dashboard view |
| **More** | Diary, Goals tree, Reviews, Files, Agents, Search, Settings | Secondary screens |

The **Plan** tab uses a segmented control at the top:

```text
Year Board | Month Board | Projects
```

The **Track** tab uses a segmented control at the top:

```text
Habits | Health | Money
```

Do not put 12 tabs in the bottom navigation. Keep it to 5 thumb-friendly tabs.

---

## 3.4 Design Language

**Palette:** Warm paper aesthetic — calm, low-contrast, never clinical.

```text
Background:      #f5f3ee (warm paper)
Panel/card:      #fffdf8 (cream white)
Border/line:     #d9d2c7 (soft warm gray)
Text:            #2f2a24 (deep warm brown)
Muted:           #746b61 (warm gray)
Soft highlight:  #ebe4d8 (cream gold)
```

**Life Pillars (6 colored areas):**

| Pillar | Color | Hex | Examples |
|--------|-------|-----|----------|
| Health & Energy | Green | #7f9f78 | Sleep, food, weight, body, longevity |
| Inner Growth | Purple | #9b86ba | Healing, meditation, identity, self-refinement |
| Money & Freedom | Blue | #779db6 | FIRE, property, work skills, apps, income |
| Family | Rose | #b77a7c | Mum, sister, close relationships, family trips |
| Joy & Exploration | Orange | #c99555 | Travel, films, music, books, sport, beauty |
| Contribution | Olive | #8b9b72 | Teaching, volunteering, videos, useful clarity |

Cards show a colored left border to indicate their life pillar.

**Component style:**

- Cards: 18–22px border-radius, 1px solid border, subtle warm shadow
- Stat grids: 3-column layout, uppercase 11px labels + bold 24px values
- Habit matrix: rows = habits, columns = days, cells = ✓/×/— symbols
- Tags/pills: 999px border-radius, warm cream background
- Modals: bottom-sheet style with 24px top-border-radius
- Buttons: 14px border-radius, no sharp corners anywhere

---

# 4. Recommended Technical Stack

## 4.1 Final stack

| Layer | Choice |
|---|---|
| Mobile app | React Native + Expo |
| Frontend language | TypeScript |
| Backend | FastAPI |
| Backend language | Python |
| Database | PostgreSQL |
| Vector search | pgvector |
| Local AI | Ollama |
| Optional external AI | OpenAI / Claude / Grok / Groq |
| Charts | react-native-gifted-charts or Victory Native |
| Local secrets | Expo SecureStore |
| File storage | Local server folder first, later MinIO/S3-compatible storage |
| Scheduler | APScheduler first, Celery + Redis later if needed |
| Deployment | Docker Compose locally first |
| Future app packaging | APK private install → AAB Google Play later |

---

## 4.2 High-level architecture

```text
React Native + Expo mobile app
│
├── Chat (+ Intake Filter)
├── Today (Global)
├── Plan (Year / Month / Projects)
├── Track (Habits / Health / Money)
└── More (Diary, Goals, Reviews, Files, Agents, Search, Settings)

        ↓ HTTPS/API

FastAPI backend
│
├── Auth
├── Cards service
├── Goal tree service
├── Kanban service
├── Habit service
├── Health service
├── Money service
├── Diary service
├── File service
├── Agent service
├── Scheduler
├── AI budget governor
└── Privacy/redaction layer

        ↓

PostgreSQL + pgvector
│
├── structured tables
├── embeddings
├── semantic search
└── agent memory

        ↓

File storage
│
├── images
├── documents
├── screenshots
└── backups

        ↓

AI providers
│
├── Ollama local by default
├── OpenAI optional
├── Claude optional
├── Grok optional
└── Groq optional
```

---

# 5. Main App Screens

## 5.1 Chat Screen (Tab 1)

This is the home screen. It combines capture AND the intake filter.

Purpose:

- ask anything,
- capture thoughts,
- receive guidance,
- create cards,
- call agents,
- run daily reviews,
- ask "what should I do today?"

### Intake Filter (embedded in Chat flow)

Raw thoughts do NOT become active cards immediately. The flow:

```text
1. Raw Thought → "I want a Ferrari" / "Go to Japan with family"
2. Want / Need → classify: want, need, obligation, impulse, external pressure
3. Mission Filter → score against 7 mission questions (0–10)
4. Exit Decision → keep / later / archive insight / delete / split / clarify / delegate
```

**Fake-want review:** rejected items are NOT just deleted. They become archived self-knowledge insights with reasoning. Example:

```text
Card: "Want a Ferrari"
Analysis: Status/comparison impulse, not aligned with freedom or solitude
Decision: Archive insight — "When I feel comparison pressure, I want status symbols"
```

Example prompt:

```text
What should I focus on today?
```

Example answer:

```text
Your energy is medium-low today.
You have 7 open tasks, which is too much.

The strongest mission-aligned actions are:
1. 45 min app architecture work
2. 10 min walk
3. Send one renovation message

Do not open new projects today.
```

The chat should be able to create structured entities:

- cards,
- habits,
- diary entries,
- health logs,
- money logs,
- file notes,
- decisions,
- reviews.

---

## 5.2 Today Screen (Tab 2)

Purpose:

**Global Today** — one shared bottleneck across all boards, habits, and agent guidance.

A card from any board (month, project, habit) can appear here via a `today = true` flag — it is never copied or duplicated.

Shows:

```text
Energy / Mood / Sleep stats (3-column stat grid)
Top 1–3 tasks (from any source)
Do-not-do list (what to avoid today)
Focus Agent guidance
Habit focus for today
```

Example:

```text
Today

Energy: 6/10
Mood: 5/10
Sleep: 6h 20m

Top tasks:
1. Build Card model (from Month Board)
2. Walk 10 minutes (from Habits)
3. Review renovation payment (from Project Board)

Do not:
- Open new projects
- Research more AI tools
- Plan more than 3 tasks

AI warning:
You are trying to plan 8 tasks. Reduce to 3.
```

Important rule:

Today should normally have only:

```text
1–3 important tasks
```

Possibly up to 5 on a high-energy day.

---

## 5.3 Plan Screen (Tab 3 — segmented)

The Plan tab contains three segments accessible via a top segmented control:

```text
Year | Month | Projects
```

### 5.3.1 Year Board

After a card passes the intake filter, assign a life area, color, and year.

Columns:

```text
This Year | Scheduled | Done
```

Use "This Year" instead of "Have to do" — it feels less oppressive and fits genuine wants as well as obligations.

Cards are color-coded by life pillar (left border).

### 5.3.2 Month Board (Current Month)

The main execution board. Columns:

```text
Inbox | This Month | This Week | In Progress | Waiting | Done | Review
```

**Carryover logic:** unfinished cards roll forward to the next month with `carryover_count + 1`. At 3 carryovers, the app forces a review.

Rules:

1. A card that moves 3+ times must be reviewed.
2. Too many "in progress" cards triggers a WIP warning.
3. "Today" is the bottleneck and must be protected (cards marked today appear on the Today tab).
4. Today is never a column here — it is a global view.

### 5.3.3 Project Boards

Large projects can have their own Kanban board. Columns:

```text
Backlog | In Progress | Waiting | Done | Review
```

Project boards sit under the month board conceptually. Today remains global and is never duplicated inside a project.

### 5.3.4 Compass + Life Pillars

Accessible from the Plan header (icon or swipe). Shows:

- The user's personal mission text
- 6 life pillars with colors
- Quick overview of active goals per pillar

---

## 5.4 Track Screen (Tab 4 — segmented)

The Track tab contains three segments:

```text
Habits | Health | Money
```

### 5.4.1 Habits

Track repeated behaviours separately from tasks.

Habits should NOT be duplicated as daily Kanban cards.

**Display:** Matrix view — rows = habits, columns = days (Mon–Sun). Cells show:
- ✓ (done, green)
- × (not done, red)
- — (skipped, gray)

Plus: streak count, consistency %, agent insights.

Examples:

```text
Sleep before target time
Wake up before target time
No sweets after 15:00
Walk 10 minutes
Drink water
Study AI
Kaizen review
Protein target
Calories target
No spending day
```

Input types:

```text
yes/no
number
time
scale 1–10
text note
```

### 5.4.2 Health Dashboard

An integrated health dashboard (not a separate app).

Tracks:

```text
Sleep / Wake time
Weight
Calories / Protein / Carbs
Steps / Walking
Energy (1–10)
Mood (1–10)
Symptoms
Food notes
```

Charts show: sleep vs energy, weight trend, protein consistency, habit correlation, fatigue patterns.

AI analyses patterns:

```text
When sleep is below 6.5 hours, your energy drops and you skip learning.
Your first bottleneck is sleep, not discipline.
```

### 5.4.3 Money Dashboard

An integrated finance dashboard (not a separate app).

Tracks:

```text
Income
Expenses (by category)
Monthly budget
Investments
FIRE progress
Property costs / Renovation costs
Subscriptions
AI usage cost
```

Charts show: monthly spending, category breakdown, savings rate, net worth/FIRE trend, AI cost usage.

Money Agent answers:

```text
Can I afford this?
Does this support freedom?
What is my cash position?
Should I pause this purchase?
How does this affect FIRE?
```

---

## 5.5 More Screen (Tab 5)

Contains secondary screens:

### Diary / Healing

Reflection and emotional pattern tracking.

Tracks:

```text
Emotional waves
Reflections
Dreams
Identity thoughts
Patterns
Pain points
Breakthroughs
```

Healing Agent should be calm and non-dramatic.

### Goal Tree

Show hierarchical goals.

Features:

- expand/collapse nodes,
- add child card,
- split card,
- mark leaf tasks as done,
- see parent path,
- show mission alignment,
- show responsible agent,
- show energy/time estimate.

### Reviews

```text
Daily Review
Weekly Review
Monthly Review
Yearly Review
```

Monthly review shows: completed cards by area, habit consistency, most postponed goals, energy pattern, money pattern, health pattern, emotional pattern, main bottleneck, next month recommendation.

### Files

Private encrypted storage for images, documents, financial screenshots, property photos, health files, attachments.

### Search

Semantic search across all cards using pgvector embeddings.

### Agents

View agent policies, budgets, audit logs.

### Settings

App configuration, theme, API keys, notifications.

---

# 6. AI Agent System

## 6.1 Agent philosophy

Agents are not random personalities.

They are functional departments of life.

Each agent has:

```text
role
responsibility
data permissions
AI model preference
privacy limits
budget limit
allowed actions
```

No agent may call external AI directly.

All external AI calls must pass through the Local AI Gateway.

---

## 6.2 Agent list

Core agents:

```text
Mission Agent
Goal Architect Agent
Time Agent
Focus Agent
Energy Agent
Health Agent
Money Agent
Productivity Agent
Learning Agent
Healing Agent
Research Agent
Review Agent
```

MVP agents:

```text
Capture Agent
Goal Architect Agent
Mission Agent
Focus Agent
Review Agent
```

Add other agents later.

---

## 6.3 Agent descriptions

### 6.3.1 Capture Agent

Purpose:

```text
Turns messy user input into structured cards/logs.
```

Responsibilities:

- extract tasks,
- extract goals,
- extract worries,
- extract ideas,
- extract diary/reflection content,
- suggest cards,
- ask for clarification only when essential.

---

### 6.3.2 Mission Agent

Purpose:

```text
Protects life direction.
```

Responsibilities:

- filters cards through mission,
- detects false goals,
- detects social pressure,
- detects goals that violate solitude,
- explains why something should stay or go.

Example:

```text
This goal supports freedom and self-refinement,
but it does not respect your current energy.
Keep it, but move it to Later.
```

---

### 6.3.3 Goal Architect Agent

Purpose:

```text
Turns big goals into trees.
```

Responsibilities:

- splits big cards into smaller cards,
- keeps parent-child structure,
- creates milestones,
- creates one-hour actions,
- detects vague cards,
- detects impossible goals.

Example:

```text
Goal: Build AI app
→ Project: Build MVP
→ Milestone: Working chat screen
→ Task: Create chat UI
→ Focus block: 60 min create message input
```

---

### 6.3.4 Time Agent

Purpose:

```text
Protects calendar reality.
```

Responsibilities:

- plans year/month/week/today,
- checks available time,
- prevents unrealistic planning,
- moves cards between time horizons,
- creates daily planning blocks.

Example:

```text
You have only 2 realistic hours today. Do not plan 6 tasks.
```

---

### 6.3.5 Focus Agent

Purpose:

```text
Protects attention.
```

Responsibilities:

- chooses top 1–3 tasks,
- blocks noise,
- stops new project explosions,
- detects scattered attention,
- decides what not to do today.

This is one of the most important agents.

Example:

```text
The correct focus today is not learning, health, money, and app building all at once.
Today is app architecture only.
```

---

### 6.3.6 Energy Agent

Purpose:

```text
Adapts the plan to the user's current state.
```

Responsibilities:

- reads sleep,
- reads fatigue,
- reads mood,
- reads stress,
- recommends low/medium/high intensity day,
- prevents burnout,
- adjusts task load.

Example:

```text
Today is low-energy. Choose maintenance tasks, not deep creative decisions.
```

---

### 6.3.7 Health Agent

Purpose:

```text
Tracks body and health behaviours.
```

Responsibilities:

- sleep tracking,
- food tracking,
- weight tracking,
- protein/calorie targets,
- walking/movement,
- health pattern detection.

Example:

```text
Your calorie target is okay, but protein is too low for preserving muscle during weight loss.
```

---

### 6.3.8 Money Agent

Purpose:

```text
Protects freedom.
```

Responsibilities:

- budget analysis,
- FIRE progress,
- investment tracking,
- property costs,
- renovation decisions,
- AI usage cost monitoring,
- purchase decisions.

Example:

```text
This purchase is not dangerous, but it delays your renovation cash buffer.
Delay by one month.
```

---

### 6.3.9 Productivity Agent

Purpose:

```text
Keeps work flowing.
```

Responsibilities:

- monitors Kanban flow,
- detects bottlenecks,
- watches WIP limits,
- finds cards stuck too long,
- reviews postponed cards,
- suggests simplification.

Example:

```text
You have 11 tasks in progress. That is not progress; that is congestion.
```

---

### 6.3.10 Learning Agent

Purpose:

```text
Builds study paths.
```

Responsibilities:

- creates learning roadmaps,
- breaks courses into tasks,
- recommends articles/videos/books,
- links learning to goals,
- prevents random course collecting.

Example:

```text
Do not start a new AI course. Finish CS50 AI first, then move to AWS AI.
```

---

### 6.3.11 Healing Agent

Purpose:

```text
Helps with reflection and emotional patterns.
```

Responsibilities:

- reads diary entries,
- detects recurring emotional waves,
- separates emotion from decision,
- creates reflection prompts,
- suggests gentle next steps.

Example:

```text
This is not a signal to change your whole life today.
This is a wave. Log it, reduce pressure, and review tomorrow.
```

---

### 6.3.12 Research Agent

Purpose:

```text
Scans the outside world.
```

Responsibilities:

- finds useful articles/videos/resources,
- searches only based on active goals,
- summarises maximum 1–3 items per day,
- avoids overload.

Example:

```text
Today's useful research:
1. One article about AI agents
2. One video about sleep consistency
3. One article about personal knowledge systems
```

---

### 6.3.13 Review Agent

Purpose:

```text
Creates feedback loops.
```

Responsibilities:

- daily review,
- weekly review,
- monthly review,
- yearly review,
- detects patterns,
- suggests corrections.

Example:

```text
This month, Money and Property moved forward.
Health was inconsistent.
Main bottleneck: sleep and too many open app ideas.
```

---

## 6.4 Agent council model

When the user asks:

```text
What should I do today?
```

The app should not let only one agent answer.

It should run an internal council:

```text
Mission Agent: Is this aligned?
Time Agent: Is there time?
Energy Agent: Is there energy?
Money Agent: Is there financial urgency?
Health Agent: Is the body okay?
Productivity Agent: What is stuck?
Focus Agent: What is the top priority?
Review Agent: What pattern is repeating?
```

Final answer example:

```text
Today’s decision:
Low-medium intensity day.

Do:
1. 60 min app architecture
2. 10 min walk
3. Log food and sleep

Do not:
- Start a new project
- Research more tools
- Add more tasks to Today
```

---

# 7. Privacy and Security Architecture

## 7.1 Core security principle

Never let raw personal data leave the user's system unless explicitly allowed.

Default:

```text
Local-first.
Ollama by default.
External AI only through Local AI Gateway.
Every data item has a privacy level.
Every agent has permissions.
Sensitive external calls require approval.
All external calls are redacted and audited.
Never-external data never leaves the machine.
```

---

## 7.2 Local AI Gateway

Do not use a "clean folder / dirty folder" quarantine architecture.

Instead, use a **Local AI Gateway** as the single controlled gate.

Architecture:

```text
Phone App
   ↓
FastAPI Backend
   ↓
Agent Orchestrator
   ↓
Local AI Gateway
   ├── Privacy classification
   ├── Agent permission check
   ├── Redaction / minimisation
   ├── Prompt injection scan
   ├── Cost estimation
   ├── Human approval if needed
   ├── External AI call if allowed
   ├── Output scan
   ├── Audit log
   └── Response back to agent
```

No agent is allowed to call OpenAI, Claude, Grok, Groq, or any other external model directly.

---

## 7.3 Privacy levels

Every data item should have a privacy level:

```text
public
normal
private
sensitive
never_external
```

Examples:

| Data | Privacy level |
|---|---|
| Generic task title | normal |
| Habit streak | private |
| Weight log | sensitive |
| Diary entry | sensitive |
| Bank screenshot | never_external |
| Passport / ID | never_external |
| Exact investment balance | sensitive |
| Property document | never_external or sensitive |
| Private photo | sensitive or never_external |
| AI-generated monthly summary | private |

---

## 7.4 Agent policies

Each agent needs permissions.

Example:

```json
{
  "agentId": "money_agent",
  "canRead": ["money_summary", "budget_summary", "redacted_transactions"],
  "cannotRead": ["raw_bank_screenshots", "identity_documents", "api_keys"],
  "canUseExternalAI": true,
  "requiresApprovalFor": ["sensitive", "never_external"],
  "defaultModel": "ollama",
  "monthlyBudgetLimitGbp": 5.00
}
```

The Money Agent can read summaries, but not raw bank screenshots.

The Health Agent can read health logs, but external AI requires approval.

The Research Agent can use external AI more freely, but should not receive raw personal data.

---

## 7.5 AI routing rules

```text
Normal card classification
→ local model or cheap external model

Diary analysis
→ local only by default

Money decision
→ local summary first, external only with approval

Health question
→ local summary + external with approval

Research agent
→ external allowed, but no personal raw data

File/image analysis
→ local only unless manually approved
```

---

## 7.6 Human approval gate

Sensitive categories should require approval before external AI calls.

Approval should be configurable per category.

Approval modal example:

```text
External AI request preview

Privacy level: sensitive
Agent: Money Agent
Provider: OpenAI
Estimated cost: £0.03

Will send:
- redacted budget summary
- no exact account numbers
- no screenshots
- no personal names

Approve?

[Approve] [Keep Local] [Cancel]
```

---

## 7.7 Hybrid redactor

Use a hybrid redactor.

MVP:

```text
regex redaction
rule-based redaction
currency redaction
email/phone redaction
location/property redaction
optional local Ollama semantic redaction
```

Later:

```text
Presidio
LLM Guard
Llama Guard
NeMo Guardrails if needed
```

Redaction examples:

```text
my flat in Vilnius → [PROPERTY_LOCATION]
my mother → [FAMILY_MEMBER]
my salary → [INCOME]
my investment account → [INVESTMENT_ACCOUNT]
£18,808 → [MONEY_AMOUNT]
email@example.com → [EMAIL]
+447... → [PHONE]
```

---

## 7.8 Audit logs

Every external AI call must be logged.

Do **not** store raw sensitive prompts in audit logs.

Store:

```text
redacted prompt
privacy level
agent ID
provider
model
cost estimate
approval status
input/output scan status
timestamp
```

---

# 8. Data Model

## 8.1 Main database tables

Use PostgreSQL.

Main tables:

```text
users
missions
agents
agent_policies
cards
card_relationships
boards
board_columns
habits
habit_logs
health_logs
money_accounts
money_transactions
diary_entries
files
agent_insights
reviews
ai_messages
ai_usage_logs
ai_audit_logs
embeddings
notifications
settings
```

Enable pgvector from day one:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 8.2 Card model

TypeScript interface:

```ts
export interface Card {
  id: string;
  userId: string;

  parentId?: string;
  rootGoalId?: string;

  title: string;
  description?: string;

  level:
    | "vision"
    | "goal"
    | "project"
    | "milestone"
    | "task"
    | "subtask"
    | "focus_block";

  type:
    | "thought"
    | "goal"
    | "task"
    | "habit"
    | "health"
    | "money"
    | "diary"
    | "research"
    | "decision";

  status:
    | "inbox"
    | "filtered"
    | "planned"
    | "in_progress_my_side"
    | "in_progress_other_side"
    | "today"
    | "done"
    | "later"
    | "deleted"
    | "review";

  lifeArea:
    | "health_energy"
    | "mind_healing"
    | "money_freedom"
    | "work_skills"
    | "home_property"
    | "joy_culture"
    | "family"
    | "contribution"
    | "app_building";

  missionScores: {
    happiness: number;
    hiddenRules: number;
    clarity: number;
    freedom: number;
    selfRefinement: number;
    solitude: number;
    meaning: number;
  };

  assignedAgentIds: string[];

  energyRequired: "low" | "medium" | "high";
  estimatedMinutes?: number;
  dueDate?: string;

  movedCount: number;
  priority: "low" | "medium" | "high";

  privacyLevel:
    | "public"
    | "normal"
    | "private"
    | "sensitive"
    | "never_external";

  embeddingStatus:
    | "not_embedded"
    | "embedded"
    | "needs_update";

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

---

## 8.3 Embedding model

Use a separate embeddings table rather than embedding directly inside every table.

```ts
export interface Embedding {
  id: string;
  userId: string;
  entityType: "card" | "diary" | "review" | "insight" | "file_text";
  entityId: string;
  textHash: string;
  embedding: number[];
  model: string;
  createdAt: string;
}
```

Purpose:

- find similar past cards,
- find repeated diary patterns,
- retrieve relevant context for agents,
- support semantic search.

---

## 8.4 Agent policy table

SQL example:

```sql
CREATE TABLE agent_policies (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    can_read JSONB NOT NULL DEFAULT '[]',
    cannot_read JSONB NOT NULL DEFAULT '[]',
    can_use_external_ai BOOLEAN NOT NULL DEFAULT FALSE,
    requires_approval_for JSONB NOT NULL DEFAULT '["sensitive", "never_external"]',
    default_model TEXT NOT NULL DEFAULT 'ollama',
    monthly_budget_limit_gbp NUMERIC(10,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 8.5 AI audit log table

SQL example:

```sql
CREATE TABLE ai_audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    agent_id TEXT NOT NULL,

    privacy_level TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,

    request_type TEXT NOT NULL,
    external_call BOOLEAN NOT NULL DEFAULT FALSE,

    original_prompt_stored BOOLEAN NOT NULL DEFAULT FALSE,
    redacted_prompt JSONB,
    redaction_map JSONB,

    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by_user BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at TIMESTAMP,

    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_gbp NUMERIC(10,4) DEFAULT 0,

    input_scan_status TEXT DEFAULT 'not_scanned',
    output_scan_status TEXT DEFAULT 'not_scanned',

    final_status TEXT NOT NULL DEFAULT 'completed',

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 8.6 Add privacy level to key tables

Example migrations:

```sql
ALTER TABLE cards
ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'private';

ALTER TABLE diary_entries
ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'sensitive';

ALTER TABLE files
ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'private';

ALTER TABLE health_logs
ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'sensitive';

ALTER TABLE money_transactions
ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'sensitive';
```

---

# 9. AI Budget Control

## 9.1 Budget principle

No surprise bills.

The app must have a strict AI budget governor.

Settings:

```text
monthly AI limit
daily AI limit
per-agent limit
per-provider limit
manual approval for expensive calls
hard stop when limit reached
```

Example:

```text
Monthly AI budget: £20
Daily limit: £1
Research Agent: £0.20/day
Deep Analysis Agent: approval required
```

---

## 9.2 AI usage log

Track every AI call:

```text
userId
agentId
provider
model
inputTokens
outputTokens
estimatedCost
privacyLevel
wasExternal
wasApproved
timestamp
```

The app should show:

```text
AI spend this month: £4.20 / £20
Research Agent: £0.80
Review Agent: £1.10
Deep Analysis: £2.30
```

---

# 10. Local AI Gateway Service

## 10.1 Interface

Python conceptual interface:

```python
class LocalAIGateway:
    async def process_request(
        self,
        user_id: str,
        agent_id: str,
        task_type: str,
        prompt: str,
        context: dict,
        requested_provider: str | None = None,
        requested_model: str | None = None,
    ) -> GatewayResponse:
        ...
```

Internal methods:

```python
class LocalAIGateway:
    def classify_privacy(self, prompt, context): ...
    def check_agent_policy(self, agent_id, privacy_level, context): ...
    def minimise_context(self, prompt, context): ...
    def redact_pii(self, prompt, context): ...
    def scan_input(self, redacted_prompt): ...
    def estimate_cost(self, provider, model, redacted_prompt): ...
    def needs_human_approval(self, privacy_level, agent_policy): ...
    async def call_model(self, provider, model, prompt): ...
    def scan_output(self, output): ...
    async def write_audit_log(self, event): ...
```

---

## 10.2 Gateway behaviour

Flow:

```text
1. Receive agent request.
2. Classify privacy.
3. Check agent permission.
4. Decide local vs external.
5. Minimise context.
6. Redact PII.
7. Scan input.
8. Estimate cost.
9. Request approval if needed.
10. Call model.
11. Scan output.
12. Write audit log.
13. Return response.
```

---

# 11. File and Storage Strategy

## 11.1 Storage types

Separate data types:

| Data type | Storage |
|---|---|
| Cards/goals/Kanban | PostgreSQL |
| Habits | PostgreSQL |
| Sleep/weight/food | PostgreSQL |
| Diary/reflections | PostgreSQL, encrypted later |
| Images | File storage |
| Documents | File storage + metadata in DB |
| Financial screenshots | File storage, never external |
| AI summaries | PostgreSQL |
| Embeddings | PostgreSQL + pgvector |

---

## 11.2 Local secrets

Use Expo SecureStore only for small secrets:

```text
auth token
refresh token
local encryption key reference
biometric setting
selected API key if needed
```

Do not use SecureStore for:

```text
large images
large diary archives
financial documents
database backups
```

---

# 12. Suggested Folder Structure

```text
personal-navigation-os/
│
├── mobile/
│   ├── app.json
│   ├── package.json
│   ├── src/
│   │   ├── screens/
│   │   │   ├── ChatScreen.tsx
│   │   │   ├── TodayScreen.tsx
│   │   │   ├── BoardsScreen.tsx
│   │   │   ├── GoalTreeScreen.tsx
│   │   │   ├── HabitsScreen.tsx
│   │   │   ├── HealthScreen.tsx
│   │   │   ├── MoneyScreen.tsx
│   │   │   ├── DiaryScreen.tsx
│   │   │   ├── FilesScreen.tsx
│   │   │   ├── ReviewsScreen.tsx
│   │   │   ├── AgentsScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── CardItem.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── GoalTreeNode.tsx
│   │   │   ├── HabitRow.tsx
│   │   │   ├── AgentMessage.tsx
│   │   │   ├── MissionScoreBadge.tsx
│   │   │   └── ApprovalModal.tsx
│   │   │
│   │   ├── api/
│   │   ├── store/
│   │   ├── navigation/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── cards.py
│   │   │   ├── boards.py
│   │   │   ├── habits.py
│   │   │   ├── health.py
│   │   │   ├── money.py
│   │   │   ├── diary.py
│   │   │   ├── files.py
│   │   │   ├── agents.py
│   │   │   ├── reviews.py
│   │   │   └── gateway.py
│   │   │
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── card_service.py
│   │   │   ├── goal_tree_service.py
│   │   │   ├── mission_service.py
│   │   │   ├── habit_service.py
│   │   │   ├── health_service.py
│   │   │   ├── money_service.py
│   │   │   ├── diary_service.py
│   │   │   ├── file_service.py
│   │   │   ├── redactor_service.py
│   │   │   ├── ai_budget_service.py
│   │   │   └── local_ai_gateway.py
│   │   │
│   │   ├── agents/
│   │   │   ├── base_agent.py
│   │   │   ├── capture_agent.py
│   │   │   ├── mission_agent.py
│   │   │   ├── goal_architect_agent.py
│   │   │   ├── focus_agent.py
│   │   │   ├── review_agent.py
│   │   │   ├── health_agent.py
│   │   │   ├── money_agent.py
│   │   │   ├── energy_agent.py
│   │   │   ├── learning_agent.py
│   │   │   ├── healing_agent.py
│   │   │   └── research_agent.py
│   │   │
│   │   ├── scheduler/
│   │   ├── security/
│   │   └── database/
│
├── database/
│   ├── migrations/
│   └── seed/
│
├── storage/
│
├── docker-compose.yml
│
└── docs/
    ├── project-spec.md
    ├── architecture.md
    ├── agents.md
    ├── data-model.md
    ├── security.md
    └── mvp-plan.md
```

---

# 13. Docker Compose Starter

Use local Docker Compose first.

Conceptual setup:

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: personal_os
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  ollama:
    image: ollama/ollama
    volumes:
      - ollama:/root/.ollama
    ports:
      - "11434:11434"

  backend:
    build: ./backend
    depends_on:
      - db
      - ollama
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/personal_os
      OLLAMA_HOST: http://ollama:11434
    ports:
      - "8000:8000"

volumes:
  pgdata:
  ollama:
```

Important:

Do not expose Ollama publicly.

Phone should talk to backend.

Backend talks to Ollama.

---

# 14. MVP Scope

## 14.1 MVP must include

Phase 1 MVP:

```text
1. React Native + Expo app shell
2. Basic navigation
3. Login/local user
4. Chat screen
5. Thought Inbox
6. Card creation
7. Parent-child goal tree
8. Mission filter
9. Basic Kanban
10. Habit tracker
11. Health log
12. Local AI Gateway shell
13. AI budget tracking
14. Basic local Ollama integration
15. Privacy levels on records
```

---

## 14.2 Do not build first

Do not build in MVP:

```text
public marketplace
social features
payments
full app store release
advanced wearable integrations
complex investment analysis
all 12 agents fully autonomous
full iOS polish
complex RAG workflows
```

---

## 14.3 MVP agents

Build these first:

```text
Capture Agent
Goal Architect Agent
Mission Agent
Focus Agent
Review Agent
```

Later add:

```text
Time Agent
Energy Agent
Health Agent
Money Agent
Productivity Agent
Learning Agent
Healing Agent
Research Agent
```

---

# 15. Build Phases

## Phase 1 — Foundation

Build:

```text
React Native app
Navigation
Basic screens
FastAPI backend
PostgreSQL
User model
Auth/local login
Docker Compose
```

---

## Phase 2 — Cards and Goal Tree

Build:

```text
Thought Inbox
Card CRUD
Parent-child structure
Goal tree view
Card detail screen
Split card action
```

---

## Phase 3 — Mission Filter

Build:

```text
Mission setup
Filter questions
Mission scoring
Keep/delete/later/split/clarify decisions
Mission score display
```

---

## Phase 4 — Kanban

Build:

```text
Boards
Columns
Move cards between columns
Today column
Done column
Review column
Moved count
Stuck-card detection
```

---

## Phase 5 — Habits and Health

Build:

```text
Habit definitions
Habit logs
Sleep log
Weight log
Food note
Energy score
Mood score
Basic charts
```

---

## Phase 6 — AI Chat

Build:

```text
Chat UI
Message history
Capture Agent
Card creation from chat
Basic local Ollama call
Agent response format
```

---

## Phase 7 — Security Gateway

Build:

```text
PrivacyLevel enum
AgentPolicy table
LocalAIGateway class
Regex redactor
Audit logs
Budget logs
Human approval placeholder
```

---

## Phase 8 — Reviews

Build:

```text
Daily review
Weekly review
Monthly review
Review Agent
Patterns from cards/habits/health
```

---

## Phase 9 — Money, Diary, Files

Build:

```text
Money screen
Budget logs
Diary entries
File uploads
File privacy levels
Never-external protection
```

---

## Phase 10 — Advanced AI

Build:

```text
pgvector semantic search
Embeddings
Agent memory
Research Agent
Learning Agent
Healing Agent
External AI providers through gateway
Approval modal
```

---

## Phase 11 — Packaging

Build:

```text
Android APK for private install
Later Android AAB for Google Play
Later iOS build if needed
```

---

# 16. UI / UX Design Direction

## 16.1 Overall style

The app should feel:

```text
calm
intelligent
private
serious
warm
minimal
low-noise
not childish
not gamified
not chaotic
```

Visual style:

```text
warm dark mode
soft light mode
clean cards
rounded corners
minimal clutter
calm typography
clear spacing
simple charts
```

Avoid:

```text
neon productivity chaos
childish badges
too many colours
overloaded dashboards
shouting notifications
```

---

## 16.2 Main UI principle

The UI should constantly help answer:

```text
What matters now?
What can wait?
What should be deleted?
What is the next small step?
What is draining energy?
What is actually aligned?
```

---

## 16.3 Card UI

Each card should show:

```text
title
level
life area
status
mission score
parent goal
assigned agent
energy requirement
estimated time
privacy level
```

---

## 16.4 Today UI

Today should be extremely simple.

Show:

```text
energy
mood
sleep
top 1–3 tasks
habit focus
AI warning if overloaded
```

---

# 17. App Rules and Guardrails

## Rule 1 — No overloaded Today

Today should have maximum:

```text
1–3 important cards
```

Maybe 5 on high-energy days.

---

## Rule 2 — If a card moves 3 times, review it

Ask:

```text
Do you really want this?
Is this too big?
Is this the wrong time?
Is this someone else's expectation?
Should it be deleted?
Should it be split?
```

---

## Rule 3 — Big cards must be split

Bad card:

```text
Learn AI
```

Better:

```text
Finish CS50 AI Week 0
Watch lecture
Complete project
Write notes
Build one small demo
```

---

## Rule 4 — Habits are separate from projects

"Sleep before 23:30" is not a Kanban card every day.

It is a habit.

---

## Rule 5 — Complex projects get their own board

Examples:

```text
North Star
Vilnius Flat Renovation
Weight Loss
CS50 AI
Property Rental
FIRE Plan
```

But all projects share one Today bottleneck.

---

## Rule 6 — Agents cannot bypass security gateway

No agent may directly call external AI.

---

## Rule 7 — Never-external data stays local

Examples:

```text
passport
bank statements
raw financial screenshots
raw diary archive
private photos
medical documents
API keys
database backups
```

---

# 18. Scheduled Agent Tasks

## Morning review

Runs every morning.

Output:

```text
Morning Guidance
1. State today
2. Main bottleneck
3. Top 1–3 tasks
4. Habit focus
5. One learning recommendation
6. One emotional reminder
```

---

## Evening review

Runs in the evening.

Output:

```text
Evening Review
- What was completed?
- What was avoided?
- What created energy?
- What drained energy?
- What should move to tomorrow?
```

---

## Weekly review

Output:

```text
Weekly Review
- Completed cards by area
- Habit consistency
- Emotional pattern
- Health pattern
- Money pattern
- Bottlenecks
- Recommended next week focus
```

---

## Monthly review

Output:

```text
Monthly Kaizen Review
- What moved forward?
- What got stuck?
- Which cards moved 3+ times?
- Which life area was ignored?
- What should be deleted?
- What should be simplified?
- What is next month's theme?
```

---

# 19. Research Agent Rules

Research Agent can scan the internet later, but should not be active in early MVP.

Rules:

```text
Only research based on active goals.
Maximum 1–3 recommendations per day.
Do not create overload.
Do not send raw personal data externally.
Use external AI only through Local AI Gateway.
```

Example:

```text
Today's useful research:
1. One article about AI agents
2. One video about sleep consistency
3. One article about personal knowledge systems
```

---

# 20. How AI Should Respond in the App

AI responses should be:

```text
short
structured
calm
direct
actionable
not dramatic
not overloaded
```

Good answer:

```text
Today is a low-medium energy day.

Do:
1. 45 min app architecture
2. 10 min walk
3. Log food and sleep

Do not:
- start a new project
- research more tools
- add more tasks to Today
```

Bad answer:

```text
Here are 25 things you can do today...
```

The app must reduce cognitive load, not increase it.

---

# 21. API Concepts

## 21.1 Main endpoints

Suggested backend endpoints:

```text
POST /auth/login
GET /me

POST /chat/message
GET /chat/history

GET /cards
POST /cards
GET /cards/{id}
PATCH /cards/{id}
DELETE /cards/{id}

POST /cards/{id}/split
POST /cards/{id}/move
POST /cards/{id}/score-mission

GET /goal-tree
GET /goal-tree/{rootGoalId}

GET /boards
POST /boards
POST /boards/{boardId}/move-card

GET /habits
POST /habits
POST /habit-logs

GET /health/logs
POST /health/logs

GET /money/summary
POST /money/transactions

GET /diary
POST /diary

GET /files
POST /files/upload

POST /agents/run
POST /gateway/request

GET /reviews/daily
POST /reviews/daily/generate

GET /ai-usage
GET /ai-audit-logs
```

---

# 22. Coding Assistant Instructions

When implementing this project, the coding AI should follow these rules:

1. Do not ask for broad clarification unless absolutely blocked.
2. Use the decisions in this spec as defaults.
3. Build in phases.
4. Keep MVP simple.
5. Do not build all agents fully at once.
6. Use TypeScript on mobile.
7. Use Python/FastAPI on backend.
8. Use PostgreSQL + pgvector.
9. Use Ollama as default local AI.
10. Do not expose Ollama publicly.
11. All external AI calls must go through Local AI Gateway.
12. Store raw private data locally/server-side only.
13. Do not send sensitive raw data to external AI.
14. Add privacy_level to important records.
15. Add audit logs before enabling external AI.
16. Keep UI calm and low-noise.
17. Protect Today from overload.
18. Preserve parent goals when splitting cards.
19. Use one shared Today bottleneck across all projects.
20. Keep everything modular.

---

# 23. Initial Implementation Target

The first usable version should allow the user to:

1. Open the mobile app.
2. Type thoughts into Chat.
3. Convert thoughts into cards.
4. See cards in Inbox.
5. Split big card into child cards.
6. View goal tree.
7. Run mission filter.
8. Move cards to Kanban.
9. Add 1–3 cards to Today.
10. Track basic habits.
11. Track sleep/energy/mood.
12. Ask Focus Agent what to do today.
13. Store all data in PostgreSQL.
14. Use local Ollama for basic AI.
15. Keep privacy levels on records.

This is the minimum first meaningful app.

---

# 24. Final Product Vision

The final app should become the user's quiet command centre.

It should answer:

```text
Where am I?
What matters?
What is noise?
What is the next correct step?
What pattern am I repeating?
What should I stop doing?
What should I learn now?
What should I do today?
```

The app is not a productivity prison.

It is a private, intelligent, calm navigation system for building a meaningful, free, self-directed life.

