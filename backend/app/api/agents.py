"""Capture Agent — turns a raw chat message into a structured card draft.

Spec §8 MVP agent #1. Always runs through the Local AI Gateway with
the `capture_agent` policy (local Ollama, `can_use_external_ai=False`).

Flow:
  POST /agents/capture { user_id, text }
    → gateway.process_request(...) with NORMAL privacy
    → parse JSON draft from model output
    → return draft (NOT persisted; mobile decides whether to save via
      `POST /cards`)

If parsing fails the raw text is returned as the title fallback so
the user is never blocked.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.enums import CardLevel, CardStatus, CardType, EnergyLevel, LifeArea, PrivacyLevel
from app.gateway import GatewayRequest, LocalAIGateway
from app.models.card import Card
from app.models.diary_entry import DiaryEntry
from app.models.energy import EnergyLog
from app.models.habit import Habit, HabitLog
from app.models.health_log import HealthLog
from app.models.money_transaction import MoneyTransaction


router = APIRouter(prefix="/agents", tags=["agents"])


_CAPTURE_AGENT_ID = "capture_agent"

# Kept tight: small JSON, simple keys. Local Ollama models follow this
# more reliably than longer prompts.
_PROMPT_TEMPLATE = (
    "You convert a user's raw thought into a structured card. "
    "Reply with ONLY a JSON object on a single line. No prose. "
    "Schema:\n"
    '{{"title": string (<=100 chars), "description": string|null, '
    '"type": one of [thought, goal, task, habit, research, decision], '
    '"life_area": one of [health_energy, mind_healing, money_freedom, '
    "work_skills, home_property, joy_culture, family] or null}}\n\n"
    "User thought:\n---\n{text}\n---"
)


class CaptureRequest(BaseModel):
    user_id: uuid.UUID
    text: str = Field(min_length=1, max_length=2000)


class CaptureDraft(BaseModel):
    title: str
    description: str | None = None
    type: CardType = CardType.THOUGHT
    life_area: LifeArea | None = None
    level: CardLevel = CardLevel.TASK
    privacy_level: PrivacyLevel = PrivacyLevel.NORMAL


class CaptureResponse(BaseModel):
    draft: CaptureDraft
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


@router.post("/capture", response_model=CaptureResponse)
async def capture(
    payload: CaptureRequest,
    db: Session = Depends(get_db),
) -> CaptureResponse:
    gateway = LocalAIGateway(db=db)

    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_CAPTURE_AGENT_ID,
        request_type="classify",
        prompt=_PROMPT_TEMPLATE.format(text=payload.text),
        declared_fields=["chat_input"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=300,
        force_local=True,  # Capture is always local per agent policy.
    )

    response = await gateway.process_request(request)

    # If the model couldn't run (no Ollama, etc.) fall back to a
    # "raw thought" draft so the user can still capture.
    if response.final_status != "completed" or not response.text:
        return CaptureResponse(
            draft=_fallback_draft(payload.text),
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    draft = _parse_draft(response.text, fallback_text=payload.text)
    return CaptureResponse(
        draft=draft,
        used_ai=True,
        audit_log_id=response.audit_log_id,
    )


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
_JSON_OBJ_RE = re.compile(r"\{.*\}", re.DOTALL)


def _parse_draft(model_text: str, *, fallback_text: str) -> CaptureDraft:
    """Pull the first JSON object out of the model output and validate."""
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return _fallback_draft(fallback_text)
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return _fallback_draft(fallback_text)

    title = (data.get("title") or fallback_text).strip()[:100] or fallback_text[:100]
    description = data.get("description")
    if isinstance(description, str):
        description = description.strip() or None
    else:
        description = None

    raw_type = (data.get("type") or "thought").strip().lower()
    try:
        card_type = CardType(raw_type)
    except ValueError:
        card_type = CardType.THOUGHT

    raw_area = data.get("life_area")
    life_area: LifeArea | None
    if isinstance(raw_area, str) and raw_area.strip():
        try:
            life_area = LifeArea(raw_area.strip().lower())
        except ValueError:
            life_area = None
    else:
        life_area = None

    return CaptureDraft(
        title=title,
        description=description,
        type=card_type,
        life_area=life_area,
    )


def _fallback_draft(text: str) -> CaptureDraft:
    stripped = text.strip()
    first_line = stripped.splitlines()[0] if stripped else ""
    title = first_line[:100] or "(untitled)"
    return CaptureDraft(title=title, description=None, type=CardType.THOUGHT)


# ======================================================================
# Focus Agent — picks 1–3 cards for "Today" given current energy.
# ======================================================================

_FOCUS_AGENT_ID = "focus_agent"

# Hard cap on candidate cards we send to the model. Spec §8 lists Focus
# Agent's `can_read` as `card_titles` + `today_summary` + `energy_summary`
# + `open_task_count` — titles only, no descriptions or other PII.
_FOCUS_CANDIDATE_LIMIT = 30
_FOCUS_PICK_MIN = 1
_FOCUS_PICK_MAX = 3

_FOCUS_PROMPT_TEMPLATE = (
    "You are the Focus Agent. The user has {energy} energy right now. "
    "{mood_info}"
    "They have {today_count} cards already in Today and {total_open} open cards total. "
    "{stuck_info}"
    "Pick {pick_min} to {pick_max} cards from the candidate list that "
    "best fit that energy and mood and would be most valuable today. "
    "Also provide:\n"
    "- `do_not_do`: 2-4 short rules for what NOT to do today based on "
    "their energy, mood, and workload (protect them from overload).\n"
    "- `insight`: One sentence of coaching guidance for the day.\n\n"
    "Reply with ONLY a JSON object on a single line. No prose. "
    "Schema:\n"
    '{{"picks": [{{"id": <int>, "reason": <string, <=120 chars>}}], '
    '"do_not_do": [<string, <=60 chars>, ...], '
    '"insight": <string, <=200 chars>}}\n'
    "Use the integer `id` shown next to each candidate.\n\n"
    "Candidates (id · status · title):\n{candidates}"
)


class FocusRequest(BaseModel):
    user_id: uuid.UUID
    energy: EnergyLevel = EnergyLevel.MEDIUM
    mood: int | None = None  # 0-5 DBT scale, None = not logged yet


class FocusPick(BaseModel):
    card_id: uuid.UUID
    title: str
    reason: str | None = None


class FocusResponse(BaseModel):
    energy: EnergyLevel
    picks: list[FocusPick]
    do_not_do: list[str] = []
    insight: str | None = None
    used_ai: bool
    candidate_count: int
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


@router.post("/focus", response_model=FocusResponse)
async def focus(
    payload: FocusRequest,
    db: Session = Depends(get_db),
) -> FocusResponse:
    # Eligible "today candidates": anything not done/deleted/today/later.
    eligible_statuses = [
        CardStatus.INBOX,
        CardStatus.FILTERED,
        CardStatus.PLANNED,
        CardStatus.IN_PROGRESS_MY_SIDE,
        CardStatus.REVIEW,
    ]
    stmt = (
        select(Card)
        .where(Card.user_id == payload.user_id)
        .where(Card.status.in_([s.value for s in eligible_statuses]))
        .order_by(Card.created_at.desc())
        .limit(_FOCUS_CANDIDATE_LIMIT)
    )
    candidates: list[Card] = list(db.execute(stmt).scalars())

    # Gather context for the prompt
    today_count = db.execute(
        select(func.count(Card.id))
        .where(Card.user_id == payload.user_id)
        .where(Card.status == CardStatus.TODAY.value)
    ).scalar() or 0
    total_open = len(candidates) + today_count
    stuck_cards = [c for c in candidates if c.moved_count >= 3]
    stuck_info = (
        f"{len(stuck_cards)} cards have been moved 3+ times (stuck). "
        if stuck_cards else ""
    )
    mood_info = (
        f"User's current mood is {payload.mood}/5. "
        if payload.mood is not None else ""
    )

    if not candidates:
        return FocusResponse(
            energy=payload.energy,
            picks=[],
            do_not_do=_fallback_do_not_do(payload.energy, today_count, 0, payload.mood),
            insight=_fallback_insight(payload.energy, today_count, payload.mood),
            used_ai=False,
            candidate_count=0,
        )

    # Build prompt with positional integer ids so the model has fewer
    # tokens to chew on (and so we never expose UUIDs to it).
    by_idx: dict[int, Card] = {i + 1: c for i, c in enumerate(candidates)}
    candidate_lines = "\n".join(
        f"{idx} · {c.status} · {c.title[:80]}" for idx, c in by_idx.items()
    )
    prompt = _FOCUS_PROMPT_TEMPLATE.format(
        energy=payload.energy.value,
        pick_min=_FOCUS_PICK_MIN,
        pick_max=_FOCUS_PICK_MAX,
        today_count=today_count,
        total_open=total_open,
        stuck_info=stuck_info,
        mood_info=mood_info,
        candidates=candidate_lines,
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_FOCUS_AGENT_ID,
        request_type="focus_pick",
        prompt=prompt,
        declared_fields=["card_titles", "energy_summary", "open_task_count"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=300,
        force_local=True,  # Focus is always local per agent policy.
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        # Fallback: simple energy-based heuristic (newest first).
        return FocusResponse(
            energy=payload.energy,
            picks=_fallback_picks(candidates, payload.energy),
            do_not_do=_fallback_do_not_do(payload.energy, today_count, len(stuck_cards), payload.mood),
            insight=_fallback_insight(payload.energy, today_count, payload.mood),
            used_ai=False,
            candidate_count=len(candidates),
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    picks, do_not_do, insight = _parse_focus_response(response.text, by_idx)
    if not picks:
        picks = _fallback_picks(candidates, payload.energy)
        do_not_do = _fallback_do_not_do(payload.energy, today_count, len(stuck_cards), payload.mood)
        insight = _fallback_insight(payload.energy, today_count, payload.mood)
        used_ai = False
    else:
        if not do_not_do:
            do_not_do = _fallback_do_not_do(payload.energy, today_count, len(stuck_cards), payload.mood)
        if not insight:
            insight = _fallback_insight(payload.energy, today_count, payload.mood)
        used_ai = True

    return FocusResponse(
        energy=payload.energy,
        picks=picks,
        do_not_do=do_not_do,
        insight=insight,
        used_ai=used_ai,
        candidate_count=len(candidates),
        audit_log_id=response.audit_log_id,
    )


def _parse_focus_response(
    model_text: str,
    by_idx: dict[int, Card],
) -> tuple[list[FocusPick], list[str], str | None]:
    """Pull picks, do_not_do, insight from the model's JSON."""
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return [], [], None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return [], [], None

    raw_picks = data.get("picks")
    if not isinstance(raw_picks, list):
        return [], [], None

    out: list[FocusPick] = []
    seen: set[int] = set()
    for entry in raw_picks:
        if not isinstance(entry, dict):
            continue
        raw_id = entry.get("id")
        try:
            idx = int(raw_id)
        except (TypeError, ValueError):
            continue
        if idx in seen or idx not in by_idx:
            continue
        seen.add(idx)
        card = by_idx[idx]
        reason = entry.get("reason")
        if isinstance(reason, str):
            reason = reason.strip()[:120] or None
        else:
            reason = None
        out.append(
            FocusPick(card_id=card.id, title=card.title, reason=reason)
        )
        if len(out) >= _FOCUS_PICK_MAX:
            break

    # Extract do_not_do and insight
    raw_dnd = data.get("do_not_do")
    do_not_do: list[str] = []
    if isinstance(raw_dnd, list):
        for item in raw_dnd:
            if isinstance(item, str) and item.strip():
                do_not_do.append(item.strip()[:80])

    insight: str | None = None
    raw_insight = data.get("insight")
    if isinstance(raw_insight, str) and raw_insight.strip():
        insight = raw_insight.strip()[:200]

    return out, do_not_do, insight


def _fallback_picks(
    candidates: list[Card],
    energy: EnergyLevel,
) -> list[FocusPick]:
    """Heuristic fallback when the model is unavailable.

    Match cards whose `energy_required` matches the current energy first,
    then top up with the newest cards. Caps at _FOCUS_PICK_MAX.
    """
    matching = [c for c in candidates if c.energy_required == energy]
    others = [c for c in candidates if c.energy_required != energy]
    ordered = (matching + others)[:_FOCUS_PICK_MAX]
    return [
        FocusPick(card_id=c.id, title=c.title, reason=None)
        for c in ordered
    ]


