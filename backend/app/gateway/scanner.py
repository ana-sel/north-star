"""Phase 2 stub input/output scanners.

Always return `clean`. Real prompt-injection detection lands in Phase 3.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ScanStatus = Literal["clean", "suspicious", "blocked", "not_scanned"]


@dataclass
class ScanResult:
    status: ScanStatus
    reason: str | None = None


class StubScanner:
    name = "stub"

    def scan_input(self, text: str) -> ScanResult:
        return ScanResult(status="clean")

    def scan_output(self, text: str) -> ScanResult:
        return ScanResult(status="clean")
