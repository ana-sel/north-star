# North Star

A private, AI-powered Personal Navigation OS — a quiet command centre for a meaningful, free, intentional life.

See [SPEC.md](SPEC.md) for the complete project specification, build status, and remaining work.

> **Legacy specs** (superseded by SPEC.md): `personal-navigation-os-spec.md`, `personal_navigation_os_project_spec.md`

---

## Build status

- [x] **Phase 0** — Specification
- [x] **Phase 1** — Foundation + Data Tagging
  - FastAPI backend skeleton
  - Docker Compose (PostgreSQL + pgvector, Ollama)
  - Base tables: users, cards, diary_entries, health_logs, money_transactions, files
  - `PrivacyLevel` enum + `privacy_level` column on all sensitive tables
  - `agent_policies` table + seed data for MVP agents
  - `ai_audit_logs` table
  - `embeddings` table (pgvector)
- [x] **Phase 2** — Local AI Gateway shell
  - `LocalAIGateway` orchestrator with full 13-step flow
  - Permission checks against `agent_policies` (`cannot_read` enforced)
  - Privacy-level routing (`never_external` always local, `force_local` honoured)
  - Working Ollama provider; OpenAI / Claude as fail-loud stubs
  - Every call writes an `ai_audit_logs` row (raw prompts never stored)
- [x] **Phase 3** — Hybrid redactor
  - Regex pass: emails, phones, URLs, IBAN, card numbers, money amounts
  - Vocabulary pass: family / income / property / employer phrases
  - Optional Ollama semantic pass (local-only, off by default)
- [x] **Phase 4** — Human approval flow
  - `pending_ai_approvals` table + lifecycle
  - Gateway redacts → enqueues pending row → returns `awaiting_approval`
  - 15-min auto-expiry on pending approvals
  - Cost estimator (rough per-model £)
- [x] **Phase 5** — Full external AI
  - Real `ClaudeProvider` + `OpenAIProvider` (httpx)
  - Token-accurate `actual_cost_gbp` after each call
  - Budget enforcement per agent
- [x] **Phase 6** — Mobile app scaffold
  - Expo + React Native + TypeScript under `mobile/`
  - Bottom tabs: Chat | Today | Plan | Track | More
- [x] **Phase 7** — Cards + Capture Agent
  - `GET/POST/PATCH/DELETE /cards` (privacy-level aware)
  - `POST /agents/capture` — local-only Capture Agent
  - Mobile Chat screen: send thought → see draft → save as card → auto-run Intake Filter (mission scores + decision)
  - Chat currently handles capture + intake filter; full command centre (trigger any agent, create habits/diary/health/money, run reviews, "what should I do today?") planned for later
- [x] **Phase 8** — Kanban + status transitions
  - Auto-bumps `moved_count`, stamps `completed_at`
  - Mobile Boards screen: horizontal Kanban, tap/long-press/drag
  - Stuck-card visual: orange border + `stuck × N` badge
- [x] **Phase 9** — Today screen + Focus Agent
  - `POST /agents/focus` — picks 1–3 cards given energy + mood
  - Heuristic fallback when Ollama unavailable
  - Energy 0–5 DBT-style scale + mood 0–5
  - Dynamic "do not do" rules from real card state
  - Dynamic Focus Agent insight (energy + mood aware)
  - Auto-triggers Focus Agent when energy is logged
  - Habit collapse on low energy + energy mismatch warnings on tasks
- [x] **Phase 10** — Card detail screen
  - Full view + edit of any card, delete with confirmation
  - Boards uses `useFocusEffect` to refetch on tab return
- [x] **Phase 11** — Goal tree
  - `GET /cards/tree` returns nested `CardTreeNode[]`
  - Mobile Goals screen: indented tree, add child at next level
- [x] **Phase 12** — Habits + Energy + Health + Money
  - Habits API + Today screen toggles + HabitsScreen dashboard
  - Energy log API + 0–5 DBT-style picker on Today
  - HealthScreen: sleep/weight/energy/mood/calories/protein/steps logging
  - Sleep bar chart + energy/mood trend line chart + weight trend chart
  - MoneyScreen: transactions + category summary + spending bar chart
