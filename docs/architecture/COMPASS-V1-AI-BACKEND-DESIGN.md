# Compass V1 — AI Backend Interface & Identity Design

Status: **Design only** · Phase 3B · builds on and defers to
[`COMPASS-V1-AI-CONTRACT.md`](./COMPASS-V1-AI-CONTRACT.md)

No Workers, D1, auth, networking, model calls, or package installs are part of
this phase. No mobile runtime code is modified. This document settles the exact
API, identity/quota strategy, cache ownership, and failure flow so implementation
does not build into a corner.

Approved frozen decisions carried into this phase:

1. V1 AI uses **today's structured state only** — no seven-day history.
2. Local AI result caching and server-side idempotency/quota are **separate**.
3. V1 exposes exactly one AI feature: **Today Coach Insight**.

---

## 1. Request schema (frozen) + runtime name review

Frozen conceptual input:

```ts
type TodayAIContext = {
  localDate: string;                 // 'YYYY-MM-DD', user's local calendar day
  pace: 'full' | 'lighter' | 'rest';

  sleep: {
    logged: boolean;
    durationMinutes?: number;        // omit when not logged
    targetMinutes?: number;          // omit when no target configured
  };

  habits: {
    scheduled: number;               // total scheduled today (all buckets)
    completed: number;               // total completed today (all buckets)
    morningScheduled: number;
    morningCompleted: number;
    eveningScheduled: number;
    eveningCompleted: number;
  };

  plan: {
    dueToday: number;
    completedToday: number;
  };

  journey?: {
    id: string;                      // canonical, UNPREFIXED (see below)
    type: 'path' | 'foundation';
    title: string;                   // app content
    stage: 'watching' | 'doing' | 'under_pressure';
    practice: string;                // canonical app content
  };
};
```

**Review against current Compass runtime — necessary adjustments only:**

- **`pace`** — matches `PaceMode = 'full' | 'lighter' | 'rest'` in
  `todayLogic.ts`. No change.
- **`sleep.durationMinutes` / `targetMinutes`** — runtime already carries these
  as `number | null` (Today's `durationMinutes`, and `targetMinutes` via
  `sleepTargetMinutes`). Adjustment: use **optional/omitted** rather than
  `null` on the wire; `logged = durationMinutes != null`.
- **`habits`** — runtime has no ready-made struct. It must be derived by a small
  pure builder (implementation slice §15/§10-first-slice) from existing helpers:
  per-day scheduling (the `isHabitScheduledOnDate` predicate currently private in
  `progressLogic.ts` should be promoted to a shared helper) and today's
  completions (`habitsForDate`). Note **`anytime` habits** are included in the
  top-level `scheduled`/`completed` totals; `morning*`/`evening*` are subsets, so
  `anytime = scheduled − morningScheduled − eveningScheduled`. This is acceptable
  for V1; anytime is intentionally not broken out.
- **`journey.id`** — runtime `PathProgress.path_id` is **prefixed** for
  foundations (`foundation:regulate`). Since `type` is a separate field,
  recommend sending the **unprefixed** id (`regulate`) plus `type: 'foundation'`.
  This avoids leaking the storage namespace convention and duplicating `type`.
  The client strips the `foundation:` prefix at the boundary.
- **`journey.stage`** — runtime `stageLabel` is capitalized
  (`'Watching' | 'Doing' | 'Under pressure'`, from `stageInfoForReturns`).
  Recommend a tiny boundary map to the wire enum
  (`watching | doing | under_pressure`). Keep the wire form lowercase/snake for
  stability. (`current_camp` 1|2|3 is an equivalent signal; stage label is
  preferred for readability.)
- **`journey.title` / `practice`** — `DATA[id].quality` /
  `DATA[id].practice.what` for paths; `foundation.title` / `foundation.practice`
  for foundations. App content, allowed.

No task titles, notes, journal text, names, or free text. No seven-day history.

---

## 2. Response schema (frozen) + validation

```ts
type TodayAIInsight = {
  observation: string;   // required
  orientation?: string;  // optional
};
```

Strict **server-side** validation before returning to the client:

