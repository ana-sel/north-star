# North Star — Complete Project Specification

**Version:** 1.0 — Final Security-First Edition  
**Date:** May 2026  
**Purpose:** One single source of truth for building a private, AI-powered North Star.

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

The app is **not** another productivity tool. It is a quiet command centre for a meaningful, free, and intentional life.

---

## 2. Vision & Mission Filter

### Personal Mission
> To live a happy life.  
> I explore the world’s hidden energies and rules,  
> share clarity with those who seek it,  
> build my freedom to live meaningfully,  
> and refine myself in chosen solitude.

### Mission Filter Questions (every card/goal is scored against these)

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

---

## 3. Final Tech Stack (100% Free & Private-First)

| Layer              | Choice                                      | Reason |
|--------------------|---------------------------------------------|--------|
| Mobile             | React Native + Expo                         | One codebase, excellent dev experience, free builds |
| Frontend Language  | TypeScript                                  | Type safety + modern React Native |
| Backend            | FastAPI (Python)                            | Best for AI agents, async, clean |
| Database           | PostgreSQL 16 + pgvector                    | Relational + semantic search in one DB |
| Vector Search      | pgvector (built-in)                         | No extra service needed |
| AI (Default)       | Ollama (local models)                       | Private, unlimited, zero cost |
| AI (Optional)      | OpenAI / Claude / Grok / Groq (via gateway) | Only through controlled gate + strict budget |
| Charts             | react-native-gifted-charts or Victory Native| Free, beautiful, mobile-native |
| File Storage       | Local encrypted folder → MinIO later        | Maximum privacy |
| Auth               | JWT + Expo SecureStore                      | Simple & secure |
| Scheduler          | APScheduler (Phase 1) → Celery later        | Lightweight start |
| Deployment         | Docker Compose (local/home server first)    | True privacy, zero ongoing cost |

**Golden Rule:** Local Ollama is default. External AI only through the Local AI Gateway.

---

## 4. High-Level Architecture

```
┌──────────────────────────────────────┐
│          MOBILE APP                  │
│      React Native + Expo             │
│  Chat | Today | Boards | Habits | More│
└──────────────────────────────────────┘
                 ↓ HTTPS
┌──────────────────────────────────────┐
│          FASTAPI BACKEND             │
│  Agent Orchestrator                  │
│  Local AI Gateway (security layer)   │
│  All domain services (Cards, Goals,  │
│  Habits, Health, Money, Diary, etc.) │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│     PostgreSQL + pgvector            │
│  - cards, diary_entries, health_logs │
│  - money_transactions, files         │
│  - agent_policies, ai_audit_logs     │
│  - embeddings (vector)               │
└──────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────┐
│          LOCAL AI LAYER              │
│  - Ollama (default)                  │
│  - Local Redactor                    │
│  - Privacy Classifier                │
│  - Output Scanner                    │
└──────────────────────────────────────┘
```

**Critical Rule:** No agent or service may call external AI directly. Everything external must pass through the **Local AI Gateway**.

---

## 5. Security & Privacy Architecture (Final Version)

### 5.1 Privacy Levels (applied to every data item)

```ts
PrivacyLevel =
  | "public"
  | "normal"
  | "private"
  | "sensitive"
  | "never_external"
```

**Examples:**
- Generic task title → `normal`
- Habit streak → `private`
- Weight logs, diary entries → `sensitive`
- Bank screenshots, passport, raw diary archive → `never_external`

### 5.2 Agent Policies

Every agent has a policy stored in `agent_policies` table:

```json
{
  "agentId": "money_agent",
  "canRead": ["money_summary", "budget_summary"],
  "cannotRead": ["raw_bank_screenshots", "identity_documents"],
  "canUseExternalAI": true,
  "requiresApprovalFor": ["sensitive", "never_external"],
  "defaultModel": "ollama"
}
```

### 5.3 Local AI Gateway (The Single Controlled Gate)

Every external AI request must go through this gateway. The gateway performs:

1. Privacy classification
2. Agent permission check
3. Context minimisation
4. PII redaction (hybrid: regex + semantic)
5. Prompt injection scan
6. Cost estimation
7. Human approval (if required)
8. External call (only if allowed)
9. Output scan
10. Audit logging (redacted only)
11. Return clean response

**No bypass allowed.**

### 5.4 Human Approval Rules (configurable)

| Category              | Approval Required?          |
|-----------------------|-----------------------------|
| Normal task planning  | No                          |
| Diary / Health / Money| Yes for external AI         |
| Exact balances / IDs  | Never external              |
| Private images        | Local-first or manual approval |

