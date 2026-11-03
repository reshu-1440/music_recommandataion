"""
Unit and integration tests for FastAPI REST Endpoints.
Conforms strictly to specs/SPEC_05_FASTAPI_BACKEND_API.md.
Tests endpoint handlers directly to remain fully portable across Windows sandbox environments
without hanging on socket.socketpair().
"""

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import faiss
import pytest
from backend.app.main import (
    health_check,
    recommend,
    log_feedback,
    get_preferences,
    get_dpo_pairs,
    trigger_dpo_training,
)
from backend.app.models.schemas import (
    RecommendRequest,
    FeedbackRequest,
    DPOTrainRequest,
)
from backend.app.core.semantic_ids import SID_PATTERN


def test_health_endpoint():
    """Test health check returns healthy status and indexed track count."""
    data = health_check()
    assert data["status"] == "healthy"
    assert data["indexed_tracks"] >= 1000
    assert data["embedding_model"] == "all-MiniLM-L6-v2"


def test_recommend_endpoint_familiar():
    """Test recommendation endpoint in Familiar mode."""
    req = RecommendRequest(
        query="something calm for a 3 a.m. study session",
        discovery_mode="familiar",
        user_id="test_user_api",
        limit=4
    )
    resp = recommend(req)

    assert resp.query == req.query
    assert resp.discovery_mode == "familiar"
    assert len(resp.tracks) == 4

    # Verify track fields expected by Sonora frontend
    for t in resp.tracks:
        assert t.title and len(t.title) > 0
        assert t.artist and len(t.artist) > 0
        assert ":" in t.duration
        assert "%" in t.score
        assert len(t.reason) > 10
        assert "photo-" in t.image
        assert SID_PATTERN.match(t.id) is not None
        assert t.id == t.semantic_id

    assert len(resp.intent_dimensions) == 4
    assert len(resp.overall_reasoning) > 10
    assert resp.retrieval_snapshot is not None
    assert "Hybrid" in resp.retrieval_snapshot.ranking_mode or "Semantic" in resp.retrieval_snapshot.ranking_mode


def test_recommend_endpoint_explore():
    """Test recommendation endpoint in Explore (GLIDE) mode."""
    req = RecommendRequest(
        query="intense heavy workout",
        discovery_mode="explore",
        user_id="test_user_api",
        limit=4
    )
    resp = recommend(req)
    assert len(resp.tracks) == 4
    assert resp.discovery_mode == "explore"
    assert "GLIDE" in resp.retrieval_snapshot.ranking_mode


def test_feedback_and_preferences_lifecycle():
    """Test logging Save/Skip actions and retrieving preference stats."""
    save_req = FeedbackRequest(
        user_id="user_flywheel_lifecycle",
        track_id="TRK-TEST-001",
        track_name="Ambient Echoes",
        artists="Lunar Drift",
        query="late night study",
        action="save",
        semantic_id="SID-01-02-03-04"
    )

    # 1. Post Save Feedback
    fb_save = log_feedback(save_req)
    assert fb_save.status == "success"
    assert fb_save.action == "save"
    assert fb_save.weight == 1.0

    # 2. Post Skip Feedback
    skip_req = FeedbackRequest(
        user_id="user_flywheel_lifecycle",
        track_id="TRK-TEST-002",
        track_name="Harsh Noise",
        artists="Static Pulse",
        query="late night study",
        action="skip",
        semantic_id="SID-04-05-06-07"
    )
    fb_skip = log_feedback(skip_req)
    assert fb_skip.status == "success"
    assert fb_skip.action == "skip"
    assert fb_skip.weight == -1.0

    # 3. Retrieve Preferences
    pref = get_preferences("user_flywheel_lifecycle")
    assert pref.saved_count >= 1
    assert pref.skipped_count >= 1
    assert len(pref.history) >= 2


def test_dpo_pairs_and_train():
    """Test getting mined DPO pairs and triggering DPO training."""
    # 1. Get mined pairs
    pairs_data = get_dpo_pairs("user_flywheel_lifecycle")
    assert "total_pairs" in pairs_data
    assert isinstance(pairs_data["pairs"], list)

    # 2. Trigger DPO training (dry-run)
    train_req = DPOTrainRequest(epochs=2, beta=0.1, dry_run=True)
    train_resp = trigger_dpo_training(train_req)
    assert train_resp.status in ["completed", "skipped"]
    assert "dry_run" in train_resp.mode
