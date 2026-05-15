import uuid
from datetime import datetime, date

from sqlalchemy import String, Integer, Numeric, Date, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.enums import PrivacyLevel


class HealthLog(Base):
    __tablename__ = "health_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "log_date", name="uq_health_logs_user_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    log_date: Mapped[date] = mapped_column(Date, nullable=False)

    sleep_minutes: Mapped[int | None] = mapped_column(Integer)
    bedtime: Mapped[str | None] = mapped_column(String(5))      # "HH:MM"
    wake_time: Mapped[str | None] = mapped_column(String(5))    # "HH:MM"
    weight_kg: Mapped[float | None] = mapped_column(Numeric(6, 2))
    calories: Mapped[int | None] = mapped_column(Integer)
    protein_g: Mapped[int | None] = mapped_column(Integer)
    steps: Mapped[int | None] = mapped_column(Integer)
    energy: Mapped[int | None] = mapped_column(Integer)  # 1–10
    mood: Mapped[int | None] = mapped_column(Integer)  # 1–10

    notes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        String(32), nullable=False, default=PrivacyLevel.SENSITIVE
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
