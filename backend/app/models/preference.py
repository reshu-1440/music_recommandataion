"""
Feedback & DPO Preference Pydantic Models.
Conforms strictly to specs/SPEC_04_PREFERENCE_FLYWHEEL_AND_DPO.md and specs/SPEC_05_FASTAPI_BACKEND_API.md.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


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
