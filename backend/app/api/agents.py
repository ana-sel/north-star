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

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.enums import CardLevel, CardStatus, CardType, EnergyLevel, LifeArea, PrivacyLevel
from app.gateway import GatewayRequest, LocalAIGateway
from app.models.card import Card


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
    "Pick {pick_min} to {pick_max} cards from the candidate list that "
    "best fit that energy and would be most valuable today. "
    "Reply with ONLY a JSON object on a single line. No prose. "
    "Schema:\n"
    '{{"picks": [{{"id": <int>, "reason": <string, <=120 chars>}}]}}\n'
    "Use the integer `id` shown next to each candidate.\n\n"
    "Candidates (id · status · title):\n{candidates}"
)


class FocusRequest(BaseModel):
    user_id: uuid.UUID
    energy: EnergyLevel = EnergyLevel.MEDIUM


class FocusPick(BaseModel):
    card_id: uuid.UUID
    title: str
    reason: str | None = None


class FocusResponse(BaseModel):
    energy: EnergyLevel
    picks: list[FocusPick]
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

    if not candidates:
        return FocusResponse(
            energy=payload.energy,
            picks=[],
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
            used_ai=False,
            candidate_count=len(candidates),
            audit_log_id=response.audit_log_id,
            error=response.error,
        )

    picks = _parse_focus_picks(response.text, by_idx)
    if not picks:
        picks = _fallback_picks(candidates, payload.energy)
        used_ai = False
    else:
        used_ai = True

    return FocusResponse(
        energy=payload.energy,
        picks=picks,
        used_ai=used_ai,
        candidate_count=len(candidates),
        audit_log_id=response.audit_log_id,
    )


def _parse_focus_picks(
    model_text: str,
    by_idx: dict[int, Card],
) -> list[FocusPick]:
    """Pull `picks` out of the model's JSON. Tolerates prose around it."""
    match = _JSON_OBJ_RE.search(model_text)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []

    raw_picks = data.get("picks")
    if not isinstance(raw_picks, list):
        return []

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
    return out


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
