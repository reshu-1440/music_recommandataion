"""
FAISS Vector Store with Maximal Marginal Relevance (MMR) for GLIDE Discovery.
Conforms strictly to specs/SPEC_02_VECTOR_STORE_AND_GLIDE.md.
"""

from __future__ import annotations

import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import faiss

from pathlib import Path
from typing import Any
import joblib
import numpy as np


class VectorStore:
    """
    FAISS-backed vector store utilizing IndexFlatIP (Cosine Inner Product).
    Supports Maximal Marginal Relevance (MMR) for GLIDE non-habitual diversity switching:
      - lambda_param = 1.0 -> Familiar Mode (pure relevance)
      - lambda_param = 0.45 -> Explore Mode (serendipitous discovery)
    """

    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)
        self.metadata: list[dict[str, Any]] = []

    def __len__(self) -> int:
        return self.index.ntotal

    def add(self, embeddings: np.ndarray, metadata: list[dict[str, Any]]) -> None:
        """
        Add L2-normalized embeddings and corresponding track metadata to the index.
        """
        if embeddings.ndim != 2 or embeddings.shape[1] != self.dimension:
            raise ValueError(f"Expected embeddings of shape (N, {self.dimension}), got {embeddings.shape}")
        if len(embeddings) != len(metadata):
            raise ValueError(f"Number of embeddings ({len(embeddings)}) must match metadata length ({len(metadata)})")

        import faiss
        vectors = embeddings.astype(np.float32).copy()
        faiss.normalize_L2(vectors)

        self.index.add(vectors)
        self.metadata.extend(metadata)

    def search(
        self,
        query_embedding: np.ndarray,
        k: int = 10,
        lambda_param: float = 1.0
    ) -> list[dict[str, Any]]:
        """
        Search for top-k recommendations with optional MMR diversity re-ranking.
        
        Args:
            query_embedding: Shape (1, dimension) or (dimension,) unit vector.
            k: Number of tracks to return.
            lambda_param: GLIDE parameter in [0.0, 1.0].
                         1.0 = Familiar (pure relevance)
                         0.45 = Explore (GLIDE non-habitual discovery)
        """
        if self.index.ntotal == 0:
            raise RuntimeError("Cannot search an empty VectorStore.")

        import faiss
        q = query_embedding.astype(np.float32).reshape(1, self.dimension).copy()
        faiss.normalize_L2(q)

        total_items = self.index.ntotal
        actual_k = min(k, total_items)

        # Familiar Mode: Standard Top-K Cosine Search
        if lambda_param >= 0.99:
            scores, indices = self.index.search(q, actual_k)
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx >= 0:
                    item = dict(self.metadata[idx])
                    item["score"] = float(score)
                    results.append(item)
            return results

        # Explore Mode: Maximal Marginal Relevance (MMR)
        # 1. Over-fetch candidate pool
        fetch_k = min(max(k * 5, 50), total_items)
        scores, indices = self.index.search(q, fetch_k)

        cand_indices = [idx for idx in indices[0] if idx >= 0]
        if not cand_indices:
            return []

        # 2. Extract candidate vectors from FAISS index
        cand_vectors = np.array([self.index.reconstruct(int(idx)) for idx in cand_indices], dtype=np.float32)
        q_vec = q[0]  # shape (dim,)

        # 3. Compute relevance: Cosine similarity between candidates and query
        rel_scores = cand_vectors @ q_vec  # shape (num_candidates,)

        selected_cand_idx: list[int] = []
        unselected_cand_idx = list(range(len(cand_indices)))

        # 4. Iterative MMR Selection
        while len(selected_cand_idx) < actual_k and unselected_cand_idx:
            if not selected_cand_idx:
                # First pick: Highest relevance
                best_idx = int(np.argmax(rel_scores))
                selected_cand_idx.append(best_idx)
                unselected_cand_idx.remove(best_idx)
            else:
                selected_vecs = cand_vectors[selected_cand_idx]  # (S, dim)
                unselected_vecs = cand_vectors[unselected_cand_idx]  # (U, dim)

                # Pairwise similarity between unselected candidates and already selected items
                sim_to_selected = unselected_vecs @ selected_vecs.T  # (U, S)
                max_sim_to_selected = np.max(sim_to_selected, axis=1)  # (U,)

                unselected_rel = rel_scores[unselected_cand_idx]  # (U,)

                # MMR Score formula: lambda * Rel - (1 - lambda) * MaxSim
                mmr_scores = (lambda_param * unselected_rel) - ((1.0 - lambda_param) * max_sim_to_selected)
                best_sub_idx = int(np.argmax(mmr_scores))

                chosen_cand_idx = unselected_cand_idx[best_sub_idx]
                selected_cand_idx.append(chosen_cand_idx)
                unselected_cand_idx.pop(best_sub_idx)

        # 5. Format results
        results = []
        for c_idx in selected_cand_idx:
            raw_idx = cand_indices[c_idx]
            item = dict(self.metadata[raw_idx])
            item["score"] = float(rel_scores[c_idx])
            results.append(item)

        return results

    def save(self, index_path: str | Path, meta_path: str | Path) -> None:
        """Persist FAISS index and metadata registry to disk."""
        idx_p = Path(index_path)
        meta_p = Path(meta_path)
        idx_p.parent.mkdir(parents=True, exist_ok=True)
        meta_p.parent.mkdir(parents=True, exist_ok=True)

        faiss.write_index(self.index, str(idx_p))
        joblib.dump(self.metadata, meta_p)

    @classmethod
    def load(cls, index_path: str | Path, meta_path: str | Path) -> VectorStore:
        """Load persisted FAISS index and metadata registry from disk."""
        idx_p = Path(index_path)
        meta_p = Path(meta_path)
        if not idx_p.exists():
            raise FileNotFoundError(f"FAISS index file not found at: {idx_p}")
        if not meta_p.exists():
            raise FileNotFoundError(f"Metadata file not found at: {meta_p}")

        index = faiss.read_index(str(idx_p))
        metadata = joblib.load(meta_p)

        store = cls(dimension=index.d)
        store.index = index
        store.metadata = metadata
        return store
