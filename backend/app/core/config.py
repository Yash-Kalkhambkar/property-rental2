from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str
    DATABASE_DIRECT_URL: str = ""

    # ── JWT ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Supabase Storage (optional — file uploads disabled without these) ─────
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "rental-docs"

    # ── Email (optional — email alerts disabled without these) ────────────────
    RESEND_API_KEY: str = ""
    EMAIL_SENDER: str = ""

    # ── App ───────────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"
    FRONTEND_URL_ALT: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    # ── Scheduler ─────────────────────────────────────────────────────────────
    INTERNAL_JOB_SECRET: str

    # ── AI Chat ───────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
