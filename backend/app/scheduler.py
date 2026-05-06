"""Background scheduler — APScheduler-based periodic jobs.

Jobs:
  1. embedding_backfill — embed cards that don't yet have embeddings.
  2. daily_digest_placeholder — placeholder for daily review digest (logs only).
  3. habit_reminder_placeholder — placeholder for habit reminders (logs only).
"""

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.db import SessionLocal

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


# ---------------------------------------------------------------------------
# Job 1 — Embedding backfill: embed any cards missing an embedding row.
# ---------------------------------------------------------------------------
def embedding_backfill() -> None:
    """Find cards without embeddings and embed them."""
    from app.models.card import Card
    from app.models.embedding import Embedding
    from app.services.embedding_service import embed_entity

    db = SessionLocal()
    try:
        existing_ids = (
            db.query(Embedding.entity_id)
            .filter(Embedding.entity_type == "card")
            .subquery()
        )
        missing = (
            db.query(Card)
            .filter(~Card.id.in_(db.query(existing_ids.c.entity_id)))
            .limit(50)
            .all()
        )
        if not missing:
            return
        logger.info("embedding_backfill: %d cards to embed", len(missing))
        for card in missing:
            text = f"{card.title or ''} {card.description or ''}".strip()
            if not text:
                continue
            try:
                import asyncio
                asyncio.get_event_loop().run_until_complete(
                    embed_entity(db, str(card.user_id), "card", str(card.id), text)
                )
            except Exception:
                logger.exception("embedding_backfill: failed card %s", card.id)
        logger.info("embedding_backfill: done")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Job 2 — Daily digest placeholder (no-op until notification system exists)
# ---------------------------------------------------------------------------
def daily_digest_placeholder() -> None:
    logger.info(
        "daily_digest: would generate review digest at %s",
        datetime.now(timezone.utc).isoformat(),
    )


# ---------------------------------------------------------------------------
# Job 3 — Habit reminder placeholder
# ---------------------------------------------------------------------------
def habit_reminder_placeholder() -> None:
    logger.info(
        "habit_reminder: would send habit reminders at %s",
        datetime.now(timezone.utc).isoformat(),
    )


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------
def start_scheduler() -> None:
    """Register jobs and start the scheduler."""
    scheduler.add_job(
        embedding_backfill,
        "interval",
        hours=1,
        id="embedding_backfill",
        replace_existing=True,
    )
    scheduler.add_job(
        daily_digest_placeholder,
        "cron",
        hour=7,
        minute=0,
        id="daily_digest",
        replace_existing=True,
    )
    scheduler.add_job(
        habit_reminder_placeholder,
        "cron",
        hour=20,
        minute=0,
        id="habit_reminder",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started with %d jobs", len(scheduler.get_jobs()))


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
