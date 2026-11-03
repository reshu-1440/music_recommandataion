"""
Unit tests for LangGraph Agent Pipeline and Gemini Intent Extraction.
Conforms strictly to specs/SPEC_03_LANGGRAPH_GEMINI_AGENT.md.
"""

import pytest

from backend.app.agent.graph import build_recommender_graph
from backend.app.agent.prompts import heuristic_intent_parser, heuristic_explainer
from backend.app.core.embeddings import EmbeddingEngine
from backend.app.core.semantic_ids import SID_PATTERN
from backend.app.core.vector_store import VectorStore


@pytest.fixture(scope="module")
def embedder():
    return EmbeddingEngine(model_name="all-MiniLM-L6-v2")


@pytest.fixture(scope="module")
def sample_store(embedder):
    store = VectorStore(dimension=embedder.dimension)
    descriptions = [
        "A peaceful ambient piano track with rain textures for late night study sessions.",
        "Calm acoustic guitar melody with soft warm strings, perfect for deep focus.",
        "Gentle lo-fi beats with Rhodes keys and relaxed tempo for coding.",
        "Heavy metal electric guitar riffs with aggressive blast beats for gym workouts.",
        "Driving synthwave track with 80s neon arpeggios and high-energy electronic pulse."
    ]
    metadata = [
        {
            "track_id": f"TRK-{i:04d}",
            "track_name": f"Track {i}",
            "artists": f"Artist {i}",
            "album_name": f"Album {i}",
            "track_genre": "ambient" if i < 3 else "electronic",
            "semantic_id": f"SID-03-12-08-{i:02d}",
            "description": desc,
            "duration_ms": 210000,
            "popularity": 70,
            "audio_features": {
                "energy": 0.15 if i < 3 else 0.85,
                "valence": 0.25 if i < 3 else 0.75,
                "acousticness": 0.90 if i < 3 else 0.05,
                "danceability": 0.20 if i < 3 else 0.80,
                "tempo": 70.0 if i < 3 else 130.0,
                "loudness": -20.0 if i < 3 else -5.0
            }
        }
        for i, desc in enumerate(descriptions)
    ]
    vecs = embedder.encode_texts(descriptions)
    store.add(vecs, metadata)
    return store


def test_heuristic_intent_parser_calm_study():
    """Test heuristic parsing extracts calm/study parameters."""
    intent = heuristic_intent_parser("something calm for a 3 a.m. study session with soft piano")
    assert "calm" in intent["mood"] or "focused" in intent["mood"]
    assert intent["energy_range"][1] <= 0.40  # Max energy should be low
    assert intent["acousticness_min"] >= 0.50
    assert any("ambient" in g or "piano" in g for g in intent["preferred_genres"])


def test_heuristic_intent_parser_workout():
    """Test heuristic parsing extracts high-energy workout parameters."""
    intent = heuristic_intent_parser("high energy gym workout hype tracks")
    assert "energetic" in intent["mood"]
    assert intent["energy_range"][0] >= 0.60
    assert intent["tempo_range"][0] >= 110.0


def test_heuristic_explainer_content():
    """Test grounded explanation mentions track energy and Semantic ID."""
    track = {
        "track_id": "TRK-0001",
        "track_genre": "ambient",
        "semantic_id": "SID-03-12-08-01",
        "audio_features": {"energy": 0.18}
    }
    intent = {"listening_context": "late night study session"}
    explanation = heuristic_explainer(track, intent, "calm study")
    assert "SID-03-12-08-01" in explanation
    assert "ambient" in explanation
    assert "18%" in explanation


def test_agent_graph_execution_familiar_mode(sample_store, embedder):
    """Test full LangGraph agent execution in Familiar mode."""
    agent = build_recommender_graph(vector_store=sample_store, embedder=embedder)

    initial_state = {
        "query": "something calm for a 3 a.m. study session",
        "discovery_mode": "familiar",
        "k": 3
    }

    final_state = agent.invoke(initial_state)

    # 1. Check intent was parsed
    assert "parsed_intent" in final_state
    assert isinstance(final_state["parsed_intent"], dict)

    # 2. Check recommendations returned
    ranked = final_state.get("ranked_tracks", [])
    assert len(ranked) == 3

    # 3. Verify top tracks are low-energy study tracks
    for track in ranked:
        assert track["audio_features"]["energy"] < 0.50
        assert SID_PATTERN.match(track["semantic_id"]) is not None
        assert "explanation" in track and len(track["explanation"]) > 10

    # 4. Verify overall reasoning is generated for Sonora UI
    assert "overall_reasoning" in final_state
    assert len(final_state["overall_reasoning"]) > 15


def test_agent_graph_execution_explore_mode(sample_store, embedder):
    """Test LangGraph agent execution in Explore (GLIDE) mode."""
    agent = build_recommender_graph(vector_store=sample_store, embedder=embedder)

    initial_state = {
        "query": "peaceful focus",
        "discovery_mode": "explore",
        "k": 2
    }

    final_state = agent.invoke(initial_state)
    assert len(final_state.get("ranked_tracks", [])) == 2
    assert "Explore" in final_state["overall_reasoning"]
