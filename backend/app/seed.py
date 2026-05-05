"""Seed agent_policies with the MVP agents.

Run with:  python -m app.seed
Idempotent — uses upsert on agent_id.
"""
from decimal import Decimal

from sqlalchemy.dialects.postgresql import insert

from app.db import SessionLocal
from app.models.agent_policy import AgentPolicy


# MVP agents from spec §6.2: Capture, Goal Architect, Mission, Focus, Review.
MVP_AGENT_POLICIES: list[dict] = [
    {
        "agent_id": "capture_agent",
        "display_name": "Capture Agent",
        "can_read": ["chat_input", "card_titles"],
        "cannot_read": ["raw_bank_screenshots", "identity_documents", "api_keys"],
        "can_use_external_ai": False,
        "requires_approval_for": ["sensitive", "never_external"],
        "default_model": "ollama",
        "monthly_budget_limit_gbp": Decimal("2.00"),
    },
    {
        "agent_id": "goal_architect_agent",
        "display_name": "Goal Architect Agent",
        "can_read": ["card_titles", "card_descriptions", "goal_tree_summary"],
        "cannot_read": ["raw_bank_screenshots", "identity_documents", "diary_raw"],
        "can_use_external_ai": True,
        "requires_approval_for": ["sensitive", "never_external"],
        "default_model": "ollama",
        "monthly_budget_limit_gbp": Decimal("3.00"),
    },
    {
        "agent_id": "mission_agent",
        "display_name": "Mission Agent",
        "can_read": ["card_titles", "card_descriptions", "mission_text"],
        "cannot_read": ["raw_bank_screenshots", "identity_documents", "diary_raw"],
        "can_use_external_ai": True,
        "requires_approval_for": ["sensitive", "never_external"],
        "default_model": "ollama",
        "monthly_budget_limit_gbp": Decimal("3.00"),
    },
    {
        "agent_id": "focus_agent",
        "display_name": "Focus Agent",
        "can_read": [
            "card_titles",
            "today_summary",
            "energy_summary",
            "open_task_count",
        ],
        "cannot_read": ["raw_bank_screenshots", "identity_documents", "diary_raw"],
        "can_use_external_ai": False,
        "requires_approval_for": ["sensitive", "never_external"],
        "default_model": "ollama",
        "monthly_budget_limit_gbp": Decimal("1.00"),
    },
    {
        "agent_id": "review_agent",
        "display_name": "Review Agent",
        "can_read": [
            "card_titles",
            "completion_stats",
            "habit_summary",
            "energy_summary",
            "money_summary",
            "health_summary",
        ],
        "cannot_read": ["raw_bank_screenshots", "identity_documents", "diary_raw"],
        "can_use_external_ai": True,
        "requires_approval_for": ["sensitive", "never_external"],
        "default_model": "ollama",
        "monthly_budget_limit_gbp": Decimal("4.00"),
    },
    {
        "agent_id": "healing_agent",
        "display_name": "Healing Agent",
        "can_read": ["diary_text_redacted", "mood_summary"],
        "cannot_read": [
            "raw_bank_screenshots",
            "identity_documents",
            "diary_raw",
            "diary_image_raw",
        ],
        "can_use_external_ai": True,
        "requires_approval_for": ["sensitive", "never_external"],
        "default_model": "claude-3-5-sonnet-latest",
        "monthly_budget_limit_gbp": Decimal("5.00"),
    },
]


def seed() -> None:
    with SessionLocal() as session:
        for policy in MVP_AGENT_POLICIES:
            stmt = insert(AgentPolicy).values(**policy)
            stmt = stmt.on_conflict_do_update(
                index_elements=[AgentPolicy.agent_id],
                set_={
                    "display_name": stmt.excluded.display_name,
                    "can_read": stmt.excluded.can_read,
                    "cannot_read": stmt.excluded.cannot_read,
                    "can_use_external_ai": stmt.excluded.can_use_external_ai,
                    "requires_approval_for": stmt.excluded.requires_approval_for,
                    "default_model": stmt.excluded.default_model,
                    "monthly_budget_limit_gbp": stmt.excluded.monthly_budget_limit_gbp,
                },
            )
            session.execute(stmt)
        session.commit()
        print(f"Seeded {len(MVP_AGENT_POLICIES)} agent policies.")


if __name__ == "__main__":
    seed()
