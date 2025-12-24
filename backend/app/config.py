from pydantic_settings import BaseSettings
from typing import List
import json
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "2026 Lead Generation Insurance Platform"
    version: str = "1.0.0"
    description: str = "Lead Management System for Insurance Lead Generation"
    debug: bool = True
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    database_url: str = "sqlite+aiosqlite:///./leads.db"
    api_v1_prefix: str = "/api/v1"
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    pagination_default_page_size: int = 20
    pagination_max_page_size: int = 100
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def load_settings() -> Settings:
    config_path = Path(__file__).parent.parent / "config.json"
    if config_path.exists():
        with open(config_path, 'r') as f:
            config_data = json.load(f)
        return Settings(**config_data)
    return Settings()


settings = load_settings()