Approval modal shows exactly what will be sent (redacted).

### 5.5 Audit Logging

All external calls are logged in `ai_audit_logs` with:
- Redacted prompt only
- Redaction map
- Cost, tokens, approval status
- Never store raw sensitive prompts

---

## 6. Database Schema (Complete)

### Core Tables (additions only — base tables already defined in original plan)

```sql
-- Privacy levels on main tables
ALTER TABLE cards ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE diary_entries ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'sensitive';
ALTER TABLE health_logs ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'sensitive';
ALTER TABLE money_transactions ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'sensitive';
ALTER TABLE files ADD COLUMN privacy_level TEXT NOT NULL DEFAULT 'private';

-- Agent Policies
CREATE TABLE agent_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    can_read JSONB NOT NULL DEFAULT '[]',
    cannot_read JSONB NOT NULL DEFAULT '[]',
    can_use_external_ai BOOLEAN NOT NULL DEFAULT FALSE,
    requires_approval_for JSONB NOT NULL DEFAULT '["sensitive", "never_external"]',
    default_model TEXT NOT NULL DEFAULT 'ollama',
    monthly_budget_limit_gbp NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Audit Logs
CREATE TABLE ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    approved_at TIMESTAMPTZ,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_gbp NUMERIC(10,4) DEFAULT 0,
    input_scan_status TEXT DEFAULT 'not_scanned',
    output_scan_status TEXT DEFAULT 'not_scanned',
    final_status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Embedding table** (for pgvector semantic search):

```sql
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    entity_type TEXT NOT NULL,        -- 'card', 'diary', 'review', etc.
    entity_id UUID NOT NULL,
    text_hash TEXT NOT NULL,
    embedding VECTOR(1536),           -- adjust dimension to model used
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 7. Core Data Models

### Card Model (updated)

```ts
Card {
  id: string
  userId: string
  parentId?: string
  rootGoalId?: string
  title: string
  description?: string
  level: "vision" | "goal" | "project" | "milestone" | "task" | "subtask" | "focus_block"
  type: "thought" | "goal" | "task" | "habit" | ...
  status: "inbox" | "planned" | "today" | "in_progress" | ...
  lifeArea: string
  privacyLevel: "public" | "normal" | "private" | "sensitive" | "never_external"
  embeddingStatus: "not_embedded" | "embedded" | "needs_update"
  missionScores: { happiness: number, ... }
  assignedAgentIds: string[]
  createdAt: string
  updatedAt: string
}
```

---

## 8. Agent System

### MVP Agents (Phase 1–2)

1. **Capture Agent** — turns raw chat into structured cards
2. **Goal Architect Agent** — splits goals into trees
3. **Mission Agent** — scores cards against mission filter
4. **Focus Agent** — decides what belongs on Today
5. **Review Agent** — daily/weekly pattern detection

**Later agents:** Energy, Health, Money, Productivity, Learning, Healing, Research.

**Implementation:** One `AgentOrchestrator` that routes to role-based prompts. Do not build 12 separate agents early.

---

## 9. Feature Breakdown & Navigation

### 9.1 Mobile Navigation (5 bottom tabs)

```
Chat | Today | Plan | Track | More
```

| Tab | Contains | Notes |
|-----|----------|-------|
| **Chat** | Capture + Intake Filter | Filter is part of chat flow, not a separate screen |
| **Today** | Global Today | Energy stats, top 1–3 tasks, do-not-do, Focus Agent |
| **Plan** | Segmented: Year · Month · Projects | Compass/Pillars accessible from header |
| **Track** | Segmented: Habits · Health · Money | Each as a dashboard view |
| **More** | Diary, Goals tree, Reviews, Files, Agents, Search, Settings | Secondary screens |

### 9.2 Design Language

**Palette:** Warm paper aesthetic — calm, low-contrast, never clinical.

```
Background:      #f5f3ee (warm paper)
Panel:           #fffdf8 (cream white)
Border/line:     #d9d2c7 (soft warm gray)
Text:            #2f2a24 (deep warm brown)
Muted:           #746b61 (warm gray)
Soft highlight:  #ebe4d8 (cream gold)
```

**Life area colors** (left-border on cards):

| Pillar | Color | Hex |
|--------|-------|-----|
| Health & Energy | Green | #7f9f78 |
| Inner Growth | Purple | #9b86ba |
| Money & Freedom | Blue | #779db6 |
| Family | Rose | #b77a7c |
| Joy & Exploration | Orange | #c99555 |
| Contribution | Olive | #8b9b72 |