- both fields **plain text** (no Markdown required or expected)
- `observation` **mandatory**, non-empty after trim
- `orientation` optional
- total rendered output normally **≤ 60 words**
- **hard ceilings enforced server-side**, e.g. `observation ≤ 240 chars`,
  `orientation ≤ 120 chars`; reject/serve-fallback if exceeded
- reject any additional/unknown fields; strip to exactly these two
- on any validation failure → treat as a failed generation (see §7) and the
  client falls back silently

---

## 3. Endpoint contract

One conceptual endpoint:

```
POST /v1/insight/today
```

- Accepts **structured Compass state only** (`TodayAIContext`). The client
  **never** sends `prompt: "..."`. Prompt construction is entirely server-side.
- Requires an identity subject (see §6), carried in an `Authorization` header,
  not in the body.

**Request (body):** `TodayAIContext`.

**Response (200):** `TodayAIInsight`. Returned for both a fresh generation and an
idempotent replay of that subject+day's stored result (optionally flagged via a
response header such as `X-Insight-Origin: fresh|replay`).

**HTTP status semantics:**

| Status | Meaning | Client behaviour |
| --- | --- | --- |
| 200 | valid insight (fresh or idempotent replay) | cache + display |
| 400 | request schema invalid | silent deterministic fallback |
| 401 / 403 | identity missing/invalid | silent deterministic fallback |
| 429 | quota exhausted (per-subject/global) or rate limited | silent deterministic fallback |
| 503 | provider/Workers AI unavailable | silent deterministic fallback |
| 504 | model timeout | silent deterministic fallback |
| any malformed 200 | body fails validation | silent deterministic fallback |

- **Idempotency:** a second request for the same `(subject, localDate)` returns
  the stored 200 result and does **not** trigger another model generation.
- **Validation failures:** 400 with a coarse error code only (no echo of
  payload).
- **Quota response:** 429 with a coarse reason (`per_day` | `global_day` |
  `global_month` | `rate`).
- **Timeout behaviour:** server aborts the model call at a strict timeout and
  returns 504.

For **every** non-200 (and malformed 200), the mobile UI silently uses the
deterministic Coach. No red network error surfaces for an optional insight.

---

## 4. Local cache design (client)

No new SQLite table for V1. Reuse `user_prefs` (existing `getPref`/`setPref`
JSON store) with a **single** key:

```
user_prefs key: ai:today-insight
value: { "localDate": "YYYY-MM-DD", "observation": "...", "orientation"?: "..." }
```

- **Read semantics:** on Today load, read the record; if `localDate === today`
  and the shape is valid, display it (no eligibility check, no network).
- **Replacement:** on a new local day, the record is **overwritten** in place.
  Never accumulate one key per historical day (single hot record only).
- **Malformed cache:** ignore and treat as "no cache for today" (the day may then
  become eligible). Never crash Today on a bad cache.
- **Write:** only after a **successful, validated** AI result. Never write on
  failure.
- **Rest:** `pace === 'rest'` makes the day ineligible (see §11); the client does
  not request. An existing valid same-day cache may still display; otherwise the
  deterministic Rest message shows.

The local cache is a **display** cache only. It cannot and must not enforce
quota.

---

## 5. Server idempotency & quota are separate

Explicit boundary:

```
Local user_prefs cache  !=  quota enforcement
```

- The local record makes Today fast and offline-friendly, but a client can clear
  prefs or reinstall. Enforcement lives server-side.
- Future D1 stores minimal metadata **plus the small validated result** so the
  endpoint is truly idempotent (approved Phase 3B refinement):

  ```
  subject      TEXT
  local_date   TEXT
  generated_at TEXT
  observation  TEXT
  orientation  TEXT   -- nullable
  model_id     TEXT
  PRIMARY KEY (subject, local_date)
  ```

- Rationale: if the local display cache is lost/corrupted after a successful
  10:00 generation, the same subject + same local day must be able to receive the
  **already-generated** insight rather than consume another model call. The
  result is only two short strings.
- **No raw Compass request snapshot is stored** — not the input context, task
  data, sleep history, habit rows, or journey history. D1 retains only the tiny
  generated output needed for idempotent replay + the quota key.
