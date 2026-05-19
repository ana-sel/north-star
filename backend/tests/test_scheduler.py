"""Tests for background scheduler module."""

from unittest.mock import MagicMock, patch

from app.scheduler import (
    daily_digest,
    habit_reminder,
    start_scheduler,
    stop_scheduler,
)


def test_daily_digest_no_users(caplog):
    """daily_digest logs and returns when no users exist."""
    with patch("app.scheduler.SessionLocal") as mock_session_cls:
        mock_db = MagicMock()
        mock_session_cls.return_value = mock_db
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        with caplog.at_level("INFO"):
            daily_digest()
        assert "no users" in caplog.text
        mock_db.close.assert_called_once()


def test_habit_reminder_no_users(caplog):
    """habit_reminder logs and returns when no users exist."""
    with patch("app.scheduler.SessionLocal") as mock_session_cls:
        mock_db = MagicMock()
        mock_session_cls.return_value = mock_db
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        with caplog.at_level("INFO"):
            habit_reminder()
        mock_db.close.assert_called_once()


def test_start_and_stop_scheduler():
    with patch("app.scheduler.scheduler") as mock_sched:
        mock_sched.get_jobs.return_value = [1, 2, 3]
        mock_sched.running = True
        start_scheduler()
        assert mock_sched.add_job.call_count == 3
        mock_sched.start.assert_called_once()
        stop_scheduler()
        mock_sched.shutdown.assert_called_once_with(wait=False)


def test_stop_scheduler_not_running():
    with patch("app.scheduler.scheduler") as mock_sched:
        mock_sched.running = False
        stop_scheduler()
        mock_sched.shutdown.assert_not_called()