**Component style:**
- Cards: 18–22px border-radius, 1px border, subtle shadow
- Stats: grid of 3, uppercase 11px labels + large 24px values
- Habit matrix: day × habit table with ✓/×/— symbols
- Tags/pills: 999px radius, warm background
- Modals: bottom-sheet style (24px top radius)

### 9.3 Screen Details

#### Chat (Tab 1)
- Primary input for all capture
- AI responds with structured cards + guidance
- **Intake Filter** is embedded: raw thoughts → Want/Need classification → Mission Filter → Exit Decision (keep/later/archive/delete/split/clarify)
- Fake-want review: rejected items become archived self-knowledge insights, not just deleted

#### Today (Tab 2)
- **Global Today** — one shared bottleneck across all boards
- Shows: energy/mood/sleep stats, top 1–3 tasks (from any board), do-not-do list
- Focus Agent guidance
- A card from any board (month, project, habit) can appear here via `today = true` flag — never copied

#### Plan (Tab 3 — segmented)
- **Year Board** — 3 columns: This Year / Scheduled / Done
- **Month Board** — 7 columns: Inbox, This Month, This Week, In Progress, Waiting, Done, Review
- **Project Boards** — per-project Kanban (Backlog, In Progress, Done)
- Carryover logic: unfinished cards roll forward with `carryover_count + 1`. At 3 carryovers, forced review
- Cards color-coded by life pillar (left border)
- Compass/Pillars view accessible from Plan header (mission + 6 life areas)

#### Track (Tab 4 — segmented)
- **Habits** — matrix view: rows = habits, columns = days. Done/Not Done/Skipped. Streaks + agent insights
- **Health** — dashboard: sleep, weight, energy, mood, calories, protein, steps. Charts + patterns
- **Money** — dashboard: monthly spend, AI budget, cash flow, FIRE progress, categories. Charts + agent insights

#### More (Tab 5)
- Diary (sensitive reflections + approval flow for external AI)
- Goals (tree view)
- Reviews (daily/weekly/monthly/yearly pattern detection)
- Files (encrypted private vault)
- Agents (view policies, budgets, audit logs)
- Search (semantic search across all cards)
- Settings

### 9.4 Key Design Rules

1. **Raw first, filter second.** Capture everything, but nothing becomes active until it passes the intake + mission filter.
2. **Today is global.** Never duplicated across boards. One shared view.
3. **Habits are separate from Kanban.** Tracked by day, not as repeating task cards.
4. **Health & Money are integrated dashboards**, not separate apps.
5. **Fake wants become insights.** Rejected items are archived with reasoning, not just deleted.
6. **3-carryover rule.** A card moved 3+ times triggers mandatory review.
7. **Color = life area.** Every card has a visible pillar color for instant recognition.

---

## 10. Build Roadmap (Exact Order)

**Phase 0 — Foundation (Current)**
- Security specification + database schema (done)

**Phase 1 — Data Tagging**
- PrivacyLevel enum
- `privacy_level` columns on all main tables
- `agent_policies` table + seed data

**Phase 2 — Gateway Shell**
- `LocalAIGateway` class skeleton
- Permission checks + audit logging
- Provider routing (Ollama placeholder)

**Phase 3 — Hybrid Redactor**
- Regex + semantic redaction (Ollama)
- Basic PII replacement with placeholders

**Phase 4 — Human Approval Flow**
- Approval modal in React Native
- Approve/reject endpoints

**Phase 5 — Full External AI**
- Safe external calls through gateway only

**Phase 6+** — Full agents, goal tree, Kanban, etc. (as per original plan)

---

## 11. Coding Standards & Best Practices

- TypeScript strict mode on frontend
- Pydantic v2 + SQLAlchemy 2.0 on backend
- All external AI calls must go through `LocalAIGateway`
- Never store raw sensitive prompts in audit logs
- Use `JSONB` for flexible policy and redaction data
- Docker Compose for local development (Postgres + pgvector + Ollama)
- All sensitive data encrypted at rest where possible

---

## 12. Final Golden Rules

1. Local Ollama is the default for everything sensitive.
2. External AI is a privilege, not a right — always redacted and audited.
3. Privacy level is mandatory on every data item.
4. No agent bypasses the Local AI Gateway.
5. Human approval is required for sensitive external calls.
6. The app must reduce mental noise, not add more.

---

**This document is the single source of truth.**

Any AI reading this file now has complete knowledge of:
- Vision & mission
- Final architecture
- Security model
- Database schema
- Build order
- All critical rules

It can begin implementation immediately without further clarification.

---

*End of Specification*