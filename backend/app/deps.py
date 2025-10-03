from __future__ import annotations

from app.config import Settings, get_settings



def get_app_settings() -> Settings:
    return get_settings()
