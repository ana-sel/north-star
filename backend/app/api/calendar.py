"""Calendar API — spec §13 nice-to-have.

Pull-through ICS reader. The user gives us a secret ICS URL (Google
Calendar "secret address in iCal format", iCloud "Public Calendar Link",
or any CalDAV server's ics export) and we fetch + parse it on demand.

Local-first: NO OAuth, NO credentials stored. The user keeps the URL
secret; we just proxy the read. URLs can now be persisted per-user
(encrypted at rest with Fernet) via PUT /calendar/settings so the mobile
client doesn't have to re-paste each session.
"""
from __future__ import annotations

import re
from datetime import datetime, date, timedelta, timezone

import httpx
from dateutil.rrule import rrulestr
from dateutil.tz import gettz
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models.user import User
from app.utils.crypto import decrypt_str, encrypt_str


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
# /LOCATION/DESCRIPTION/RRULE/EXDATE/RDATE. We deliberately avoid pulling
# in `icalendar` to keep deps small; we only need read-only top-level
# VEVENTs. Recurring events are expanded via python-dateutil's rrule.
#
# Match KEY[;PARAMS]:VALUE — capture the params block separately so we
# can read TZID etc. without losing it.
_LINE_RE = re.compile(r"^([A-Z\-]+)((?:;[^:]*)?):(.*)$")
# Recurrence-related keys we want to keep verbatim (with params) so we
# can replay them through rrulestr / parse comma-separated date lists.
_RECUR_KEYS = {"RRULE", "EXDATE", "RDATE"}


def _parse_dt(value: str, tzid: str | None = None) -> tuple[datetime, bool]:
    """Return (datetime, is_all_day).

    Resolution order for the timezone:
      1. trailing "Z" → UTC
      2. ``tzid`` param (IANA name) resolved via dateutil.tz.gettz
      3. fallback to UTC for naive local times (best effort)
    """
    value = value.strip()
    if len(value) == 8 and value.isdigit():  # YYYYMMDD all-day
        d = datetime.strptime(value, "%Y%m%d")
        return d.replace(tzinfo=timezone.utc), True
    if value.endswith("Z"):
        dt = datetime.strptime(value, "%Y%m%dT%H%M%SZ")
        return dt.replace(tzinfo=timezone.utc), False
    # Floating local time. Try to honour TZID; if that fails, treat as UTC.
    dt = datetime.strptime(value, "%Y%m%dT%H%M%S")
    if tzid:
        tz = gettz(tzid)
        if tz is not None:
            return dt.replace(tzinfo=tz), False
    return dt.replace(tzinfo=timezone.utc), False


def _extract_tzid(params: str) -> str | None:
    """Pull a TZID=... value out of a parameter string like ';TZID=Europe/London'."""
    if not params:
        return None
    for chunk in params.lstrip(";").split(";"):
        if chunk.upper().startswith("TZID="):
            return chunk.split("=", 1)[1]
    return None


def _parse_dt_list(value: str, tzid: str | None = None) -> list[datetime]:
    """Parse a comma-separated EXDATE/RDATE value list."""
    out: list[datetime] = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            dt, _ = _parse_dt(part, tzid=tzid)
            out.append(dt)
        except Exception:
            continue
    return out


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


