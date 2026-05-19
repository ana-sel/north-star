"""Tests for app.services.triage — Slice 2 deterministic classifier."""
from app.services.triage import classify


def test_decision_should_i():
    r = classify("Should I quit my job and freelance for a year?")
    assert r.kind == "decision"
    assert r.confidence >= 0.8


def test_decision_buy():
    r = classify("Thinking about buying the flat on Mile End Rd.")
    assert r.kind == "decision"


def test_log_spent():
    r = classify("Spent 5 on coffee")
    assert r.kind == "log"


def test_log_slept():
    r = classify("Slept 6h, woke up twice")
    assert r.kind == "log"


def test_log_slash_command():
    r = classify("/energy 4")
    assert r.kind == "log"


def test_review_this_week():
    r = classify("Looking back, this week I dropped study three times.")
    assert r.kind == "review"


def test_sort_remind_me():
    r = classify("remind me to email the landlord on Friday")
    assert r.kind == "sort"


def test_sort_bullet():
    r = classify("- pick up prescription")
    assert r.kind == "sort"


def test_diary_i_feel():
    r = classify("I feel heavy today. The morning was hard.")
    assert r.kind == "diary"


def test_talk_default():
    r = classify("What do you think about radical acceptance?")
    assert r.kind == "talk"


def test_empty_text_is_talk():
    r = classify("")
    assert r.kind == "talk"
    assert r.confidence == 0.0


def test_long_paragraph_reads_as_diary():
    text = (
        "I keep coming back to mum. There is something about the way she "
        "called yesterday that landed wrong. I do not know how to name it "
        "yet. It is not anger and it is not sadness. It is more like a "
        "thinness. A flatness. Maybe just tired."
    )
    r = classify(text)
    assert r.kind == "diary"
