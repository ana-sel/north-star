"""merge drafts + user_settings heads

Revision ID: 0009_merge_drafts
Revises: 0006_drafts, 0008_user_settings
Create Date: 2026-05-19

"""
from typing import Sequence, Union


revision: str = "0009_merge_drafts"
down_revision: Union[str, Sequence[str], None] = ("0006_drafts", "0008_user_settings")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
