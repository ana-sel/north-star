"""AI provider adapters. All access to AI models goes through these.

No code outside `app.gateway` should import these directly — only the
`LocalAIGateway` may instantiate a provider.
"""

from app.gateway.providers.base import BaseProvider, ProviderError
from app.gateway.providers.ollama import OllamaProvider
from app.gateway.providers.openai import OpenAIProvider
from app.gateway.providers.claude import ClaudeProvider

__all__ = [
    "BaseProvider",
    "ProviderError",
    "OllamaProvider",
    "OpenAIProvider",
    "ClaudeProvider",
]
