"""Audit log API — spec §7.8 / §8.5. Read-only listing of AI audit records.

Exposes only redacted data. Never returns raw prompts.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models.agent_policy import AgentPolicy
from app.models.ai_audit_log import AIAuditLog


router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogOut(BaseModel):
    id: uuid.UUID
    agent_id: str
    privacy_level: str
    provider: str
    model: str
    request_type: str
    external_call: bool
    approval_required: bool
    approved_by_user: bool
    input_tokens: int
    output_tokens: int
    estimated_cost_gbp: Decimal
    final_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
class AuditSummary(BaseModel):
    total_requests: int
    external_calls: int
    local_calls: int
    approvals_required: int
    approvals_granted: int
    total_cost_gbp: Decimal
    by_agent: dict[str, int]


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    user_id: uuid.UUID = Query(...),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    agent_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[AIAuditLog]:
    stmt = (
        select(AIAuditLog)
        .where(AIAuditLog.user_id == user_id)
    )
    if agent_id:
        stmt = stmt.where(AIAuditLog.agent_id == agent_id)
    stmt = stmt.order_by(AIAuditLog.created_at.desc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars())


@router.get("/summary", response_model=AuditSummary)
def audit_summary(
    user_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> AuditSummary:
    base = select(AIAuditLog).where(AIAuditLog.user_id == user_id)
    logs = list(db.execute(base).scalars())

    by_agent: dict[str, int] = {}
    for log in logs:
        by_agent[log.agent_id] = by_agent.get(log.agent_id, 0) + 1

    return AuditSummary(
        total_requests=len(logs),
        external_calls=sum(1 for l in logs if l.external_call),
        local_calls=sum(1 for l in logs if not l.external_call),
        approvals_required=sum(1 for l in logs if l.approval_required),
        approvals_granted=sum(1 for l in logs if l.approved_by_user),
        total_cost_gbp=sum((l.estimated_cost_gbp for l in logs), Decimal("0")),
        by_agent=by_agent,
    )


class AgentBudgetRow(BaseModel):
    agent_id: str
    display_name: str
    daily_limit_gbp: Decimal | None
    daily_spend_gbp: Decimal
    monthly_limit_gbp: Decimal | None
    monthly_spend_gbp: Decimal


class BudgetReport(BaseModel):
    global_daily_limit_gbp: Decimal
    global_daily_spend_gbp: Decimal
    global_monthly_limit_gbp: Decimal
    global_monthly_spend_gbp: Decimal
    by_agent: list[AgentBudgetRow]


@router.get("/budget", response_model=BudgetReport)
def budget_report(
    user_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
) -> BudgetReport:
    """Per-agent + global budget vs spend for the AI gateway.

    Only counts billable (external) calls. Local Ollama calls have cost 0
    but are included if they happen to have a non-zero estimated cost.
    """
    now = datetime.now(timezone.utc)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = day_start.replace(day=1)

    def _sum(stmt) -> Decimal:
        value = db.execute(stmt).scalar()
        return Decimal(value) if value is not None else Decimal("0")

    global_daily = _sum(
        select(func.sum(AIAuditLog.estimated_cost_gbp)).where(
            AIAuditLog.user_id == user_id,
            AIAuditLog.created_at >= day_start,
        )
    )
    global_monthly = _sum(
        select(func.sum(AIAuditLog.estimated_cost_gbp)).where(
            AIAuditLog.user_id == user_id,
            AIAuditLog.created_at >= month_start,
        )
    )

    policies = list(db.execute(select(AgentPolicy)).scalars())
    rows: list[AgentBudgetRow] = []
    for policy in policies:
        daily_spend = _sum(
            select(func.sum(AIAuditLog.estimated_cost_gbp)).where(
                AIAuditLog.user_id == user_id,
                AIAuditLog.agent_id == policy.agent_id,
                AIAuditLog.created_at >= day_start,
            )
        )
        monthly_spend = _sum(
            select(func.sum(AIAuditLog.estimated_cost_gbp)).where(
                AIAuditLog.user_id == user_id,
                AIAuditLog.agent_id == policy.agent_id,
                AIAuditLog.created_at >= month_start,
            )
        )
        rows.append(
            AgentBudgetRow(
                agent_id=policy.agent_id,
                display_name=policy.display_name,
                daily_limit_gbp=policy.daily_budget_limit_gbp,
                daily_spend_gbp=daily_spend,
                monthly_limit_gbp=policy.monthly_budget_limit_gbp,
                monthly_spend_gbp=monthly_spend,
            )
        )

    rows.sort(key=lambda r: r.monthly_spend_gbp, reverse=True)

    return BudgetReport(
        global_daily_limit_gbp=Decimal(str(settings.global_daily_budget_gbp)),
        global_daily_spend_gbp=global_daily,
        global_monthly_limit_gbp=Decimal(str(settings.global_monthly_budget_gbp)),
        global_monthly_spend_gbp=global_monthly,
        by_agent=rows,
    )
