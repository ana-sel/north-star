"""phase 17: energy_logs table

Revision ID: 0004_energy_logs
Revises: 0003_habits
Create Date: 2026-05-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0004_energy_logs"
down_revision: Union[str, None] = "0003_habits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "energy_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("level", sa.String(16), nullable=False),
        sa.Column("notes", sa.Text),
        sa.Column("logged_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_energy_logs_user_logged_at",
        "energy_logs",
        ["user_id", "logged_at"],
    )
    op.execute(
        "ALTER TABLE energy_logs ADD CONSTRAINT ck_energy_logs_level "
        "CHECK (level IN ('low','medium','high'))"
    )


def downgrade() -> None:
    op.drop_index("ix_energy_logs_user_logged_at", table_name="energy_logs")
    op.drop_table("energy_logs")
