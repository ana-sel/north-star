"""phase 18: unique health_log per user per day

Revision ID: 0005_health_unique
Revises: 0004_energy_logs
Create Date: 2026-05-06

"""
from typing import Sequence, Union

from alembic import op


revision: str = "0005_health_unique"
down_revision: Union[str, None] = "0004_energy_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_health_logs_user_date",
        "health_logs",
        ["user_id", "log_date"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_health_logs_user_date", "health_logs", type_="unique"
    )
