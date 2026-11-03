"""
Unit tests for Preference Store and Tier 1 Online Centroid Re-Ranking.
Conforms strictly to specs/SPEC_04_PREFERENCE_FLYWHEEL_AND_DPO.md.
"""

import tempfile
from pathlib import Path
import numpy as np
import pytest

from backend.app.core.embeddings import EmbeddingEngine
from backend.app.preference.online_reranker import OnlinePreferenceReranker
from backend.app.preference.store import PreferenceStore


@pytest.fixture
def temp_db():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    yield db_path
    try:
        Path(db_path).unlink(missing_ok=True)
    except Exception:
        pass


@pytest.fixture
def store(temp_db):
    return PreferenceStore(db_path=temp_db)


@pytest.fixture(scope="module")
def embedder():
    return EmbeddingEngine(model_name="all-MiniLM-L6-v2")


def test_log_interaction_and_counters(store):
    """Test logging Save, Replay, and Skip properly updates profile tallies."""
    track = {
        "track_id": "TRK-001",
        "track_name": "Weightless",
        "artists": "Marconi Union",
        "semantic_id": "SID-03-12-08-01"
    }

    # Save
    res1 = store.log_interaction("user_1", track, "calm study music", "save")
    assert res1["weight"] == 1.0

    # Skip
    res2 = store.log_interaction("user_1", track, "calm study music", "skip")
    assert res2["weight"] == -1.0

    # Replay
    res3 = store.log_interaction("user_1", track, "calm study music", "replay")
    assert res3["weight"] == 1.5

    stats = store.get_user_stats("user_1")
    assert stats["saved_count"] == 1
    assert stats["skipped_count"] == 1
    assert stats["played_count"] == 1
    assert len(stats["history"]) == 3
    assert "Replayed" in stats["history"][0]


def test_invalid_action_raises_error(store):
    """Test invalid interaction action raises ValueError."""
    with pytest.raises(ValueError, match="Invalid action"):
        store.log_interaction("user_1", {}, "query", "dislike")


def test_online_reranker_taste_steering(store, embedder):
    """
    Test Tier 1 online preference steering:
    - User saves ambient track -> positive centroid shifts toward ambient.
    - User skips heavy metal track -> negative centroid shifts toward metal.
    - Subsequent search results boost ambient track and penalize metal track.
    """
    reranker = OnlinePreferenceReranker(store, gamma=0.5, alpha=0.20, beta=0.20)

    ambient_desc = "Peaceful ambient acoustic piano for quiet studying"
    metal_desc = "Aggressive heavy metal guitar riffs with screaming vocals"

    ambient_vec = embedder.encode_query(ambient_desc)
    metal_vec = embedder.encode_query(metal_desc)

    # User interactions: Save ambient, Skip metal
    reranker.update_from_action("user_test", ambient_vec, "save")
    reranker.update_from_action("user_test", metal_vec, "skip")

    # Candidates with equal initial scores
    candidates = [
        {"track_id": "T_METAL", "description": metal_desc, "score": 0.70},
        {"track_id": "T_AMBIENT", "description": ambient_desc, "score": 0.70}
    ]

    reranked = reranker.rerank(candidates, "user_test", embedder)

    # Ambient track should now rank #1 with a boosted score
    assert reranked[0]["track_id"] == "T_AMBIENT"
    assert reranked[0]["score"] > 0.70
    assert reranked[0]["preference_adjustment"] > 0

    # Metal track should rank #2 with a penalized score
    assert reranked[1]["track_id"] == "T_METAL"
    assert reranked[1]["score"] < 0.70
    assert reranked[1]["preference_adjustment"] < 0
