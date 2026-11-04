"""
Kaggle Track & Audio Features Pydantic Models.
Conforms strictly to specs/SPEC_01_DATASET_AND_SEMANTIC_IDS.md and specs/SPEC_05_FASTAPI_BACKEND_API.md.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class AudioFeaturesModel(BaseModel):
    energy: float = 0.5
    valence: float = 0.5
    acousticness: float = 0.5
    danceability: float = 0.5
    instrumentalness: float = 0.5
    tempo: float = 120.0
    loudness: float = -10.0


class TrackCardResponse(BaseModel):
    """Schema precisely matching Sonora's TrackCard UI component."""
    id: str = Field(..., description="Semantic ID token (e.g. SID-04-13-04-21)")
    track_id: str = Field(..., description="Catalog track identifier")
    title: str = Field(..., description="Track name")
    artist: str = Field(..., description="Artist name")
    album: str = Field(default="Single", description="Album or EP title")
    genre: str = Field(..., description="Genre display string (e.g. Ambient · Minimal)")
    duration: str = Field(..., description="Formatted duration string (e.g. 3:54)")
    duration_ms: int = 234000
    score: str = Field(..., description="Relevance score percentage (e.g. 98%)")
    numeric_score: float = 0.98
    semantic_id: str = Field(..., description="Semantic ID token")
    image: str = Field(default="", description="Unsplash photo key or artwork identifier")
    image_url: str = Field(default="", description="Unique high-resolution artwork URL")
    preview_url: str | None = Field(default=None, description="Direct audio streaming preview URL")
    reason: str = Field(..., description="Grounded contextual explanation")
    audio_features: AudioFeaturesModel = Field(default_factory=AudioFeaturesModel)


class IntentDimensionItem(BaseModel):
    label: str
    sub: str


class RetrievalSnapshotModel(BaseModel):
    intent_id: str
    catalog_id: str
    ranking_mode: str
    retrieval: str
