"""Tests for TZID handling in the ICS parser."""
from __future__ import annotations

from datetime import datetime, timezone

from dateutil.tz import gettz

from app.api.calendar import parse_ics


def _vevent(extra_lines: str) -> str:
    return (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "BEGIN:VEVENT\r\n"
        "UID:tz@example.com\r\n"
        "SUMMARY:TZ test\r\n"
        f"{extra_lines}"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )


def test_dtstart_with_tzid_resolves_named_zone():
    ics = _vevent(
        "DTSTART;TZID=Europe/London:20260601T140000\r\n"
        "DTEND;TZID=Europe/London:20260601T150000\r\n"
    )
    events = parse_ics(ics)
    assert len(events) == 1
    ev = events[0]
    # 14:00 London (BST = UTC+1 in June) == 13:00 UTC
    expected_utc = datetime(2026, 6, 1, 13, 0, tzinfo=timezone.utc)
    assert ev.start.astimezone(timezone.utc) == expected_utc
    # tzinfo should be the London zone, not bare UTC.
    london = gettz("Europe/London")
    assert ev.start.utcoffset() == london.utcoffset(  # type: ignore[union-attr]
        datetime(2026, 6, 1, 14, 0)
    )


def test_unknown_tzid_falls_back_to_utc():
    ics = _vevent("DTSTART;TZID=Mars/OlympusMons:20260601T140000\r\n")
    events = parse_ics(ics)
    assert len(events) == 1
    assert events[0].start == datetime(2026, 6, 1, 14, 0, tzinfo=timezone.utc)


def test_utc_z_suffix_still_works():
    ics = _vevent("DTSTART:20260601T140000Z\r\n")
    events = parse_ics(ics)
    assert events[0].start == datetime(2026, 6, 1, 14, 0, tzinfo=timezone.utc)


def test_rrule_expansion_preserves_tzid():
    """Recurring TZID events keep their zone across instances."""
    ics = _vevent(
        "DTSTART;TZID=America/Los_Angeles:20260601T090000\r\n"
        "DTEND;TZID=America/Los_Angeles:20260601T100000\r\n"
        "RRULE:FREQ=DAILY;COUNT=3\r\n"
    )
    from datetime import timedelta

    base = datetime(2026, 6, 1, 9, 0, tzinfo=gettz("America/Los_Angeles"))
    events = parse_ics(
        ics,
        expand_from=base,
        expand_until=base + timedelta(days=5),
    )
    assert len(events) == 3
    # All instances should be at 09:00 local LA time → 16:00 UTC (PDT = UTC-7).
    for ev in events:
        assert ev.start.astimezone(timezone.utc).hour == 16