def _fallback_do_not_do(
    energy: EnergyLevel,
    today_count: int,
    stuck_count: int,
    mood: int | None = None,
) -> list[str]:
    """Rule-based do-not-do list derived from actual state."""
    rules: list[str] = []
    if energy == EnergyLevel.LOW:
        rules.append("Do not start anything new — finish or rest")
        rules.append("Do not take on tasks for others today")
    elif energy == EnergyLevel.MEDIUM:
        rules.append("Do not add more than 3 tasks to Today")
    else:
        rules.append("Do not skip your break — high energy burns fast")

    # Mood-aware rules
    if mood is not None and mood <= 1:
        rules.append("Do not make big decisions — low mood distorts judgement")
        rules.append("Do not people-please — protect your boundaries")

    if today_count >= 3:
        rules.append(f"Do not add more cards to Today ({today_count} already)")
    if stuck_count > 0:
        rules.append(f"Do not move stuck cards again — split or delete them")
    # Always cap at 4 (mood can add extra)
    return rules[:4]


def _fallback_insight(energy: EnergyLevel, today_count: int, mood: int | None = None) -> str:
    """Rule-based day-shape insight from actual state."""
    # Low mood overrides energy-based advice
    if mood is not None and mood <= 1:
        return (
            "Mood is low. Be gentle with yourself — one small win is enough. "
            "No big decisions, no people-pleasing."
        )

    if energy == EnergyLevel.LOW:
        return (
            "Low energy day. Finish one small thing, rest well. "
            "Completion over expansion."
        )
    elif energy == EnergyLevel.MEDIUM:
        if today_count > 3:
            return (
                f"You have {today_count} tasks in Today — that's overload. "
                "Pick the top 2-3 and defer the rest."
            )
        if mood is not None and mood <= 2:
            return "Steady energy but mood is below average. Keep it simple and kind."
        return "Steady day. Do 2-3 tasks at a comfortable pace. No heroics."
    else:
        if mood is not None and mood <= 2:
            return "Good energy but mood is off — use the energy on something satisfying, not draining."
        if today_count == 0:
            return "High energy and empty slate — pick your hardest task and start."
        return "High energy — tackle the hardest thing first, then coast."


# ======================================================================
# Intake Filter Agent — scores a card against the 7 mission questions
# and recommends a decision (keep/delete/later/delegate/split/clarify/archive).
# Spec §2.2 / §5.1. Always local-only.
# ======================================================================

_FILTER_AGENT_ID = "filter_agent"

_MISSION_QUESTIONS = [
    ("happiness", "Does this support a happier, calmer, more meaningful life?"),
    ("hidden_rules", "Does this help me understand deeper patterns of life, people, systems, money, health, or myself?"),
    ("clarity", "Does this create clarity for me or others?"),
    ("freedom", "Does this increase financial, emotional, physical, time, or location freedom?"),
    ("self_refinement", "Does this refine my body, mind, skills, discipline, taste, or character?"),
    ("chosen_solitude", "Does this respect privacy, peace, independence, and low-noise living?"),
    ("meaning", "Does this make life more intentional rather than random?"),
]

_FILTER_DECISIONS = ["keep", "delete", "later", "delegate", "split", "clarify", "archive"]

_FILTER_PROMPT_TEMPLATE = (
    "You are the Intake Filter. Score this card against the user's mission.\n"
    "For each question, give a score from 0 (not at all) to 10 (perfectly aligned).\n\n"
    "Questions:\n"
    + "\n".join(f"- {key}: {q}" for key, q in _MISSION_QUESTIONS)
    + "\n\n"
    "Then decide: keep, delete, later, delegate, split, clarify, or archive.\n"
    "If the card seems like a fake want (status symbol, social pressure, impulse), "
    "say delete or archive and explain the pattern.\n\n"
    "Also classify: want, need, obligation, impulse, or external_pressure.\n\n"
    "Reply with ONLY a JSON object. Schema:\n"
    '{{"scores": {{"happiness": <0-10>, "hidden_rules": <0-10>, "clarity": <0-10>, '
    '"freedom": <0-10>, "self_refinement": <0-10>, "chosen_solitude": <0-10>, '
    '"meaning": <0-10>}}, '
    '"total": <sum of scores>, '
    '"want_type": "<want|need|obligation|impulse|external_pressure>", '
    '"decision": "<keep|delete|later|delegate|split|clarify|archive>", '
    '"reasoning": "<1-2 sentences>"}}\n\n'
    "Card title: {title}\n"
    "Card description: {description}\n"
    "Card type: {card_type}\n"
    "Life area: {life_area}"
)


class FilterRequest(BaseModel):
    user_id: uuid.UUID
    card_id: uuid.UUID | None = None
    title: str | None = None
    description: str | None = None


class MissionScores(BaseModel):
    happiness: int = 0
    hidden_rules: int = 0
    clarity: int = 0
    freedom: int = 0
    self_refinement: int = 0
    chosen_solitude: int = 0
    meaning: int = 0


class FilterResponse(BaseModel):
    scores: MissionScores
    total: int
    want_type: str = "want"
    decision: str = "keep"
    reasoning: str = ""
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


