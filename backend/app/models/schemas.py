"""
Backward-compatibility layer for Pydantic v2 schemas.
Re-exports modular models from catalog.py, request.py, and preference.py.
"""

from backend.app.models.catalog import (
    AudioFeaturesModel,
    TrackCardResponse,
    IntentDimensionItem,
    RetrievalSnapshotModel
)
from backend.app.models.request import (
    RecommendRequest,
    RecommendResponse
)
from backend.app.models.preference import (
    FeedbackRequest,
    FeedbackResponse,
    UserPreferenceStatsResponse,
    DPOPairItem,
    DPOTrainRequest,
    DPOTrainResponse
)

__all__ = [
    "AudioFeaturesModel",
    "TrackCardResponse",
    "IntentDimensionItem",
    "RetrievalSnapshotModel",
    "RecommendRequest",
    "RecommendResponse",
    "FeedbackRequest",
    "FeedbackResponse",
    "UserPreferenceStatsResponse",
    "DPOPairItem",
    "DPOTrainRequest",
    "DPOTrainResponse"
]
