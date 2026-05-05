"""Phase 4 — non-DB tests.

Covers cost estimator, schema wiring, and the import surface so
later DB-integration tests can focus on flow only.
"""
from __future__ import annotations

from decimal import Decimal


def test_cost_estimator_local_is_zero():
    from app.gateway.cost import estimate_cost_gbp

    cost = estimate_cost_gbp(
        provider="ollama", model="llama3.2",
        input_chars=1000, max_output_tokens=500,
    )
    assert cost == Decimal("0")


def test_cost_estimator_external_is_positive():
    from app.gateway.cost import estimate_cost_gbp

    cost = estimate_cost_gbp(
        provider="claude", model="claude-3-5-sonnet-latest",
        input_chars=2000, max_output_tokens=600,
    )
    assert cost > Decimal("0")
    # Sanity bound — should be cents, not pounds.
    assert cost < Decimal("1.00")


def test_cost_estimator_unknown_model_uses_default():
    from app.gateway.cost import estimate_cost_gbp

    cost_unknown = estimate_cost_gbp(
        provider="openai", model="some-future-model",
        input_chars=1000, max_output_tokens=500,
    )
    cost_known = estimate_cost_gbp(
        provider="openai", model="gpt-4o-mini",
        input_chars=1000, max_output_tokens=500,
    )
    # Both produce a number; default fallback should not crash.
    assert cost_unknown > Decimal("0")
    assert cost_known >= Decimal("0")


def test_approval_preview_shape_matches_pending_row_fields():
    """The preview returned to the UI must match what the DB stores —
    so the modal cannot show more data than the audit row contains."""
    from app.gateway.schemas import ApprovalPreview
    from app.models.pending_approval import PendingApproval

    preview_fields = set(ApprovalPreview.model_fields.keys())
    table_columns = {c.name for c in PendingApproval.__table__.columns}

    must_overlap = {
        "agent_id",
        "request_type",
        "privacy_level",
        "provider",
        "model",
        "redacted_prompt",
        "redaction_map",
        "estimated_cost_gbp",
        "expires_at",
    }
    assert must_overlap.issubset(preview_fields)
    assert must_overlap.issubset(table_columns)


def test_gateway_imports_cleanly():
    from app.gateway import (
        ApprovalPreview,
        GatewayPolicyError,
        GatewayRequest,
        GatewayResponse,
        LocalAIGateway,
    )

    # The orchestrator must still expose the approval entrypoints.
    assert hasattr(LocalAIGateway, "execute_approved")
    assert hasattr(LocalAIGateway, "reject_pending")
    # Sanity: schemas are real Pydantic models.
    assert hasattr(ApprovalPreview, "model_fields")
    assert hasattr(GatewayResponse, "model_fields")
    assert issubclass(GatewayPolicyError, Exception)
    assert hasattr(GatewayRequest, "model_fields")
