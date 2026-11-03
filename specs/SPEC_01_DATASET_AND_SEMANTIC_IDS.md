# Spec Document: Phase 1 — Kaggle Dataset & Hierarchical Semantic IDs (RQ-KMeans)

**Status:** APPROVED  
**Date:** 2026-11-03  
**Target Phase:** Phase 1  
**Inspiration:** Spotify NEO (Unified catalog tokenization using discrete Semantic IDs)

---

## 1. Overview & Context
In Spotify's NEO architecture, catalog items are not represented by arbitrary database identifiers (e.g., `track_98124`) because random IDs convey zero semantic or acoustic meaning to language models. Instead, NEO maps each track into a sequence of discrete tokens called **Semantic IDs** (SIDs) using vector quantization (RQ-VAE or RQ-KMeans).

This phase establishes:
1. The **Kaggle Spotify Tracks Dataset** ingestion pipeline, providing rich audio features and metadata across diverse genres.
2. The **Hierarchical RQ-KMeans Quantizer**, converting continuous psychoacoustic feature vectors into hierarchical 4-level discrete tokens formatted as `SID-XX-YY-ZZ-WW`.

Tracks with similar acoustic properties (e.g. calm ambient vs. high-energy techno) naturally share token prefixes (e.g., `SID-03-17-...`), providing the discrete vocabulary needed for the LLM agent and vector retriever.

---

## 2. Depends on
- Nothing (Initial foundation phase).
- Requires Python 3.10+, `numpy`, `pandas`, `scikit-learn`, `joblib`.

---

## 3. Data Schema & Feature Vectorization

### A. Kaggle Track Schema (`backend/data/kaggle_spotify_tracks.csv`)
Each record in the dataset adheres to the standardized Spotify audio features schema:

| Column | Type | Description |
|---|---|---|
| `track_id` | `TEXT` | Unique Spotify track string (e.g. `4bHsxqR3GMrXTxEPLuZo5x`) |
| `artists` | `TEXT` | Primary and featured artists |
| `album_name` | `TEXT` | Album or EP title |
| `track_name` | `TEXT` | Track title |
| `popularity` | `INTEGER` | Popularity score (0–100) |
| `duration_ms` | `INTEGER` | Duration in milliseconds |
| `danceability` | `REAL` | Suitability for dancing (0.0–1.0) |
| `energy` | `REAL` | Perceptual measure of intensity (0.0–1.0) |
| `valence` | `REAL` | Musical positiveness/mood (0.0–1.0: sad/calm to happy/euphoric) |
| `acousticness` | `REAL` | Confidence measure of acoustic nature (0.0–1.0) |
| `instrumentalness` | `REAL` | Likelihood of having no vocals (0.0–1.0) |
| `speechiness` | `REAL` | Presence of spoken words (0.0–1.0) |
| `liveness` | `REAL` | Audience presence in recording (0.0–1.0) |
| `tempo` | `REAL` | Estimated tempo in beats per minute (BPM, e.g. 50–220) |
| `loudness` | `REAL` | Overall loudness in decibels (dB, e.g. -60 to 0) |
| `track_genre` | `TEXT` | Primary genre category (e.g. `ambient`, `classical`, `electronic`, `indie`, `rock`) |
| `description` | `TEXT` | Rich text representation for embedding (title + artist + genre + mood narrative) |

### B. Quantization Feature Vector
For Semantic ID clustering, each track is mapped to a continuous 7-dimensional normalized vector:
$$x = [\text{danceability}, \text{energy}, \text{valence}, \text{acousticness}, \text{instrumentalness}, \text{tempo\_norm}, \text{loudness\_norm}]$$
Where:
- $\text{tempo\_norm} = \frac{\text{tempo} - 50}{150}$ clipped to $[0.0, 1.0]$
- $\text{loudness\_norm} = \frac{\text{loudness} - (-60)}{60}$ clipped to $[0.0, 1.0]$

---

## 4. Mathematical Formulation (RQ-KMeans)

Residual Quantization via K-Means applies iterative clustering to the residual errors of preceding levels:

1. **Level 1 (Macro Genre/Acoustic Profile)**:
   $$c_1 = \arg\min_{c \in C_1} \|x - c\|^2, \quad \text{token}_1 = \text{index}(c_1), \quad r_1 = x - c_1$$
2. **Level 2 (Sub-Genre / Texture)**:
   $$c_2 = \arg\min_{c \in C_2} \|r_1 - c\|^2, \quad \text{token}_2 = \text{index}(c_2), \quad r_2 = r_1 - c_2$$
3. **Level 3 (Mood / Sonic Nuance)**:
   $$c_3 = \arg\min_{c \in C_3} \|r_2 - c\|^2, \quad \text{token}_3 = \text{index}(c_3), \quad r_3 = r_2 - c_3$$
4. **Level 4 (Fine-Grained Discrimination)**:
   $$c_4 = \arg\min_{c \in C_4} \|r_3 - c\|^2, \quad \text{token}_4 = \text{index}(c_4)$$

