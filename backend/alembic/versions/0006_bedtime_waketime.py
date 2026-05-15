"""Add bedtime and wake_time columns to health_logs.

Revision ID: 0006_bedtime_waketime
Revises: 0005_health_unique
Create Date: 2026-05-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "0006_bedtime_waketime"
down_revision: Union[str, None] = "0005_health_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("health_logs", sa.Column("bedtime", sa.String(5), nullable=True))
    op.add_column("health_logs", sa.Column("wake_time", sa.String(5), nullable=True))


def downgrade() -> None:
    op.drop_column("health_logs", "wake_time")
    op.drop_column("health_logs", "bedtime")
