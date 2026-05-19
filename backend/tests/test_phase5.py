"""Phase 5 tests — real external providers + budget enforcement.

These tests do NOT make any real network calls. Provider tests verify
the no-key path and request-shape construction; budget tests use a
minimal stub Session.
"""
from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace

import httpx
import pytest

from app.gateway.cost import actual_cost_gbp, estimate_cost_gbp
from app.gateway.gateway import LocalAIGateway
from app.gateway.providers.base import ProviderError
from app.gateway.providers.claude import ClaudeProvider
from app.gateway.providers.openai import OpenAIProvider


# ---------------------------------------------------------------------
# Cost helpers
# ---------------------------------------------------------------------
def test_actual_cost_local_is_zero():
    assert actual_cost_gbp(
        provider="ollama", model="llama3.2", input_tokens=1000, output_tokens=1000
    ) == Decimal("0")


def test_actual_cost_external_uses_real_token_counts():
    # Sonnet rates: in £0.0024 / 1k, out £0.0120 / 1k.
    cost = actual_cost_gbp(
        provider="claude",
        model="claude-3-5-sonnet-latest",
        input_tokens=1000,
        output_tokens=1000,
    )
    assert cost == Decimal("0.0144")


def test_actual_cost_unknown_model_uses_default_table():
    cost = actual_cost_gbp(
        provider="openai",
        model="gpt-9-omega",
        input_tokens=2000,
        output_tokens=1000,
    )
    # default fallback: in £0.0010, out £0.0030
    # 2 * 0.0010 + 1 * 0.0030 = 0.0050
    assert cost == Decimal("0.0050")


# ---------------------------------------------------------------------
# Providers — no key => clean ProviderError
# ---------------------------------------------------------------------
def test_claude_provider_without_key_raises_clean_error():
    p = ClaudeProvider(api_key="")
    with pytest.raises(ProviderError, match="Anthropic API key not configured"):
        asyncio.run(p.generate(prompt="hi", model="claude-3-5-sonnet-latest", max_output_tokens=10))


def test_openai_provider_without_key_raises_clean_error():
    p = OpenAIProvider(api_key="")
    with pytest.raises(ProviderError, match="OpenAI API key not configured"):
        asyncio.run(p.generate(prompt="hi", model="gpt-4o-mini", max_output_tokens=10))


# ---------------------------------------------------------------------
# Providers — successful response is parsed correctly via httpx mock
# ---------------------------------------------------------------------
def test_claude_provider_parses_messages_response(monkeypatch):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = dict(request.headers)
        captured["json"] = request.read().decode()
        body = {
            "content": [{"type": "text", "text": "hello back"}],
            "usage": {"input_tokens": 12, "output_tokens": 7},
        }
        return httpx.Response(200, json=body)

    transport = httpx.MockTransport(handler)
    real_client = httpx.AsyncClient

    def mock_async_client(*args, **kwargs):
        kwargs.pop("timeout", None)
        return real_client(transport=transport)

    monkeypatch.setattr("app.gateway.providers.claude.httpx.AsyncClient", mock_async_client)

    p = ClaudeProvider(api_key="sk-test")
    result = asyncio.run(
        p.generate(prompt="hi", model="claude-3-5-sonnet-latest", max_output_tokens=50)
    )
    assert result.text == "hello back"
    assert result.input_tokens == 12
    assert result.output_tokens == 7
    assert result.estimated_cost_gbp > Decimal("0")
    assert "x-api-key" in captured["headers"]
    # Anthropic-version header MUST be present.
    assert captured["headers"].get("anthropic-version") == "2023-06-01"


