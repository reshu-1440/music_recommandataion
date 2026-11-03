"""
Sentence Transformer Embedding Engine.
Conforms strictly to specs/SPEC_02_VECTOR_STORE_AND_GLIDE.md.
"""

from __future__ import annotations

import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

import numpy as np


class EmbeddingEngine:
    """
    Dense text embedding engine using sentence-transformers.
    Defaults to all-MiniLM-L6-v2 (384 dimensions, fast inference on CPU).
    Guarantees L2-normalized unit vectors for exact cosine similarity in FAISS.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", device: str = "cpu"):
        self.model_name = model_name
        self.device = device
        self._model = None
        self.dimension: int = 384

    @property
    def model(self):
        """Lazy load SentenceTransformer model from local cache."""
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            try:
                # Prefer strictly local cache to avoid any network latency or timeouts
                self._model = SentenceTransformer(
                    self.model_name,
                    device=self.device,
                    local_files_only=True
                )
            except Exception:
                self._model = SentenceTransformer(
                    self.model_name,
                    device=self.device
                )

            if hasattr(self._model, "get_embedding_dimension"):
                self.dimension = self._model.get_embedding_dimension()
            else:
                self.dimension = self._model.get_sentence_embedding_dimension()

        return self._model

    def encode_texts(self, texts: list[str], batch_size: int = 64) -> np.ndarray:
        """
        Encode a list of text descriptions into L2-normalized dense embeddings.
        Returns shape (N, dimension) as float32.
        """
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)

        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embeddings.astype(np.float32)

    def encode_query(self, query: str) -> np.ndarray:
        """
        Encode a single natural language query string into an L2-normalized embedding.
        Returns shape (1, dimension) as float32.
        """
        if not query or not query.strip():
            # Return zero vector for empty query
            return np.zeros((1, self.dimension), dtype=np.float32)

        embedding = self.model.encode(
            [query.strip()],
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embedding.astype(np.float32)
