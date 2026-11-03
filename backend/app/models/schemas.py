"""
Pydantic v2 Request & Response Schemas.
Conforms strictly to specs/SPEC_05_FASTAPI_BACKEND_API.md.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class RecommendRequest(BaseModel):
    query: str = Field(..., description="Natural language listener prompt", json_schema_extra={"example": "something calm for a 3 a.m. study session"})
    discovery_mode: str = Field(default="familiar", description="'familiar' or 'explore' (GLIDE switch)")
    user_id: str = Field(default="default_user", description="Listener ID for preference flywheel personalization")
    limit: int = Field(default=8, ge=1, le=50, description="Number of recommendations to return")


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
    image: str = Field(..., description="Unsplash photo key for artwork")
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


class RecommendResponse(BaseModel):
    query: str
    discovery_mode: str
    tracks: list[TrackCardResponse]
    intent_dimensions: list[IntentDimensionItem]
    overall_reasoning: str
    retrieval_snapshot: RetrievalSnapshotModel


class FeedbackRequest(BaseModel):
    user_id: str = Field(default="default_user")
    track_id: str
    track_name: str
    artists: str
    query: str = Field(default="general search")
    action: str = Field(..., description="'save' | 'skip' | 'replay' | 'play'")
    semantic_id: str = Field(default="SID-00-00-00-00")


class FeedbackResponse(BaseModel):
    status: str = "success"
    action: str
    weight: float
    track_id: str
    user_id: str
    updated_stats: dict[str, Any]


class UserPreferenceStatsResponse(BaseModel):
    user_id: str
    saved_count: int
    skipped_count: int
    played_count: int
    total_interactions: int
    history: list[str]


class DPOPairItem(BaseModel):
    prompt: str
    chosen: str
    rejected: str
    user_id: str


class DPOTrainRequest(BaseModel):
    epochs: int = Field(default=3, ge=1, le=10)
    beta: float = Field(default=0.1, ge=0.01, le=1.0)
    dry_run: bool = Field(default=True, description="When True, executes fast verification simulation")


class DPOTrainResponse(BaseModel):
    status: str
    mode: str
    pairs_trained: int
    epochs: int
    beta: float
    initial_dpo_loss: float | None = None
    final_dpo_loss: float | None = None
    reward_margin_gain: float | None = None
    output_dir: str | None = None
