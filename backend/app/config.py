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

    # Files (spec §9 Files screen). Storage root for user-uploaded
    # private files. Created on first write.
    files_storage_root: str = "./storage/files"
    files_max_bytes: int = 50 * 1024 * 1024  # 50 MB per file

    # Scanner (Phase 3). Use RealScanner by default; disable for
    # specific test scenarios.
    scanner_enabled: bool = True

    # File encryption (Phase 3). Fernet key; empty = passthrough (no encryption).
    files_encryption_key: str = ""

    # JWT Auth
    jwt_secret_key: str = "CHANGE-ME-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60


settings = Settings()