def test_openai_provider_parses_chat_completions_response(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        body = {
            "choices": [{"message": {"role": "assistant", "content": "yo"}}],
            "usage": {"prompt_tokens": 5, "completion_tokens": 3},
        }
        return httpx.Response(200, json=body)

    transport = httpx.MockTransport(handler)
    real_client = httpx.AsyncClient

    def mock_async_client(*args, **kwargs):
        kwargs.pop("timeout", None)
        return real_client(transport=transport)

    monkeypatch.setattr("app.gateway.providers.openai.httpx.AsyncClient", mock_async_client)

    p = OpenAIProvider(api_key="sk-test")
    result = asyncio.run(
        p.generate(prompt="hi", model="gpt-4o-mini", max_output_tokens=50)
    )
    assert result.text == "yo"
    assert result.input_tokens == 5
    assert result.output_tokens == 3


def test_openai_provider_maps_4xx_to_provider_error(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            json={"error": {"type": "invalid_api_key", "message": "bad key"}},
        )

    transport = httpx.MockTransport(handler)
    real_client = httpx.AsyncClient

    def mock_async_client(*args, **kwargs):
        kwargs.pop("timeout", None)
        return real_client(transport=transport)

    monkeypatch.setattr("app.gateway.providers.openai.httpx.AsyncClient", mock_async_client)

    p = OpenAIProvider(api_key="sk-bad")
    with pytest.raises(ProviderError, match="401"):
        asyncio.run(p.generate(prompt="hi", model="gpt-4o-mini", max_output_tokens=10))


# ---------------------------------------------------------------------
# Budget enforcement (gateway-level)
# ---------------------------------------------------------------------
class _StubExecResult:
    def __init__(self, value):
        self._value = value

    def scalar_one(self):
        return self._value


class _StubSession:
    """Minimal stand-in for a SQLAlchemy Session used only to satisfy
    `gateway._check_budget`."""

    def __init__(self, spent: Decimal):
        self._spent = spent
        self.last_query = None

    def execute(self, query):
        self.last_query = query
        return _StubExecResult(self._spent)


def _make_gateway(spent: Decimal) -> LocalAIGateway:
    return LocalAIGateway(db=_StubSession(spent))


def test_budget_check_passes_when_under_cap(monkeypatch):
    from app.gateway import gateway as gw_mod
    monkeypatch.setattr(gw_mod.settings, "global_daily_budget_gbp", 0)
    monkeypatch.setattr(gw_mod.settings, "global_monthly_budget_gbp", 0)
    gw = _make_gateway(spent=Decimal("1.00"))
    policy = SimpleNamespace(
        agent_id="x",
        monthly_budget_limit_gbp=Decimal("5.00"),
        daily_budget_limit_gbp=None,
    )
    assert gw._check_budget(policy, Decimal("0.50")) is None


def test_budget_check_blocks_when_over_cap(monkeypatch):
    from app.gateway import gateway as gw_mod
    monkeypatch.setattr(gw_mod.settings, "global_daily_budget_gbp", 0)
    monkeypatch.setattr(gw_mod.settings, "global_monthly_budget_gbp", 0)
    gw = _make_gateway(spent=Decimal("4.80"))
    policy = SimpleNamespace(
        agent_id="healing_agent",
        monthly_budget_limit_gbp=Decimal("5.00"),
        daily_budget_limit_gbp=None,
    )
    reason = gw._check_budget(policy, Decimal("0.30"))
    assert reason is not None
    assert "monthly budget" in reason
    assert "healing_agent" in reason


def test_budget_check_no_cap_means_no_block(monkeypatch):
    from app.gateway import gateway as gw_mod
    monkeypatch.setattr(gw_mod.settings, "global_daily_budget_gbp", 0)
    monkeypatch.setattr(gw_mod.settings, "global_monthly_budget_gbp", 0)
    gw = _make_gateway(spent=Decimal("999"))
    policy = SimpleNamespace(
        agent_id="x",
        monthly_budget_limit_gbp=None,
        daily_budget_limit_gbp=None,
    )
    assert gw._check_budget(policy, Decimal("100")) is None


def test_estimate_and_actual_cost_are_consistent_for_default_model():
    # If we estimate using max_output_tokens then the call returns exactly
    # max_output_tokens, the actual cost should be >= the estimate's
    # output portion (because real input_tokens >= chars/4).
    est = estimate_cost_gbp(
        provider="claude",
        model="claude-3-5-sonnet-latest",
        input_chars=400,  # ≈ 100 tokens
        max_output_tokens=100,
    )
    actual = actual_cost_gbp(
        provider="claude",
        model="claude-3-5-sonnet-latest",
        input_tokens=100,
        output_tokens=100,
    )
    # Should be the same order of magnitude.
    assert abs(est - actual) < Decimal("0.01")
