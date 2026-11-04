"""
Pydantic v2 Models Package for Sonora Music Discovery.
Organized into catalog, request, and preference models per architecture plan.
"""

from .catalog import (
    AudioFeaturesModel,
    TrackCardResponse,
    IntentDimensionItem,
    RetrievalSnapshotModel
)
from .request import (
    RecommendRequest,
    RecommendResponse
)
from .preference import (
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