- [x] **Phase 13** — Intake Filter + Mission Scoring
  - `POST /agents/filter` — scores cards against 7 mission questions (0–10)
  - Want/need classification (want, need, obligation, impulse, external_pressure)
  - Exit decision (keep/delete/later/delegate/split/clarify/archive)
  - Heuristic fallback with keyword-based scoring
  - Auto-runs after saving a card in Chat → shows scores + decision inline
  - Persists `mission_scores` on the card
- [x] **Phase 14** — Compass + Life Pillars
  - CompassScreen: bar chart per pillar showing active/done/total cards + mission avg
  - "Neglected" badge for pillars with zero activity
  - Accessible from More tab
- [x] **Phase 15** — Plan with real data
  - Year board: real visions/goals/projects grouped by life area (was hardcoded)
  - Projects view: real project cards with child progress % and column counts (was hardcoded)
  - Boards: 7 columns (Inbox · Planned · Today · Doing · Waiting · Done · Review)
- [x] **Boards drag-and-drop** — real DnD via `PanResponder` + `Animated`
- [x] **Pillar colors** — 4px colored left border on cards by life area (8 pillar colors)
- [x] **Stat grid icons** — ⚡ Energy, 😊 Mood, 🌙 Sleep
- [ ] **Remaining** — Diary image+OCR, monthly/yearly reviews, more agent insights

---

## Quick start (Phase 1)

```powershell
# 1. Start Postgres + Ollama
docker compose up -d

# 2. Install backend deps
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Run migrations
alembic upgrade head

# 4. Seed agent policies
python -m app.seed

# 5. Run the API
uvicorn app.main:app --reload
```

Then open <http://localhost:8000/docs>.

---

## Project structure

```
north-star/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI entrypoint
│   │   ├── config.py            Settings (env)
│   │   ├── db.py                SQLAlchemy engine + session
│   │   ├── enums.py             PrivacyLevel, CardStatus, LifeArea, etc.
│   │   ├── seed.py              Seed agent_policies
│   │   ├── scheduler.py         Background tasks
│   │   ├── models/              ORM models (card, health_log, energy, habit, etc.)
│   │   ├── api/                 Routers (agents, cards, health, habits, energy, money, diary, files, approvals, gateway)
│   │   ├── gateway/             Local AI Gateway (providers, redactor, scanner, schemas)
│   │   ├── services/            Business logic services
│   │   └── utils/               Helpers
│   ├── alembic/                 Migrations (0001–0006)
│   ├── tests/                   Unit tests
│   ├── static/                  approval-demo.html
│   ├── alembic.ini
│   └── requirements.txt
├── mobile/
│   ├── src/
│   │   ├── theme.ts             Design tokens + PILLAR_COLOR map
│   │   ├── api/                 API clients (cards, health, habits, energy, money)
│   │   ├── config/              API_BASE_URL, DEV_USER_ID
│   │   ├── navigation/          RootNavigator + types
│   │   ├── screens/             All screens (Chat, Today, Plan, Track, Boards, Health, Habits, Money, Compass, Goals, CardDetail, etc.)
│   │   └── components/          Shared UI components
│   ├── App.tsx
│   └── package.json
├── docker-compose.yml
├── README.md
├── personal-navigation-os-spec.md
└── personal_navigation_os_project_spec.md
```

---

## Golden rules

1. Local Ollama is the default for everything sensitive.
2. External AI is a privilege, not a right — always redacted and audited.
3. Privacy level is mandatory on every data item.
4. No agent bypasses the Local AI Gateway.
5. Human approval is required for sensitive external calls.
6. The app must reduce mental noise, not add more.

## Mobile app (Phase 6 bootstrap)

```powershell
cd mobile
npm install        # only on first run
npm run web        # easiest: opens in the browser
# or:
npm run android    # via Expo Go on a connected device / emulator
```

### Configure backend URL

Edit `mobile/src/config/api.ts`:

- `npm run web` on the same machine: `http://localhost:8000` works.
- Expo Go on a phone (same Wi-Fi): use your dev machine's LAN IP, e.g. `http://192.168.1.42:8000`.
- Android emulator: `http://10.0.2.2:8000` reaches the host.

`DEV_USER_ID` is the user whose pending approvals you want to review (until JWT auth lands).

