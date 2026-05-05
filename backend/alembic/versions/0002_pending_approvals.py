"""phase 4: pending_ai_approvals

Revision ID: 0002_pending_approvals
Revises: 0001_initial
Create Date: 2026-05-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0002_pending_approvals"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pending_ai_approvals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_id", sa.String(64), nullable=False),
        sa.Column("audit_log_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("ai_audit_logs.id", ondelete="CASCADE"),
                  nullable=False, unique=True),
        sa.Column("request_type", sa.String(64), nullable=False),
        sa.Column("privacy_level", sa.String(32), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("redacted_prompt", sa.Text, nullable=False),
        sa.Column("redaction_map", postgresql.JSONB, nullable=False,
                  server_default=sa.text("'{}'::jsonb")),
        sa.Column("max_output_tokens", sa.Integer, nullable=False,
                  server_default="512"),
        sa.Column("estimated_cost_gbp", sa.Numeric(10, 4), nullable=False,
                  server_default="0"),
        sa.Column("status", sa.String(16), nullable=False,
                  server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True)),
        sa.Column("decided_outcome", sa.String(16)),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_pending_approvals_user_status",
        "pending_ai_approvals",
        ["user_id", "status"],
    )
    op.execute(
        "ALTER TABLE pending_ai_approvals "
        "ADD CONSTRAINT ck_pending_approvals_status "
        "CHECK (status IN ('pending','approved','rejected','expired','executed'))"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE pending_ai_approvals "
        "DROP CONSTRAINT IF EXISTS ck_pending_approvals_status"
    )
    op.drop_index("ix_pending_approvals_user_status",
                  table_name="pending_ai_approvals")
    op.drop_table("pending_ai_approvals")
