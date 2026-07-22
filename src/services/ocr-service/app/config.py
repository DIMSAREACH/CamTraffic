"""OCR service configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ocr_service_host: str = "0.0.0.0"
    ocr_service_port: int = 8081
    ocr_mock_mode: bool = False
    ocr_min_confidence: float = 0.45
    ocr_languages: str = "en"


settings = Settings()
