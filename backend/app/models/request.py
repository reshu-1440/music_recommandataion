"""
Recommendation Request & Response Pydantic Models.
Conforms strictly to specs/SPEC_05_FASTAPI_BACKEND_API.md.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

from backend.app.models.catalog import (
    TrackCardResponse,
    IntentDimensionItem,
    RetrievalSnapshotModel
)


class RecommendRequest(BaseModel):
    query: str = Field(
        ...,
        description="Natural language listener prompt",
        json_schema_extra={"example": "something calm for a 3 a.m. study session"}
    )
    discovery_mode: str = Field(
        default="familiar",
        description="'familiar' or 'explore' (GLIDE switch)"
    )
    user_id: str = Field(
        default="default_user",
        description="Listener ID for preference flywheel personalization"
    )
    limit: int = Field(
        default=8,
        ge=1,
        le=50,
        description="Number of recommendations to return"
    )
    preparsed_intent: dict[str, Any] | None = Field(
        default=None,
        description="Client-side pre-parsed intent from WebLLM"
    )


class RecommendResponse(BaseModel):
    query: str
    discovery_mode: str
    tracks: list[TrackCardResponse]
    intent_dimensions: list[IntentDimensionItem]
    overall_reasoning: str
    retrieval_snapshot: RetrievalSnapshotModel
    is_valid: bool = True
    error_message: str | None = None
