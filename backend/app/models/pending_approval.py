import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Boolean, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PendingApproval(Base):
    """A queued external AI call awaiting human approval.

    Created by the gateway whenever an external call is needed for content
    whose `privacy_level` is in the agent's `requires_approval_for`.
    The call's full plan (provider, model, redacted prompt, params) is
    stored here so the approval endpoint can execute it later, identically.

    No raw originals are stored.  `redacted_prompt` is what the provider
    will see; `redaction_map` is placeholder->category only (audit-safe).
    """

    __tablename__ = "pending_ai_approvals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    agent_id: Mapped[str] = mapped_column(String(64), nullable=False)
    audit_log_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_audit_logs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # What was requested
    request_type: Mapped[str] = mapped_column(String(64), nullable=False)
    privacy_level: Mapped[str] = mapped_column(String(32), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)

    # Exact text the provider will see (already redacted).  Stored so the
    # approve endpoint can replay the call with no surprises.
    redacted_prompt: Mapped[str] = mapped_column(String, nullable=False)
    redaction_map: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict
    )

    max_output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=512)
    estimated_cost_gbp: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0")
    )

    # Lifecycle
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending"
    )  # pending | approved | rejected | expired | executed
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_outcome: Mapped[str | None] = mapped_column(String(16))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
