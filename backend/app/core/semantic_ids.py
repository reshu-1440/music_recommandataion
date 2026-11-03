"""
Hierarchical RQ-KMeans Semantic ID Generator.
Conforms strictly to specs/SPEC_01_DATASET_AND_SEMANTIC_IDS.md.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence
import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

SID_PATTERN = re.compile(r"^SID-\d{2}-\d{2}-\d{2}-\d{2}$")
REQUIRED_AUDIO_COLUMNS = [
    "danceability", "energy", "valence", "acousticness",
    "instrumentalness", "tempo", "loudness"
]


class SemanticIDGenerator:
    """
    Residual Quantization via K-Means (RQ-KMeans).
    Converts continuous audio feature vectors into hierarchical discrete Semantic IDs.
    
    Level 1: Macro acoustic cluster (e.g. ambient study vs high-energy dance)
    Level 2: Sub-genre / Texture cluster
    Level 3: Mood / Sonic dynamics cluster
    Level 4: Fine-grained catalog token
    """

    def __init__(self, n_levels: int = 4, n_clusters: int = 32, random_state: int = 42):
        self.n_levels = n_levels
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.codebooks: list[KMeans] = []
        self.is_fitted: bool = False

    def extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """
        Extract and normalize the 7 continuous audio features from catalog DataFrame:
        [danceability, energy, valence, acousticness, instrumentalness, tempo_norm, loudness_norm]
        """
        missing = [col for col in REQUIRED_AUDIO_COLUMNS if col in df.columns and False or col not in df.columns]
        if missing:
            raise ValueError(f"Missing required audio columns in DataFrame: {missing}")

        data = df[REQUIRED_AUDIO_COLUMNS].copy()

        # Impute any missing/NaN values with column medians
        for col in REQUIRED_AUDIO_COLUMNS:
            if data[col].isna().any():
                data[col] = data[col].fillna(data[col].median())

        danceability = np.clip(data["danceability"].to_numpy(dtype=np.float32), 0.0, 1.0)
        energy = np.clip(data["energy"].to_numpy(dtype=np.float32), 0.0, 1.0)
        valence = np.clip(data["valence"].to_numpy(dtype=np.float32), 0.0, 1.0)
        acousticness = np.clip(data["acousticness"].to_numpy(dtype=np.float32), 0.0, 1.0)
        instrumentalness = np.clip(data["instrumentalness"].to_numpy(dtype=np.float32), 0.0, 1.0)

        # tempo: normalize from [50, 200] -> [0.0, 1.0]
        tempo = data["tempo"].to_numpy(dtype=np.float32)
        tempo_norm = np.clip((tempo - 50.0) / 150.0, 0.0, 1.0)

        # loudness: normalize from [-60, 0] dB -> [0.0, 1.0]
        loudness = data["loudness"].to_numpy(dtype=np.float32)
        loudness_norm = np.clip((loudness + 60.0) / 60.0, 0.0, 1.0)

        features = np.column_stack([
            danceability, energy, valence, acousticness,
            instrumentalness, tempo_norm, loudness_norm
        ]).astype(np.float32)

        return features

    def fit(self, features: np.ndarray) -> SemanticIDGenerator:
        """
        Fit hierarchical RQ-KMeans on the feature matrix.
        Successively clusters residuals from previous quantization layers.
        """
        if features.ndim != 2 or features.shape[1] != 7:
            raise ValueError(f"Expected feature matrix of shape (N, 7), got {features.shape}")

        n_samples = features.shape[0]
        actual_clusters = min(self.n_clusters, n_samples)

        self.codebooks = []
        residuals = features.copy().astype(np.float32)

        for level in range(self.n_levels):
            kmeans = KMeans(
                n_clusters=actual_clusters,
                random_state=self.random_state + level,
                n_init=10
            )
            kmeans.fit(residuals)
            labels = kmeans.predict(residuals)

            # Subtract reconstructed centroid from current residual
            centroids = kmeans.cluster_centers_[labels]
            residuals = residuals - centroids

            self.codebooks.append(kmeans)

        self.is_fitted = True
        return self

    def encode(self, features: np.ndarray) -> np.ndarray:
        """
        Encode features into discrete codebook indices of shape (N, n_levels).
        """
        if not self.is_fitted:
            raise RuntimeError("SemanticIDGenerator must be fitted before encoding.")

        if features.ndim != 2 or features.shape[1] != 7:
            raise ValueError(f"Expected feature matrix of shape (N, 7), got {features.shape}")

        residuals = features.copy().astype(np.float32)
        code_matrix = []

        for level in range(self.n_levels):
            kmeans = self.codebooks[level]
            labels = kmeans.predict(residuals)
            code_matrix.append(labels)

            centroids = kmeans.cluster_centers_[labels]
            residuals = residuals - centroids

        # Shape (N, n_levels) with integers in [0, n_clusters-1]
        return np.column_stack(code_matrix).astype(np.int32)

    def format_sid(self, code_tuple: Sequence[int]) -> str:
        """
        Format a code sequence into standard string: SID-XX-YY-ZZ-WW
        """
        if len(code_tuple) != self.n_levels:
            raise ValueError(f"Expected code tuple of length {self.n_levels}, got {len(code_tuple)}")
        return "SID-" + "-".join(f"{int(c):02d}" for c in code_tuple)

    def batch_format(self, codes: np.ndarray) -> list[str]:
        """
        Convert matrix of shape (N, n_levels) to list of formatted SID strings.
        """
        return [self.format_sid(row) for row in codes]

    @staticmethod
    def decode_sid(sid_string: str) -> tuple[int, ...]:
        """
        Decode formatted string 'SID-03-17-09-24' back into integer tuple (3, 17, 9, 24).
        """
        if not SID_PATTERN.match(sid_string):
            raise ValueError(f"Invalid Semantic ID format: '{sid_string}'. Expected format 'SID-XX-YY-ZZ-WW'.")
        parts = sid_string.split("-")[1:]
        return tuple(int(p) for p in parts)

    def save(self, file_path: str | Path) -> None:
        """Serialize codebooks to disk."""
        if not self.is_fitted:
            raise RuntimeError("Cannot save an un-fitted SemanticIDGenerator.")
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "n_levels": self.n_levels,
            "n_clusters": self.n_clusters,
            "random_state": self.random_state,
            "codebooks": self.codebooks
        }, path)

    @classmethod
    def load(cls, file_path: str | Path) -> SemanticIDGenerator:
        """Deserialize codebooks from disk."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Semantic ID model file not found at: {path}")
        data = joblib.load(path)
        instance = cls(
            n_levels=data["n_levels"],
            n_clusters=data["n_clusters"],
            random_state=data["random_state"]
        )
        instance.codebooks = data["codebooks"]
        instance.is_fitted = True
        return instance
