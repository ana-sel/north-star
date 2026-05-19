"""merge 0006 heads and add users.mission_data

The model `User.mission_data` was added to the codebase before this
migration was written. Postgres rejected INSERTs because the column
didn't exist. This migration:

1. Merges the two parallel `0006_*` heads into a single head.
2. Adds `users.mission_data JSONB NOT NULL DEFAULT '{}'`.

Revision ID: 0007_merge_users_mission
Revises: 0006_bedtime_waketime, 0006_must_haves
Create Date: 2026-05-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "0007_merge_users_mission"
down_revision: Union[str, Sequence[str], None] = (
    "0006_bedtime_waketime",
    "0006_must_haves",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "mission_data",
            JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "mission_data")