- D1 is **not** implemented in this phase.

---

## 6. Minimum identity strategy — recommendation

V1 AI needs a **stable server-side subject** for daily idempotency, abuse
limiting, and quota. Options compared:

| | A. Full account auth first | **B. Anonymous installation identity** | C. Other minimal Cloudflare approach |
| --- | --- | --- | --- |
| Privacy | Collects email/PII up front | **No PII; opaque subject** | Varies |
| Abuse resistance | Strong | **Good (server-issued, revocable, quota-bound)** | Varies |
| Complexity | High (auth UX, recovery, storage) | **Low (issue + store one token)** | Medium |
| Uninstall/reinstall | Stable across reinstall | New subject on reinstall (bounded by global caps) | Varies |
| Account migration | Native | **Attachable to an account later** | Varies |
| Hand-rolled crypto risk | Medium if self-built | **Avoided (Cloudflare-issued signed token)** | Depends |

**Recommendation: Option B — anonymous installation identity for V1.**

- The Worker mints an **opaque subject token** on first contact (no email, no
  password), which the client stores securely and presents on each request. It
  is a genuine **server-issued bearer credential**, not a client-generated UUID
  that anyone could invent:

  ```
  first installation
      ↓
  Worker issues random installation credential (bearer)
      ↓
  mobile stores it securely
      ↓
  server stores only identity/credential verification material
      ↓
  future AI calls resolve to a stable anonymous subject
  ```

- Issuance/verification is **server-owned** using Cloudflare-native primitives
  (a signed/opaque token the Worker can validate) — **no hand-rolled auth or
  cryptography** in the client, and no device fingerprinting.
- Reinstall yields a new subject; the small per-user quota reset this allows is
  bounded by the **global daily/monthly ceilings + endpoint rate limiting**
  (§7), so it is not a meaningful abuse vector for a once-per-day optional
  insight. No invasive anti-abuse machinery is needed for V1.
- The subject is designed to be **attachable to a real account later** if/when
  full accounts are introduced. **Better Auth remains a candidate**, not a
  decision, pending Cloudflare/D1 compatibility review; it is not required for V1
  AI.

Minimum capability the AI endpoint requires: *a trustworthy, stable, opaque,
server-issued subject credential sufficient to key idempotency and quota.*
Nothing more.

---

## 7. Quota model

Conceptual safeguards:

```
per-subject:  <= 1 successful generation / local day
global:       daily ceiling
global:       monthly ceiling
endpoint:     rate limit (per subject + per IP)
model:        strict timeout
```

- **Only a successfully validated AI result consumes the subject's daily
  generation.** A failed/timed-out/invalid attempt does **not** burn the daily
  success slot.
- To stop failure-loop abuse, a **separate attempt-rate limit** applies, e.g.
  **≤ 5 attempts / subject / hour** (and a coarser per-IP limit). Exceeding it
  returns 429 `rate`.
- Global daily and monthly ceilings protect total cost independently of
  per-subject logic and back-stop reinstall churn.
- All limits are enforced server-side; the client only reacts to 429 by falling
  back.

---

## 8. Local-day trust boundary

The client supplies `localDate`; blindly trusting arbitrary dates could let a
malicious client rotate dates to bypass one/day quota.

**Recommendation (simplest, privacy-preserving):**

- Client sends `localDate` plus a **coarse UTC offset** (e.g. minutes, already
  derivable from `getTimezoneOffsetMinutes`) — **never GPS/location**.
- The Worker computes the plausible local day from `serverUTC + offset` and
  **accepts `localDate` only within a small window** of that (e.g. equal to the
  computed local day, ±1 day to absorb clock skew / near-midnight).
- **Idempotency + quota do the real enforcement**, keyed on
  `(subject, localDate)`; the acceptance window merely rejects implausible dates.
- No precise timezone name or location is required or collected.

This keeps the boundary honest without turning `localDate` into a location
signal.

---

## 9. AI provider boundary

```
Mobile → Cloudflare Worker → Workers AI
```

