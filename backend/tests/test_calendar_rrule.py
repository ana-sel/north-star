"""Tests for ICS parser RRULE/EXDATE/RDATE expansion."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.api.calendar import parse_ics


# Anchor at a fixed UTC start so the test is deterministic.
_DTSTART = datetime(2026, 6, 1, 9, 0, 0, tzinfo=timezone.utc)


def _ics(extra_lines: str) -> str:
    return (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "BEGIN:VEVENT\r\n"
        "UID:test-recurring@example.com\r\n"
        "SUMMARY:Standup\r\n"
        f"DTSTART:{_DTSTART.strftime('%Y%m%dT%H%M%SZ')}\r\n"
        f"DTEND:{(_DTSTART + timedelta(minutes=30)).strftime('%Y%m%dT%H%M%SZ')}\r\n"
        f"{extra_lines}"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )


def test_no_window_no_expansion():
    """Without a window, RRULE events appear once at DTSTART."""
    ics = _ics("RRULE:FREQ=DAILY;COUNT=10\r\n")
    events = parse_ics(ics)
    assert len(events) == 1
    assert events[0].start == _DTSTART


def test_daily_rrule_expands_within_window():
    ics = _ics("RRULE:FREQ=DAILY;COUNT=10\r\n")
    events = parse_ics(
        ics,
        expand_from=_DTSTART,
        expand_until=_DTSTART + timedelta(days=4, hours=1),
    )
    # Days 1..5 inclusive (start day + 4 more).
    assert len(events) == 5
    assert events[0].start == _DTSTART
    assert events[4].start == _DTSTART + timedelta(days=4)
    # Duration preserved.
    assert events[0].end == _DTSTART + timedelta(minutes=30)


def test_rrule_count_caps_expansion():
    """COUNT=3 must not produce more than 3 instances even on a big window."""
    ics = _ics("RRULE:FREQ=DAILY;COUNT=3\r\n")
    events = parse_ics(
        ics,
        expand_from=_DTSTART,
        expand_until=_DTSTART + timedelta(days=365),
    )
    assert len(events) == 3


def test_exdate_skips_instance():
    skip = _DTSTART + timedelta(days=1)
    ics = _ics(
        "RRULE:FREQ=DAILY;COUNT=5\r\n"
        f"EXDATE:{skip.strftime('%Y%m%dT%H%M%SZ')}\r\n"
    )
    events = parse_ics(
        ics,
        expand_from=_DTSTART,
        expand_until=_DTSTART + timedelta(days=10),
    )
    assert len(events) == 4
    starts = {e.start for e in events}
    assert skip not in starts


def test_weekly_rrule_by_day():
    ics = _ics("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6\r\n")
    events = parse_ics(
        ics,
        expand_from=_DTSTART,
        expand_until=_DTSTART + timedelta(days=21),
    )
    # 6 instances all in the window.
    assert len(events) == 6
    # All distinct.
    assert len({e.start for e in events}) == 6


def test_malformed_rrule_falls_back_to_single_instance():
    ics = _ics("RRULE:GARBAGE=YES\r\n")
    events = parse_ics(
        ics,
        expand_from=_DTSTART,
        expand_until=_DTSTART + timedelta(days=30),
    )
    assert len(events) == 1
    assert events[0].start == _DTSTART


def test_non_recurring_event_passes_through_with_window():
    ics = _ics("")
    events = parse_ics(
        ics,
        expand_from=_DTSTART,
        expand_until=_DTSTART + timedelta(days=30),
    )
    assert len(events) == 1
    assert events[0].uid == "test-recurring@example.com"
