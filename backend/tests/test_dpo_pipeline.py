"""
Unit tests for Tier 2 DPO Pair Mining and Training Pipeline.
Conforms strictly to specs/SPEC_04_PREFERENCE_FLYWHEEL_AND_DPO.md.
"""

import tempfile
from pathlib import Path
import pytest

from backend.app.preference.dpo_trainer import train_dpo_pipeline
from backend.app.preference.pair_miner import DPOPairMiner
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
    s = PreferenceStore(db_path=temp_db)
    # Seed interactions from a search session: "chill study music"
    # Saved track 1 (chosen)
    s.log_interaction("user_1", {
        "track_id": "T1", "track_name": "Ambient Chill", "artists": "Echo", "semantic_id": "SID-01-02-03-04"
    }, "chill study music", "save")

    # Replayed track 2 (chosen)
    s.log_interaction("user_1", {
        "track_id": "T2", "track_name": "Lofi Rain", "artists": "LofiCo", "semantic_id": "SID-01-02-03-05"
    }, "chill study music", "replay")

    # Skipped track 3 (rejected)
    s.log_interaction("user_1", {
        "track_id": "T3", "track_name": "Bass Blast", "artists": "EDM DJ", "semantic_id": "SID-28-15-20-11"
    }, "chill study music", "skip")

    return s


def test_dpo_pair_miner(store):
    """Test miner pairs chosen (save/replay) with rejected (skip) from same query session."""
    miner = DPOPairMiner(store)
    pairs = miner.mine_preference_pairs("user_1")

    # 2 chosen tracks x 1 rejected track = 2 pairs
    assert len(pairs) == 2

    for p in pairs:
        assert "chill study music" in p["prompt"]
        assert "SID" in p["chosen"]
        assert "SID" in p["rejected"]
        assert "Bass Blast" in p["rejected"]


def test_dpo_export_and_trainer_dry_run(store):
    """Test exporting JSONL dataset and executing dry-run DPO trainer."""
    miner = DPOPairMiner(store)

    with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as tmp_ds:
        ds_path = tmp_ds.name
    with tempfile.TemporaryDirectory() as tmp_out:
        out_dir = tmp_out

    try:
        count = miner.export_dpo_jsonl(ds_path, "user_1")
        assert count == 2
        assert Path(ds_path).stat().st_size > 50

        # Run DPO training pipeline in dry-run mode
        metrics = train_dpo_pipeline(ds_path, out_dir, epochs=3, beta=0.1, dry_run=True)

        assert metrics["status"] == "completed"
        assert metrics["pairs_trained"] == 2
        assert metrics["epochs"] == 3
        assert metrics["final_dpo_loss"] < metrics["initial_dpo_loss"]
        assert (Path(out_dir) / "training_summary.json").exists()
    finally:
        try:
            Path(ds_path).unlink(missing_ok=True)
        except Exception:
            pass