- Define an **internal provider adapter** interface inside the Worker so model
  choice is not scattered through code:

  ```ts
  interface InsightProvider {
    generate(context: TodayAIContext, systemPrompt: string):
      Promise<TodayAIInsight>;
  }
  ```

- The **system prompt is server-owned** (from `COMPASS-V1-AI-CONTRACT.md` §8).
- The **model identifier is configuration/env**, never supplied by the mobile
  client.
- No implementation in this phase.

---

## 10. Deterministic fallback flow (future runtime sequence)

```
Today loads
  ↓
deterministic Coach (buildInsight) is immediately available
  ↓
read local cache  ai:today-insight
  ↓
valid cache for today?  ── yes ──▶ display cached AI insight
  │ no
  ▼
getTodayAIClient()               (dev → mock; prod → null until real client)
  │ null ───────────────────────▶ keep deterministic Coach
  │ client
  ▼
run local eligibility  shouldRequestAI(todayState)   (contract §3)
  │ ineligible ─────────────────▶ keep deterministic Coach
  │ eligible
  ▼
POST /v1/insight/today  (bounded, structured)
  │ success + valid ───▶ write cache + display
  │ any failure ───────▶ keep deterministic Coach
```

**Provider selection & presentation coupling (Phase 3C.1):**

- AI generation occurs **only while the Today insight surface is visible**. The
  current V1 UI shows it in **Full** pace only, so eligibility requires Full;
  **Lighter and Rest never generate** and use deterministic behaviour.
- The **mock provider is development-only** (`selectTodayAIClient` returns it
  only when `isDevelopment`). In production, until the Cloudflare client exists,
  selection returns **null** and Today uses the deterministic Coach — **the mock
  is never a production fallback**.
```

AI must **never block Today rendering**. The deterministic Coach is shown first
and remains the floor.

---

## 11. Rest (and Lighter) behaviour

**V1:** both `pace === 'rest'` and `pace === 'lighter'` make the AI request
**ineligible**, because the Today insight surface is hidden for both — only
**Full** shows it. The deterministic behaviour is enough, and zero calls is the
desired outcome. (A same-day cache generated earlier in Full may still display,
but no new request is made.)

---

## 12. Network / privacy contract

- The future client sends **only** `TodayAIContext` (§1) plus the identity
  header. No automatic telemetry payload containing device name, contacts,
  location, email, database history, or free text.
- **Inherent transport metadata:** the infrastructure will unavoidably see
  network-level metadata (source IP, TLS/timing). This is distinct from the
  application payload and is used only for coarse rate limiting/abuse control;
  it is not enriched, stored long-term, or joined to personal content.
- Logging follows contract §12/§18: success/failure, latency, model id,
  token/cost estimate, coarse error code — not payloads or insight text.

---

## 13. Old sleep-AI cleanup decision (audit — no deletion this phase)

| File | Nature | Reusable for Today AI? | Recommendation |
| --- | --- | --- | --- |
| `src/lib/ai.ts` (`generateNote` / `generateRuleBasedNote`) | Deterministic **sleep-week note** generator | **No** — different shape/purpose; not the Today Coach provider | **Retain now, delete in 3C** unless a sleep-summary surface adopts it. Do **not** repurpose as the Today provider. |
| `src/features/sleep/components/AINoteCard.tsx` | Presentational card rendering a note string | Not needed — Today uses `InsightCard` | **Delete in 3C** as obsolete Week/History-era UI unless a sleep summary returns. |
| `src/features/sleep/components/SleepChart.tsx` | Pure **non-AI** 7-day bar chart UI | N/A (not AI) | **Retain as reusable non-AI UI** if a sleep-trend view is likely; otherwise delete in 3C. Lowest priority. |

Rationale: V1 AI is **Today Coach only**. `ai.ts`/`AINoteCard` are a *second,
half-existing AI concept* tied to the removed Week screen and must not silently
survive into V1 as a parallel AI product. They are kept only long enough for 3C
to confirm nothing adopts them. **No deletions in Phase 3B.**

---

## 14. Cloudflare component map (minimum future)

```
Mobile
  TodayAIClient
    - buildTodayAIContext (pure)
    - local cache: user_prefs ai:today-insight
    - eligibility gate (shouldRequestAI)
        ↓ POST /v1/insight/today  (subject header, structured body)
