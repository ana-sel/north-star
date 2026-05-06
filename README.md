# North Star

A private, AI-powered Personal Navigation OS — a quiet command centre for a meaningful, free, intentional life.

See [personal-navigation-os-spec.md](personal-navigation-os-spec.md) and [personal_navigation_os_project_spec.md](personal_navigation_os_project_spec.md) for the full specification.

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
  - Stub redactor / scanner / approval (Phases 3 & 4 placeholders)
  - Every call writes an `ai_audit_logs` row (raw prompts never stored)
  - Dev endpoint `POST /gateway/test`
- [x] **Phase 3** — Hybrid redactor
  - Regex pass: emails, phones, URLs, IBAN, card numbers, money amounts
  - Vocabulary pass: family / income / property / employer phrases (extensible via `REDACTOR_VOCAB_PATH`)
  - Optional Ollama semantic pass (local-only, off by default)
  - Audit log stores `redacted_prompt` + placeholder→category map only — never originals
  - 7 unit tests passing
- [x] **Phase 4** — Human approval flow
  - `pending_ai_approvals` table + lifecycle (`pending` → `approved`/`rejected`/`expired`/`executed`)
  - Gateway redacts → enqueues pending row → returns `awaiting_approval` with redacted preview
  - Endpoints: `GET /approvals`, `GET /approvals/{id}`, `POST /approvals/{id}/approve`, `POST /approvals/{id}/reject`
  - 15-min auto-expiry on pending approvals
  - Cost estimator (rough per-model £)
  - HTML demo page at `http://localhost:8000/static/approval-demo.html` (temporary — replaced by the React Native modal in Phase 6)
  - 12 unit tests passing
- [x] **Phase 5** — Full external AI
  - Real `ClaudeProvider` (Anthropic Messages API via httpx)
  - Real `OpenAIProvider` (Chat Completions API via httpx)
  - Token-accurate `actual_cost_gbp` after each call
  - Budget enforcement: gateway sums month-to-date spend per agent (completed + awaiting_approval) and refuses with `blocked_by_budget` when adding the planned cost would exceed `agent_policies.monthly_budget_limit_gbp`
  - Missing API key → clean `ProviderError` (audit log records `provider_error`, no money spent)
  - HTTP 4xx/5xx and network errors mapped to `ProviderError`
  - 24 unit tests passing (no real network calls — providers tested via `httpx.MockTransport`)
- [x] **Phase 6 (bootstrap)** — Mobile app scaffold
  - Expo + React Native + TypeScript under `mobile/`
  - Bottom tabs per spec §9: **Chat | Today | Boards | Habits | More** (Chat/Today/Boards/Habits are placeholders for later phases)
  - **Approval review flow** in React Native: list pending → modal with redacted prompt + redaction map + cost → Approve / Reject
  - Talks to backend via `mobile/src/config/api.ts` (`API_BASE_URL`, `DEV_USER_ID` — JWT/SecureStore wires in later)
- [x] **Phase 7** — Cards + Capture Agent
  - Backend: `GET/POST/PATCH/DELETE /cards` (privacy-level aware)
  - Backend: `POST /agents/capture` — Capture Agent (local-only via gateway, returns a structured card draft; falls back to a raw-thought draft if local model is unavailable)
  - Mobile **Chat** screen: send a thought → see a draft → save as card
  - Mobile **Boards** screen: live list of your cards (Kanban columns + drag come later)
  - 32 unit tests passing (8 new for the capture parser)
- [x] **Phase 8** — Kanban + status transitions
  - Backend: `PATCH /cards/{id}` auto-bumps `moved_count` on every status change, stamps `completed_at` on entering DONE, clears it on leaving DONE
  - `moved_count` exposed on `CardOut` for stuck-card detection
  - Mobile **Boards** screen rebuilt as horizontal Kanban: **Inbox · Planned · Today · Doing · Done** (subset of `CardStatus` per spec §9)
  - Tap any card → modal with destination columns → optimistic move with rollback on error
  - Stuck-card visual: orange border + `stuck × N` badge when `moved_count ≥ 3` (spec §2 stuck-card detection)
  - 39 unit tests passing (7 new for status-transition logic)
- [x] **Phase 9** — Today screen + Focus Agent
  - Backend: `POST /agents/focus` — Focus Agent picks 1–3 cards from open candidates given current energy (local-only via gateway)
  - Reads only `card_titles` + `energy_summary` (matches `focus_agent` policy `can_read`)
  - Heuristic fallback when local model unavailable: prefer cards whose `energy_required` matches current energy
  - Mobile **Today** screen: Low / Medium / High energy picker → "Pick my top 1–3" → suggestions with reasons → one-tap "Move to Today"
  - Below the picker: live list of cards already in TODAY status (pull-to-refresh)
  - 49 unit tests passing (10 new for the focus parser + fallback)
- [x] **Phase 10** — Card detail screen
  - Mobile **CardDetail** modal: full view + edit of any card (title, description, type, status, life area, energy, priority) + delete with confirmation
  - Tap any card on Boards or Today to open it; long-press on Boards still opens the quick MoveModal
  - Navigation restructured: tabs are now wrapped in a root native stack so any tab can `push` shared modals
  - Boards uses `useFocusEffect` to refetch on tab return so edits propagate without manual refresh
  - Reuses existing `GET /cards/{id}` + `PATCH /cards/{id}` + `DELETE /cards/{id}` (no new backend code)
- [x] **Phase 11** — Goal tree (spec §3 Vision → Goal → Project → Milestone)
  - Backend: `GET /cards/tree?user_id=...&include_tasks=...` returns nested `CardTreeNode[]`
  - Pure `_build_tree` helper handles orphans (parent filtered out → promoted to root)
  - Mobile **Goals** screen (More tab): indented tree, "+ Add goal" at root, "+" on each row to add a child at the next level down
  - Tapping a row opens CardDetail; "Include tasks" toggle folds task-level cards into the tree
  - 56 unit tests passing (7 new for tree builder)
- [x] **Boards drag-and-drop** — real DnD via `PanResponder` + `Animated` (no new deps); tap = detail, long-press = quick modal, drag = column move
- [ ] **Phase 12+** — Habits, Energy log, Reviews, Health, Money, Files (per spec §8 / §9)

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
│   │   ├── models/              ORM models
│   │   ├── enums.py             PrivacyLevel, etc.
│   │   ├── seed.py              Seed agent_policies
│   │   └── api/                 Routers (added in later phases)
│   ├── alembic/                 Migrations
│   ├── alembic.ini
│   └── requirements.txt
├── docker-compose.yml
├── .gitignore
├── README.md
└── personal-navigation-os-spec.md
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

