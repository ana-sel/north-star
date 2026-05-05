"""initial schema: Phase 1 — base tables, privacy_level, agent_policies, audit, embeddings.

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PRIVACY_LEVELS = ("public", "normal", "private", "sensitive", "never_external")


def upgrade() -> None:
    # Required extensions.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # users -----------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("display_name", sa.String(255)),
        sa.Column("hashed_password", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    # cards -----------------------------------------------------------------
    op.create_table(
        "cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("cards.id", ondelete="SET NULL")),
        sa.Column("root_goal_id", postgresql.UUID(as_uuid=True)),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("level", sa.String(32), nullable=False, server_default="task"),
        sa.Column("type", sa.String(32), nullable=False, server_default="task"),
        sa.Column("status", sa.String(32), nullable=False, server_default="inbox"),
        sa.Column("life_area", sa.String(32)),
        sa.Column("mission_scores", postgresql.JSONB, nullable=False,
                  server_default=sa.text("'{}'::jsonb")),
        sa.Column("assigned_agent_ids", postgresql.JSONB, nullable=False,
                  server_default=sa.text("'[]'::jsonb")),
        sa.Column("energy_required", sa.String(16), nullable=False,
                  server_default="medium"),
        sa.Column("estimated_minutes", sa.Integer),
        sa.Column("due_date", sa.DateTime(timezone=True)),
        sa.Column("moved_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("priority", sa.String(16), nullable=False, server_default="medium"),
        sa.Column("privacy_level", sa.String(32), nullable=False,
                  server_default="normal"),
        sa.Column("embedding_status", sa.String(32), nullable=False,
                  server_default="not_embedded"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_cards_user_id", "cards", ["user_id"])
    op.create_index("ix_cards_status", "cards", ["status"])
    op.create_index("ix_cards_parent_id", "cards", ["parent_id"])

    # diary_entries ---------------------------------------------------------
    op.create_table(
        "diary_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500)),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("mood", sa.String(64)),
        sa.Column("privacy_level", sa.String(32), nullable=False,
                  server_default="sensitive"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_diary_entries_user_id", "diary_entries", ["user_id"])

    # health_logs -----------------------------------------------------------
    op.create_table(
        "health_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("log_date", sa.Date, nullable=False),
        sa.Column("sleep_minutes", sa.Integer),
        sa.Column("weight_kg", sa.Numeric(6, 2)),
        sa.Column("calories", sa.Integer),
        sa.Column("protein_g", sa.Integer),
        sa.Column("steps", sa.Integer),
        sa.Column("energy", sa.Integer),
        sa.Column("mood", sa.Integer),
        sa.Column("notes", postgresql.JSONB, nullable=False,
                  server_default=sa.text("'{}'::jsonb")),
        sa.Column("privacy_level", sa.String(32), nullable=False,
                  server_default="sensitive"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_health_logs_user_id_date", "health_logs",
                    ["user_id", "log_date"])

    # money_transactions ----------------------------------------------------
    op.create_table(
        "money_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("txn_date", sa.Date, nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="GBP"),
        sa.Column("category", sa.String(64)),
        sa.Column("description", sa.String(500)),
        sa.Column("privacy_level", sa.String(32), nullable=False,
                  server_default="sensitive"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_money_txn_user_date", "money_transactions",
                    ["user_id", "txn_date"])

    # files -----------------------------------------------------------------
    op.create_table(
        "files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column("mime_type", sa.String(128)),
        sa.Column("size_bytes", sa.BigInteger),
        sa.Column("category", sa.String(64)),
        sa.Column("privacy_level", sa.String(32), nullable=False,
                  server_default="private"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_files_user_id", "files", ["user_id"])

    # agent_policies --------------------------------------------------------
    op.create_table(
        "agent_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("agent_id", sa.String(64), nullable=False, unique=True),
        sa.Column("display_name", sa.String(128), nullable=False),
        sa.Column("can_read", postgresql.JSONB, nullable=False,
                  server_default=sa.text("'[]'::jsonb")),
        sa.Column("cannot_read", postgresql.JSONB, nullable=False,
                  server_default=sa.text("'[]'::jsonb")),
        sa.Column("can_use_external_ai", sa.Boolean, nullable=False,
                  server_default=sa.text("false")),
        sa.Column("requires_approval_for", postgresql.JSONB, nullable=False,
                  server_default=sa.text("""'["sensitive","never_external"]'::jsonb""")),
        sa.Column("default_model", sa.String(64), nullable=False,
                  server_default="ollama"),
        sa.Column("monthly_budget_limit_gbp", sa.Numeric(10, 2)),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    # ai_audit_logs ---------------------------------------------------------
    op.create_table(
        "ai_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_id", sa.String(64), nullable=False),
        sa.Column("privacy_level", sa.String(32), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("request_type", sa.String(64), nullable=False),
        sa.Column("external_call", sa.Boolean, nullable=False,
                  server_default=sa.text("false")),
        sa.Column("original_prompt_stored", sa.Boolean, nullable=False,
                  server_default=sa.text("false")),
        sa.Column("redacted_prompt", postgresql.JSONB),
        sa.Column("redaction_map", postgresql.JSONB),
        sa.Column("approval_required", sa.Boolean, nullable=False,
                  server_default=sa.text("false")),
        sa.Column("approved_by_user", sa.Boolean, nullable=False,
                  server_default=sa.text("false")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("input_tokens", sa.Integer, server_default="0"),
        sa.Column("output_tokens", sa.Integer, server_default="0"),
        sa.Column("estimated_cost_gbp", sa.Numeric(10, 4), server_default="0"),
        sa.Column("input_scan_status", sa.String(32), server_default="not_scanned"),
        sa.Column("output_scan_status", sa.String(32), server_default="not_scanned"),
        sa.Column("final_status", sa.String(32), nullable=False,
                  server_default="completed"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ai_audit_user_created", "ai_audit_logs",
                    ["user_id", "created_at"])

    # embeddings ------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE embeddings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id UUID NOT NULL,
            text_hash TEXT NOT NULL,
            embedding VECTOR(1536) NOT NULL,
            model TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.create_index("ix_embeddings_entity", "embeddings", ["entity_type", "entity_id"])

    # privacy_level CHECK constraints --------------------------------------
    privacy_in = "(" + ", ".join(f"'{p}'" for p in PRIVACY_LEVELS) + ")"
    for table in (
        "cards",
        "diary_entries",
        "health_logs",
        "money_transactions",
        "files",
    ):
        op.execute(
            f"ALTER TABLE {table} "
            f"ADD CONSTRAINT ck_{table}_privacy_level "
            f"CHECK (privacy_level IN {privacy_in})"
        )


def downgrade() -> None:
    for table in (
        "cards",
        "diary_entries",
        "health_logs",
        "money_transactions",
        "files",
    ):
        op.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS ck_{table}_privacy_level")

    op.drop_index("ix_embeddings_entity", table_name="embeddings")
    op.execute("DROP TABLE embeddings")
    op.drop_index("ix_ai_audit_user_created", table_name="ai_audit_logs")
    op.drop_table("ai_audit_logs")
    op.drop_table("agent_policies")
    op.drop_index("ix_files_user_id", table_name="files")
    op.drop_table("files")
    op.drop_index("ix_money_txn_user_date", table_name="money_transactions")
    op.drop_table("money_transactions")
    op.drop_index("ix_health_logs_user_id_date", table_name="health_logs")
    op.drop_table("health_logs")
    op.drop_index("ix_diary_entries_user_id", table_name="diary_entries")
    op.drop_table("diary_entries")
    op.drop_index("ix_cards_parent_id", table_name="cards")
    op.drop_index("ix_cards_status", table_name="cards")
    op.drop_index("ix_cards_user_id", table_name="cards")
    op.drop_table("cards")
    op.drop_table("users")
