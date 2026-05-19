"""Calendar API — spec §13 nice-to-have.

Pull-through ICS reader. The user gives us a secret ICS URL (Google
Calendar "secret address in iCal format", iCloud "Public Calendar Link",
or any CalDAV server's ics export) and we fetch + parse it on demand.

Local-first: NO OAuth, NO credentials stored. The user keeps the URL
secret; we just proxy the read. Future work: persist URLs per user and
write-back via CalDAV.
"""
from __future__ import annotations

import re
from datetime import datetime, date, timedelta, timezone

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, HttpUrl


router = APIRouter(prefix="/calendar", tags=["calendar"])


class CalendarEvent(BaseModel):
    uid: str
    summary: str
    start: datetime
    end: datetime | None
    all_day: bool
    location: str | None
    description: str | None


class CalendarFeed(BaseModel):
    source: str
    events: list[CalendarEvent]


# Very small RFC-5545 parser — covers VEVENT + DTSTART/DTEND/SUMMARY/UID
# /LOCATION/DESCRIPTION. We deliberately avoid pulling in `icalendar` to
# keep deps small; we only need read-only top-level VEVENTs.
_LINE_RE = re.compile(r"^([A-Z\-]+)(?:;[^:]*)?:(.*)$")


def _parse_dt(value: str) -> tuple[datetime, bool]:
    """Return (datetime, is_all_day). Naive values are treated as UTC."""
    value = value.strip()
    if len(value) == 8 and value.isdigit():  # YYYYMMDD
        d = datetime.strptime(value, "%Y%m%d")
        return d.replace(tzinfo=timezone.utc), True
    if value.endswith("Z"):
        dt = datetime.strptime(value, "%Y%m%dT%H%M%SZ")
        return dt.replace(tzinfo=timezone.utc), False
    # Local time without TZID — best-effort, mark UTC.
    dt = datetime.strptime(value, "%Y%m%dT%H%M%S")
    return dt.replace(tzinfo=timezone.utc), False


def _unfold(text: str) -> list[str]:
    """RFC-5545 line unfolding: continuation lines start with a space/tab."""
    raw = text.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    for line in raw:
        if line.startswith((" ", "\t")) and out:
            out[-1] += line[1:]
        else:
            out.append(line)
    return out


def parse_ics(text: str) -> list[CalendarEvent]:
    events: list[CalendarEvent] = []
    current: dict | None = None
    for line in _unfold(text):
        if line == "BEGIN:VEVENT":
            current = {}
            continue
        if line == "END:VEVENT" and current is not None:
            try:
                start_raw = current.get("DTSTART", "")
                start_dt, all_day = _parse_dt(start_raw) if start_raw else (None, False)
                end_dt = None
                if "DTEND" in current:
                    end_dt, _ = _parse_dt(current["DTEND"])
                if start_dt is None:
                    current = None
                    continue
                events.append(
                    CalendarEvent(
                        uid=current.get("UID", ""),
                        summary=current.get("SUMMARY", "(no title)"),
                        start=start_dt,
                        end=end_dt,
                        all_day=all_day,
                        location=current.get("LOCATION") or None,
                        description=current.get("DESCRIPTION") or None,
                    )
                )
            except Exception:
                pass  # skip malformed VEVENT
            current = None
            continue
        if current is None:
            continue
        m = _LINE_RE.match(line)
        if not m:
            continue
        key, value = m.group(1), m.group(2)
        # Unescape RFC-5545 text values.
        value = value.replace("\\n", "\n").replace("\\,", ",").replace("\\;", ";")
        current[key] = value
    return events


@router.get("/ics", response_model=CalendarFeed)
async def read_ics(
    url: HttpUrl = Query(..., description="Public/secret ICS feed URL"),
    days: int = Query(default=14, ge=1, le=90),
) -> CalendarFeed:
    """Fetch an ICS feed and return upcoming events within `days`.

    Only HTTP(S) URLs are honoured (HttpUrl enforces this). No
    credentials are accepted; if your calendar needs auth, expose a
    secret-token URL (Google + iCloud both support this).
    """
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(str(url))
            resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"fetch failed: {exc}")

    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days)
    events = [
        ev
        for ev in parse_ics(resp.text)
        if ev.start >= now - timedelta(hours=12) and ev.start <= cutoff
    ]
    events.sort(key=lambda e: e.start)
    return CalendarFeed(source=str(url), events=events)
