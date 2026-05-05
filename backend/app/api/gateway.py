"""Phase 2 sanity-check endpoint for the Local AI Gateway.

POST /gateway/test  with a `GatewayRequest` body.
Returns the `GatewayResponse` so you can verify policy enforcement,
routing, and audit logging end-to-end.

This endpoint is for development.  Real agent endpoints arrive in Phase 6+.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.gateway import GatewayRequest, GatewayResponse, LocalAIGateway

router = APIRouter(prefix="/gateway", tags=["gateway"])


@router.post("/test", response_model=GatewayResponse)
async def gateway_test(
    request: GatewayRequest,
    db: Session = Depends(get_db),
) -> GatewayResponse:
    gateway = LocalAIGateway(db=db)
    return await gateway.process_request(request)
