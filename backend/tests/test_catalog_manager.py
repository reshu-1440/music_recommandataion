"""
Unit tests for CatalogManager.
Conforms to specs/SPEC_01_DATASET_AND_SEMANTIC_IDS.md.
"""

import pytest
import pandas as pd
from backend.app.core.catalog_manager import CatalogManager


@pytest.fixture
def sample_catalog_csv(tmp_path):
    csv_file = tmp_path / "test_tracks.csv"
    data = {
        "track_id": ["TRK-001", "TRK-002", "TRK-003", "TRK-004"],
        "track_name": ["Song A", "Song B", "Song C", "Song D"],
        "artists": ["Artist 1", "Artist 2", "Artist 3", "Artist 4"],
        "album_name": ["Album 1", "Album 2", "Album 3", "Album 4"],
        "track_genre": ["ambient", "ambient", "electronic", "rock"],
        "semantic_id": ["SID-01-05-12-03", "SID-01-05-18-09", "SID-04-10-02-15", "SID-08-20-11-01"],
        "energy": [0.15, 0.22, 0.85, 0.90],
        "valence": [0.20, 0.35, 0.70, 0.65],
        "acousticness": [0.90, 0.85, 0.05, 0.02],
        "danceability": [0.20, 0.30, 0.80, 0.50],
        "tempo": [70.0, 75.0, 128.0, 140.0],
        "loudness": [-20.0, -18.0, -6.0, -4.0],
        "duration_ms": [200000, 210000, 220000, 190000],
        "popularity": [60, 65, 75, 80]
    }
    df = pd.DataFrame(data)
    df.to_csv(csv_file, index=False)
    return csv_file


def test_catalog_manager_load_and_len(sample_catalog_csv):
    mgr = CatalogManager(catalog_path=sample_catalog_csv)
    assert len(mgr) == 4
    assert "ambient" in mgr.get_genres()
    assert "electronic" in mgr.get_genres()


def test_catalog_manager_get_track(sample_catalog_csv):
    mgr = CatalogManager(catalog_path=sample_catalog_csv)
    trk = mgr.get_track("TRK-001")
    assert trk is not None
    assert trk["track_name"] == "Song A"
    assert trk["track_genre"] == "ambient"

    non_existent = mgr.get_track("TRK-999")
    assert non_existent is None


def test_catalog_manager_semantic_id_prefix_lookup(sample_catalog_csv):
    mgr = CatalogManager(catalog_path=sample_catalog_csv)
    # Lookup by exact SID
    tracks_exact = mgr.get_tracks_by_semantic_id("SID-01-05-12-03")
    assert len(tracks_exact) == 1
    assert tracks_exact[0]["track_id"] == "TRK-001"

    # Lookup by level-1 macro prefix
    macro_tracks = mgr.get_tracks_by_semantic_id("SID-01")
    assert len(macro_tracks) == 2
    assert {t["track_id"] for t in macro_tracks} == {"TRK-001", "TRK-002"}


def test_catalog_manager_filter_by_bounds(sample_catalog_csv):
    mgr = CatalogManager(catalog_path=sample_catalog_csv)
    # Filter for low energy, high acousticness (ambient study)
    results = mgr.filter_by_bounds(
        energy_range=(0.10, 0.30),
        acousticness_min=0.80,
        genres=["ambient"]
    )
    assert len(results) == 2
    for r in results:
        assert r["track_genre"] == "ambient"
        assert r["energy"] <= 0.30
        assert r["acousticness"] >= 0.80
