"""Calendar ICS parser unit tests — no network."""
from __future__ import annotations

from datetime import timezone

from app.api.calendar import parse_ics


SAMPLE = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:abc-123
SUMMARY:Standup
DTSTART:20260520T090000Z
DTEND:20260520T093000Z
LOCATION:Office
DESCRIPTION:Daily sync\\nBring notes
END:VEVENT
BEGIN:VEVENT
UID:def-456
SUMMARY:Holiday
DTSTART;VALUE=DATE:20260524
DTEND;VALUE=DATE:20260525
END:VEVENT
END:VCALENDAR
"""


def test_parse_ics_extracts_events():
    events = parse_ics(SAMPLE)
    assert len(events) == 2

    standup = events[0]
    assert standup.uid == "abc-123"
    assert standup.summary == "Standup"
    assert standup.start.tzinfo is not None
    assert standup.start.hour == 9
    assert standup.end is not None
    assert standup.location == "Office"
    assert "Bring notes" in standup.description

    holiday = events[1]
    assert holiday.all_day is True
    assert holiday.summary == "Holiday"


def test_parse_ics_handles_line_folding():
    folded = (
        "BEGIN:VCALENDAR\r\n"
        "BEGIN:VEVENT\r\n"
        "UID:x\r\n"
        "SUMMARY:A really long\r\n"
        "  title that spans two lines\r\n"
        "DTSTART:20260520T100000Z\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )
    events = parse_ics(folded)
    assert len(events) == 1
    assert events[0].summary == "A really long title that spans two lines"


def test_parse_ics_skips_malformed_events():
    bad = (
        "BEGIN:VEVENT\n"
        "UID:y\n"
        "SUMMARY:No start\n"
        "END:VEVENT\n"
        "BEGIN:VEVENT\n"
        "UID:z\n"
        "SUMMARY:Good\n"
        "DTSTART:20260520T100000Z\n"
        "END:VEVENT\n"
    )
    events = parse_ics(bad)
    assert len(events) == 1
    assert events[0].uid == "z"
