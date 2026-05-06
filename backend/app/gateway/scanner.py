"""Input/output scanners for the Local AI Gateway.

Detects prompt-injection attempts in input and PII leakage / instruction
leakage in output. Heuristic & regex based — no ML model required.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

ScanStatus = Literal["clean", "suspicious", "blocked", "not_scanned"]


@dataclass
class ScanResult:
    status: ScanStatus
    reason: str | None = None


# ============================================================
# Input injection patterns (prompt injection / jailbreaks)
# ============================================================

_INJECTION_PATTERNS: list[tuple[str, re.Pattern]] = [
    # Direct instruction override
    (
        "instruction_override",
        re.compile(
            r"(?:ignore|disregard|forget|override|bypass)\s+"
            r"(?:\w+\s+){0,3}"
            r"(?:previous|prior|above|earlier|system)\s+"
            r"(?:\w+\s+){0,2}"
            r"(?:instructions?|prompts?|rules?|constraints?)",
            re.IGNORECASE,
        ),
    ),
    # Role-play jailbreak
    (
        "role_play_attack",
        re.compile(
            r"(?:you\s+are\s+now|act\s+as|pretend\s+(?:to\s+be|you\s+are)|"
            r"from\s+now\s+on\s+you\s+(?:are|will)|"
            r"enter\s+(?:DAN|developer)\s+mode)",
            re.IGNORECASE,
        ),
    ),
    # System prompt extraction
    (
        "system_prompt_extraction",
        re.compile(
            r"(?:show|reveal|print|output|repeat|display|leak)\s+"
            r"(?:your|the|system)\s+"
            r"(?:system\s+)?(?:prompt|instructions?|rules?|context)",
            re.IGNORECASE,
        ),
    ),
    # Encoded bypass (base64 decode directive)
    (
        "encoded_bypass",
        re.compile(
            r"(?:base64|hex|rot13|decode|eval)\s*[:(]",
            re.IGNORECASE,
        ),
    ),
    # Delimiter injection (fake system/user/assistant tags)
    (
        "delimiter_injection",
        re.compile(
            r"<\|(?:system|im_start|im_end|endoftext)\|>|"
            r"\[INST\]|\[/INST\]|<<SYS>>|<</SYS>>|"
            r"### (?:System|Human|Assistant):",
            re.IGNORECASE,
        ),
    ),
]

# ============================================================
# Output leakage patterns
# ============================================================

_PII_OUTPUT_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("email", re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b")),
    ("iban", re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b")),
    (
        "card_number",
        re.compile(r"\b(?:\d[ \-]?){12,18}\d\b"),
    ),
    (
        "phone",
        re.compile(
            r"(?<!\w)(?:\+?\d{1,3}[ \-]?)?(?:\(?\d{2,4}\)?[ \-]?)?"
            r"\d{3}[ \-]?\d{3,4}(?!\w)"
        ),
    ),
]

_INSTRUCTION_LEAK_PATTERNS: list[tuple[str, re.Pattern]] = [
    # Model regurgitating system instructions
    (
        "system_instruction_leak",
        re.compile(
            r"(?:my\s+(?:system\s+)?instructions?\s+(?:are|say|tell)|"
            r"I\s+(?:was|am)\s+(?:told|instructed|programmed)\s+to|"
            r"here\s+(?:are|is)\s+my\s+(?:system\s+)?prompt)",
            re.IGNORECASE,
        ),
    ),
]


class StubScanner:
    """Always-clean scanner for testing."""

    name = "stub"

    def scan_input(self, text: str) -> ScanResult:
        return ScanResult(status="clean")

    def scan_output(self, text: str) -> ScanResult:
        return ScanResult(status="clean")


class RealScanner:
    """Heuristic prompt-injection and PII-leakage scanner."""

    name = "real"

    def scan_input(self, text: str) -> ScanResult:
        """Detect prompt-injection attempts in user/agent input."""
        for tag, pattern in _INJECTION_PATTERNS:
            if pattern.search(text):
                return ScanResult(status="blocked", reason=f"injection:{tag}")
        return ScanResult(status="clean")

    def scan_output(self, text: str) -> ScanResult:
        """Detect PII leakage or instruction regurgitation in model output."""
        # Check PII leakage
        for tag, pattern in _PII_OUTPUT_PATTERNS:
            if pattern.search(text):
                return ScanResult(status="suspicious", reason=f"pii_leak:{tag}")
        # Check instruction leakage
        for tag, pattern in _INSTRUCTION_LEAK_PATTERNS:
            if pattern.search(text):
                return ScanResult(status="suspicious", reason=f"leak:{tag}")
        return ScanResult(status="clean")
