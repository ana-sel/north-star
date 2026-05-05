"""Provider interface contract."""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.gateway.schemas import ProviderResult


class ProviderError(RuntimeError):
    """Raised when a provider call fails for any reason."""


class BaseProvider(ABC):
    """All AI providers implement this interface."""

    name: str

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        model: str,
        max_output_tokens: int,
    ) -> ProviderResult:
        """Run a single prompt → text completion."""
        raise NotImplementedError
