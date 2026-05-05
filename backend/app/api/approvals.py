"""Phase 4 — human approval endpoints.

Flow:
  1. An agent submits a GatewayRequest that requires approval. The
     gateway redacts, stores a `pending_ai_approvals` row, and the
     response carries `pending_approval_id` + `approval_preview`.
  2. The phone (or HTML demo page) lists pending items via
     `GET /approvals`, fetches the preview via `GET /approvals/{id}`,
     and the human chooses Approve / Reject.
  3. Approve  → `POST /approvals/{id}/approve` runs the queued external
     call with the EXACT redacted prompt the user just saw.
  4. Reject   → `POST /approvals/{id}/reject` updates the audit log
     and the queued row; nothing is ever sent.

The redacted prompt and redaction map (placeholder→category only) are
the only payload bits the user can see — originals never come through
the API.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.gateway import GatewayPolicyError, GatewayResponse, LocalAIGateway
from app.models.pending_approval import PendingApproval


router = APIRouter(prefix="/approvals", tags=["approvals"])


# -- Response shapes ---------------------------------------------------------

class ApprovalListItem(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    agent_id: str
    request_type: str
    privacy_level: str
    provider: str
    model: str
    estimated_cost_gbp: Decimal
    status: str
    created_at: datetime
    expires_at: datetime


class ApprovalDetail(ApprovalListItem):
    """Full preview for the approval modal — redacted only."""
    redacted_prompt: str
    redaction_map: dict[str, str]


# -- Endpoints ---------------------------------------------------------------

@router.get("", response_model=list[ApprovalListItem])
def list_approvals(
    user_id: uuid.UUID = Query(..., description="Owner whose pending approvals to list"),
    status_filter: Literal["pending", "approved", "rejected", "expired", "executed"] | None
        = Query(None, alias="status"),
    db: Session = Depends(get_db),
) -> list[ApprovalListItem]:
    stmt = select(PendingApproval).where(PendingApproval.user_id == user_id)
    if status_filter:
        stmt = stmt.where(PendingApproval.status == status_filter)
    stmt = stmt.order_by(PendingApproval.created_at.desc())
    rows = db.execute(stmt).scalars().all()
    return [_to_list_item(r) for r in rows]


@router.get("/{approval_id}", response_model=ApprovalDetail)
def get_approval(
    approval_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ApprovalDetail:
    row = db.get(PendingApproval, approval_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "pending approval not found")
    return _to_detail(row)


@router.post("/{approval_id}/approve", response_model=GatewayResponse)
async def approve(
    approval_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> GatewayResponse:
    gateway = LocalAIGateway(db=db)
    try:
        return await gateway.execute_approved(approval_id)
    except GatewayPolicyError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))


@router.post("/{approval_id}/reject")
def reject(
    approval_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Response:
    gateway = LocalAIGateway(db=db)
    try:
        gateway.reject_pending(approval_id)
    except GatewayPolicyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# -- Helpers -----------------------------------------------------------------

def _to_list_item(row: PendingApproval) -> ApprovalListItem:
    return ApprovalListItem(
        id=row.id,
        user_id=row.user_id,
        agent_id=row.agent_id,
        request_type=row.request_type,
        privacy_level=row.privacy_level,
        provider=row.provider,
        model=row.model,
        estimated_cost_gbp=row.estimated_cost_gbp,
        status=row.status,
        created_at=row.created_at,
        expires_at=row.expires_at,
    )


def _to_detail(row: PendingApproval) -> ApprovalDetail:
    return ApprovalDetail(
        **_to_list_item(row).model_dump(),
        redacted_prompt=row.redacted_prompt,
        redaction_map=dict(row.redaction_map or {}),
    )
