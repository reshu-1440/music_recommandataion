"""
Unit tests for FAISS Vector Store and GLIDE MMR Diversity Retrieval.
Conforms strictly to specs/SPEC_02_VECTOR_STORE_AND_GLIDE.md.
"""

import tempfile
from pathlib import Path
import numpy as np
import pytest

from backend.app.core.embeddings import EmbeddingEngine
from backend.app.core.vector_store import VectorStore


def calculate_intra_list_similarity(items: list[dict], embedder: EmbeddingEngine) -> float:
    """Helper to calculate mean pairwise cosine similarity among recommended items."""
    if len(items) < 2:
        return 1.0
    descriptions = [it["description"] for it in items]
    vecs = embedder.encode_texts(descriptions)
    # Cosine similarity matrix
    sim_matrix = vecs @ vecs.T
    # Extract upper triangle (excluding diagonal)
    n = len(items)
    upper_indices = np.triu_indices(n, k=1)
    pairwise_sims = sim_matrix[upper_indices]
    return float(np.mean(pairwise_sims))


@pytest.fixture(scope="module")
def embedder():
    return EmbeddingEngine(model_name="all-MiniLM-L6-v2")


@pytest.fixture
def sample_vector_store(embedder):
    store = VectorStore(dimension=embedder.dimension)
    descriptions = [
        "Calm acoustic guitar and soft piano for late night studying",
        "Peaceful ambient piano and quiet acoustic rain textures for deep study",
        "Gentle lo-fi study beats with vintage acoustic piano for focus",
        "Heavy metal guitar riffs with aggressive drums and screaming vocals",
        "Hard-hitting thrash metal with fast double-bass pedal and distortion",
        "Fast tempo electronic techno track with 130 BPM pulsing bassline",
        "Upbeat disco pop with catchy vocal hooks and danceable synth bass",
        "Energetic funk guitar groove with brass section and groovy rhythm"
    ]
    metadata = [
        {"track_id": f"TRK-{i}", "description": desc, "track_genre": "study" if i < 3 else "high_energy"}
        for i, desc in enumerate(descriptions)
    ]
    vectors = embedder.encode_texts(descriptions)
    store.add(vectors, metadata)
    return store


def test_embedding_engine_dimension_and_norm(embedder):
    """Test EmbeddingEngine generates 384-dimensional unit vectors."""
    assert embedder.dimension == 384
    query_vec = embedder.encode_query("ambient calm study music")
    assert query_vec.shape == (1, 384)
    # Norm must be 1.0 (unit vector)
    norm = np.linalg.norm(query_vec[0])
    assert pytest.approx(norm, abs=1e-4) == 1.0

    texts_vec = embedder.encode_texts(["Track 1", "Track 2"])
    assert texts_vec.shape == (2, 384)
    assert pytest.approx(np.linalg.norm(texts_vec[0]), abs=1e-4) == 1.0
    assert pytest.approx(np.linalg.norm(texts_vec[1]), abs=1e-4) == 1.0


def test_empty_query_returns_zeros(embedder):
    """Test empty or whitespace query returns zero vector."""
    zero_vec = embedder.encode_query("   ")
    assert zero_vec.shape == (1, 384)
    assert np.all(zero_vec == 0.0)


def test_vector_store_search_ranking(sample_vector_store, embedder):
    """Test search retrieves study tracks at top ranks for study query."""
    q_vec = embedder.encode_query("calm acoustic piano music for studying")
    results = sample_vector_store.search(q_vec, k=3, lambda_param=1.0)
    assert len(results) == 3
    # All top-3 should be the calm/study tracks
    for res in results:
        assert res["track_genre"] == "study"
    # Scores must be in descending order
    scores = [r["score"] for r in results]
    assert scores == sorted(scores, reverse=True)


def test_glide_mmr_diversity(sample_vector_store, embedder):
    """
    Test GLIDE MMR:
    Familiar mode (lambda=1.0) returns purely study tracks.
    Explore mode (lambda=0.45) introduces diverse musical directions.
    Intra-list similarity in Explore mode must be lower than Familiar mode.
    """
    q_vec = embedder.encode_query("peaceful calm study session")

    familiar_results = sample_vector_store.search(q_vec, k=4, lambda_param=1.0)
    explore_results = sample_vector_store.search(q_vec, k=4, lambda_param=0.45)

    assert len(familiar_results) == 4
    assert len(explore_results) == 4

    familiar_sim = calculate_intra_list_similarity(familiar_results, embedder)
    explore_sim = calculate_intra_list_similarity(explore_results, embedder)

    # GLIDE exploration should decrease average pairwise redundancy
    assert explore_sim < familiar_sim, f"Expected Explore sim ({explore_sim:.3f}) < Familiar sim ({familiar_sim:.3f})"


def test_vector_store_persistence(sample_vector_store, embedder):
    """Test saving and loading vector store preserves identical search results."""
    with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as f_idx:
        idx_path = f_idx.name
    with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as f_meta:
        meta_path = f_meta.name

    try:
        sample_vector_store.save(idx_path, meta_path)
        loaded_store = VectorStore.load(idx_path, meta_path)

        assert len(loaded_store) == len(sample_vector_store)

        q_vec = embedder.encode_query("metal drums")
        res_orig = sample_vector_store.search(q_vec, k=2, lambda_param=1.0)
        res_load = loaded_store.search(q_vec, k=2, lambda_param=1.0)

        assert [r["track_id"] for r in res_orig] == [r["track_id"] for r in res_load]
    finally:
        Path(idx_path).unlink(missing_ok=True)
        Path(meta_path).unlink(missing_ok=True)


def test_empty_store_raises_error():
    """Test searching an empty store raises RuntimeError."""
    empty_store = VectorStore(dimension=384)
    with pytest.raises(RuntimeError, match="Cannot search an empty VectorStore"):
        empty_store.search(np.zeros((1, 384)), k=5)