def parse_ics(
    text: str,
    *,
    expand_from: datetime | None = None,
    expand_until: datetime | None = None,
    max_per_series: int = 366,
) -> list[CalendarEvent]:
    """Parse VEVENTs from an ICS document.

    If ``expand_from`` and ``expand_until`` are both provided, any VEVENT
    carrying an RRULE is expanded into individual instances within that
    window (capped at ``max_per_series`` to bound the worst case).
    EXDATE entries are honoured. Non-recurring events are returned as
    a single instance regardless of the window.
    """
    events: list[CalendarEvent] = []
    current: dict | None = None
    for line in _unfold(text):
        if line == "BEGIN:VEVENT":
            current = {
                "_exdates": [],
                "_rdates": [],
                "_tzid_dtstart": None,
                "_tzid_dtend": None,
            }
            continue
        if line == "END:VEVENT" and current is not None:
            try:
                start_raw = current.get("DTSTART", "")
                start_tzid = current.get("_tzid_dtstart")
                start_dt, all_day = (
                    _parse_dt(start_raw, tzid=start_tzid) if start_raw else (None, False)
                )
                end_dt = None
                if "DTEND" in current:
                    end_dt, _ = _parse_dt(
                        current["DTEND"], tzid=current.get("_tzid_dtend")
                    )
                if start_dt is None:
                    current = None
                    continue
                duration = (end_dt - start_dt) if end_dt is not None else None
                base = CalendarEvent(
                    uid=current.get("UID", ""),
                    summary=current.get("SUMMARY", "(no title)"),
                    start=start_dt,
                    end=end_dt,
                    all_day=all_day,
                    location=current.get("LOCATION") or None,
                    description=current.get("DESCRIPTION") or None,
                )

                rrule_value = current.get("RRULE")
                if (
                    rrule_value
                    and expand_from is not None
                    and expand_until is not None
                ):
                    exdates = set(current.get("_exdates", []))
                    try:
                        rule = rrulestr(f"RRULE:{rrule_value}", dtstart=start_dt)
                    except Exception:
                        events.append(base)
                    else:
                        count = 0
                        # Walk a slightly wider window so we don't miss
                        # instances whose start is just before `expand_from`
                        # but still ongoing.
                        lookback = expand_from - timedelta(days=1)
                        for occ in rule.between(
                            lookback, expand_until, inc=True
                        ):
                            if occ in exdates:
                                continue
                            count += 1
                            if count > max_per_series:
                                break
                            occ_end = (occ + duration) if duration else None
                            events.append(
                                CalendarEvent(
                                    uid=f"{base.uid}@{occ.isoformat()}",
                                    summary=base.summary,
                                    start=occ,
                                    end=occ_end,
                                    all_day=base.all_day,
                                    location=base.location,
                                    description=base.description,
                                )
                            )
                        # RDATE additions
                        for extra in current.get("_rdates", []):
                            if extra in exdates:
                                continue
                            if expand_from <= extra <= expand_until:
                                occ_end = (extra + duration) if duration else None
                                events.append(
                                    CalendarEvent(
                                        uid=f"{base.uid}@{extra.isoformat()}",
                                        summary=base.summary,
                                        start=extra,
                                        end=occ_end,
                                        all_day=base.all_day,
                                        location=base.location,
                                        description=base.description,
                                    )
                                )
                else:
                    events.append(base)
            except Exception:
                pass  # skip malformed VEVENT
            current = None
            continue
        if current is None:
            continue
        m = _LINE_RE.match(line)
        if not m:
            continue
        key, params, value = m.group(1), m.group(2), m.group(3)
        if key == "EXDATE":
            current["_exdates"].extend(_parse_dt_list(value, tzid=_extract_tzid(params)))
            continue
        if key == "RDATE":
            current["_rdates"].extend(_parse_dt_list(value, tzid=_extract_tzid(params)))
            continue
        if key == "DTSTART":
            current["_tzid_dtstart"] = _extract_tzid(params)
        elif key == "DTEND":
            current["_tzid_dtend"] = _extract_tzid(params)
        # Unescape RFC-5545 text values for free-text fields.
        if key not in _RECUR_KEYS:
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
    window_start = now - timedelta(hours=12)
    events = [
        ev
        for ev in parse_ics(
            resp.text, expand_from=window_start, expand_until=cutoff
        )
        if ev.start >= window_start and ev.start <= cutoff
    ]
    events.sort(key=lambda e: e.start)
    return CalendarFeed(source=str(url), events=events)


# --- Per-user stored ICS URL ---------------------------------------------
#
# Stored encrypted-at-rest on User.user_settings['ics_url_encrypted'].
# We never return the raw URL to the client; we expose a flag and let
# the client fetch via /calendar/ics-stored which decrypts server-side.

_ICS_KEY = "ics_url_encrypted"


class CalendarSettingsOut(BaseModel):
    ics_url_set: bool


class CalendarSettingsIn(BaseModel):
    # None / empty string clears the saved URL.
    ics_url: HttpUrl | None = None


@router.get("/settings", response_model=CalendarSettingsOut)
def get_calendar_settings(
    current_user: User = Depends(get_current_user),
) -> CalendarSettingsOut:
    return CalendarSettingsOut(
        ics_url_set=bool((current_user.user_settings or {}).get(_ICS_KEY))
    )


@router.put("/settings", response_model=CalendarSettingsOut)
def put_calendar_settings(
    body: CalendarSettingsIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CalendarSettingsOut:
    settings_dict = dict(current_user.user_settings or {})
    if body.ics_url is None:
        settings_dict.pop(_ICS_KEY, None)
    else:
        settings_dict[_ICS_KEY] = encrypt_str(str(body.ics_url))
    current_user.user_settings = settings_dict
    db.add(current_user)
    db.commit()
    return CalendarSettingsOut(ics_url_set=_ICS_KEY in settings_dict)


@router.get("/ics-stored", response_model=CalendarFeed)
async def read_stored_ics(
    days: int = Query(default=14, ge=1, le=90),
    current_user: User = Depends(get_current_user),
) -> CalendarFeed:
    """Fetch the user's saved ICS feed. Requires a prior PUT /calendar/settings."""
    token = (current_user.user_settings or {}).get(_ICS_KEY)
    if not token:
        raise HTTPException(status_code=404, detail="no saved ics_url")
    url = decrypt_str(token)
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"fetch failed: {exc}")

    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days)
    window_start = now - timedelta(hours=12)
    events = [
        ev
        for ev in parse_ics(
            resp.text, expand_from=window_start, expand_until=cutoff
        )
        if ev.start >= window_start and ev.start <= cutoff
    ]
    events.sort(key=lambda e: e.start)
    # Don't echo the raw URL back to the client; keep it server-side.
    return CalendarFeed(source="stored", events=events)
