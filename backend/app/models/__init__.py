"""Aggregate model imports so Alembic / SQLAlchemy see every table."""

from app.models.user import User
from app.models.card import Card
from app.models.diary_entry import DiaryEntry
from app.models.health_log import HealthLog
from app.models.money_transaction import MoneyTransaction
from app.models.file import File
from app.models.agent_policy import AgentPolicy
from app.models.ai_audit_log import AIAuditLog
from app.models.embedding import Embedding
from app.models.pending_approval import PendingApproval

__all__ = [
    "User",
    "Card",
    "DiaryEntry",
    "HealthLog",
    "MoneyTransaction",
    "File",
    "AgentPolicy",
    "AIAuditLog",
    "Embedding",
    "PendingApproval",
]
