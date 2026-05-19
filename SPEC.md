# North Star — Project Specification

**Version:** 2.0 — Unified Edition  
**Date:** May 2026  
**Purpose:** Single source of truth for building and maintaining North Star.

---

## 1. Executive Summary

**North Star** is a private, mobile-first life operating system that combines:

- ChatGPT-style conversational capture
- Trello/Planyway-style task & goal management
- Habit, health, money, and diary tracking
- Specialised AI agents with a personal mission filter
- Goal-tree architecture
- Strong privacy and security by design

**Core Principle:**  
Everything starts from the AI chat. Everything becomes structured data. Everything is reviewed by agents. Everything moves toward the next correct action — while protecting your privacy and energy at all times.

**Core Promise (8 lines):**
> Capture everything. Filter honestly. Split intelligently. Focus narrowly.  
> Track reality. Review patterns. Protect energy. Build freedom.

The app is **not** another productivity tool. It is a quiet command centre for a meaningful, free, and intentional life.

---

## 2. Vision & Mission Filter

### Personal Mission
> To live a happy life.  
> I explore the world's hidden energies and rules,  
> share clarity with those who seek it,  
> build my freedom to live meaningfully,  
> and refine myself in chosen solitude.

**The mission is user-editable** — the app must support custom mission statements and filter questions.

### Mission Filter Questions (every card/goal is scored 0–10 against these)

| Filter            | Question |
|-------------------|----------|
| Happiness         | Does this support a happier, calmer, more meaningful life? |
| Hidden Rules      | Does this help me understand deeper patterns of life, people, money, systems, health, or myself? |
| Clarity           | Does this create clarity for me or others? |
| Freedom           | Does this increase financial, emotional, time, physical, or location freedom? |
| Self-Refinement   | Does this refine my body, mind, skills, discipline, taste, or character? |
| Chosen Solitude   | Does this respect peace, privacy, independence, and low-noise living? |
| Meaning           | Does this make life more intentional? |

**Decision outcomes:** Keep / Delete / Later / Delegate / Split / Clarify / Archive

**Fake-want rule:** Rejected items become archived self-knowledge insights (not just deleted).

---

## 3. Tech Stack

| Layer              | Choice                                      |
|--------------------|---------------------------------------------|
| Mobile             | React Native + Expo (TypeScript)            |
| Backend            | FastAPI (Python 3.14)                       |
| Database           | PostgreSQL 16 + pgvector                    |
| AI (Default)       | Ollama (local, private, free)               |
| AI (Optional)      | OpenAI / Claude via Local AI Gateway        |
| Charts             | react-native-gifted-charts                  |
| File Storage       | Local encrypted folder (Fernet)             |
| Auth               | JWT + Expo SecureStore (DEV_USER_ID for now)|
| Scheduler          | APScheduler                                 |
| Deployment         | Docker Compose (local-first)                |
| APK Build          | EAS Build (Expo)                            |

**Golden Rule:** Local Ollama is default. External AI only through the Local AI Gateway.

---

## 4. Architecture

```
┌──────────────────────────────────────┐
│          MOBILE APP                  │
│      React Native + Expo             │
│  Chat | Today | Plan | Track | More  │
└──────────────────────────────────────┘
                 ↓ HTTPS
┌──────────────────────────────────────┐
│          FASTAPI BACKEND             │
│  Agent Orchestrator (12 agents)      │
│  Local AI Gateway (security layer)   │
│  Domain services (Cards, Goals,      │
│  Habits, Health, Money, Diary, etc.) │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│     PostgreSQL + pgvector            │
│  cards, diary_entries, health_logs,  │
│  money_transactions, habits, files,  │
│  agent_policies, ai_audit_logs,      │
│  embeddings (vector), users          │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│          LOCAL AI LAYER              │
│  Ollama · Redactor · Scanner         │
└──────────────────────────────────────┘
```

**Critical Rule:** No agent may call external AI directly. Everything external passes through the Local AI Gateway (13-step flow: classify → check policy → minimise → redact → scan input → estimate cost → human approval → call → scan output → audit → return).

---

## 5. Security & Privacy

### 5.1 Privacy Levels

