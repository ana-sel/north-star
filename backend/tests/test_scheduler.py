"""Tests for background scheduler module."""

from unittest.mock import MagicMock, patch

from app.scheduler import (
    daily_digest_placeholder,
    habit_reminder_placeholder,
    start_scheduler,
    stop_scheduler,
)


def test_daily_digest_placeholder_logs(caplog):
    with caplog.at_level("INFO"):
        daily_digest_placeholder()
    assert "daily_digest" in caplog.text


def test_habit_reminder_placeholder_logs(caplog):
    with caplog.at_level("INFO"):
        habit_reminder_placeholder()
    assert "habit_reminder" in caplog.text


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
