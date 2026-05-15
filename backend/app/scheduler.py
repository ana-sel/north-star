"""Background scheduler — APScheduler-based periodic jobs.

Jobs:
  1. embedding_backfill — embed cards that don't yet have embeddings.
  2. daily_digest — generates a daily review digest for all users.
  3. habit_reminder — checks due habits and logs reminders.
"""

import logging
from datetime import datetime, timedelta, timezone

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
                loop = asyncio.new_event_loop()
                try:
                    loop.run_until_complete(
                        embed_entity(db, str(card.user_id), "card", str(card.id), text)
                    )
                finally:
                    loop.close()
            except Exception:
                logger.exception("embedding_backfill: failed card %s", card.id)
        logger.info("embedding_backfill: done")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Job 2 — Daily digest: generate review summary for every user.
# ---------------------------------------------------------------------------
def daily_digest() -> None:
    """Generate a daily review digest for every user with recent activity."""
    import asyncio
    from app.models.user import User
    from app.models.card import Card
    from app.enums import CardStatus
    from sqlalchemy import select

    db = SessionLocal()
    try:
        users = db.execute(select(User)).scalars().all()
        if not users:
            logger.info("daily_digest: no users, skipping")
            return

        since = datetime.now(timezone.utc) - timedelta(days=1)
        for user in users:
            try:
                cards = list(
                    db.execute(
                        select(Card).where(Card.user_id == user.id)
                    ).scalars()
                )

                completed = sum(
                    1 for c in cards
                    if c.completed_at and c.completed_at >= since
                )
                created = sum(
                    1 for c in cards
                    if c.created_at and c.created_at >= since
                )
                in_progress = sum(
                    1 for c in cards
                    if c.status in (
                        CardStatus.IN_PROGRESS_MY_SIDE.value,
                        CardStatus.TODAY.value,
                    )
                )

                logger.info(
                    "daily_digest [%s]: %d completed, %d created, %d in-progress "
                    "(last 24h)",
                    user.email,
                    completed,
                    created,
                    in_progress,
                )
                # Future: call Review Agent for richer summary + send
                # push notification via Expo Push API.
            except Exception:
                logger.exception("daily_digest: error for user %s", user.id)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Job 3 — Habit reminders: find habits due today that haven't been checked in.
# ---------------------------------------------------------------------------
def habit_reminder() -> None:
    """Find habits that haven't been logged today and log a reminder."""
    from app.models.habit import Habit, HabitLog
    from app.models.user import User
    from sqlalchemy import select, func

    db = SessionLocal()
    try:
        today = datetime.now(timezone.utc).date()
        users = db.execute(select(User)).scalars().all()

        for user in users:
            try:
                habits = list(
                    db.execute(
                        select(Habit)
                        .where(Habit.user_id == user.id)
                        .where(Habit.active == True)  # noqa: E712
                    ).scalars()
                )
                if not habits:
                    continue

                # Find which habits already have a log today.
                logged_ids = set(
                    db.execute(
                        select(HabitLog.habit_id)
                        .where(HabitLog.habit_id.in_([h.id for h in habits]))
                        .where(func.date(HabitLog.logged_at) == today)
                    ).scalars()
                )

                due = [h for h in habits if h.id not in logged_ids]
                if due:
                    logger.info(
                        "habit_reminder [%s]: %d habits not yet logged today: %s",
                        user.email,
                        len(due),
                        ", ".join(h.name for h in due[:5]),
                    )
                    # Future: send push notification via Expo Push API.
            except Exception:
                logger.exception("habit_reminder: error for user %s", user.id)
    finally:
        db.close()


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
        daily_digest,
        "cron",
        hour=7,
        minute=0,
        id="daily_digest",
        replace_existing=True,
    )
    scheduler.add_job(
        habit_reminder,
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