| Level | Example | External AI? |
|-------|---------|-------------|
| `public` | Generic task title | Yes |
| `normal` | Work task | Yes (redacted) |
| `private` | Habit streak | Approval required |
| `sensitive` | Diary, health, money | Approval required |
| `never_external` | Bank screenshots, passport | Never |

### 5.2 Agent Policies
Every agent has a policy in `agent_policies`: `can_read`, `cannot_read`, `can_use_external_ai`, `requires_approval_for`, `default_model`, `monthly_budget_limit_gbp`.

### 5.3 AI Routing Rules

| Data type | Routing |
|-----------|---------|
| Normal card | Local or cheap external |
| Diary | Local only |
| Money | Local summary + approval for external |
| Health | Local + approval |
| Research | External OK, no personal data |
| Files | Local only unless approved |

### 5.4 Human Approval
Approval modal shows exactly what will be sent (redacted). 15-min auto-expiry.

### 5.5 Audit Logging
All external calls logged in `ai_audit_logs` with redacted prompt, cost, tokens, approval status. Raw sensitive prompts never stored.

### 5.6 AI Budget Control
Monthly/daily/per-agent/per-provider budget limits. Hard stop when limit reached.

---

## 6. Database Schema

### Tables (12 implemented)

| Table | Purpose |
|-------|---------|
| `users` | Auth (email/password) + `mission_data` JSONB |
| `cards` | Full goal/task tree with mission_scores, assigned_agent_ids |
| `habits` | Habit definitions (title, frequency, input type) |
| `habit_logs` | Per-day log per habit |
| `diary_entries` | Private reflections with mood |
| `health_logs` | Per-user-per-day (sleep, weight, mood, steps, energy, calories, protein) |
| `money_transactions` | Income/expense with category |
| `energy_logs` | Low/medium/high + notes, timestamped |
| `files` | File metadata + Fernet-encrypted storage |
| `embeddings` | pgvector for semantic search |
| `agent_policies` | Agent permission rules |
| `ai_audit_logs` | Audit trail for every AI request |
| `pending_approvals` | Approval queue with redacted_prompt + expiry |

---

## 7. Data Models

### Card Model

```
Card {
  id, userId, parentId, rootGoalId
  title, description
  level: vision | goal | project | milestone | task | subtask | focus_block
  type: thought | goal | task | habit | research | decision
  status: inbox | planned | today | in_progress_my_side | in_progress_other_side | waiting | done | review | filtered | archived
  lifeArea: health_energy | inner_growth | money_freedom | family | joy_exploration | contribution | work_skills | home_property | app_building
  privacyLevel, embeddingStatus
  missionScores: { happiness, hidden_rules, clarity, freedom, self_refinement, chosen_solitude, meaning }
  energyRequired: low | medium | high
  estimatedMinutes, dueDate, movedCount, priority
  assignedAgentIds, completedAt, createdAt, updatedAt
}
```

**Focus block rule:** 30/60/90 min or 1 day max.  
**Parent persistence:** Parent cards remain visible after splitting (never disappear).

### Habit Input Types
- `yes_no` — simple toggle
- `number` — numeric value (glasses of water, pages read)
- `time` — duration (meditation minutes)
- `scale` — 1–10 rating
- `text` — free-form note

---

## 8. Agent System

### 8.1 All Agents (13)

| # | Agent | Purpose |
|---|-------|---------|
| 1 | **Capture** | Turns raw chat into structured cards (local-only) |
| 2 | **Mission** | Scores cards against 7 mission filter dimensions |
| 3 | **Goal Architect** | Splits goals into subtask trees |
| 4 | **Focus** | Picks 1–3 today-cards given energy + mood |
| 5 | **Review** | Daily/weekly/monthly pattern detection |
| 6 | **Energy** | Energy log analysis + recommendations |
| 7 | **Health** | Sleep/weight/mood trends + alerts |
| 8 | **Money** | Budget/spending patterns + FIRE progress |
| 9 | **Productivity** | Task velocity insights |
| 10 | **Learning** | Study-habit analytics |
| 11 | **Healing** | Emotional/body-care patterns (always local) |
| 12 | **Research** | Research-item clustering |
| 13 | **Council** | Multi-agent "what should I do today?" orchestration |

### 8.2 Agent Council
When user asks "What should I do today?", the app runs an internal council: Mission → Energy → Health → Money → Productivity → Focus → Review agents all contribute votes with recommendations. The council synthesizes into a prioritized answer.

