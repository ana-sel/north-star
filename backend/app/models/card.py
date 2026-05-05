import uuid
from datetime import datetime

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.enums import (
    CardLevel,
    CardType,
    CardStatus,
    LifeArea,
    EnergyLevel,
    Priority,
    PrivacyLevel,
    EmbeddingStatus,
)


class Card(Base):
    """A card represents one thought / goal / task / focus block (spec §8.2)."""

    __tablename__ = "cards"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cards.id", ondelete="SET NULL")
    )
    root_goal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    level: Mapped[CardLevel] = mapped_column(
        String(32), nullable=False, default=CardLevel.TASK
    )
    type: Mapped[CardType] = mapped_column(
        String(32), nullable=False, default=CardType.TASK
    )
    status: Mapped[CardStatus] = mapped_column(
        String(32), nullable=False, default=CardStatus.INBOX
    )
    life_area: Mapped[LifeArea | None] = mapped_column(String(32))

    mission_scores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    assigned_agent_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    energy_required: Mapped[EnergyLevel] = mapped_column(
        String(16), nullable=False, default=EnergyLevel.MEDIUM
    )
    estimated_minutes: Mapped[int | None] = mapped_column(Integer)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    moved_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    priority: Mapped[Priority] = mapped_column(
        String(16), nullable=False, default=Priority.MEDIUM
    )

    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        String(32), nullable=False, default=PrivacyLevel.NORMAL
    )
    embedding_status: Mapped[EmbeddingStatus] = mapped_column(
        String(32), nullable=False, default=EmbeddingStatus.NOT_EMBEDDED
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
