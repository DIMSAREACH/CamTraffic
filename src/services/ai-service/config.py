"""Runtime configuration for the CamTraffic AI inference service."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ai_host: str = "0.0.0.0"
    ai_port: int = 8090
    ai_mock_mode: bool = False
    ai_weights_path: str = str(REPO_ROOT / "ai" / "weights" / "best.pt")
    ai_confidence_threshold: float = 0.45
    ai_ocr_enabled: bool = True
    ai_ocr_languages: str = "en"
    ai_sign_catalog_path: str = str(REPO_ROOT / "ai" / "sign_catalog.json")
    ai_allowed_origins: str = "*"
    ai_max_upload_mb: int = 50

    # Cambodia thesis classes
    traffic_sign_classes: tuple[str, ...] = (
        "stop",
        "speed_limit_20",
        "speed_limit_40",
        "speed_limit_60",
        "speed_limit_80",
        "no_entry",
        "no_parking",
        "turn_left",
        "turn_right",
        "u_turn",
        "pedestrian_crossing",
        "traffic_light",
        "school_zone",
        "one_way",
    )
    vehicle_classes: tuple[str, ...] = (
        "motorcycle",
        "car",
        "bus",
        "truck",
        "tuk_tuk",
    )

    def resolve_path(self, value: str) -> Path:
        path = Path(value)
        if path.is_absolute():
            return path
        # Prefer paths relative to repo root, then ai_service/
        for base in (REPO_ROOT, ROOT):
            candidate = (base / path).resolve()
            if candidate.exists():
                return candidate
        return (REPO_ROOT / path).resolve()

    @property
    def cors_origins(self) -> list[str]:
        raw = self.ai_allowed_origins.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
