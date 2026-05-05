import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Boolean, Integer, Numeric, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AIAuditLog(Base):
    """Immutable audit record for every AI request that touches the gateway.

    Raw sensitive prompts are never stored — only redacted versions.
    See spec §7.8 / §8.5.
    """

    __tablename__ = "ai_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    agent_id: Mapped[str] = mapped_column(String(64), nullable=False)

    privacy_level: Mapped[str] = mapped_column(String(32), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)

    request_type: Mapped[str] = mapped_column(String(64), nullable=False)
    external_call: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    original_prompt_stored: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    redacted_prompt: Mapped[dict | None] = mapped_column(JSONB)
    redaction_map: Mapped[dict | None] = mapped_column(JSONB)

    approval_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    approved_by_user: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost_gbp: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0")
    )

    input_scan_status: Mapped[str] = mapped_column(String(32), default="not_scanned")
    output_scan_status: Mapped[str] = mapped_column(String(32), default="not_scanned")
    final_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="completed"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
