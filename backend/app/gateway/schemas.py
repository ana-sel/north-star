"""Pydantic schemas for the Local AI Gateway boundary.

These are the only shapes any agent uses to talk to the gateway.
No agent constructs provider-specific payloads directly.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.enums import PrivacyLevel


RequestType = Literal[
    "classify",
    "summarise",
    "split_goal",
    "mission_score",
    "focus_pick",
    "review",
    "chat",
    "embed",
]

Provider = Literal["ollama", "openai", "claude", "grok", "groq"]

FinalStatus = Literal[
    "completed",
    "blocked_by_policy",
    "blocked_by_budget",
    "awaiting_approval",
    "rejected_by_user",
    "provider_error",
]


class GatewayRequest(BaseModel):
    """Incoming request from an agent to the gateway."""

    user_id: uuid.UUID
    agent_id: str
    request_type: RequestType

    # Free-form prompt the agent has already prepared. The gateway will
    # redact it (Phase 3) before any external call.
    prompt: str

    # The agent must declare what fields it is sending so the gateway can
    # check `cannot_read`. Examples: ["card_titles", "diary_raw"].
    declared_fields: list[str] = Field(default_factory=list)

    # Highest privacy level present in `prompt`. Drives routing decisions.
    privacy_level: PrivacyLevel = PrivacyLevel.NORMAL

    # Preferred provider. The gateway is free to override (e.g. force local
    # for sensitive content).
    preferred_provider: Provider | None = None
    preferred_model: str | None = None

    # Maximum tokens the agent expects to need. Used for cost estimate.
    max_output_tokens: int = 512

    # If true, the gateway must not call an external provider regardless
    # of the agent's policy.
    force_local: bool = False


class GatewayResponse(BaseModel):
    """Outgoing response from the gateway to the agent."""

    audit_log_id: uuid.UUID
    final_status: FinalStatus
    provider: Provider
    model: str
    external_call: bool

    text: str | None = None
    error: str | None = None

    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_gbp: Decimal = Decimal("0")

    # Populated when final_status == "awaiting_approval".
    pending_approval_id: uuid.UUID | None = None
    approval_preview: "ApprovalPreview | None" = None


class ApprovalPreview(BaseModel):
    """Everything a human needs to decide whether to approve an external AI call.

    Stays in memory only when surfaced via GatewayResponse; persisted as
    `pending_ai_approvals` row (without `restoration_map`).
    """

    pending_approval_id: uuid.UUID
    agent_id: str
    request_type: RequestType
    privacy_level: PrivacyLevel
    provider: Provider
    model: str
    redacted_prompt: str
    redaction_map: dict[str, str]  # placeholder -> category (audit-safe)
    estimated_cost_gbp: Decimal
    expires_at: datetime


class ProviderResult(BaseModel):
    """What a provider returns to the gateway (internal)."""

    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_gbp: Decimal = Decimal("0")