Cloudflare Worker
    - request validation (schema, size)
    - identity (subject) + quota + rate limit
    - idempotency (subject, local_date)
    - server-owned system prompt
    - provider adapter (model id from config)
        ↓
Workers AI

D1
    - identity / quota / idempotency metadata only
```

**R2 is not introduced for Today AI** — it provides no V1 value (no history/blob
storage needed for a one-line daily insight).

---

## 15. Final decisions

1. **Request schema:** frozen `TodayAIContext` (§1), today-only, with the runtime
   adjustments noted (omit-null sleep fields; unprefixed `journey.id` + `type`;
   lowercase `stage` enum via boundary map; habits derived from a promoted
   per-day scheduling helper; anytime folded into totals).
2. **Response schema:** frozen `TodayAIInsight` (§2) with server-side plain-text
   validation and hard length ceilings.
3. **Local cache semantics:** single `user_prefs` key `ai:today-insight`
   `{ localDate, observation, orientation? }`; overwrite per day; malformed →
   ignore; write only on success; Rest does not request (§4, §11).
4. **Recommended identity strategy:** **Option B — anonymous installation
   identity** (server-issued opaque subject, no PII, attachable later; Better
   Auth remains a candidate) (§6).
5. **D1 metadata responsibilities:** `(subject, local_date, generated_at,
   observation, orientation, model_id)` for idempotency/quota **and idempotent
   replay of the small result**; no raw Compass request snapshot or history (§5).
6. **Quota / idempotency model:** ≤ 1 successful generation/subject/local day;
   global daily + monthly ceilings; separate ≤ ~5 attempts/subject/hour rate
   limit; only successful validated results consume the daily allowance (§7).
7. **Local-date validation:** client sends `localDate` + coarse UTC offset; Worker
   accepts within a small window of server-computed local day; idempotency/quota
   enforce; no location collected (§8).
8. **Provider boundary:** internal `InsightProvider` adapter in the Worker;
   server-owned system prompt; model id from config, never from client (§9).
9. **Old sleep-AI code:** retain `ai.ts`/`AINoteCard`/`SleepChart` for now;
   plan deletion of `ai.ts` + `AINoteCard` in 3C unless adopted; `SleepChart`
   retained as reusable non-AI UI or removed in 3C (§13). No deletion in 3B.
10. **First implementation slice after approval (tiny, mobile-only, provider
    mocked):**
    - a pure `buildTodayAIContext(todayState): TodayAIContext` builder (+ unit
      tests) reusing existing Today data;
    - promote the per-day habit scheduling predicate to a shared helper;
    - local `ai:today-insight` cache read/write via `user_prefs`;
    - `shouldRequestAI` eligibility gate (+ tests);
    - a `TodayAIClient` interface whose network provider is **mocked** (returns a
      stub or throws), wired so Today shows AI-or-deterministic through the
      **existing `InsightCard` seam**.
    - **No network, no Worker, no auth, no persistence table.**

---

## Conflicts with `COMPASS-V1-AI-CONTRACT.md`

No blocking conflicts. Two **tightenings** (approved) to reconcile:

- Contract **§4** input example included a `recent` 7-day aggregate block and
  journey `returns14d` / `lastReturnDaysAgo`. Phase 3B **removes these** for the
  initial version (today-only). Recommend annotating Contract §4/§6 as
  *superseded by the frozen 3B `TodayAIContext`*, with 7-day aggregates listed as
  a future option.
- Contract **§16** specified "a stable per-user identifier." Phase 3B **refines**
  this to the concrete recommendation of an **anonymous installation identity**.
  Consistent, not conflicting.

Everything else (single Today feature, one/day, caching-as-display, silent
fallback, cost ceilings, safety, server-owned prompt, no task titles/free text)
matches the contract exactly.

---

## STOP

No Worker code, no mobile runtime changes, no D1 schema, no Cloudflare tooling,
no auth, no model calls. This document is the only deliverable. Nothing staged,
committed, tagged, or pushed.
