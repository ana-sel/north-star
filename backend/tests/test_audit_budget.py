"""Tests for the AI budget report endpoint (/audit/budget)."""
from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models.agent_policy import AgentPolicy
from app.models.ai_audit_log import AIAuditLog
from app.models.user import User


client = TestClient(app)


@pytest.fixture
def budget_world():
    """Seed a user + one agent policy + two audit-log rows."""
    user_id = uuid.uuid4()
    agent_id = f"budget-test-{uuid.uuid4().hex[:6]}"
    with SessionLocal() as db:
        db.add(User(id=user_id, email=f"budget-{user_id}@test.local"))
        db.add(
            AgentPolicy(
                agent_id=agent_id,
                display_name="Budget Test Agent",
                can_read=[],
                cannot_read=[],
                can_use_external_ai=True,
                requires_approval_for=["sensitive"],
                default_model="ollama",
                daily_budget_limit_gbp=Decimal("0.50"),
                monthly_budget_limit_gbp=Decimal("5.00"),
            )
        )
        db.add(
            AIAuditLog(
                user_id=user_id,
                agent_id=agent_id,
                privacy_level="public",
                provider="openai",
                model="gpt-4o-mini",
                request_type="chat",
                external_call=True,
                approval_required=False,
                approved_by_user=False,
                input_tokens=100,
                output_tokens=200,
                estimated_cost_gbp=Decimal("0.12"),
                final_status="completed",
            )
        )
        db.add(
            AIAuditLog(
                user_id=user_id,
                agent_id=agent_id,
                privacy_level="public",
                provider="openai",
                model="gpt-4o-mini",
                request_type="chat",
                external_call=True,
                approval_required=False,
                approved_by_user=False,
                input_tokens=100,
                output_tokens=200,
                estimated_cost_gbp=Decimal("0.08"),
                final_status="completed",
            )
        )
        db.commit()

    yield {"user_id": user_id, "agent_id": agent_id}

    with SessionLocal() as db:
        db.query(AIAuditLog).filter(AIAuditLog.user_id == user_id).delete()
        db.query(AgentPolicy).filter(AgentPolicy.agent_id == agent_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()


def test_budget_report_returns_global_and_per_agent_spend(budget_world):
    user_id = str(budget_world["user_id"])
    agent_id = budget_world["agent_id"]

    resp = client.get("/audit/budget", params={"user_id": user_id})
    assert resp.status_code == 200, resp.text
    body = resp.json()

    # Global spend = sum of the two seeded logs (0.12 + 0.08 = 0.20).
    assert Decimal(body["global_daily_spend_gbp"]) >= Decimal("0.20")
    assert Decimal(body["global_monthly_spend_gbp"]) >= Decimal("0.20")

    # Per-agent row exists with matching limits and spend.
    agent_rows = [r for r in body["by_agent"] if r["agent_id"] == agent_id]
    assert len(agent_rows) == 1
    row = agent_rows[0]
    assert row["display_name"] == "Budget Test Agent"
    assert Decimal(row["daily_limit_gbp"]) == Decimal("0.50")
    assert Decimal(row["monthly_limit_gbp"]) == Decimal("5.00")
    assert Decimal(row["daily_spend_gbp"]) >= Decimal("0.20")
    assert Decimal(row["monthly_spend_gbp"]) >= Decimal("0.20")


def test_budget_report_requires_user_id():
    resp = client.get("/audit/budget")
    assert resp.status_code == 422


def test_budget_report_isolates_users(budget_world):
    """A different user_id must NOT see the seeded spend."""
    other_user = uuid.uuid4()
    with SessionLocal() as db:
        db.add(User(id=other_user, email=f"other-{other_user}@test.local"))
        db.commit()
    try:
        resp = client.get("/audit/budget", params={"user_id": str(other_user)})
        assert resp.status_code == 200
        body = resp.json()
        assert Decimal(body["global_daily_spend_gbp"]) == Decimal("0")
        # by_agent rows still appear (policies are global) but with zero spend.
        for row in body["by_agent"]:
            assert Decimal(row["daily_spend_gbp"]) == Decimal("0")
            assert Decimal(row["monthly_spend_gbp"]) == Decimal("0")
    finally:
        with SessionLocal() as db:
            db.query(User).filter(User.id == other_user).delete()
            db.commit()
