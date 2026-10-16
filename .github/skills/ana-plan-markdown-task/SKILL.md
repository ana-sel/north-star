---
name: ana-plan-markdown-task
description: 'Plan a Compass task from a Markdown file or section before editing: preserve the written requirements, inspect the owning code and nearest tests, map each requirement and gate to the smallest change and proof, and surface genuine conflicts or ambiguity.'
argument-hint: 'Markdown path and heading, pasted task text, or short goal'
user-invocable: true
disable-model-invocation: false
---

# Plan Markdown Task

Work in read-only mode. Do not edit, format, commit, push, deploy, or mark a task complete.

## 1. Establish the task

Use the Markdown file and heading named by the user. If none is named, locate the narrowest relevant section in `PLAN.md`.

Capture verbatim:
- the task heading and requirement bullets;
- its gate, completion condition, or explicit test matrix entries;
- user clarifications from the current conversation;
- linked product, design, or architecture material only when it changes the task.

Do not invent an ID, status, priority, acceptance criterion, or requirement. Treat unchecked boxes and ordinary bullets as requirements only within the selected task section.

If the selected text conflicts with `PLAN.md` or `COMPASS-V1-CONTENT-FREEZE (1).md`, identify the exact conflict and stop if it changes implementation materially.

## 2. Orient locally

Read root `AGENTS.md` and only the relevant deeper docs. Locate:
- the code that owns the current behavior;
- the nearest peer implementation;
- the nearest meaningful tests;
- affected persistence, date/time, navigation, AI, or UI boundaries.

Do not map the whole repository. Treat `docs/archive/` as historical evidence, never current direction.

Before proposing a solution, state:
1. the requirement in one sentence;
2. the current owner and behavior;
3. one falsifiable implementation hypothesis;
4. the cheapest check that could disconfirm it.

## 3. Map requirements

Use a compact table:

| Requirement / gate | Current behavior | Smallest required change | Proof |
|---|---|---|---|

Separate required work from necessary compatibility repair, pre-existing issues, optional cleanup, and future work. Only required work and necessary compatibility repair are in scope by default.

## 4. Design the minimum change

Prefer the layer that already owns the behavior. Reuse existing types, data access, hooks, components, and tokens. Add an abstraction only when it owns a real responsibility or removes meaningful duplication.

For persistence changes, include migration and existing-data proof. For date/time or cadence changes, include boundary cases. For UI changes, include loading, empty, error, offline, accessibility, and relevant viewport/runtime checks in proportion to risk.

## 5. Resolve ambiguity

Investigate code and current docs before asking. Ask only when plausible interpretations lead to materially different implementations and the evidence does not settle them. Draft one concise question and mark whether it blocks implementation.

## 6. Output

```markdown
<Markdown file> — <task heading>

**Goal:** <one plain-English sentence>

**Current behavior**
- Owner: <file/function anchor>
- <brief flow when useful>

**Requirement map**
| Requirement / gate | Current behavior | Smallest required change | Proof |
|---|---|---|---|

**Minimum implementation**
1. <file anchor> — <change>

**Files likely to change**
- <path>
- Inspected only: <paths>

**Regression protection**
- <behavior that must remain unchanged and proof>

**Validation**
- [ ] <focused command or runtime check>
- [ ] <phase gate proof, when applicable>

**Open questions**
- **Blocking / Non-blocking:** <question and evidence checked>

**Out of scope**
- <pre-existing issue, optional cleanup, or future work>

**Next action:** <one line>
```

Omit empty optional sections. Keep the plan proportional and output only the plan.
