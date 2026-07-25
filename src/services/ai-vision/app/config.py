"""Service configuration via environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ai_vision_host: str = "0.0.0.0"
    ai_vision_port: int = 8080
    ai_mock_mode: bool = False

    ai_root: Path = Path("../../ai")
    ai_weights_path: Path = Path("../../ai/weights/best.pt")
    ai_sign_catalog_path: Path = Path("../../ai/sign_catalog.json")

    ai_confidence_threshold: float = 0.5
    ai_ocr_enabled: bool = True
    ai_ocr_min_confidence: float = 0.75

    ocr_service_url: str = ""

    @property
    def service_root(self) -> Path:
        return Path(__file__).resolve().parent.parent

    def resolve_path(self, path: Path) -> Path:
        if path.is_absolute():
            return path
        return (self.service_root / path).resolve()


settings = Settings()
