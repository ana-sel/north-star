"""phase 19 (chat redesign slice 3): drafts table

Revision ID: 0006_drafts
Revises: 0005_health_unique
Create Date: 2026-05-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0006_drafts"
down_revision: Union[str, None] = "0005_health_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "drafts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_text", sa.Text, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False, server_default="task"),
        sa.Column("state", sa.String(32), nullable=False, server_default="new"),
        sa.Column("life_area", sa.String(32)),
        sa.Column("confidence", sa.Float, nullable=False, server_default="0.5"),
        sa.Column("reason", sa.Text),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_drafts_user_id", "drafts", ["user_id"])
    op.create_index("ix_drafts_user_state", "drafts", ["user_id", "state"])
    op.execute(
        "ALTER TABLE drafts ADD CONSTRAINT ck_drafts_kind "
        "CHECK (kind IN ('task','insight','decision','research','lesson'))"
    )
    op.execute(
        "ALTER TABLE drafts ADD CONSTRAINT ck_drafts_state "
        "CHECK (state IN ('new','accepted','dismissed','archived_insight'))"
    )


def downgrade() -> None:
    op.drop_index("ix_drafts_user_state", table_name="drafts")
    op.drop_index("ix_drafts_user_id", table_name="drafts")
    op.drop_table("drafts")
