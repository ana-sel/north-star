"""phase 5: habits + habit_logs

Revision ID: 0003_habits
Revises: 0002_pending_approvals
Create Date: 2026-05-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0003_habits"
down_revision: Union[str, None] = "0002_pending_approvals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "habits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False, server_default="yes_no"),
        sa.Column("target_value", sa.Numeric(10, 2)),
        sa.Column("target_unit", sa.String(32)),
        sa.Column("schedule", sa.String(32), nullable=False,
                  server_default="daily"),
        sa.Column("active", sa.Boolean, nullable=False,
                  server_default=sa.text("true")),
        sa.Column("privacy_level", sa.String(32), nullable=False,
                  server_default="normal"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_habits_user_active", "habits", ["user_id", "active"])
    op.execute(
        "ALTER TABLE habits ADD CONSTRAINT ck_habits_kind "
        "CHECK (kind IN ('yes_no','number','scale','time','text'))"
    )

    op.create_table(
        "habit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("habit_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("habits.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("log_date", sa.Date, nullable=False),
        sa.Column("value_bool", sa.Boolean),
        sa.Column("value_number", sa.Numeric(12, 2)),
        sa.Column("value_text", sa.Text),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("habit_id", "log_date", name="uq_habit_log_per_day"),
    )
    op.create_index(
        "ix_habit_logs_user_date", "habit_logs", ["user_id", "log_date"]
    )


def downgrade() -> None:
    op.drop_index("ix_habit_logs_user_date", table_name="habit_logs")
    op.drop_table("habit_logs")
    op.drop_index("ix_habits_user_active", table_name="habits")
    op.drop_table("habits")
