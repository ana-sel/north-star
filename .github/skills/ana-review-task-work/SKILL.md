---
name: ana-review-task-work
description: 'Perform an independent read-only review of Compass work against its Markdown task: verify every requirement and gate, inspect realistic regressions, detect accidental scope or lost tests, and distinguish blockers from pre-existing or cosmetic findings.'
argument-hint: 'Markdown task path/heading and optional base branch'
user-invocable: true
disable-model-invocation: false
context: fork
---

# Review Task Work

Perform an independent, read-only review. Do not edit files.

## Establish the comparison

Identify the selected Markdown task and preserve its wording. Determine the real Git base when branch comparison is requested; otherwise review the current worktree delta relevant to the task. Do not require a clean worktree and do not include unrelated user changes in scope.

Inspect the requirement bullets and gate, relevant changed files and diff, owning behavior and nearest tests, and applicable locked product, content, design, and architecture decisions.

## Review the implementation

For each changed production file ask:
- Is it required by the selected Markdown task?
- Is this the existing owning layer?
- Does it preserve local-first and offline behavior?
- Does persisted data need a migration?
- Can the requirement be met with less code or fewer concepts?
- Did navigation, content counts, date/time semantics, cadence, progression, privacy, or accessibility change accidentally?

For UI work, compare with the relevant wireframe and design tokens without demanding unrelated pixel churn. For AI work, verify caching, quotas, local fallback, structured inputs, and that secrets or private content are not exposed.

Map each requirement and gate to evidence. Check that new tests protect unique behavior, important prior coverage remains, and assertions test behavior rather than incidental implementation. Run the narrowest useful checks available.

## Classify findings

- **Must fix**: correctness, requirement gap, data loss, privacy/security issue, or concrete regression.
- **Worth fixing if tiny**: clear value with negligible churn.
- **Pre-existing / out of scope**: real but not caused by this task.
- **Cosmetic**: do not churn working code for it.

Only **Must fix** blocks readiness.

## Output

```markdown
<task heading> · <branch/worktree comparison> · <N relevant files, +added/−removed>

**Verdict:** Ready / Not ready — <one sentence>

**Must fix**
- [ ] <file anchor> — <problem, evidence, and smallest fix>
(or: None)

**Non-blocking**
- *Worth fixing if tiny:* <finding>
- *Pre-existing / out of scope:* <finding>
- *Cosmetic:* <finding>

**Requirement coverage**
| Requirement / gate | Covered by | Proof |
|---|---|---|

**Complexity:** Proportionate / Over-built — <one line>

**Regression coverage:** <what remains protected or is missing>

**Validation**
- [x] <command> — <result>

**Next action:** <one line>
```

Write `None` when there are no blocking findings. Omit empty non-blocking categories. Output only the review.
