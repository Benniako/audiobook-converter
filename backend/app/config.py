from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/audiobook"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/audiobook"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-this-to-a-random-secret-key"
    upload_dir: str = "./uploads"
    audio_output_dir: str = "./audio_output"
    admin_email: str = "admin@example.com"
    kokoro_model_path: str = ""
    openai_api_key: str = ""
    chatterbox_model: str = "turbo"
    qwen3_model: str = "1.7B"
    cosyvoice_model_path: str = ""
    translation_provider: str = "libre"  # libre, openai, google
    libre_translate_url: str = ""
    google_api_key: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
