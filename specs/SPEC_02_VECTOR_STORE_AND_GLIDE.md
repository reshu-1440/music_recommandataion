# Spec Document: Phase 2 — Vector Store & GLIDE Non-Habitual Retrieval

**Status:** APPROVED  
**Date:** 2026-11-03  
**Target Phase:** Phase 2  
**Inspiration:** Spotify GLIDE (1B parameter discovery model for "non-habitual" listening) & FAISS Vector Search

---

## 1. Overview & Context
Spotify GLIDE was specifically designed to overcome the "habit loop"—a common flaw where recommendation algorithms continually serve familiar comfort-zone content, causing user fatigue. GLIDE introduces a mechanism to surface "non-habitual" tracks outside a user's regular rotation without violating their contextual mood.

In Phase 2, we implement:
1. **Dense Vector Embeddings** using `sentence-transformers/all-MiniLM-L6-v2` (384-dim, fast, highly semantic) mapping track descriptions and natural language prompts into a shared latent space.
2. **FAISS Vector Store** (`IndexFlatIP`) executing sub-millisecond cosine similarity search over normalized vectors.
3. **Maximal Marginal Relevance (MMR) Diversity Engine** serving as the core mathematical driver of the GLIDE switch:
   - **Familiar Mode ($\lambda = 1.0$)**: Exploitation — pure relevance matching.
   - **Explore Mode ($\lambda = 0.45$)**: Exploration — actively penalizes redundancy to surface serendipitous acoustic and genre variations.

---

## 2. Depends on
- Phase 1: `specs/SPEC_01_DATASET_AND_SEMANTIC_IDS.md`, `backend/data/kaggle_spotify_tracks.csv`, `backend/app/core/semantic_ids.py`.
- Libraries: `sentence-transformers`, `faiss-cpu`, `numpy`, `pandas`.

---

## 3. Data Schemas & Vector Representation

### A. Dense Track Representation
For each track in `kaggle_spotify_tracks.csv`, its `description` string is transformed into a dense embedding:
$$e = \operatorname{Encoder}(\text{description}) \in \mathbb{R}^{384}, \quad \text{normalized: } \|e\|_2 = 1.0$$

### B. FAISS Index Structure
- **Index Type**: `faiss.IndexFlatIP(384)` (Inner Product on unit vectors equals Cosine Similarity).
- **Index Mapping**: Row $i$ in FAISS correlates directly to row $i$ in `self.metadata: list[dict]`.

### C. Search Result Schema
```python
{
    "track_id": "TRK-AMB-0001",
    "track_name": "Ethereal Echo",
    "artists": "Brian Eno",
    "track_genre": "ambient",
    "semantic_id": "SID-03-17-09-24",
    "score": 0.892,
    "audio_features": {
        "energy": 0.12,
        "valence": 0.25,
        "acousticness": 0.94,
        "danceability": 0.22,
        "tempo": 68.0,
        "loudness": -21.4
    }
}
```

---

## 4. Mathematical Formulation (GLIDE Non-Habitual via MMR)

To dynamically toggle between familiar recommendations and serendipitous exploration, candidate selection utilizes **Maximal Marginal Relevance (MMR)**:

$$\operatorname{MMR}(q, D, R) = \operatorname{argmax}_{d_i \in D \setminus R} \left[ \lambda \cdot \operatorname{Sim}(d_i, q) - (1 - \lambda) \max_{d_j \in R} \operatorname{Sim}(d_i, d_j) \right]$$

Where:
- $q$: User's natural language query embedding (unit vector).
- $D$: Over-fetched candidate set from FAISS ($k_{\text{fetch}} = \max(k \times 5, 50)$).
- $R$: Currently selected recommendation set (initially empty).
- $\operatorname{Sim}(a, b) = a \cdot b$: Cosine similarity between unit vectors.
- $\lambda \in [0.0, 1.0]$: The **GLIDE Exploration Balance Parameter**:
  - $\lambda = 1.0$ (**Familiar Mode**): Maximize relevance to query. Zero penalty for redundant items.
  - $\lambda = 0.45$ (**Explore Mode**): Penalize items similar to already selected tracks, forcing genre, artist, and sonic diversity while keeping overall relevance high.

---

## 5. Classes & Functions to Implement

### A. `backend/app/core/embeddings.py`
Class `EmbeddingEngine`:
- `__init__(self, model_name: str = "all-MiniLM-L6-v2", device: str = "cpu")`
- `encode_texts(self, texts: list[str]) -> np.ndarray`:
  - Returns L2-normalized `float32` matrix of shape $(N, 384)$.
- `encode_query(self, query: str) -> np.ndarray`:
  - Returns L2-normalized `float32` vector of shape $(1, 384)$.

### B. `backend/app/core/vector_store.py`
Class `VectorStore`:
- `__init__(self, dimension: int = 384)`
- `add(self, embeddings: np.ndarray, metadata: list[dict]) -> None`:
  - Validates shapes, ensures float32 L2 normalization, adds to FAISS index, and appends to `self.metadata`.
- `search(self, query_embedding: np.ndarray, k: int = 10, lambda_param: float = 1.0) -> list[dict]`:
  - If $\lambda = 1.0$: standard top-$k$ FAISS search.
  - If $\lambda < 1.0$: executes MMR diversity re-ranking over candidate pool.
- `save(self, index_path: str | Path, meta_path: str | Path) -> None`:
  - Persists FAISS binary index and JSON/pickle metadata.
- `load(self, index_path: str | Path, meta_path: str | Path) -> "VectorStore"`:
  - Loads FAISS index and metadata.

### C. `backend/app/scripts/build_index.py`
- End-to-end index builder:
  1. Loads `backend/data/kaggle_spotify_tracks.csv`.
  2. Fits `SemanticIDGenerator` and attaches discrete `semantic_id` to all rows.
  3. Uses `EmbeddingEngine` to encode track descriptions into dense vectors.
  4. Builds `VectorStore` and saves `faiss_index.bin` and `sid_codebooks.pkl`.
  5. Exports fully annotated `backend/data/catalog_indexed.csv`.

---

## 6. Files to Create
1. `specs/SPEC_02_VECTOR_STORE_AND_GLIDE.md`
2. `backend/app/core/embeddings.py`
3. `backend/app/core/vector_store.py`
4. `backend/app/scripts/build_index.py`
5. `backend/tests/test_vector_store.py`

---

## 7. Rules for Implementation
1. **Unit Length Invariant**: All embeddings must be normalized with $\|v\|_2 = 1.0$ before addition or search to ensure Inner Product strictly matches Cosine Similarity.
2. **Dimension Matching**: Enforce 384-dimensional vectors; raise explicit errors on mismatched dimensions.
3. **Diversity Monotonicity**: Prove via automated test that intra-list pairwise similarity is lower under Explore mode ($\lambda = 0.45$) than Familiar mode ($\lambda = 1.0$).
4. **Zero Index-Metadata Drift**: Vector row $i$ must always point to metadata entry $i$.

---

## 8. Definition of Done (Checklist)
- [ ] `EmbeddingEngine` correctly loads `all-MiniLM-L6-v2` and produces L2-normalized vectors.
- [ ] `VectorStore` supports fast vector insertion and retrieval.
- [ ] MMR re-ranking empirically reduces intra-list similarity in Explore mode.
- [ ] `backend/app/scripts/build_index.py` executes cleanly, producing `faiss_index.bin`, `sid_codebooks.pkl`, and `catalog_indexed.csv`.
- [ ] All unit tests in `backend/tests/test_vector_store.py` pass.