@router.post("/filter", response_model=FilterResponse)
async def intake_filter(
    payload: FilterRequest,
    db: Session = Depends(get_db),
) -> FilterResponse:
    # Resolve the card title/description
    title: str = ""
    description: str = ""
    card_type: str = "task"
    life_area: str = "none"
    card: Card | None = None

    if payload.card_id:
        card = db.get(Card, payload.card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        title = card.title
        description = card.description or ""
        card_type = card.type
        life_area = card.life_area or "none"
    else:
        title = payload.title or ""
        description = payload.description or ""

    if not title:
        raise HTTPException(status_code=400, detail="No card title to filter")

    prompt = _FILTER_PROMPT_TEMPLATE.format(
        title=title,
        description=description,
        card_type=card_type,
        life_area=life_area,
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_FILTER_AGENT_ID,
        request_type="mission_filter",
        prompt=prompt,
        declared_fields=["card_titles"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=400,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        # Heuristic fallback: keyword-based rough scoring
        scores, total, decision, want_type, reasoning = _fallback_filter(title, description)
        result = FilterResponse(
            scores=scores,
            total=total,
            want_type=want_type,
            decision=decision,
            reasoning=reasoning,
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )
    else:
        result = _parse_filter_response(response.text)
        result.used_ai = True
        result.audit_log_id = response.audit_log_id

    # Persist scores on the card if we have one
    if card and result.scores:
        card.mission_scores = result.scores.model_dump()
        if result.decision in ("delete", "archive"):
            card.status = CardStatus.ARCHIVED.value
            card.rejection_insight = result.reasoning or "Filtered out by mission alignment check."
        elif result.decision == "later":
            card.status = CardStatus.LATER.value
        elif result.decision == "keep":
            card.status = CardStatus.FILTERED.value
        db.commit()

    return result


def _parse_filter_response(text: str) -> FilterResponse:
    """Extract mission scores from model JSON output."""
    match = _JSON_OBJ_RE.search(text)
    if not match:
        return _fallback_filter_response()
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return _fallback_filter_response()

    raw_scores = data.get("scores", {})
    scores = MissionScores(
        happiness=_clamp(raw_scores.get("happiness", 0)),
        hidden_rules=_clamp(raw_scores.get("hidden_rules", 0)),
        clarity=_clamp(raw_scores.get("clarity", 0)),
        freedom=_clamp(raw_scores.get("freedom", 0)),
        self_refinement=_clamp(raw_scores.get("self_refinement", 0)),
        chosen_solitude=_clamp(raw_scores.get("chosen_solitude", 0)),
        meaning=_clamp(raw_scores.get("meaning", 0)),
    )
    total = sum(scores.model_dump().values())
    decision = data.get("decision", "keep")
    if decision not in _FILTER_DECISIONS:
        decision = "keep"
    want_type = data.get("want_type", "want")
    reasoning = str(data.get("reasoning", ""))[:300]

    return FilterResponse(
        scores=scores,
        total=total,
        want_type=want_type,
        decision=decision,
        reasoning=reasoning,
        used_ai=False,
    )


def _clamp(val: int | float | str, lo: int = 0, hi: int = 10) -> int:
    try:
        return max(lo, min(hi, int(val)))
    except (ValueError, TypeError):
        return 0


def _fallback_filter(
    title: str, description: str
) -> tuple[MissionScores, int, str, str, str]:
    """Keyword-based heuristic when model is unavailable."""
    text = (title + " " + description).lower()

    scores = MissionScores()
    # Simple keyword matching for rough scoring
    if any(w in text for w in ["health", "exercise", "walk", "sleep", "body", "energy"]):
        scores.happiness = 6
        scores.self_refinement = 7
    if any(w in text for w in ["learn", "study", "read", "skill", "course", "cert"]):
        scores.self_refinement = 8
        scores.hidden_rules = 5
    if any(w in text for w in ["money", "save", "invest", "budget", "income", "financial"]):
        scores.freedom = 7
    if any(w in text for w in ["family", "partner", "friend", "relationship"]):
        scores.happiness = 7
        scores.meaning = 6
    if any(w in text for w in ["build", "create", "app", "project", "ship"]):
        scores.clarity = 6
        scores.meaning = 7
        scores.self_refinement = 6
    if any(w in text for w in ["buy", "want", "ferrari", "luxury", "status", "impress"]):
        scores.chosen_solitude = 2
        scores.freedom = 2
        return scores, sum(scores.model_dump().values()), "archive", "impulse", \
            "This looks like a status/impulse want. Archived as self-knowledge."

    total = sum(scores.model_dump().values())
    decision = "keep" if total >= 15 else "clarify"
    return scores, total, decision, "want", "Heuristic scoring — review manually."


def _fallback_filter_response() -> FilterResponse:
    return FilterResponse(
        scores=MissionScores(),
        total=0,
        decision="clarify",
        reasoning="Could not parse AI response. Review manually.",
        used_ai=False,
    )


# ======================================================================
# Goal Architect Agent — splits a parent goal into 3-7 child suggestions
# at the next level down (Vision → Goal → Project → Milestone → Task).
# Spec §8 MVP agent #2. Suggestions are NOT persisted — the mobile app
# decides which ones to keep.
# ======================================================================

_ARCHITECT_AGENT_ID = "goal_architect_agent"
_ARCHITECT_PICK_MIN = 3
_ARCHITECT_PICK_MAX = 7

# Mirrors mobile/src/screens/GoalsScreen.tsx LEVEL_DOWN.
_LEVEL_DOWN: dict[CardLevel, CardLevel] = {
    CardLevel.VISION: CardLevel.GOAL,
    CardLevel.GOAL: CardLevel.PROJECT,
    CardLevel.PROJECT: CardLevel.MILESTONE,
    CardLevel.MILESTONE: CardLevel.TASK,
    CardLevel.TASK: CardLevel.SUBTASK,
    CardLevel.SUBTASK: CardLevel.FOCUS_BLOCK,
    CardLevel.FOCUS_BLOCK: CardLevel.FOCUS_BLOCK,
}

_ARCHITECT_PROMPT_TEMPLATE = (
    "You are the Goal Architect Agent. Split the parent {parent_level} "
    "into {pick_min}-{pick_max} concrete {child_level}-level children "
    "that, taken together, would meaningfully advance it. "
    "Each child must be specific, action-oriented, and non-overlapping. "
    "Reply with ONLY a JSON object on a single line. No prose. "
    "Schema:\n"
    '{{"children": [{{"title": <string, <=80 chars>, '
    '"description": <string|null, <=200 chars>}}]}}\n\n'
    "Parent {parent_level}:\n"
    "Title: {parent_title}\n"
    "Description: {parent_description}"
)


class ArchitectRequest(BaseModel):
    user_id: uuid.UUID
    card_id: uuid.UUID


class ArchitectSuggestion(BaseModel):
    title: str
    description: str | None = None
    level: CardLevel


class ArchitectResponse(BaseModel):
    parent_id: uuid.UUID
    parent_level: CardLevel
    child_level: CardLevel
    suggestions: list[ArchitectSuggestion]
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


@router.post("/architect", response_model=ArchitectResponse)
async def architect(
    payload: ArchitectRequest,
    db: Session = Depends(get_db),
) -> ArchitectResponse:
    parent = db.get(Card, payload.card_id)
    if parent is None or parent.user_id != payload.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "card not found")

    parent_level = (
        parent.level if isinstance(parent.level, CardLevel)
        else CardLevel(parent.level)
    )
    child_level = _LEVEL_DOWN[parent_level]

    prompt = _ARCHITECT_PROMPT_TEMPLATE.format(
        parent_level=parent_level.value,
        child_level=child_level.value,
        pick_min=_ARCHITECT_PICK_MIN,
        pick_max=_ARCHITECT_PICK_MAX,
        parent_title=parent.title[:120],
        parent_description=(parent.description or "(none)")[:400],
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_ARCHITECT_AGENT_ID,
        request_type="split_goal",
        prompt=prompt,
        declared_fields=["card_titles", "card_descriptions", "goal_tree_summary"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=600,
        force_local=True,  # Local-first per spec §5; can relax later.
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        return ArchitectResponse(
            parent_id=parent.id,
            parent_level=parent_level,
            child_level=child_level,
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    suggestions = _parse_architect_suggestions(response.text, child_level)
    return ArchitectResponse(
        parent_id=parent.id,
        parent_level=parent_level,
        child_level=child_level,
        suggestions=suggestions,
        used_ai=bool(suggestions),
        audit_log_id=response.audit_log_id,
    )


def _parse_architect_suggestions(
    model_text: str,
    child_level: CardLevel,
) -> list[ArchitectSuggestion]:
    """Pull `children` out of the model JSON. Tolerates prose around it."""
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []

    raw = data.get("children")
    if not isinstance(raw, list):
        return []

    out: list[ArchitectSuggestion] = []
    seen_titles: set[str] = set()
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        title = entry.get("title")
        if not isinstance(title, str):
            continue
        title = title.strip()[:80]
        if not title:
            continue
        key = title.lower()
        if key in seen_titles:
            continue
        seen_titles.add(key)
        description = entry.get("description")
        if isinstance(description, str):
            description = description.strip()[:200] or None
        else:
            description = None
        out.append(
            ArchitectSuggestion(
                title=title,
                description=description,
                level=child_level,
            )
        )
        if len(out) >= _ARCHITECT_PICK_MAX:
            break
    return out


# ======================================================================
# Mission Agent — scores a card against the 7-question Mission Filter
# (spec §2). Each filter gets an integer 0-10 score plus a one-line note.
# Scores are persisted to `cards.mission_scores` so they survive reload.
# Spec §8 MVP agent #3.
# ======================================================================

_MISSION_AGENT_ID = "mission_agent"

# Order matters — keep it stable for UI display.
_MISSION_FILTERS: list[tuple[str, str]] = [
    ("happiness", "Does this support a happier, calmer, more meaningful life?"),
    (
        "hidden_rules",
        "Does this help understand deeper patterns of life, people, money, "
        "systems, health, or self?",
    ),
    ("clarity", "Does this create clarity for me or others?"),
    (
        "freedom",
        "Does this increase financial, emotional, time, physical, or location "
        "freedom?",
    ),
    (
        "self_refinement",
        "Does this refine body, mind, skills, discipline, taste, or character?",
    ),
    (
        "chosen_solitude",
        "Does this respect peace, privacy, independence, and low-noise living?",
    ),
    ("meaning", "Does this make life more intentional?"),
]
_MISSION_KEYS: tuple[str, ...] = tuple(k for k, _ in _MISSION_FILTERS)

_MISSION_PROMPT_TEMPLATE = (
    "You are the Mission Agent. Score the card below against each of the "
    "seven Personal Mission filters. Each score is an integer 0-10 where "
    "0 = no fit and 10 = perfect fit. Add a brief one-line note (<=80 "
    "chars) per filter. Reply with ONLY a JSON object on a single line. "
    "No prose. Schema:\n"
    "{{\n"
    + ",\n".join(
        f'  "{key}": {{"score": <int 0-10>, "note": <string|null>}}'
        for key in _MISSION_KEYS
    )
    + "\n}}\n\n"
    "Filters:\n"
    + "\n".join(f"- {key}: {q}" for key, q in _MISSION_FILTERS)
    + "\n\nCard:\nTitle: {title}\nDescription: {description}"
)


class MissionRequest(BaseModel):
    user_id: uuid.UUID
    card_id: uuid.UUID


class MissionFilterScore(BaseModel):
    score: int = Field(ge=0, le=10)
    note: str | None = None


class MissionResponse(BaseModel):
    card_id: uuid.UUID
    scores: dict[str, MissionFilterScore]
    overall: float
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


@router.post("/mission", response_model=MissionResponse)
async def mission(
    payload: MissionRequest,
    db: Session = Depends(get_db),
) -> MissionResponse:
    card = db.get(Card, payload.card_id)
    if card is None or card.user_id != payload.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "card not found")

    prompt = _MISSION_PROMPT_TEMPLATE.format(
        title=card.title[:120],
        description=(card.description or "(none)")[:400],
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_MISSION_AGENT_ID,
        request_type="mission_score",
        prompt=prompt,
        declared_fields=["card_titles", "card_descriptions", "mission_text"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=400,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        return MissionResponse(
            card_id=card.id,
            scores={},
            overall=0.0,
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    scores = _parse_mission_scores(response.text)
    if not scores:
        return MissionResponse(
            card_id=card.id,
            scores={},
            overall=0.0,
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error="Could not parse mission scores from model output.",
        )

    overall = round(
        sum(s.score for s in scores.values()) / len(scores), 2
    )

    # Persist to the card (mission_scores JSONB).
    card.mission_scores = {
        k: {"score": v.score, "note": v.note} for k, v in scores.items()
    } | {"overall": overall}
    db.add(card)
    db.commit()

    return MissionResponse(
        card_id=card.id,
        scores=scores,
        overall=overall,
        used_ai=True,
        audit_log_id=response.audit_log_id,
    )


def _parse_mission_scores(model_text: str) -> dict[str, MissionFilterScore]:
    """Pull per-filter scores out of model JSON. Tolerates prose."""
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return {}
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}
    if not isinstance(data, dict):
        return {}

    out: dict[str, MissionFilterScore] = {}
    for key in _MISSION_KEYS:
        entry = data.get(key)
        if not isinstance(entry, dict):
            continue
        raw_score = entry.get("score")
        try:
            score = int(raw_score)
        except (TypeError, ValueError):
            continue
        score = max(0, min(10, score))
        note = entry.get("note")
        if isinstance(note, str):
            note = note.strip()[:80] or None
        else:
            note = None
        out[key] = MissionFilterScore(score=score, note=note)
    return out


# ======================================================================
# Review Agent — daily / weekly pattern detection over card activity.
# Spec §8 MVP agent #5. Reads only `card_titles` + `completion_stats`
# per `review_agent` policy in seed.py.
# Habits / energy / money / health summaries plug in here in later
# phases — for now the review is purely card-based.
# ======================================================================

_REVIEW_AGENT_ID = "review_agent"

ReviewWindow = Literal["daily", "weekly", "monthly", "yearly"]
_REVIEW_WINDOW_DAYS: dict[str, int] = {"daily": 1, "weekly": 7, "monthly": 30, "yearly": 365}

_REVIEW_PROMPT_TEMPLATE = (
    "You are the Review Agent. Look at the user's last {days} day(s) of "
    "activity and produce a short, honest reflection. Focus on "
    "patterns, not platitudes. Reply with ONLY a JSON object on a single "
    "line. No prose. Schema:\n"
    '{{"summary": <string, <=240 chars>, '
    '"wins": [<string, <=120 chars>], '
    '"patterns": [<string, <=120 chars>], '
    '"suggestions": [<string, <=120 chars>]}}\n\n'
    "Card stats:\n{stats}\n\n"
    "Recent completed cards:\n{completed}\n\n"
    "Currently in progress:\n{in_progress}\n\n"
    "Health/energy context:\n{health_context}"
)


class ReviewRequest(BaseModel):
    user_id: uuid.UUID
    window: ReviewWindow = "daily"


class ReviewStats(BaseModel):
    completed: int
    created: int
    in_progress: int
    moved: int  # total moved_count across active cards in window
    by_status: dict[str, int]
    habits_done: int = 0
    habits_missed: int = 0
    avg_energy: float | None = None
    avg_mood: float | None = None
    avg_sleep_hrs: float | None = None


class ReviewResponse(BaseModel):
    window: ReviewWindow
    stats: ReviewStats
    summary: str
    wins: list[str]
    patterns: list[str]
    suggestions: list[str]
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


@router.post("/review", response_model=ReviewResponse)
async def review(
    payload: ReviewRequest,
    db: Session = Depends(get_db),
) -> ReviewResponse:
    days = _REVIEW_WINDOW_DAYS[payload.window]
    since = datetime.now(timezone.utc) - timedelta(days=days)
    since_date = since.date()

    cards: list[Card] = list(
        db.execute(
            select(Card).where(Card.user_id == payload.user_id)
        ).scalars()
    )
    stats = _build_review_stats(cards, since)

    # --- Health / habits / energy context ---
    health_logs: list[HealthLog] = list(
        db.execute(
            select(HealthLog)
            .where(HealthLog.user_id == payload.user_id, HealthLog.log_date >= since_date)
        ).scalars()
    )
    habit_logs: list[HabitLog] = list(
        db.execute(
            select(HabitLog)
            .where(HabitLog.user_id == payload.user_id, HabitLog.log_date >= since_date)
        ).scalars()
    )
    energy_logs: list[EnergyLog] = list(
        db.execute(
            select(EnergyLog)
            .where(EnergyLog.user_id == payload.user_id, EnergyLog.logged_at >= since)
        ).scalars()
    )

    # Enrich stats with health/habit aggregates
    habits_done = sum(1 for h in habit_logs if h.value_bool is True)
    habits_missed = sum(1 for h in habit_logs if h.value_bool is False)
    stats.habits_done = habits_done
    stats.habits_missed = habits_missed

    moods = [h.mood for h in health_logs if h.mood is not None]
    sleeps = [h.sleep_minutes for h in health_logs if h.sleep_minutes is not None]
    energies = [h.energy for h in health_logs if h.energy is not None]
    if moods:
        stats.avg_mood = round(sum(moods) / len(moods), 1)
    if sleeps:
        stats.avg_sleep_hrs = round(sum(sleeps) / len(sleeps) / 60, 1)
    if energies:
        stats.avg_energy = round(sum(energies) / len(energies), 1)

    health_context = _build_health_context(stats, energy_logs, habits_done, habits_missed)

    completed_titles = [
        c.title
        for c in cards
        if c.completed_at is not None and c.completed_at >= since
    ][:20]
    in_progress_titles = [
        c.title
        for c in cards
        if c.status
        in (
            CardStatus.IN_PROGRESS_MY_SIDE.value,
            CardStatus.IN_PROGRESS_OTHER_SIDE.value,
            CardStatus.TODAY.value,
            CardStatus.REVIEW.value,
        )
    ][:20]

    if stats.completed == 0 and stats.created == 0 and not in_progress_titles:
        # Nothing happened — short-circuit, don't burn an AI call.
        return ReviewResponse(
            window=payload.window,
            stats=stats,
            summary=f"No card activity in the last {days} day(s).",
            wins=[],
            patterns=[],
            suggestions=[
                "Capture at least one thought to start the loop running."
            ],
            used_ai=False,
        )

    prompt = _REVIEW_PROMPT_TEMPLATE.format(
        days=days,
        stats=_format_stats_for_prompt(stats),
        completed="\n".join(f"- {t[:80]}" for t in completed_titles) or "(none)",
        in_progress="\n".join(f"- {t[:80]}" for t in in_progress_titles)
        or "(none)",
        health_context=health_context,
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_REVIEW_AGENT_ID,
        request_type="review",
        prompt=prompt,
        declared_fields=["card_titles", "completion_stats"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=600,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        # Fallback: deterministic summary from stats only.
        return ReviewResponse(
            window=payload.window,
            stats=stats,
            summary=_fallback_summary(stats, days),
            wins=[],
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    parsed = _parse_review(response.text)
    if parsed is None:
        return ReviewResponse(
            window=payload.window,
            stats=stats,
            summary=_fallback_summary(stats, days),
            wins=[],
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error="Could not parse review JSON.",
        )
    return ReviewResponse(
        window=payload.window,
        stats=stats,
        used_ai=True,
        audit_log_id=response.audit_log_id,
        **parsed,
    )


def _build_review_stats(cards: list[Card], since: datetime) -> ReviewStats:
    """Pure helper — count stats relative to `since` cutoff."""
    completed = 0
    created = 0
    moved = 0
    by_status: dict[str, int] = {}
    for c in cards:
        status_val = c.status if isinstance(c.status, str) else c.status.value
        by_status[status_val] = by_status.get(status_val, 0) + 1
        if c.created_at is not None and c.created_at >= since:
            created += 1
        if c.completed_at is not None and c.completed_at >= since:
            completed += 1
        moved += c.moved_count or 0
    in_progress = sum(
        by_status.get(s, 0)
        for s in (
            CardStatus.IN_PROGRESS_MY_SIDE.value,
            CardStatus.IN_PROGRESS_OTHER_SIDE.value,
            CardStatus.TODAY.value,
            CardStatus.REVIEW.value,
        )
    )
    return ReviewStats(
        completed=completed,
        created=created,
        in_progress=in_progress,
        moved=moved,
        by_status=by_status,
    )


def _format_stats_for_prompt(stats: ReviewStats) -> str:
    lines = [
        f"completed: {stats.completed}",
        f"created: {stats.created}",
        f"in_progress: {stats.in_progress}",
        f"moves_total: {stats.moved}",
        "by_status: "
        + ", ".join(f"{k}={v}" for k, v in sorted(stats.by_status.items())),
    ]
    if stats.habits_done or stats.habits_missed:
        lines.append(f"habits_done: {stats.habits_done}, habits_missed: {stats.habits_missed}")
    if stats.avg_energy is not None:
        lines.append(f"avg_energy: {stats.avg_energy}/10")
    if stats.avg_mood is not None:
        lines.append(f"avg_mood: {stats.avg_mood}/10")
    if stats.avg_sleep_hrs is not None:
        lines.append(f"avg_sleep_hrs: {stats.avg_sleep_hrs}")
    return "\n".join(lines)


def _build_health_context(
    stats: ReviewStats,
    energy_logs: list[EnergyLog],
    habits_done: int,
    habits_missed: int,
) -> str:
    parts: list[str] = []
    if stats.avg_energy is not None:
        parts.append(f"Average energy: {stats.avg_energy}/10")
    if stats.avg_mood is not None:
        parts.append(f"Average mood: {stats.avg_mood}/10")
    if stats.avg_sleep_hrs is not None:
        parts.append(f"Average sleep: {stats.avg_sleep_hrs} hours")
    if habits_done or habits_missed:
        total = habits_done + habits_missed
        rate = round(habits_done / total * 100) if total else 0
        parts.append(f"Habits: {habits_done}/{total} done ({rate}%)")
    energy_counts: dict[str, int] = {}
    for e in energy_logs:
        lvl = e.level if isinstance(e.level, str) else e.level.value
        energy_counts[lvl] = energy_counts.get(lvl, 0) + 1
    if energy_counts:
        parts.append("Energy log distribution: " + ", ".join(f"{k}={v}" for k, v in sorted(energy_counts.items())))
    return "\n".join(parts) if parts else "(no health data)"


def _fallback_summary(stats: ReviewStats, days: int) -> str:
    return (
        f"In the last {days} day(s): {stats.completed} completed, "
        f"{stats.created} created, {stats.in_progress} in progress."
    )


def _parse_review(model_text: str) -> dict | None:
    """Pull review fields out of model JSON. Returns dict or None."""
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None

    summary = data.get("summary")
    if not isinstance(summary, str):
        return None
    summary = summary.strip()[:240]
    if not summary:
        return None

    def _string_list(key: str, max_items: int = 6, max_len: int = 120) -> list[str]:
        raw = data.get(key)
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()[:max_len]
            if cleaned:
                out.append(cleaned)
            if len(out) >= max_items:
                break
        return out

    return {
        "summary": summary,
        "wins": _string_list("wins"),
        "patterns": _string_list("patterns"),
        "suggestions": _string_list("suggestions"),
    }


# ======================================================================
# Energy Agent — spec §8 later agents.
# ======================================================================
# Looks at the user's last N days of energy_logs (and optionally their
# completion stats) to spot patterns: best time of day, sustained dips,
# correlation between energy + completed cards. Local-only by policy.

_ENERGY_AGENT_ID = "energy_agent"

_ENERGY_PROMPT_TEMPLATE = (
    "You are the Energy Agent. Look at the user's recent energy "
    "self-reports and produce a short reflection. Reply with ONLY a "
    "JSON object on a single line. No prose. Schema:\n"
    '{{"summary": <string, <=240 chars>, '
    '"patterns": [<string, <=120 chars>], '
    '"suggestions": [<string, <=120 chars>]}}\n\n'
    "Stats:\n{stats}\n\n"
    "Recent log (newest first):\n{log_lines}"
)


class EnergyInsightRequest(BaseModel):
    user_id: uuid.UUID
    days: int = Field(default=14, ge=1, le=90)


class EnergyStats(BaseModel):
    sample_count: int
    days_covered: int
    by_level: dict[str, int]
    avg_score: float  # low=1, medium=2, high=3
    completed_in_window: int


class EnergyInsightResponse(BaseModel):
    days: int
    stats: EnergyStats
    summary: str
    patterns: list[str]
    suggestions: list[str]
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


_LEVEL_SCORE = {"low": 1, "medium": 2, "high": 3}


def _build_energy_stats(
    logs: list[EnergyLog], cards: list[Card], since: datetime
) -> EnergyStats:
    by_level: dict[str, int] = {"low": 0, "medium": 0, "high": 0}
    score_sum = 0
    for log in logs:
        level = log.level if isinstance(log.level, str) else log.level.value
        if level in by_level:
            by_level[level] += 1
            score_sum += _LEVEL_SCORE[level]
    avg = (score_sum / len(logs)) if logs else 0.0
    days_covered = len({log.logged_at.date() for log in logs}) if logs else 0
    completed = sum(
        1
        for c in cards
        if c.completed_at is not None and c.completed_at >= since
    )
    return EnergyStats(
        sample_count=len(logs),
        days_covered=days_covered,
        by_level=by_level,
        avg_score=round(avg, 2),
        completed_in_window=completed,
    )


def _format_energy_stats_for_prompt(stats: EnergyStats, days: int) -> str:
    return (
        f"window_days: {days}\n"
        f"sample_count: {stats.sample_count}\n"
        f"days_covered: {stats.days_covered}\n"
        f"by_level: low={stats.by_level['low']}, "
        f"medium={stats.by_level['medium']}, high={stats.by_level['high']}\n"
        f"avg_score (1=low, 3=high): {stats.avg_score}\n"
        f"completed_cards_in_window: {stats.completed_in_window}"
    )


def _energy_fallback_summary(stats: EnergyStats, days: int) -> str:
    if stats.sample_count == 0:
        return f"No energy logs in the last {days} day(s)."
    label = (
        "high"
        if stats.avg_score >= 2.5
        else "medium"
        if stats.avg_score >= 1.7
        else "low"
    )
    return (
        f"{stats.sample_count} energy reports across {stats.days_covered} day(s); "
        f"average leans {label}."
    )


def _parse_energy(model_text: str) -> dict | None:
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    summary = data.get("summary")
    if not isinstance(summary, str):
        return None
    summary = summary.strip()[:240]
    if not summary:
        return None

    def _string_list(key: str, max_items: int = 6, max_len: int = 120) -> list[str]:
        raw = data.get(key)
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()[:max_len]
            if cleaned:
                out.append(cleaned)
            if len(out) >= max_items:
                break
        return out

    return {
        "summary": summary,
        "patterns": _string_list("patterns"),
        "suggestions": _string_list("suggestions"),
    }


@router.post("/energy", response_model=EnergyInsightResponse)
async def energy_insight(
    payload: EnergyInsightRequest,
    db: Session = Depends(get_db),
) -> EnergyInsightResponse:
    since = datetime.now(timezone.utc) - timedelta(days=payload.days)

    logs: list[EnergyLog] = list(
        db.execute(
            select(EnergyLog)
            .where(
                EnergyLog.user_id == payload.user_id,
                EnergyLog.logged_at >= since,
            )
            .order_by(EnergyLog.logged_at.desc())
        ).scalars()
    )
    cards: list[Card] = list(
        db.execute(
            select(Card).where(Card.user_id == payload.user_id)
        ).scalars()
    )
    stats = _build_energy_stats(logs, cards, since)

    if stats.sample_count < 3:
        # Not enough signal — short-circuit, save the AI call.
        return EnergyInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_energy_fallback_summary(stats, payload.days),
            patterns=[],
            suggestions=[
                "Log your energy a few times across different parts of the day so patterns can emerge."
            ],
            used_ai=False,
        )

    log_lines = "\n".join(
        f"- {log.logged_at.strftime('%a %H:%M')}: {log.level}"
        + (f" — {log.notes[:60]}" if log.notes else "")
        for log in logs[:30]
    )

    prompt = _ENERGY_PROMPT_TEMPLATE.format(
        stats=_format_energy_stats_for_prompt(stats, payload.days),
        log_lines=log_lines,
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_ENERGY_AGENT_ID,
        request_type="energy_insight",
        prompt=prompt,
        declared_fields=["energy_summary", "completion_stats"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=500,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        return EnergyInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_energy_fallback_summary(stats, payload.days),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    parsed = _parse_energy(response.text)
    if parsed is None:
        return EnergyInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_energy_fallback_summary(stats, payload.days),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error="Could not parse energy JSON.",
        )
    return EnergyInsightResponse(
        days=payload.days,
        stats=stats,
        used_ai=True,
        audit_log_id=response.audit_log_id,
        **parsed,
    )


# ======================================================================
# Health Agent - spec section 8 later agents.
# ======================================================================
# Reflects on the user's recent health_logs (sleep, steps, mood, energy
# 1-10 scale, etc.) and produces a short summary + suggestions. Local
# only by policy; data is SENSITIVE so we never let this leave the box.

_HEALTH_AGENT_ID = "health_agent"

_HEALTH_PROMPT_TEMPLATE = (
    "You are the Health Agent. Look at the user's recent daily health "
    "self-reports and produce a short, kind reflection. Reply with ONLY "
    "a JSON object on a single line. No prose. Schema:\n"
    '{{"summary": <string, <=240 chars>, '
    '"patterns": [<string, <=120 chars>], '
    '"suggestions": [<string, <=120 chars>]}}\n\n'
    "Stats:\n{stats}\n\n"
    "Recent log (newest first):\n{log_lines}"
)


class HealthInsightRequest(BaseModel):
    user_id: uuid.UUID
    days: int = Field(default=14, ge=1, le=90)


class HealthFieldStat(BaseModel):
    count: int
    avg: float | None = None
    min: float | None = None
    max: float | None = None


class HealthStats(BaseModel):
    sample_count: int
    days_covered: int
    sleep_minutes: HealthFieldStat
    steps: HealthFieldStat
    weight_kg: HealthFieldStat
    mood: HealthFieldStat
    energy: HealthFieldStat


class HealthInsightResponse(BaseModel):
    days: int
    stats: HealthStats
    summary: str
    patterns: list[str]
    suggestions: list[str]
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


def _field_stat(values: list[float]) -> HealthFieldStat:
    if not values:
        return HealthFieldStat(count=0)
    return HealthFieldStat(
        count=len(values),
        avg=round(sum(values) / len(values), 2),
        min=min(values),
        max=max(values),
    )


def _build_health_stats(logs: list[HealthLog]) -> HealthStats:
    sleep = [float(l.sleep_minutes) for l in logs if l.sleep_minutes is not None]
    steps = [float(l.steps) for l in logs if l.steps is not None]
    weight = [float(l.weight_kg) for l in logs if l.weight_kg is not None]
    mood = [float(l.mood) for l in logs if l.mood is not None]
    energy = [float(l.energy) for l in logs if l.energy is not None]
    return HealthStats(
        sample_count=len(logs),
        days_covered=len({l.log_date for l in logs}),
        sleep_minutes=_field_stat(sleep),
        steps=_field_stat(steps),
        weight_kg=_field_stat(weight),
        mood=_field_stat(mood),
        energy=_field_stat(energy),
    )


def _format_health_stats_for_prompt(stats: HealthStats, days: int) -> str:
    def line(name: str, fs: HealthFieldStat, unit: str = "") -> str:
        if fs.count == 0:
            return f"{name}: no data"
        return (
            f"{name}: n={fs.count} avg={fs.avg}{unit} "
            f"min={fs.min}{unit} max={fs.max}{unit}"
        )

    return (
        f"window_days: {days}\n"
        f"days_covered: {stats.days_covered}\n"
        + line("sleep_minutes", stats.sleep_minutes, "m") + "\n"
        + line("steps", stats.steps) + "\n"
        + line("weight_kg", stats.weight_kg, "kg") + "\n"
        + line("mood (1-10)", stats.mood) + "\n"
        + line("energy (1-10)", stats.energy)
    )


def _health_fallback_summary(stats: HealthStats, days: int) -> str:
    if stats.sample_count == 0:
        return f"No health logs in the last {days} day(s)."
    bits: list[str] = [
        f"{stats.sample_count} day(s) logged in the last {days}"
    ]
    if stats.sleep_minutes.count and stats.sleep_minutes.avg is not None:
        bits.append(f"avg sleep {round(stats.sleep_minutes.avg / 60, 1)}h")
    if stats.steps.count and stats.steps.avg is not None:
        bits.append(f"avg steps {int(stats.steps.avg)}")
    if stats.mood.count and stats.mood.avg is not None:
        bits.append(f"avg mood {stats.mood.avg}/10")
    return "; ".join(bits) + "."


def _parse_health(model_text: str) -> dict | None:
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    summary = data.get("summary")
    if not isinstance(summary, str):
        return None
    summary = summary.strip()[:240]
    if not summary:
        return None

    def _string_list(key: str, max_items: int = 6, max_len: int = 120) -> list[str]:
        raw = data.get(key)
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()[:max_len]
            if cleaned:
                out.append(cleaned)
            if len(out) >= max_items:
                break
        return out

    return {
        "summary": summary,
        "patterns": _string_list("patterns"),
        "suggestions": _string_list("suggestions"),
    }


def _format_health_log_line(log: HealthLog) -> str:
    parts: list[str] = [log.log_date.isoformat()]
    if log.sleep_minutes is not None:
        parts.append(f"sleep={round(log.sleep_minutes / 60, 1)}h")
    if log.steps is not None:
        parts.append(f"steps={log.steps}")
    if log.weight_kg is not None:
        parts.append(f"weight={log.weight_kg}kg")
    if log.mood is not None:
        parts.append(f"mood={log.mood}")
    if log.energy is not None:
        parts.append(f"energy={log.energy}")
    return "- " + " ".join(parts)


@router.post("/health", response_model=HealthInsightResponse)
async def health_insight(
    payload: HealthInsightRequest,
    db: Session = Depends(get_db),
) -> HealthInsightResponse:
    today = datetime.now(timezone.utc).date()
    since_date = today - timedelta(days=payload.days)

    logs: list[HealthLog] = list(
        db.execute(
            select(HealthLog)
            .where(
                HealthLog.user_id == payload.user_id,
                HealthLog.log_date >= since_date,
            )
            .order_by(HealthLog.log_date.desc())
        ).scalars()
    )
    stats = _build_health_stats(logs)

    if stats.sample_count < 3:
        return HealthInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_health_fallback_summary(stats, payload.days),
            patterns=[],
            suggestions=[
                "Log a few more days of sleep, steps, or mood so patterns can emerge."
            ],
            used_ai=False,
        )

    log_lines = "\n".join(_format_health_log_line(l) for l in logs[:30])

    prompt = _HEALTH_PROMPT_TEMPLATE.format(
        stats=_format_health_stats_for_prompt(stats, payload.days),
        log_lines=log_lines,
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_HEALTH_AGENT_ID,
        request_type="health_insight",
        prompt=prompt,
        declared_fields=["health_summary", "energy_summary"],
        privacy_level=PrivacyLevel.SENSITIVE,
        max_output_tokens=500,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        return HealthInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_health_fallback_summary(stats, payload.days),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    parsed = _parse_health(response.text)
    if parsed is None:
        return HealthInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_health_fallback_summary(stats, payload.days),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error="Could not parse health JSON.",
        )
    return HealthInsightResponse(
        days=payload.days,
        stats=stats,
        used_ai=True,
        audit_log_id=response.audit_log_id,
        **parsed,
    )



# ======================================================================
# Money Agent - spec section 8 later agents.
# ======================================================================
# Reflects on the user's recent money_transactions (positive = income,
# negative = expense) over a window. Produces totals, top categories,
# and a short reflection. Local only by policy; financial data is
# SENSITIVE and never leaves the box.

_MONEY_AGENT_ID = "money_agent"

_MONEY_PROMPT_TEMPLATE = (
    "You are the Money Agent. Look at the user's recent transactions "
    "and produce a short, factual reflection. Reply with ONLY a JSON "
    "object on a single line. No prose. Schema:\n"
    '{{"summary": <string, <=240 chars>, '
    '"patterns": [<string, <=120 chars>], '
    '"suggestions": [<string, <=120 chars>]}}\n\n'
    "Stats:\n{stats}\n\n"
    "Top categories (most spent first):\n{cat_lines}"
)


class MoneyInsightRequest(BaseModel):
    user_id: uuid.UUID
    days: int = Field(default=30, ge=1, le=365)


class CategoryTotal(BaseModel):
    category: str
    total: float
    count: int


class MoneyStats(BaseModel):
    txn_count: int
    income: float
    expenses: float  # signed: negative when there is spending
    net: float
    top_categories: list[CategoryTotal]


class MoneyInsightResponse(BaseModel):
    days: int
    stats: MoneyStats
    summary: str
    patterns: list[str]
    suggestions: list[str]
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


def _build_money_stats(txns: list[MoneyTransaction]) -> MoneyStats:
    income = 0.0
    expenses = 0.0
    by_cat: dict[str, list[float]] = {}
    for t in txns:
        amt = float(t.amount)
        if amt >= 0:
            income += amt
        else:
            expenses += amt
        cat = t.category or "uncategorised"
        by_cat.setdefault(cat, []).append(amt)
    # Rank categories by absolute spend (most negative first), keep top 5.
    cat_totals = [
        CategoryTotal(
            category=c,
            total=round(sum(amounts), 2),
            count=len(amounts),
        )
        for c, amounts in by_cat.items()
    ]
    cat_totals.sort(key=lambda ct: ct.total)  # most negative first
    return MoneyStats(
        txn_count=len(txns),
        income=round(income, 2),
        expenses=round(expenses, 2),
        net=round(income + expenses, 2),
        top_categories=cat_totals[:5],
    )


def _format_money_stats_for_prompt(stats: MoneyStats, days: int) -> str:
    return (
        f"window_days: {days}\n"
        f"txn_count: {stats.txn_count}\n"
        f"income_total: {stats.income}\n"
        f"expenses_total: {stats.expenses}\n"
        f"net: {stats.net}"
    )


def _format_money_categories(stats: MoneyStats) -> str:
    if not stats.top_categories:
        return "(none)"
    return "\n".join(
        f"- {c.category}: total={c.total} count={c.count}"
        for c in stats.top_categories
    )


def _money_fallback_summary(stats: MoneyStats, days: int) -> str:
    if stats.txn_count == 0:
        return f"No transactions in the last {days} day(s)."
    return (
        f"{stats.txn_count} transactions in {days} day(s); "
        f"income {stats.income}, expenses {stats.expenses}, net {stats.net}."
    )


def _parse_money(model_text: str) -> dict | None:
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    summary = data.get("summary")
    if not isinstance(summary, str):
        return None
    summary = summary.strip()[:240]
    if not summary:
        return None

    def _string_list(key: str, max_items: int = 6, max_len: int = 120) -> list[str]:
        raw = data.get(key)
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()[:max_len]
            if cleaned:
                out.append(cleaned)
            if len(out) >= max_items:
                break
        return out

    return {
        "summary": summary,
        "patterns": _string_list("patterns"),
        "suggestions": _string_list("suggestions"),
    }


@router.post("/money", response_model=MoneyInsightResponse)
async def money_insight(
    payload: MoneyInsightRequest,
    db: Session = Depends(get_db),
) -> MoneyInsightResponse:
    today = datetime.now(timezone.utc).date()
    since_date = today - timedelta(days=payload.days)

    txns: list[MoneyTransaction] = list(
        db.execute(
            select(MoneyTransaction)
            .where(
                MoneyTransaction.user_id == payload.user_id,
                MoneyTransaction.txn_date >= since_date,
            )
            .order_by(MoneyTransaction.txn_date.desc())
        ).scalars()
    )
    stats = _build_money_stats(txns)

    if stats.txn_count < 3:
        return MoneyInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_money_fallback_summary(stats, payload.days),
            patterns=[],
            suggestions=[
                "Log a few more transactions so spending patterns can emerge."
            ],
            used_ai=False,
        )

    prompt = _MONEY_PROMPT_TEMPLATE.format(
        stats=_format_money_stats_for_prompt(stats, payload.days),
        cat_lines=_format_money_categories(stats),
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_MONEY_AGENT_ID,
        request_type="money_insight",
        prompt=prompt,
        declared_fields=["money_summary"],
        privacy_level=PrivacyLevel.SENSITIVE,
        max_output_tokens=500,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        return MoneyInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_money_fallback_summary(stats, payload.days),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    parsed = _parse_money(response.text)
    if parsed is None:
        return MoneyInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_money_fallback_summary(stats, payload.days),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error="Could not parse money JSON.",
        )
    return MoneyInsightResponse(
        days=payload.days,
        stats=stats,
        used_ai=True,
        audit_log_id=response.audit_log_id,
        **parsed,
    )



# ======================================================================
# Productivity Agent - spec section 8 later agents.
# ======================================================================
# Looks at cards completed/created and habit logs in a window and
# produces a short reflection. Local only by policy.

_PRODUCTIVITY_AGENT_ID = "productivity_agent"

_PRODUCTIVITY_PROMPT_TEMPLATE = (
    "You are the Productivity Agent. Look at the user's recent task and "
    "habit activity and produce a short, kind reflection. Reply with "
    "ONLY a JSON object on a single line. No prose. Schema:\n"
    '{{"summary": <string, <=240 chars>, '
    '"patterns": [<string, <=120 chars>], '
    '"suggestions": [<string, <=120 chars>]}}\n\n'
    "Stats:\n{stats}\n\n"
    "Active habits:\n{habit_lines}\n\n"
    "Recently completed cards (newest first):\n{card_lines}"
)


class ProductivityInsightRequest(BaseModel):
    user_id: uuid.UUID
    days: int = Field(default=14, ge=1, le=90)


class HabitProgress(BaseModel):
    habit_id: uuid.UUID
    title: str
    logged_days: int
    target_days: int


class ProductivityStats(BaseModel):
    window_days: int
    cards_created: int
    cards_completed: int
    cards_in_progress: int
    completion_rate: float  # completed / max(created, 1), 0..1
    avg_days_to_complete: float | None
    habits: list[HabitProgress]


class ProductivityInsightResponse(BaseModel):
    days: int
    stats: ProductivityStats
    summary: str
    patterns: list[str]
    suggestions: list[str]
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


def _build_productivity_stats(
    cards: list[Card],
    habits: list[Habit],
    habit_logs: list[HabitLog],
    since: datetime,
    days: int,
) -> ProductivityStats:
    created = 0
    completed = 0
    in_progress = 0
    days_to_complete: list[float] = []
    for c in cards:
        if c.created_at is not None and c.created_at >= since:
            created += 1
        if c.completed_at is not None and c.completed_at >= since:
            completed += 1
            if c.created_at is not None:
                delta = (c.completed_at - c.created_at).total_seconds() / 86400
                if delta >= 0:
                    days_to_complete.append(delta)
        status_val = c.status if isinstance(c.status, str) else c.status.value
        if status_val in (
            CardStatus.IN_PROGRESS_MY_SIDE.value,
            CardStatus.IN_PROGRESS_OTHER_SIDE.value,
            CardStatus.TODAY.value,
            CardStatus.REVIEW.value,
        ):
            in_progress += 1

    avg_dtc = (
        round(sum(days_to_complete) / len(days_to_complete), 2)
        if days_to_complete
        else None
    )
    rate = round(completed / max(created, 1), 2) if created else 0.0

    # Habit progress: count distinct days a habit was logged inside the window.
    logs_by_habit: dict[uuid.UUID, set] = {}
    for log in habit_logs:
        logs_by_habit.setdefault(log.habit_id, set()).add(log.log_date)
    habit_rows: list[HabitProgress] = []
    for h in habits:
        if not h.active:
            continue
        habit_rows.append(
            HabitProgress(
                habit_id=h.id,
                title=h.title,
                logged_days=len(logs_by_habit.get(h.id, set())),
                target_days=days,
            )
        )

    return ProductivityStats(
        window_days=days,
        cards_created=created,
        cards_completed=completed,
        cards_in_progress=in_progress,
        completion_rate=rate,
        avg_days_to_complete=avg_dtc,
        habits=habit_rows,
    )


def _format_productivity_stats_for_prompt(stats: ProductivityStats) -> str:
    return (
        f"window_days: {stats.window_days}\n"
        f"cards_created: {stats.cards_created}\n"
        f"cards_completed: {stats.cards_completed}\n"
        f"cards_in_progress: {stats.cards_in_progress}\n"
        f"completion_rate: {stats.completion_rate}\n"
        f"avg_days_to_complete: {stats.avg_days_to_complete}"
    )


def _format_habit_lines(stats: ProductivityStats) -> str:
    if not stats.habits:
        return "(none)"
    return "\n".join(
        f"- {h.title}: {h.logged_days}/{h.target_days} days"
        for h in stats.habits
    )


def _format_completed_card_lines(cards: list[Card], since: datetime) -> str:
    lines: list[str] = []
    completed_recent = [
        c for c in cards if c.completed_at is not None and c.completed_at >= since
    ]
    completed_recent.sort(key=lambda c: c.completed_at, reverse=True)
    for c in completed_recent[:15]:
        title = (c.title or "").strip()[:80]
        if title:
            lines.append(f"- {title}")
    return "\n".join(lines) if lines else "(none)"


def _productivity_fallback_summary(stats: ProductivityStats) -> str:
    return (
        f"In the last {stats.window_days} day(s): "
        f"{stats.cards_completed} completed, "
        f"{stats.cards_created} created, "
        f"{stats.cards_in_progress} in progress."
    )


def _parse_productivity(model_text: str) -> dict | None:
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    summary = data.get("summary")
    if not isinstance(summary, str):
        return None
    summary = summary.strip()[:240]
    if not summary:
        return None

    def _string_list(key: str, max_items: int = 6, max_len: int = 120) -> list[str]:
        raw = data.get(key)
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()[:max_len]
            if cleaned:
                out.append(cleaned)
            if len(out) >= max_items:
                break
        return out

    return {
        "summary": summary,
        "patterns": _string_list("patterns"),
        "suggestions": _string_list("suggestions"),
    }


@router.post("/productivity", response_model=ProductivityInsightResponse)
async def productivity_insight(
    payload: ProductivityInsightRequest,
    db: Session = Depends(get_db),
) -> ProductivityInsightResponse:
    since = datetime.now(timezone.utc) - timedelta(days=payload.days)
    since_date = since.date()

    cards: list[Card] = list(
        db.execute(
            select(Card).where(Card.user_id == payload.user_id)
        ).scalars()
    )
    habits: list[Habit] = list(
        db.execute(
            select(Habit).where(Habit.user_id == payload.user_id)
        ).scalars()
    )
    habit_logs: list[HabitLog] = list(
        db.execute(
            select(HabitLog).where(
                HabitLog.user_id == payload.user_id,
                HabitLog.log_date >= since_date,
            )
        ).scalars()
    )

    stats = _build_productivity_stats(
        cards, habits, habit_logs, since, payload.days
    )

    # Short-circuit: if no completions and no habit logs, there is nothing
    # worth asking the model about.
    if stats.cards_completed == 0 and not any(h.logged_days for h in stats.habits):
        return ProductivityInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_productivity_fallback_summary(stats),
            patterns=[],
            suggestions=[
                "No completed cards or habit check-ins yet in this window."
            ],
            used_ai=False,
        )

    prompt = _PRODUCTIVITY_PROMPT_TEMPLATE.format(
        stats=_format_productivity_stats_for_prompt(stats),
        habit_lines=_format_habit_lines(stats),
        card_lines=_format_completed_card_lines(cards, since),
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_PRODUCTIVITY_AGENT_ID,
        request_type="productivity_insight",
        prompt=prompt,
        declared_fields=["completion_stats", "card_titles"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=500,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        return ProductivityInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_productivity_fallback_summary(stats),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    parsed = _parse_productivity(response.text)
    if parsed is None:
        return ProductivityInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_productivity_fallback_summary(stats),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error="Could not parse productivity JSON.",
        )
    return ProductivityInsightResponse(
        days=payload.days,
        stats=stats,
        used_ai=True,
        audit_log_id=response.audit_log_id,
        **parsed,
    )



# ======================================================================
# Learning Agent - spec section 8 later agents.
# ======================================================================
# Reflects on learning-related activity: cards tagged with life_area
# work_skills or type research, plus habit logs that look study-related.
# Local only by policy.

_LEARNING_AGENT_ID = "learning_agent"

_LEARNING_LIFE_AREAS = {LifeArea.WORK_SKILLS.value}
_LEARNING_CARD_TYPES = {CardType.RESEARCH.value}

_LEARNING_PROMPT_TEMPLATE = (
    "You are the Learning Agent. Reflect on the user's recent learning "
    "and skill-building activity (cards and habits). Reply with ONLY a "
    "JSON object on a single line. No prose. Schema:\n"
    '{{"summary": <string, <=240 chars>, '
    '"patterns": [<string, <=120 chars>], '
    '"suggestions": [<string, <=120 chars>]}}\n\n'
    "Stats:\n{stats}\n\n"
    "Recent learning cards (newest first):\n{card_lines}\n\n"
    "Learning habits:\n{habit_lines}"
)


class LearningInsightRequest(BaseModel):
    user_id: uuid.UUID
    days: int = Field(default=30, ge=1, le=365)


class LearningStats(BaseModel):
    window_days: int
    learning_cards_total: int
    learning_cards_created: int
    learning_cards_completed: int
    learning_cards_in_progress: int
    learning_habits_active: int
    learning_habit_logged_days: int


class LearningInsightResponse(BaseModel):
    days: int
    stats: LearningStats
    summary: str
    patterns: list[str]
    suggestions: list[str]
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


def _is_learning_card(card: Card) -> bool:
    life_area = card.life_area if isinstance(card.life_area, str) else (
        card.life_area.value if card.life_area else None
    )
    card_type = card.type if isinstance(card.type, str) else (
        card.type.value if card.type else None
    )
    return (life_area in _LEARNING_LIFE_AREAS) or (card_type in _LEARNING_CARD_TYPES)


def _build_learning_stats(
    cards: list[Card],
    habits: list[Habit],
    habit_logs: list[HabitLog],
    since: datetime,
    days: int,
) -> LearningStats:
    learning_cards = [c for c in cards if _is_learning_card(c)]
    created = 0
    completed = 0
    in_progress = 0
    for c in learning_cards:
        if c.created_at is not None and c.created_at >= since:
            created += 1
        if c.completed_at is not None and c.completed_at >= since:
            completed += 1
        status_val = c.status if isinstance(c.status, str) else c.status.value
        if status_val in (
            CardStatus.IN_PROGRESS_MY_SIDE.value,
            CardStatus.IN_PROGRESS_OTHER_SIDE.value,
            CardStatus.TODAY.value,
            CardStatus.REVIEW.value,
        ):
            in_progress += 1

    # Learning habits: active habits whose title contains study-related words
    _LEARN_KEYWORDS = {"learn", "study", "course", "read", "book", "lecture", "practice"}
    learn_habits = [
        h for h in habits
        if h.active and any(kw in h.title.lower() for kw in _LEARN_KEYWORDS)
    ]
    learn_habit_ids = {h.id for h in learn_habits}
    learn_log_dates: set = set()
    for log in habit_logs:
        if log.habit_id in learn_habit_ids:
            learn_log_dates.add(log.log_date)

    return LearningStats(
        window_days=days,
        learning_cards_total=len(learning_cards),
        learning_cards_created=created,
        learning_cards_completed=completed,
        learning_cards_in_progress=in_progress,
        learning_habits_active=len(learn_habits),
        learning_habit_logged_days=len(learn_log_dates),
    )


def _format_learning_stats_for_prompt(stats: LearningStats) -> str:
    return (
        f"window_days: {stats.window_days}\n"
        f"learning_cards_total: {stats.learning_cards_total}\n"
        f"learning_cards_created: {stats.learning_cards_created}\n"
        f"learning_cards_completed: {stats.learning_cards_completed}\n"
        f"learning_cards_in_progress: {stats.learning_cards_in_progress}\n"
        f"learning_habits_active: {stats.learning_habits_active}\n"
        f"learning_habit_logged_days: {stats.learning_habit_logged_days}"
    )


def _format_learning_card_lines(cards: list[Card], since: datetime) -> str:
    learn = [c for c in cards if _is_learning_card(c)]
    recent = [c for c in learn if c.created_at is not None and c.created_at >= since]
    recent.sort(key=lambda c: c.created_at, reverse=True)
    lines = []
    for c in recent[:15]:
        title = (c.title or "").strip()[:80]
        status_val = c.status if isinstance(c.status, str) else c.status.value
        if title:
            lines.append(f"- [{status_val}] {title}")
    return "\n".join(lines) if lines else "(none)"


def _format_learning_habit_lines(habits: list[Habit]) -> str:
    _LEARN_KEYWORDS = {"learn", "study", "course", "read", "book", "lecture", "practice"}
    learn_habits = [
        h for h in habits
        if h.active and any(kw in h.title.lower() for kw in _LEARN_KEYWORDS)
    ]
    if not learn_habits:
        return "(none)"
    return "\n".join(f"- {h.title}" for h in learn_habits)


def _learning_fallback_summary(stats: LearningStats) -> str:
    if stats.learning_cards_total == 0 and stats.learning_habits_active == 0:
        return f"No learning activity found in the last {stats.window_days} day(s)."
    return (
        f"In the last {stats.window_days} day(s): "
        f"{stats.learning_cards_completed} learning cards completed, "
        f"{stats.learning_cards_in_progress} in progress, "
        f"{stats.learning_habit_logged_days} study-habit days logged."
    )


def _parse_learning(model_text: str) -> dict | None:
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    summary = data.get("summary")
    if not isinstance(summary, str):
        return None
    summary = summary.strip()[:240]
    if not summary:
        return None

    def _string_list(key: str, max_items: int = 6, max_len: int = 120) -> list[str]:
        raw = data.get(key)
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()[:max_len]
            if cleaned:
                out.append(cleaned)
            if len(out) >= max_items:
                break
        return out

    return {
        "summary": summary,
        "patterns": _string_list("patterns"),
        "suggestions": _string_list("suggestions"),
    }


@router.post("/learning", response_model=LearningInsightResponse)
async def learning_insight(
    payload: LearningInsightRequest,
    db: Session = Depends(get_db),
) -> LearningInsightResponse:
    since = datetime.now(timezone.utc) - timedelta(days=payload.days)
    since_date = since.date()

    cards: list[Card] = list(
        db.execute(
            select(Card).where(Card.user_id == payload.user_id)
        ).scalars()
    )
    habits: list[Habit] = list(
        db.execute(
            select(Habit).where(Habit.user_id == payload.user_id)
        ).scalars()
    )
    habit_logs: list[HabitLog] = list(
        db.execute(
            select(HabitLog).where(
                HabitLog.user_id == payload.user_id,
                HabitLog.log_date >= since_date,
            )
        ).scalars()
    )

    stats = _build_learning_stats(cards, habits, habit_logs, since, payload.days)

    if (
        stats.learning_cards_completed == 0
        and stats.learning_cards_in_progress == 0
        and stats.learning_habit_logged_days == 0
    ):
        return LearningInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_learning_fallback_summary(stats),
            patterns=[],
            suggestions=[
                "No learning activity yet. Tag a card with work_skills or research, "
                "or create a habit with 'study' or 'read' in the title."
            ],
            used_ai=False,
        )

    prompt = _LEARNING_PROMPT_TEMPLATE.format(
        stats=_format_learning_stats_for_prompt(stats),
        card_lines=_format_learning_card_lines(cards, since),
        habit_lines=_format_learning_habit_lines(habits),
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_LEARNING_AGENT_ID,
        request_type="learning_insight",
        prompt=prompt,
        declared_fields=["completion_stats", "card_titles"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=500,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        return LearningInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_learning_fallback_summary(stats),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    parsed = _parse_learning(response.text)
    if parsed is None:
        return LearningInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_learning_fallback_summary(stats),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error="Could not parse learning JSON.",
        )
    return LearningInsightResponse(
        days=payload.days,
        stats=stats,
        used_ai=True,
        audit_log_id=response.audit_log_id,
        **parsed,
    )



# ======================================================================
# Healing Agent - spec section 8 later agents.
# ======================================================================
# Reflects on mental-health and healing activity: cards with life_area
# mind_healing, diary cards, mood/energy from health_logs, and
# healing-related habits. SENSITIVE data -- strictly local.

_HEALING_AGENT_ID = "healing_agent"

_HEALING_LIFE_AREAS = {LifeArea.MIND_HEALING.value}
_HEALING_CARD_TYPES = {CardType.DIARY.value}

_HEALING_PROMPT_TEMPLATE = (
    "You are the Healing Agent. You are gentle and kind. Reflect on the "
    "user's recent mental-health and inner-work activity. Reply with "
    "ONLY a JSON object on a single line. No prose. Schema:\n"
    '{{"summary": <string, <=240 chars>, '
    '"patterns": [<string, <=120 chars>], '
    '"suggestions": [<string, <=120 chars>]}}\n\n'
    "Stats:\n{stats}\n\n"
    "Mood/energy from health logs (last 14 days):\n{mood_lines}\n\n"
    "Healing-related habits:\n{habit_lines}"
)


class HealingInsightRequest(BaseModel):
    user_id: uuid.UUID
    days: int = Field(default=14, ge=1, le=90)


class HealingStats(BaseModel):
    window_days: int
    healing_cards_total: int
    healing_cards_created: int
    diary_entries_in_window: int
    avg_mood: float | None
    avg_energy: float | None
    healing_habits_active: int
    healing_habit_logged_days: int


class HealingInsightResponse(BaseModel):
    days: int
    stats: HealingStats
    summary: str
    patterns: list[str]
    suggestions: list[str]
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


def _is_healing_card(card: Card) -> bool:
    life_area = card.life_area if isinstance(card.life_area, str) else (
        card.life_area.value if card.life_area else None
    )
    card_type = card.type if isinstance(card.type, str) else (
        card.type.value if card.type else None
    )
    return (life_area in _HEALING_LIFE_AREAS) or (card_type in _HEALING_CARD_TYPES)


def _build_healing_stats(
    cards: list[Card],
    health_logs: list[HealthLog],
    habits: list[Habit],
    habit_logs: list[HabitLog],
    since: datetime,
    days: int,
    diary_entries_count: int = 0,
) -> HealingStats:
    healing_cards = [c for c in cards if _is_healing_card(c)]
    created = sum(
        1 for c in healing_cards
        if c.created_at is not None and c.created_at >= since
    )
    diary_cards_in_window = sum(
        1 for c in cards
        if (c.type if isinstance(c.type, str) else (c.type.value if c.type else None)) == CardType.DIARY.value
        and c.created_at is not None and c.created_at >= since
    )
    diary_in_window = diary_cards_in_window + diary_entries_count

    moods = [float(h.mood) for h in health_logs if h.mood is not None]
    energies = [float(h.energy) for h in health_logs if h.energy is not None]
    avg_mood = round(sum(moods) / len(moods), 2) if moods else None
    avg_energy = round(sum(energies) / len(energies), 2) if energies else None

    _HEAL_KEYWORDS = {
        "meditat", "therapy", "journal", "breath", "mindful", "heal",
        "gratitude", "affirmation", "yoga", "stretch", "walk",
    }
    heal_habits = [
        h for h in habits
        if h.active and any(kw in h.title.lower() for kw in _HEAL_KEYWORDS)
    ]
    heal_habit_ids = {h.id for h in heal_habits}
    heal_log_dates: set = set()
    for log in habit_logs:
        if log.habit_id in heal_habit_ids:
            heal_log_dates.add(log.log_date)

    return HealingStats(
        window_days=days,
        healing_cards_total=len(healing_cards),
        healing_cards_created=created,
        diary_entries_in_window=diary_in_window,
        avg_mood=avg_mood,
        avg_energy=avg_energy,
        healing_habits_active=len(heal_habits),
        healing_habit_logged_days=len(heal_log_dates),
    )


def _format_healing_stats_for_prompt(stats: HealingStats) -> str:
    return (
        f"window_days: {stats.window_days}\n"
        f"healing_cards_total: {stats.healing_cards_total}\n"
        f"healing_cards_created: {stats.healing_cards_created}\n"
        f"diary_entries_in_window: {stats.diary_entries_in_window}\n"
        f"avg_mood: {stats.avg_mood}\n"
        f"avg_energy: {stats.avg_energy}\n"
        f"healing_habits_active: {stats.healing_habits_active}\n"
        f"healing_habit_logged_days: {stats.healing_habit_logged_days}"
    )


def _format_mood_lines(health_logs: list[HealthLog]) -> str:
    entries = [
        h for h in health_logs
        if h.mood is not None or h.energy is not None
    ]
    entries.sort(key=lambda h: h.log_date, reverse=True)
    if not entries:
        return "(no mood/energy data)"
    lines = []
    for h in entries[:14]:
        parts = [str(h.log_date)]
        if h.mood is not None:
            parts.append(f"mood={h.mood}")
        if h.energy is not None:
            parts.append(f"energy={h.energy}")
        lines.append("- " + " ".join(parts))
    return "\n".join(lines)


def _format_healing_habit_lines(habits: list[Habit]) -> str:
    _HEAL_KEYWORDS = {
        "meditat", "therapy", "journal", "breath", "mindful", "heal",
        "gratitude", "affirmation", "yoga", "stretch", "walk",
    }
    heal = [
        h for h in habits
        if h.active and any(kw in h.title.lower() for kw in _HEAL_KEYWORDS)
    ]
    return "\n".join(f"- {h.title}" for h in heal) if heal else "(none)"


def _healing_fallback_summary(stats: HealingStats) -> str:
    if (
        stats.healing_cards_total == 0
        and stats.healing_habits_active == 0
        and stats.avg_mood is None
    ):
        return f"No healing activity found in the last {stats.window_days} day(s)."
    bits: list[str] = []
    if stats.diary_entries_in_window:
        bits.append(f"{stats.diary_entries_in_window} diary entries")
    if stats.avg_mood is not None:
        bits.append(f"avg mood {stats.avg_mood}/10")
    if stats.avg_energy is not None:
        bits.append(f"avg energy {stats.avg_energy}/10")
    if stats.healing_habit_logged_days:
        bits.append(f"{stats.healing_habit_logged_days} healing-habit days")
    return (
        f"Last {stats.window_days} day(s): " + "; ".join(bits) + "."
        if bits
        else f"Some healing cards exist but no recent activity in the last {stats.window_days} day(s)."
    )


def _parse_healing(model_text: str) -> dict | None:
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    summary = data.get("summary")
    if not isinstance(summary, str):
        return None
    summary = summary.strip()[:240]
    if not summary:
        return None

    def _string_list(key: str, max_items: int = 6, max_len: int = 120) -> list[str]:
        raw = data.get(key)
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()[:max_len]
            if cleaned:
                out.append(cleaned)
            if len(out) >= max_items:
                break
        return out

    return {
        "summary": summary,
        "patterns": _string_list("patterns"),
        "suggestions": _string_list("suggestions"),
    }


@router.post("/healing", response_model=HealingInsightResponse)
async def healing_insight(
    payload: HealingInsightRequest,
    db: Session = Depends(get_db),
) -> HealingInsightResponse:
    since = datetime.now(timezone.utc) - timedelta(days=payload.days)
    since_date = since.date()

    cards: list[Card] = list(
        db.execute(
            select(Card).where(Card.user_id == payload.user_id)
        ).scalars()
    )
    health_logs: list[HealthLog] = list(
        db.execute(
            select(HealthLog).where(
                HealthLog.user_id == payload.user_id,
                HealthLog.log_date >= since_date,
            )
        ).scalars()
    )
    habits: list[Habit] = list(
        db.execute(
            select(Habit).where(Habit.user_id == payload.user_id)
        ).scalars()
    )
    habit_logs: list[HabitLog] = list(
        db.execute(
            select(HabitLog).where(
                HabitLog.user_id == payload.user_id,
                HabitLog.log_date >= since_date,
            )
        ).scalars()
    )

    # Count dedicated diary_entries created in the window
    from sqlalchemy import func as sa_func
    diary_entries_count: int = db.execute(
        select(sa_func.count()).select_from(DiaryEntry).where(
            DiaryEntry.user_id == payload.user_id,
            DiaryEntry.created_at >= since,
        )
    ).scalar_one()

    stats = _build_healing_stats(
        cards, health_logs, habits, habit_logs, since, payload.days,
        diary_entries_count=diary_entries_count,
    )

    has_signal = (
        stats.diary_entries_in_window > 0
        or stats.healing_habit_logged_days > 0
        or stats.avg_mood is not None
    )
    if not has_signal:
        return HealingInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_healing_fallback_summary(stats),
            patterns=[],
            suggestions=[
                "No mood, diary, or healing-habit activity yet. Log some health "
                "data or write a diary entry to get started."
            ],
            used_ai=False,
        )

    prompt = _HEALING_PROMPT_TEMPLATE.format(
        stats=_format_healing_stats_for_prompt(stats),
        mood_lines=_format_mood_lines(health_logs),
        habit_lines=_format_healing_habit_lines(habits),
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_HEALING_AGENT_ID,
        request_type="healing_insight",
        prompt=prompt,
        declared_fields=["health_summary", "energy_summary", "card_titles"],
        privacy_level=PrivacyLevel.SENSITIVE,
        max_output_tokens=500,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        return HealingInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_healing_fallback_summary(stats),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    parsed = _parse_healing(response.text)
    if parsed is None:
        return HealingInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_healing_fallback_summary(stats),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error="Could not parse healing JSON.",
        )
    return HealingInsightResponse(
        days=payload.days,
        stats=stats,
        used_ai=True,
        audit_log_id=response.audit_log_id,
        **parsed,
    )



# ======================================================================
# Research Agent - spec section 8 later agents.
# ======================================================================
# Reflects on research-typed cards: total, completed, in-progress, and
# the titles of recent ones. Can optionally use external AI (policy
# allows it), but defaults to local.

_RESEARCH_AGENT_ID = "research_agent"

_RESEARCH_PROMPT_TEMPLATE = (
    "You are the Research Agent. Look at the user's research cards and "
    "provide a short reflection. Reply with ONLY a JSON object on a "
    "single line. No prose. Schema:\n"
    '{{"summary": <string, <=240 chars>, '
    '"patterns": [<string, <=120 chars>], '
    '"suggestions": [<string, <=120 chars>]}}\n\n'
    "Stats:\n{stats}\n\n"
    "Recent research cards (newest first):\n{card_lines}"
)


class ResearchInsightRequest(BaseModel):
    user_id: uuid.UUID
    days: int = Field(default=30, ge=1, le=365)


class ResearchStats(BaseModel):
    window_days: int
    research_cards_total: int
    research_cards_created: int
    research_cards_completed: int
    research_cards_in_progress: int


class ResearchInsightResponse(BaseModel):
    days: int
    stats: ResearchStats
    summary: str
    patterns: list[str]
    suggestions: list[str]
    used_ai: bool
    audit_log_id: uuid.UUID | None = None
    error: str | None = None


def _build_research_stats(
    cards: list[Card], since: datetime, days: int
) -> ResearchStats:
    research = [
        c for c in cards
        if (c.type if isinstance(c.type, str) else (c.type.value if c.type else None))
        == CardType.RESEARCH.value
    ]
    created = sum(
        1 for c in research if c.created_at is not None and c.created_at >= since
    )
    completed = sum(
        1 for c in research if c.completed_at is not None and c.completed_at >= since
    )
    in_progress = 0
    for c in research:
        sv = c.status if isinstance(c.status, str) else c.status.value
        if sv in (
            CardStatus.IN_PROGRESS_MY_SIDE.value,
            CardStatus.IN_PROGRESS_OTHER_SIDE.value,
            CardStatus.TODAY.value,
            CardStatus.REVIEW.value,
        ):
            in_progress += 1
    return ResearchStats(
        window_days=days,
        research_cards_total=len(research),
        research_cards_created=created,
        research_cards_completed=completed,
        research_cards_in_progress=in_progress,
    )


def _format_research_stats_for_prompt(stats: ResearchStats) -> str:
    return (
        f"window_days: {stats.window_days}\n"
        f"research_cards_total: {stats.research_cards_total}\n"
        f"research_cards_created: {stats.research_cards_created}\n"
        f"research_cards_completed: {stats.research_cards_completed}\n"
        f"research_cards_in_progress: {stats.research_cards_in_progress}"
    )


def _format_research_card_lines(cards: list[Card], since: datetime) -> str:
    research = [
        c for c in cards
        if (c.type if isinstance(c.type, str) else (c.type.value if c.type else None))
        == CardType.RESEARCH.value
    ]
    recent = [c for c in research if c.created_at is not None and c.created_at >= since]
    recent.sort(key=lambda c: c.created_at, reverse=True)
    lines = []
    for c in recent[:15]:
        title = (c.title or "").strip()[:80]
        sv = c.status if isinstance(c.status, str) else c.status.value
        if title:
            lines.append(f"- [{sv}] {title}")
    return "\n".join(lines) if lines else "(none)"


def _research_fallback_summary(stats: ResearchStats) -> str:
    if stats.research_cards_total == 0:
        return f"No research cards found in the last {stats.window_days} day(s)."
    return (
        f"In the last {stats.window_days} day(s): "
        f"{stats.research_cards_completed} research cards completed, "
        f"{stats.research_cards_in_progress} in progress, "
        f"{stats.research_cards_total} total."
    )


def _parse_research(model_text: str) -> dict | None:
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    summary = data.get("summary")
    if not isinstance(summary, str):
        return None
    summary = summary.strip()[:240]
    if not summary:
        return None

    def _string_list(key: str, max_items: int = 6, max_len: int = 120) -> list[str]:
        raw = data.get(key)
        if not isinstance(raw, list):
            return []
        out: list[str] = []
        for item in raw:
            if not isinstance(item, str):
                continue
            cleaned = item.strip()[:max_len]
            if cleaned:
                out.append(cleaned)
            if len(out) >= max_items:
                break
        return out

    return {
        "summary": summary,
        "patterns": _string_list("patterns"),
        "suggestions": _string_list("suggestions"),
    }


@router.post("/research", response_model=ResearchInsightResponse)
async def research_insight(
    payload: ResearchInsightRequest,
    db: Session = Depends(get_db),
) -> ResearchInsightResponse:
    since = datetime.now(timezone.utc) - timedelta(days=payload.days)

    cards: list[Card] = list(
        db.execute(
            select(Card).where(Card.user_id == payload.user_id)
        ).scalars()
    )
    stats = _build_research_stats(cards, since, payload.days)

    if stats.research_cards_total == 0:
        return ResearchInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_research_fallback_summary(stats),
            patterns=[],
            suggestions=[
                "No research cards yet. Create a card with type 'research' to track investigations."
            ],
            used_ai=False,
        )

    prompt = _RESEARCH_PROMPT_TEMPLATE.format(
        stats=_format_research_stats_for_prompt(stats),
        card_lines=_format_research_card_lines(cards, since),
    )

    gateway = LocalAIGateway(db=db)
    request = GatewayRequest(
        user_id=payload.user_id,
        agent_id=_RESEARCH_AGENT_ID,
        request_type="research_insight",
        prompt=prompt,
        declared_fields=["completion_stats", "card_titles"],
        privacy_level=PrivacyLevel.NORMAL,
        max_output_tokens=500,
        force_local=True,
    )
    response = await gateway.process_request(request)

    if response.final_status != "completed" or not response.text:
        return ResearchInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_research_fallback_summary(stats),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    parsed = _parse_research(response.text)
    if parsed is None:
        return ResearchInsightResponse(
            days=payload.days,
            stats=stats,
            summary=_research_fallback_summary(stats),
            patterns=[],
            suggestions=[],
            used_ai=False,
            audit_log_id=response.audit_log_id,
            error="Could not parse research JSON.",
        )
    return ResearchInsightResponse(
        days=payload.days,
        stats=stats,
        used_ai=True,
        audit_log_id=response.audit_log_id,
        **parsed,
    )


# ======================================================================
# Mission Editor — view/edit personal mission statement + filter questions
# ======================================================================

_DEFAULT_MISSION_DATA = {
    "statement": (
        "To live a happy life. I explore the world's hidden energies and rules, "
        "share clarity with those who seek it, build my freedom to live meaningfully, "
        "and refine myself in chosen solitude."
    ),
    "questions": [
        {"key": "happiness", "question": "Does this support a happier, calmer, more meaningful life?"},
        {"key": "hidden_rules", "question": "Does this help me understand deeper patterns of life, people, systems, money, health, or myself?"},
        {"key": "clarity", "question": "Does this create clarity for me or others?"},
        {"key": "freedom", "question": "Does this increase financial, emotional, physical, time, or location freedom?"},
        {"key": "self_refinement", "question": "Does this refine my body, mind, skills, discipline, taste, or character?"},
        {"key": "chosen_solitude", "question": "Does this respect privacy, peace, independence, and low-noise living?"},
        {"key": "meaning", "question": "Does this make life more intentional rather than random?"},
    ],
}


class MissionQuestion(BaseModel):
    key: str = Field(min_length=1, max_length=50)
    question: str = Field(min_length=1, max_length=300)


class MissionData(BaseModel):
    statement: str = Field(min_length=1, max_length=2000)
    questions: list[MissionQuestion] = Field(min_length=1, max_length=12)


class MissionResponse(BaseModel):
    statement: str
    questions: list[MissionQuestion]


@router.get("/mission/{user_id}", response_model=MissionResponse)
async def get_mission(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> MissionResponse:
    from app.models.user import User

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    data = user.mission_data or _DEFAULT_MISSION_DATA
    return MissionResponse(
        statement=data.get("statement", _DEFAULT_MISSION_DATA["statement"]),
        questions=[
            MissionQuestion(**q)
            for q in data.get("questions", _DEFAULT_MISSION_DATA["questions"])
        ],
    )


@router.put("/mission/{user_id}", response_model=MissionResponse)
async def update_mission(
    user_id: uuid.UUID,
    payload: MissionData,
    db: Session = Depends(get_db),
) -> MissionResponse:
    from app.models.user import User

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user not found")
    user.mission_data = {
        "statement": payload.statement,
        "questions": [q.model_dump() for q in payload.questions],
    }
    db.commit()
    db.refresh(user)
    return MissionResponse(
        statement=payload.statement,
        questions=payload.questions,
    )


# ======================================================================
# Agent Council — "what should I do today?" queries multiple agents
# ======================================================================

class CouncilRequest(BaseModel):
    user_id: uuid.UUID


class CouncilVote(BaseModel):
    agent: str
    recommendation: str


class CouncilResponse(BaseModel):
    votes: list[CouncilVote]
    synthesis: str
    used_ai: bool


@router.post("/council", response_model=CouncilResponse)
async def council(
    payload: CouncilRequest,
    db: Session = Depends(get_db),
) -> CouncilResponse:
    """Query Focus, Energy, Health, and Money agents for a combined recommendation."""
    votes: list[CouncilVote] = []

    # 1. Focus Agent
    try:
        focus_resp = await focus(FocusRequest(user_id=payload.user_id), db)
        votes.append(CouncilVote(
            agent="Focus",
            recommendation=f"Do: {focus_resp.card_title or 'no pick'}. {focus_resp.insight or ''}".strip(),
        ))
    except Exception:
        votes.append(CouncilVote(agent="Focus", recommendation="(unavailable)"))

    # 2. Energy Agent
    try:
        energy_resp = await energy_insight(
            EnergyInsightRequest(user_id=payload.user_id), db
        )
        votes.append(CouncilVote(
            agent="Energy",
            recommendation=energy_resp.summary or "(no data)",
        ))
    except Exception:
        votes.append(CouncilVote(agent="Energy", recommendation="(unavailable)"))

    # 3. Health context from recent health logs
    try:
        since_date = (datetime.now(timezone.utc) - timedelta(days=1)).date()
        health_logs: list[HealthLog] = list(
            db.execute(
                select(HealthLog)
                .where(HealthLog.user_id == payload.user_id, HealthLog.log_date >= since_date)
            ).scalars()
        )
        if health_logs:
            h = health_logs[-1]
            parts = []
            if h.energy is not None:
                parts.append(f"energy {h.energy}/10")
            if h.mood is not None:
                parts.append(f"mood {h.mood}/10")
            if h.sleep_minutes is not None:
                parts.append(f"sleep {round(h.sleep_minutes / 60, 1)}h")
            votes.append(CouncilVote(
                agent="Health",
                recommendation=f"Today's state: {', '.join(parts)}" if parts else "(no data today)",
            ))
        else:
            votes.append(CouncilVote(agent="Health", recommendation="(no data today)"))
    except Exception:
        votes.append(CouncilVote(agent="Health", recommendation="(unavailable)"))

    # 4. Money — check if there are urgent money tasks
    try:
        money_cards = list(
            db.execute(
                select(Card)
                .where(
                    Card.user_id == payload.user_id,
                    Card.life_area == "money_freedom",
                    Card.status.in_([
                        CardStatus.TODAY.value,
                        CardStatus.IN_PROGRESS_MY_SIDE.value,
                    ]),
                )
            ).scalars()
        )
        if money_cards:
            titles = ", ".join(c.title[:40] for c in money_cards[:3])
            votes.append(CouncilVote(
                agent="Money",
                recommendation=f"Active money tasks: {titles}",
            ))
        else:
            votes.append(CouncilVote(agent="Money", recommendation="No urgent money tasks."))
    except Exception:
        votes.append(CouncilVote(agent="Money", recommendation="(unavailable)"))

    # Synthesis (deterministic — no AI call needed for council itself)
    synthesis = _synthesize_council(votes)

    return CouncilResponse(votes=votes, synthesis=synthesis, used_ai=False)


def _synthesize_council(votes: list[CouncilVote]) -> str:
    """Simple deterministic summary from council votes."""
    parts: list[str] = []
    for v in votes:
        if v.recommendation and "(unavailable)" not in v.recommendation:
            parts.append(f"{v.agent}: {v.recommendation}")
    if not parts:
        return "No agents had data to share. Capture a thought to get started."
    return " | ".join(parts)
