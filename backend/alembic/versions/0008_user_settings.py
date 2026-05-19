"""add user_settings JSONB column to users

Revision ID: 0008_user_settings
Revises: 0007_merge_users_mission
Create Date: 2026-05-19

Adds a flexible JSONB blob on users for per-user settings (currently just
the encrypted iCal URL, but designed to hold other prefs over time).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0008_user_settings"
down_revision = "0007_merge_users_mission"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "user_settings",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "user_settings")
