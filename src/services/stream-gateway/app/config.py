"""Stream gateway configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    stream_gateway_host: str = "0.0.0.0"
    stream_gateway_port: int = 8082
    stream_mock_mode: bool = False
    stream_default_fps: int = 5
    stream_process_every_n: int = 5
    redis_url: str = "redis://127.0.0.1:6379/2"
    ai_vision_service_url: str = ""
    stream_auto_detect: bool = False


settings = Settings()
