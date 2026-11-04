"""
Catalog Manager for Kaggle Spotify Tracks Dataset.
Conforms strictly to specs/SPEC_01_DATASET_AND_SEMANTIC_IDS.md.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Sequence
import pandas as pd

from backend.app.config import settings
from backend.app.scripts.download_or_seed_dataset import load_or_fetch_dataset

logger = logging.getLogger(__name__)


class CatalogManager:
    """
    Manages loading, indexing, and querying the Kaggle Spotify Tracks catalog.
    Provides fast O(1) lookups by track_id, prefix filtering by Semantic ID,
    and audio feature bounds filtering.
    """

    def __init__(self, catalog_path: str | Path | None = None):
        self.catalog_path = Path(catalog_path) if catalog_path else settings.catalog_path
        self.df: pd.DataFrame = pd.DataFrame()
        self._id_index: dict[str, dict[str, Any]] = {}
        self._sid_index: dict[str, list[dict[str, Any]]] = {}

        if self.catalog_path.exists():
            self.load()
        elif settings.raw_catalog_path.exists():
            self.catalog_path = settings.raw_catalog_path
            self.load()

    def __len__(self) -> int:
        return len(self.df)

    def load(self, path: str | Path | None = None) -> CatalogManager:
        """Load catalog from CSV and build lookup indices."""
        target_path = Path(path) if path else self.catalog_path
        if not target_path.exists():
            logger.info(f"Catalog file not found at {target_path}. Downloading or seeding dataset...")
            self.df = load_or_fetch_dataset(str(target_path))
        else:
            self.df = pd.read_csv(target_path)

        self._build_indices()
        return self

    def _build_indices(self) -> None:
        """Build in-memory hash indices for rapid O(1) track lookups and SID prefix groupings."""
        self._id_index.clear()
        self._sid_index.clear()

        for _, row in self.df.iterrows():
            record = row.to_dict()
            track_id = str(record.get("track_id", ""))
            sid = str(record.get("semantic_id", ""))

            self._id_index[track_id] = record

            if sid:
                # Index by exact SID
                if sid not in self._sid_index:
                    self._sid_index[sid] = []
                self._sid_index[sid].append(record)

                # Index by level-1 prefix (e.g. SID-03)
                parts = sid.split("-")
                if len(parts) >= 2:
                    macro_key = f"{parts[0]}-{parts[1]}"
                    if macro_key not in self._sid_index:
                        self._sid_index[macro_key] = []
                    self._sid_index[macro_key].append(record)

    def get_track(self, track_id: str) -> dict[str, Any] | None:
        """Retrieve full track metadata dictionary by track_id."""
        return self._id_index.get(track_id)

    def get_tracks_by_semantic_id(self, semantic_id_or_prefix: str) -> list[dict[str, Any]]:
        """Retrieve tracks matching a specific Semantic ID or hierarchical prefix."""
        return self._sid_index.get(semantic_id_or_prefix, [])

    def get_genres(self) -> list[str]:
        """Return sorted list of all unique track genres in the catalog."""
        if self.df.empty or "track_genre" not in self.df.columns:
            return []
        return sorted(self.df["track_genre"].dropna().unique().tolist())

    def filter_by_bounds(
        self,
        energy_range: tuple[float, float] | None = None,
        valence_range: tuple[float, float] | None = None,
        acousticness_min: float | None = None,
        genres: Sequence[str] | None = None,
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """Filter catalog tracks by psychoacoustic feature bounds and genres."""
        if self.df.empty:
            return []

        filtered = self.df

        if energy_range and "energy" in filtered.columns:
            filtered = filtered[(filtered["energy"] >= energy_range[0]) & (filtered["energy"] <= energy_range[1])]

        if valence_range and "valence" in filtered.columns:
            filtered = filtered[(filtered["valence"] >= valence_range[0]) & (filtered["valence"] <= valence_range[1])]

        if acousticness_min is not None and "acousticness" in filtered.columns:
            filtered = filtered[filtered["acousticness"] >= acousticness_min]

        if genres and "track_genre" in filtered.columns:
            genre_set = {g.lower() for g in genres}
            filtered = filtered[filtered["track_genre"].str.lower().isin(genre_set)]

        return filtered.head(limit).to_dict(orient="records")

    def summary(self) -> dict[str, Any]:
        """Return catalog telemetry summary."""
        return {
            "total_tracks": len(self.df),
            "total_genres": len(self.get_genres()),
            "has_semantic_ids": "semantic_id" in self.df.columns if not self.df.empty else False,
            "genres": self.get_genres()[:10]
        }
