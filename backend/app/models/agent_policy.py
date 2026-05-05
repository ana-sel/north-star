import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Boolean, Numeric, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AgentPolicy(Base):
    """Policy controlling what an agent may read and which AI models it may use.

    See spec §7.4 / §8.4. Enforced by the Local AI Gateway.
    """

    __tablename__ = "agent_policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    agent_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)

    can_read: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    cannot_read: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    can_use_external_ai: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    requires_approval_for: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=lambda: ["sensitive", "never_external"],
    )
    default_model: Mapped[str] = mapped_column(
        String(64), nullable=False, default="ollama"
    )
    monthly_budget_limit_gbp: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
