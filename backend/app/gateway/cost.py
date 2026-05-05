"""Rough per-call cost estimator (in GBP).

Used to populate `estimated_cost_gbp` on pending_ai_approvals so the user
can see a budget impact before approving.

Numbers are conservative ballparks as of mid-2026; refine as pricing
shifts.  Local Ollama is always £0.
"""
from __future__ import annotations

from decimal import Decimal


# Approximate £ per 1k tokens (input, output) — tweak in one place.
_RATES: dict[str, tuple[Decimal, Decimal]] = {
    # Anthropic
    "claude-3-5-sonnet-latest": (Decimal("0.0024"), Decimal("0.0120")),
    "claude-3-5-haiku-latest": (Decimal("0.0008"), Decimal("0.0040")),
    "claude-opus-4": (Decimal("0.0120"), Decimal("0.0600")),
    # OpenAI
    "gpt-4o": (Decimal("0.0040"), Decimal("0.0120")),
    "gpt-4o-mini": (Decimal("0.0001"), Decimal("0.0005")),
    # Default fallback
    "_default": (Decimal("0.0010"), Decimal("0.0030")),
}


def estimate_cost_gbp(
    *,
    provider: str,
    model: str,
    input_chars: int,
    max_output_tokens: int,
) -> Decimal:
    """Return a £ estimate for a planned external call.

    Local providers are free.  Token count is approximated as
    chars / 4 (a common rule of thumb).
    """
    if provider == "ollama":
        return Decimal("0")

    rate_in, rate_out = _RATES.get(model, _RATES["_default"])
    est_input_tokens = Decimal(input_chars) / Decimal(4)
    est = (
        (est_input_tokens / Decimal(1000)) * rate_in
        + (Decimal(max_output_tokens) / Decimal(1000)) * rate_out
    )
    # Round to 4 decimal places.
    return est.quantize(Decimal("0.0001"))


def actual_cost_gbp(
    *,
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> Decimal:
    """Return the £ cost of an *executed* call given real token counts.

    Used after a successful provider response so the audit log records
    the real billed amount, not the pre-call estimate.
    """
    if provider == "ollama":
        return Decimal("0")
    rate_in, rate_out = _RATES.get(model, _RATES["_default"])
    cost = (
        (Decimal(input_tokens) / Decimal(1000)) * rate_in
        + (Decimal(output_tokens) / Decimal(1000)) * rate_out
    )
    return cost.quantize(Decimal("0.0001"))
