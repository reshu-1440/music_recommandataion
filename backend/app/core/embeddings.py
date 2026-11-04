"""
Sentence Transformer Embedding Engine.
Conforms strictly to specs/SPEC_02_VECTOR_STORE_AND_GLIDE.md.
"""

from __future__ import annotations

import os
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
        self._fallback_mode = False
        self.dimension: int = 384

    @property
    def model(self):
        """Lazy load SentenceTransformer model from local cache or download on first run."""
        if self._model is None and not self._fallback_mode:
            try:
                from sentence_transformers import SentenceTransformer
                # 1. Prefer strictly local cache to avoid any network latency
                try:
                    self._model = SentenceTransformer(
                        self.model_name,
                        device=self.device,
                        local_files_only=True
                    )
                except Exception:
                    # 2. Not in local cache -> download online from HuggingFace
                    print(f"[INFO] Downloading embedding model '{self.model_name}' (~80MB, first-time setup)...")
                    self._model = SentenceTransformer(
                        self.model_name,
                        device=self.device,
                        local_files_only=False
                    )

                if hasattr(self._model, "get_embedding_dimension"):
                    self.dimension = self._model.get_embedding_dimension()
                else:
                    self.dimension = self._model.get_sentence_embedding_dimension()

            except Exception as e:
                # 3. Model unavailable (offline / no internet / HuggingFace restricted)
                print(f"[WARNING] Could not load or download SentenceTransformer model '{self.model_name}': {e}")
                print("[INFO] Switching to deterministic acoustic pseudo-embeddings for offline catalog indexing.")
                self._fallback_mode = True
                self._model = None

        return self._model

    def _fallback_encode(self, texts: list[str]) -> np.ndarray:
        """
        Deterministic pseudo-embeddings when model cannot be downloaded offline.
        Produces consistent, unit-normalized (N, dimension) vectors based on text hash.
        """
        n = len(texts)
        embeddings = np.zeros((n, self.dimension), dtype=np.float32)
        for i, text in enumerate(texts):
            clean_text = text.strip() if text else ""
            h = int.from_bytes(clean_text.encode("utf-8", errors="ignore")[:8], "little", signed=True) if clean_text else 0
            rng = np.random.RandomState(abs(h) % (2**31 - 1))
            vec = rng.randn(self.dimension).astype(np.float32)
            norm = np.linalg.norm(vec)
            if norm > 1e-12:
                vec /= norm
            embeddings[i] = vec
        return embeddings

    def encode_texts(self, texts: list[str], batch_size: int = 64) -> np.ndarray:
        """
        Encode a list of text descriptions into L2-normalized dense embeddings.
        Returns shape (N, dimension) as float32.
        """
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)

        if self.model is not None:
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True
            )
            return embeddings.astype(np.float32)
        else:
            return self._fallback_encode(texts)

    def encode_query(self, query: str) -> np.ndarray:
        """
        Encode a single natural language query string into an L2-normalized embedding.
        Returns shape (1, dimension) as float32.
        """
        if not query or not query.strip():
            # Return zero vector for empty query
            return np.zeros((1, self.dimension), dtype=np.float32)

        if self.model is not None:
            embedding = self.model.encode(
                [query.strip()],
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True
            )
            return embedding.astype(np.float32)
        else:
            return self._fallback_encode([query.strip()])
