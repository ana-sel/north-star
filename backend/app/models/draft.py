"""Draft model — proposed structured items from Capture / Sort mode.

Spec §4. Drafts are NOT active cards. They are AI suggestions that the
user must explicitly accept (→ card) or dismiss (→ archived insight /
delete). Drafts are only auto-created in Sort mode (triage kind=sort) or
when the user explicitly asks via slash-command or "Create drafts".
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Draft(Base):
    __tablename__ = "drafts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # The original chat message that produced this draft (audit + grouping).
    source_text: Mapped[str] = mapped_column(Text, nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    # Subset of DraftType from the spec — start small and grow as we need.
    # Allowed: task | insight | decision | research | lesson
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default="task")
    # Lifecycle. Allowed: new | accepted | dismissed | archived_insight
    state: Mapped[str] = mapped_column(String(32), nullable=False, default="new")

    life_area: Mapped[str | None] = mapped_column(String(32))
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
