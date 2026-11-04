"""
Application Configuration and Environment Settings.
"""

from __future__ import annotations

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    # Google Gemini Settings
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    gemini_model: str = "gemini-2.0-flash"
    gemini_timeout: float = 6.0
    gemini_max_retries: int = 1

    # Embedding & Retrieval Settings
    embedding_model: str = "all-MiniLM-L6-v2"
    faiss_dimension: int = 384
    default_recommendation_limit: int = 8

    # GLIDE Non-Habitual Settings
    glide_familiar_lambda: float = 1.0
    glide_explore_lambda: float = 0.45

    # File Paths
    catalog_path: Path = DATA_DIR / "catalog_indexed.csv"
    raw_catalog_path: Path = DATA_DIR / "kaggle_spotify_tracks.csv"
    faiss_index_path: Path = DATA_DIR / "faiss_index.bin"
    faiss_metadata_path: Path = DATA_DIR / "faiss_metadata.pkl"
    sid_codebooks_path: Path = DATA_DIR / "sid_codebooks.pkl"
    preferences_db_path: Path = DATA_DIR / "preferences.db"

    # API Settings
    api_title: str = "Sonora Music Discovery API"
    api_version: str = "1.0.0"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