- **Hyperparameters**:
  - Number of hierarchy levels: $L = 4$
  - Number of codebook clusters per level: $K = 32$
  - Resulting Code: 4 discrete integers in $[0, 31]$, formatted as `SID-XX-YY-ZZ-WW` (zero-padded, e.g. `SID-03-17-09-24`).

---

## 5. Classes & Functions to Implement

### A. `backend/app/scripts/download_or_seed_dataset.py`
- `seed_curated_kaggle_dataset(output_path: str, n_samples: int = 1200) -> pd.DataFrame`:
  - Generates a high-fidelity synthetic catalog strictly conforming to the Kaggle Spotify tracks schema across 20+ distinct genres (`ambient`, `chill`, `classical`, `deep-house`, `indie`, `jazz`, `lo-fi`, `metal`, `piano`, `pop`, `post-rock`, `r-n-b`, `rock`, etc.).
  - Calculates realistic audio features, duration, popularity, and rich narrative descriptions suitable for text embeddings.
  - Automatically exports to `backend/data/kaggle_spotify_tracks.csv`.
- `load_or_fetch_dataset(data_path: str) -> pd.DataFrame`:
  - Checks if file exists; if not, triggers seed generation automatically.

### B. `backend/app/core/semantic_ids.py`
Class `SemanticIDGenerator`:
- `__init__(self, n_levels: int = 4, n_clusters: int = 32, random_state: int = 42)`
- `extract_features(self, df: pd.DataFrame) -> np.ndarray`:
  - Extracts the 7 normalized audio features into a `float32` matrix of shape $(N, 7)$.
- `fit(self, features: np.ndarray) -> "SemanticIDGenerator"`:
  - Iteratively fits $L$ K-Means codebooks on residual vectors.
- `encode(self, features: np.ndarray) -> np.ndarray`:
  - Returns integer matrix of shape $(N, L)$ representing codebook indices.
- `format_sid(self, code_tuple: Sequence[int]) -> str`:
  - Converts integer tuple `(3, 17, 9, 24)` to string `"SID-03-17-09-24"`.
- `batch_format(self, codes: np.ndarray) -> list[str]`:
  - Formats all rows into SID strings.
- `save(self, file_path: str) -> None`:
  - Persists codebook models using `joblib`.
- `load(self, file_path: str) -> "SemanticIDGenerator"`:
  - Loads fitted codebook models.

---

## 6. Files to Create
1. `backend/requirements.txt` — Core backend dependencies.
2. `backend/app/scripts/download_or_seed_dataset.py` — Kaggle dataset loader/seeder.
3. `backend/app/core/semantic_ids.py` — RQ-KMeans Semantic ID engine.
4. `backend/tests/test_semantic_ids.py` — Unit tests.

---

## 7. Dependencies
- `numpy>=1.26.0`
- `pandas>=2.2.0`
- `scikit-learn>=1.5.0`
- `joblib>=1.4.0`
- `pytest>=8.3.0`

---

## 8. Rules for Implementation
1. **Deterministic Execution**: Always set `random_state=42` in `KMeans` to ensure identical SIDs across runs.
2. **Missing & Extreme Values**: Clean inputs; replace any `NaN` values with feature medians; clamp normalized ranges to $[0.0, 1.0]$.
3. **Format Guarantee**: SIDs must strictly match regex `^SID-\d{2}-\d{2}-\d{2}-\d{2}$`.
4. **Serialization Safety**: Ensure codebook models can be serialized and deserialized with bitwise identical outputs on new runs.

---

## 9. Expected Behavior
- Calling `download_or_seed_dataset.py` produces `backend/data/kaggle_spotify_tracks.csv` containing $\ge 1,000$ valid tracks with all 17 schema columns.
- Fitting `SemanticIDGenerator` on the dataset produces 4 fitted KMeans codebooks.
- Acoustically close tracks (e.g. ambient study songs with energy $< 0.2$ and acousticness $> 0.8$) share identical Level 1 cluster tokens (`SID-03-...`).
- High-energy rock/metal tracks get distinct Level 1 tokens (e.g. `SID-28-...`).

---

## 10. Error Handling Expectations
- Attempting to call `encode()` before `fit()` raises a descriptive `RuntimeError("SemanticIDGenerator must be fitted before encoding.")`.
- Missing columns in input dataframe raises `ValueError` specifying the missing columns.
- Feature vectors with incorrect dimensions raise `ValueError`.

---

## 11. Definition of Done (Checklist)
- [ ] `backend/requirements.txt` created and dependencies installed.
- [ ] `backend/app/scripts/download_or_seed_dataset.py` creates `backend/data/kaggle_spotify_tracks.csv` with $\ge 1,000$ tracks.
- [ ] `backend/app/core/semantic_ids.py` passes all unit tests in `backend/tests/test_semantic_ids.py`:
  - [ ] Test codebook fitting and residual convergence.
  - [ ] Test SID string formatting and regex validation (`^SID-\d{2}-\d{2}-\d{2}-\d{2}$`).
  - [ ] Test acoustic locality: songs with similar features share Level 1 prefix.
  - [ ] Test model save/load round-trip determinism.
  - [ ] Test un-fitted error handling and invalid input rejection.