### 8.3 Chat Processing Pipeline (10 steps)
1. Detect emotional/cognitive state
2. Extract thought units
3. Create card(s)
4. Link to existing goals
5. Run mission filter (want/need classification → 7-dimension scoring → exit decision)
6. Assign life area
7. Assign responsible agent
8. Route to Inbox/GoalTree/Kanban
9. Suggest next actions
10. Update review data

### 8.4 AI Response Style
- Short, structured, calm, direct, actionable
- Never dramatic, never overloaded
- "Never suggest 25 things" — max 3 suggestions at a time

### 8.5 Scheduled Reviews

**Morning review:** top 3 tasks, energy forecast, blocked items, habit status, calendar conflicts, quick win suggestion.

**Evening review:** tasks completed, tasks postponed + why, energy pattern, tomorrow's priority, one reflection question.

**Weekly review:** completed by area, habits consistency, stuck cards, energy trend, money summary, main bottleneck, next week focus.

**Monthly review:** completed by area, habit consistency %, most postponed goals, energy pattern, money pattern, health pattern, emotional pattern, main bottleneck, next month recommendation.

---

## 9. Navigation & Screens

### 9.1 Bottom Tabs (5)

```
Chat | Today | Plan | Track | More
```

### 9.2 Screen Map

| Screen | Tab | Purpose |
|--------|-----|---------|
| ChatScreen | Chat | Capture + intake filter flow |
| TodayScreen | Today | Energy/mood stats, top 1–3 tasks, do-not-do, Focus Agent, council |
| PlanScreen | Plan | Year board · Projects view |
| BoardsScreen | Plan | 7-column Kanban with drag-and-drop |
| TrackScreen | Track | Segmented: Habits · Health · Money |
| HabitsScreen | Track | Habit dashboard + daily toggles |
| HealthScreen | Track | Sleep/weight/energy/mood charts |
| MoneyScreen | Track | Transactions + category summary + charts |
| DiaryScreen | More | Reflection prompts, mood streak, edit/delete |
| GoalsScreen | More | Indented goal tree with add-child |
| CompassScreen | More | Life pillar balance (bar chart) |
| ReviewScreen | More | Daily/weekly/monthly/yearly review tabs |
| MissionEditorScreen | More | Edit mission statement + filter questions |
| SearchScreen | More | Semantic search across all cards |
| FilesScreen | More | Encrypted private vault |
| ApprovalsListScreen | More | Review pending AI approval requests |
| AuditLogsScreen | More | AI usage transparency (summary + log list) |
| SettingsScreen | More | API config, notifications, privacy, about |
| ProductivityInsightsScreen | More | Task velocity + completion rate |
| LearningInsightsScreen | More | Study cards + learning habits |
| HealingInsightsScreen | More | Diary, mood/energy, healing habits |
| ResearchInsightsScreen | More | Research card progress |
| CardDetailScreen | Modal | Full card editor |
| LoginScreen | Auth gate | Email/password login + register (shown when no JWT token) |

### 9.3 Design Language

**Palette:** Warm paper aesthetic — calm, low-contrast, never clinical.

| Token | Hex |
|-------|-----|
| Background | `#f5f3ee` |
| Surface | `#fffdf8` |
| Border | `#d9d2c7` |
| Text | `#2f2a24` |
| Muted | `#746b61` |
| Soft | `#ebe4d8` |
| Primary | `#6a5a46` |
| Danger | `#bf6b62` |
| Success | `#7f9f78` |

**Pillar colors** (left-border on cards):

| Pillar | Hex |
|--------|-----|
| Health & Energy | `#7f9f78` |
| Inner Growth | `#9b86ba` |
| Money & Freedom | `#779db6` |
| Family | `#b77a7c` |
| Joy & Exploration | `#c99555` |
| Contribution | `#8b9b72` |

**Component rules:** 18–22px border-radius, 1px border, bottom-sheet modals (24px top radius), 999px pills.

**UI feel:** Calm, intelligent, private, serious, warm, minimal. No neon, no gamification badges, no shouting notifications.

### 9.4 Key Design Rules

