"""Habit + HabitLog models — spec §5.6 / §8 Habits.

Habits are tracked separately from Kanban cards (rule §4 of the spec)
to avoid duplicating recurring behaviours as daily tasks. Each habit
has a `kind` describing the input shape; logs are one row per habit
per day.
"""
import uuid
from datetime import datetime, date

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.enums import PrivacyLevel


# Habit input kinds. Mirrors spec §5.6 input list.
HABIT_KINDS = ("yes_no", "number", "scale", "time", "text")


class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="yes_no")
    target_value: Mapped[float | None] = mapped_column(Numeric(10, 2))
    target_unit: Mapped[str | None] = mapped_column(String(32))
    schedule: Mapped[str] = mapped_column(
        String(32), nullable=False, default="daily"
    )
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        String(32), nullable=False, default=PrivacyLevel.NORMAL
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


class HabitLog(Base):
    __tablename__ = "habit_logs"
    __table_args__ = (
        UniqueConstraint("habit_id", "log_date", name="uq_habit_log_per_day"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    habit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("habits.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    log_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Only one of these will typically be set; matches the habit's `kind`.
    value_bool: Mapped[bool | None] = mapped_column(Boolean)
    value_number: Mapped[float | None] = mapped_column(Numeric(12, 2))
    value_text: Mapped[str | None] = mapped_column(Text)

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
