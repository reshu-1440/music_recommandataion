"""
Unit tests for Hierarchical RQ-KMeans Semantic ID Generator.
Conforms strictly to specs/SPEC_01_DATASET_AND_SEMANTIC_IDS.md.
"""

import re
import tempfile
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from backend.app.core.semantic_ids import SemanticIDGenerator, SID_PATTERN
from backend.app.scripts.download_or_seed_dataset import seed_curated_kaggle_dataset


@pytest.fixture(scope="module")
def sample_catalog_df():
    """Generates a small test dataframe conforming to the Kaggle Spotify tracks schema."""
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        tmp_path = tmp.name
    df = seed_curated_kaggle_dataset(tmp_path, n_samples=200, random_seed=42)
    Path(tmp_path).unlink(missing_ok=True)
    return df


@pytest.fixture
def generator():
    return SemanticIDGenerator(n_levels=4, n_clusters=16, random_state=42)


def test_feature_extraction(generator, sample_catalog_df):
    """Test feature extraction yields expected shape (N, 7) and valid [0, 1] bounds."""
    features = generator.extract_features(sample_catalog_df)
    assert features.shape == (len(sample_catalog_df), 7)
    assert features.dtype == np.float32
    assert np.all(features >= 0.0)
    assert np.all(features <= 1.0)


def test_feature_extraction_missing_column(generator):
    """Test feature extraction raises ValueError when required columns are absent."""
    invalid_df = pd.DataFrame({"title": ["Test"], "danceability": [0.5]})
    with pytest.raises(ValueError, match="Missing required audio columns"):
        generator.extract_features(invalid_df)


def test_fit_and_encode(generator, sample_catalog_df):
    """Test fitting and encoding outputs codes in [0, n_clusters-1]."""
    features = generator.extract_features(sample_catalog_df)
    generator.fit(features)
    assert generator.is_fitted is True
    assert len(generator.codebooks) == 4

    codes = generator.encode(features)
    assert codes.shape == (len(sample_catalog_df), 4)
    assert np.all(codes >= 0)
    assert np.all(codes < 16)


def test_unfitted_encode_raises_error(generator, sample_catalog_df):
    """Test calling encode() on an un-fitted generator raises RuntimeError."""
    features = np.random.uniform(0, 1, (10, 7)).astype(np.float32)
    with pytest.raises(RuntimeError, match="must be fitted before encoding"):
        generator.encode(features)


def test_sid_formatting_and_regex(generator):
    """Test SID formatting strictly matches regex ^SID-\\d{2}-\\d{2}-\\d{2}-\\d{2}$."""
    code = (3, 15, 0, 9)
    sid_str = generator.format_sid(code)
    assert sid_str == "SID-03-15-00-09"
    assert SID_PATTERN.match(sid_str) is not None


def test_sid_decoding_roundtrip(generator):
    """Test encode -> format -> decode produces identical code tuple."""
    original = (7, 12, 3, 14)
    sid_str = generator.format_sid(original)
    decoded = generator.decode_sid(sid_str)
    assert decoded == original


def test_invalid_sid_decode_raises_error():
    """Test decoding ill-formatted SID strings raises ValueError."""
    with pytest.raises(ValueError, match="Invalid Semantic ID format"):
        SemanticIDGenerator.decode_sid("INVALID-123")
    with pytest.raises(ValueError, match="Invalid Semantic ID format"):
        SemanticIDGenerator.decode_sid("SID-1-2-3-4")


def test_acoustic_locality_prefix_sharing(generator, sample_catalog_df):
    """
    Test acoustic locality:
    Two acoustically close ambient study tracks should share Level 1 prefix.
    A heavy high-energy metal track should have a different Level 1 prefix.
    """
    features = generator.extract_features(sample_catalog_df)
    generator.fit(features)

    # Synthetic calm ambient tracks (very low energy, high acousticness)
    ambient_1 = np.array([[0.20, 0.10, 0.20, 0.95, 0.90, 0.10, 0.20]], dtype=np.float32)
    ambient_2 = np.array([[0.22, 0.12, 0.25, 0.92, 0.88, 0.12, 0.22]], dtype=np.float32)

    # Synthetic metal/techno track (very high energy, low acousticness, high tempo)
    heavy_track = np.array([[0.70, 0.98, 0.30, 0.01, 0.10, 0.85, 0.95]], dtype=np.float32)

    code_amb1 = generator.encode(ambient_1)[0]
    code_amb2 = generator.encode(ambient_2)[0]
    code_heavy = generator.encode(heavy_track)[0]

    # Level 1 cluster index (code[0]) should match between ambient tracks
    assert code_amb1[0] == code_amb2[0], f"Expected ambient tracks to share prefix, got {code_amb1} vs {code_amb2}"
    # Level 1 cluster should differ from heavy track
    assert code_amb1[0] != code_heavy[0], f"Expected ambient and heavy to differ, got {code_amb1} vs {code_heavy}"


def test_save_and_load_roundtrip(generator, sample_catalog_df):
    """Test model persistence preserves identical predictions after reloading."""
    features = generator.extract_features(sample_catalog_df)
    generator.fit(features)
    original_codes = generator.encode(features[:10])

    with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as tmp:
        model_path = tmp.name

    try:
        generator.save(model_path)
        loaded_gen = SemanticIDGenerator.load(model_path)
        assert loaded_gen.is_fitted is True
        loaded_codes = loaded_gen.encode(features[:10])
        np.testing.assert_array_equal(original_codes, loaded_codes)
    finally:
        Path(model_path).unlink(missing_ok=True)