1. **Raw first, filter second.** Capture everything, filter through mission before activating.
2. **Today is global.** One shared view across all boards — never duplicated.
3. **Habits are separate from Kanban.** Tracked by day, not as repeating cards.
4. **Health & Money are integrated dashboards**, not separate apps.
5. **Fake wants become insights.** Rejected items archived with reasoning.
6. **3-carryover rule.** Card moved 3+ times triggers mandatory review modal.
7. **Color = life area.** Every card has a visible pillar color.

---

## 10. API Endpoints

### Cards & Goals
- `POST /cards` — create card
- `GET /cards` — list cards (with filters)
- `GET /cards/{id}` — get card
- `PATCH /cards/{id}` — update card
- `DELETE /cards/{id}` — delete card
- `GET /cards/tree` — goal tree
- `GET /cards/search` — semantic search

### Agents (all POST)
- `/agents/capture` — raw text → structured card
- `/agents/focus` — pick 1–3 today-cards
- `/agents/architect` — split goal into subtasks
- `/agents/filter` — mission scoring + exit decision
- `/agents/review` — pattern insights
- `/agents/energy` — energy analysis
- `/agents/health` — health trends
- `/agents/money` — spending patterns
- `/agents/productivity` — task velocity
- `/agents/learning` — study analytics
- `/agents/healing` — emotional patterns
- `/agents/research` — research clustering
- `/agents/council` — multi-agent daily advice
- `GET/PUT /agents/mission/{user_id}` — mission CRUD

### Tracking
- `POST/GET /habits`, `POST /habits/log` — habits + daily logs
- `POST/GET /health` — health logs (upsert per day)
- `POST/GET /energy` — energy logs
- `POST/GET /money`, `GET /money/summary` — transactions
- `GET/POST/PATCH/DELETE /diary` — diary entries

### Security & Admin
- `POST /auth/register`, `POST /auth/login` — JWT auth
- `GET/POST /approvals`, `POST /approvals/{id}/approve|reject` — approval flow
- `GET /audit`, `GET /audit/summary` — audit log viewing
- `POST /gateway/test` — gateway sanity check
- `POST/GET /files` — encrypted file storage

---

## 11. Coding Standards

- TypeScript strict mode on frontend
- Pydantic v2 + SQLAlchemy 2.0 on backend
- All external AI calls through `LocalAIGateway`
- Never store raw sensitive prompts
- Docker Compose for local dev
- AI response style: short, calm, max 3 suggestions

---

## 12. Build Status

### Infrastructure
- [x] Docker Compose (PostgreSQL + pgvector + Ollama)
- [x] FastAPI backend skeleton + config + DB
- [x] Alembic migrations (6 versions)
- [x] Expo + React Native mobile scaffold
- [x] EAS Build config (APK + AAB profiles)

### Security & Privacy
- [x] PrivacyLevel enum + privacy_level on all tables
- [x] Agent policies table + seed data
- [x] Local AI Gateway (13-step flow)
- [x] Hybrid redactor (regex + vocabulary + optional semantic)
- [x] Output scanner (prompt injection detection)
- [x] Human approval flow (pending_approvals + 15-min expiry)
- [x] Real external providers (OpenAI + Claude via httpx)
- [x] Cost estimation + token-accurate billing
- [x] Audit logging (redacted only, never raw)

### Data & Models
- [x] Cards — full CRUD + tree + search + mission_scores
- [x] Habits + habit_logs — CRUD + daily upsert
- [x] Diary entries — CRUD with mood
- [x] Health logs — upsert per day (sleep/weight/mood/energy/calories/protein/steps)
- [x] Money transactions — CRUD + category summary
- [x] Energy logs — POST/GET with level + notes
- [x] Files — upload/download with Fernet encryption
- [x] Embeddings — pgvector + background backfill on card CRUD
- [x] Users — register/login + mission_data JSONB

### Agents (13)
- [x] Capture Agent (local-only, raw text → structured card)
- [x] Mission Agent (7-dimension scoring + exit decision)
- [x] Goal Architect Agent (split into subtask tree)
- [x] Focus Agent (1–3 picks by energy/mood + do-not-do + heuristic fallback)
- [x] Review Agent (daily/weekly/monthly patterns + health/habit/energy context)
- [x] Energy Agent (energy log analysis)
- [x] Health Agent (sleep/weight/mood trends)
- [x] Money Agent (spending patterns + categories)
- [x] Productivity Agent (task velocity + completion rate)
- [x] Learning Agent (study cards + learning habits)
- [x] Healing Agent (emotional/body-care patterns, always local)
- [x] Research Agent (research card clustering)
- [x] Agent Council (multi-agent "what should I do today?")

