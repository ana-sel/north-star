"""must-haves: rejection_insight on cards, daily_budget_limit_gbp on agent_policies

Revision ID: 0006_must_haves
Revises: 0005_health_unique
Create Date: 2026-05-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "0006_must_haves"
down_revision: Union[str, None] = "0005_health_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cards",
        sa.Column("rejection_insight", sa.Text(), nullable=True),
    )
    op.add_column(
        "agent_policies",
        sa.Column("daily_budget_limit_gbp", sa.Numeric(10, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("agent_policies", "daily_budget_limit_gbp")
    op.drop_column("cards", "rejection_insight")
