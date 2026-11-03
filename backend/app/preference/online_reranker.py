"""
Tier 1: Online Preference Centroid Re-Ranker.
Conforms strictly to specs/SPEC_04_PREFERENCE_FLYWHEEL_AND_DPO.md.
"""

from __future__ import annotations

import json
from typing import Any
import numpy as np

from backend.app.core.embeddings import EmbeddingEngine
from backend.app.preference.store import PreferenceStore


class OnlinePreferenceReranker:
    """
    Maintains running positive and negative user taste centroids.
    Dynamically adjusts candidate scores based on user feedback (Save/Skip/Replay).
    """

    def __init__(self, store: PreferenceStore, gamma: float = 0.35, alpha: float = 0.15, beta: float = 0.15):
        self.store = store
        self.gamma = gamma    # Exponential moving average update rate
        self.alpha = alpha    # Positive centroid boost multiplier
        self.beta = beta      # Negative centroid penalty multiplier

        # In-memory centroid cache: user_id -> {"pos": np.ndarray | None, "neg": np.ndarray | None}
        self.centroids: dict[str, dict[str, np.ndarray | None]] = {}

    def _get_user_centroids(self, user_id: str) -> dict[str, np.ndarray | None]:
        if user_id not in self.centroids:
            self.centroids[user_id] = {"pos": None, "neg": None}
        return self.centroids[user_id]

    def update_from_action(
        self,
        user_id: str,
        track_embedding: np.ndarray,
        action: str
    ) -> None:
        """
        Update user's positive or negative taste centroid based on interaction.
        """
        act = action.lower().strip()
        vec = track_embedding.flatten().astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        user_c = self._get_user_centroids(user_id)

        if act in ["save", "replay"]:
            if user_c["pos"] is None:
                user_c["pos"] = vec.copy()
            else:
                updated = (1.0 - self.gamma) * user_c["pos"] + self.gamma * vec
                u_norm = np.linalg.norm(updated)
                user_c["pos"] = updated / u_norm if u_norm > 0 else updated

        elif act == "skip":
            if user_c["neg"] is None:
                user_c["neg"] = vec.copy()
            else:
                updated = (1.0 - self.gamma) * user_c["neg"] + self.gamma * vec
                u_norm = np.linalg.norm(updated)
                user_c["neg"] = updated / u_norm if u_norm > 0 else updated

    def rerank(
        self,
        candidates: list[dict[str, Any]],
        user_id: str,
        embedder: EmbeddingEngine
    ) -> list[dict[str, Any]]:
        """
        Apply real-time centroid bias to candidate recommendations.
        S_final = S_base + alpha * cos(track, C_pos) - beta * cos(track, C_neg)
        """
        if not candidates:
            return []

        user_c = self._get_user_centroids(user_id)
        pos_centroid = user_c["pos"]
        neg_centroid = user_c["neg"]

        # If no interactions yet, return unchanged
        if pos_centroid is None and neg_centroid is None:
            return list(candidates)

        descriptions = [c.get("description", "") for c in candidates]
        cand_vecs = embedder.encode_texts(descriptions)  # shape (N, dim)

        reranked = []
        for i, track in enumerate(candidates):
            t_vec = cand_vecs[i]
            base_score = float(track.get("score", 0.5))

            pos_bonus = 0.0
            if pos_centroid is not None:
                pos_bonus = float(np.dot(t_vec, pos_centroid)) * self.alpha

            neg_penalty = 0.0
            if neg_centroid is not None:
                neg_penalty = float(np.dot(t_vec, neg_centroid)) * self.beta

            final_score = round(float(np.clip(base_score + pos_bonus - neg_penalty, 0.01, 1.0)), 4)

            t_copy = dict(track)
            t_copy["base_score"] = base_score
            t_copy["score"] = final_score
            t_copy["preference_adjustment"] = round(pos_bonus - neg_penalty, 4)
            reranked.append(t_copy)

        # Re-sort descending by preference-adjusted score
        reranked.sort(key=lambda t: t.get("score", 0.0), reverse=True)
        return reranked
