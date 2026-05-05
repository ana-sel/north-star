from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg://northstar:northstar_dev@localhost:5432/northstar"
    )
    ollama_base_url: str = "http://localhost:11434"
    app_env: str = "development"

    # Redactor settings
    redactor_vocab_path: str | None = None
    redactor_semantic_enabled: bool = False
    redactor_semantic_model: str = "llama3.2"

    # External AI provider keys (Phase 5). Empty = provider disabled.
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # External AI HTTP settings.
    external_ai_timeout_seconds: float = 60.0


settings = Settings()