### Mobile Screens (25)
- [x] ChatScreen — capture + intake filter + council button
- [x] TodayScreen — energy/mood/sleep stats + Focus Agent + council votes
- [x] PlanScreen — year board + projects view (real data)
- [x] BoardsScreen — 7-column Kanban + drag-and-drop + carryover modal (3-move stuck detection)
- [x] TrackScreen — segmented habits/health/money
- [x] HabitsScreen — habit dashboard + daily toggles
- [x] HealthScreen — charts (sleep bars, energy/mood lines, weight trend)
- [x] MoneyScreen — transactions + spending bar chart
- [x] DiaryScreen — guided reflection prompts + mood streak + edit/delete + detail modal
- [x] GoalsScreen — indented tree + add child
- [x] CompassScreen — life pillar balance bars + neglected badges
- [x] ReviewScreen — daily/weekly/monthly tabs with stats
- [x] MissionEditorScreen — edit mission statement + filter questions
- [x] SearchScreen — semantic search
- [x] FilesScreen — encrypted file browser
- [x] ApprovalsListScreen + ApprovalDetailScreen — approval flow
- [x] AuditLogsScreen — AI usage summary + log list
- [x] SettingsScreen — API config, notifications, privacy, about
- [x] ProductivityInsightsScreen — task velocity charts
- [x] LearningInsightsScreen — study analytics
- [x] HealingInsightsScreen — mood/energy/diary patterns
- [x] ResearchInsightsScreen — research progress
- [x] CardDetailScreen — full card editor modal

### Services & Scheduling
- [x] Embedding service (Ollama + pgvector + hash dedup)
- [x] Scheduler — embedding backfill + daily digest + habit reminder
- [x] Local notifications (morning review, bedtime reflection, overload alert)

### Design
- [x] Warm paper theme + pillar colors
- [x] Card pillar left-border coloring
- [x] Stat grid icons (energy/mood/sleep)
- [x] Boards drag-and-drop (PanResponder + Animated)

---

## 13. Remaining Work

### Must-have (MVP completeness)
- [x] **JWT auth (real)** — LoginScreen + AuthContext + SecureStore + jwt-decode; logout in Settings
- [x] **Fake-want archive** — ARCHIVED status + rejection_insight column; filter sets archived + stores reasoning
- [x] **Yearly review** — ReviewWindow includes "yearly" (365 days); Year tab in ReviewScreen
- [x] **Habit input types** — backend + mobile UI already support yes_no, number, time, scale, text
- [x] **AI budget enforcement** — daily per-agent, monthly per-agent, global daily, global monthly hard stops in gateway

### Nice-to-have (post-MVP)
- [x] **Diary image + OCR** — `POST /diary/ocr` using local Ollama vision model; "Extract text from photo" button on DiaryScreen
- [x] **Calendar/time-blocking** — `GET /calendar/ics` pull-through ICS reader (Google/iCloud secret URLs, no OAuth); time-blocking UI is post-MVP
- [x] **Chat as command centre** — slash commands `/spend`, `/income`, `/energy`, `/habit`, `/help` in ChatScreen; full agent triggers post-MVP
- [x] **Production Docker hardening** — multi-stage Dockerfile, non-root UID, `read_only` rootfs, dropped capabilities, pinned image tags, secrets via env, internal network, healthchecks
- [x] **Wearable integration** — `POST /wearables/import` bulk-upsert into health_logs from Apple Health / Fitbit / Garmin / Oura JSON exports; continuous OAuth sync post-MVP
- [x] **AI budget dashboard** — `GET /audit/budget` + AIBudgetScreen with global + per-agent daily/monthly progress bars

---

## 14. Golden Rules

1. Local Ollama is the default for everything sensitive.
2. External AI is a privilege, not a right — always redacted and audited.
3. Privacy level is mandatory on every data item.
4. No agent bypasses the Local AI Gateway.
5. Human approval is required for sensitive external calls.
6. The app must reduce mental noise, not add more.

---

*End of Specification*
