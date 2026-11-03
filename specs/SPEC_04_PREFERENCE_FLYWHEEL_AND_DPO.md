# Spec Document: Phase 4 — Two-Tier Preference Flywheel & DPO Pipeline

**Status:** APPROVED  
**Date:** 2026-11-03  
**Target Phase:** Phase 4  
**Inspiration:** Spotify AI Playlist (Skip/Save/Replay Preference Flywheel & DPO Alignment)

---

## 1. Overview & Context
Spotify's AI Playlist uses user feedback as implicit preference signals to align the recommendation agent. When users interact with a playlist, every action reflects contextual taste:
- **Save / Like**: Strong positive preference ($\text{weight} = +1.0$)
- **Replay**: Very strong positive preference ($\text{weight} = +1.5$)
- **Skip**: Negative preference ($\text{weight} = -1.0$)

To deliver both **immediate live interactivity** and **rigorous machine learning alignment**, we implement a **Two-Tier Architecture**:
1. **Tier 1 (Online Preference Flywheel)**: Real-time user taste centroids. Actions immediately update positive $\vec{C}_{\text{pos}}$ and negative $\vec{C}_{\text{neg}}$ embedding centroids, shifting scores dynamically on the subsequent search.
2. **Tier 2 (Offline DPO Triplet Mining & TRL Training)**: Mined $(x, y_w, y_l)$ triplets paired by query session, feeding an end-to-end Hugging Face `trl.DPOTrainer` script with LoRA and CPU dry-run verification.

---

## 2. Depends on
- Phase 1, 2, 3 (`VectorStore`, `EmbeddingEngine`, `backend/app/config.py`).
- Standard library: `sqlite3`.
- ML libraries: `transformers`, `torch`.

---

## 3. Database Schema (Pure SQLite, Parameterized, No ORMs)

Database file: `backend/data/preferences.db`

### Table A: `user_interactions`
Logs every granular listener action with timestamp and context.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | Unique interaction ID |
| `user_id` | `TEXT` | NOT NULL | User identifier (e.g. `user_default`) |
| `track_id` | `TEXT` | NOT NULL | Catalog track ID |
| `track_name` | `TEXT` | NOT NULL | Song title |
| `artists` | `TEXT` | NOT NULL | Artist name |
| `query` | `TEXT` | NOT NULL | The natural language prompt active when action occurred |
| `action` | `TEXT` | NOT NULL | `'save'` \| `'skip'` \| `'replay'` \| `'play'` |
| `weight` | `REAL` | NOT NULL | $+1.0$ (save), $+1.5$ (replay), $-1.0$ (skip), $+0.5$ (play) |
| `semantic_id` | `TEXT` | NOT NULL | Track Semantic ID |
| `created_at` | `TEXT` | NOT NULL | ISO-8601 UTC timestamp |

### Table B: `user_taste_profiles`
Maintains aggregated user telemetry and taste vectors.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | `TEXT` | PRIMARY KEY | User identifier |
| `save_count` | `INTEGER` | DEFAULT 0 | Total saves |
| `skip_count` | `INTEGER` | DEFAULT 0 | Total skips |
| `play_count` | `INTEGER` | DEFAULT 0 | Total plays |
| `pos_centroid_json` | `TEXT` | NULLABLE | JSON array of 384-dim positive taste centroid |
| `neg_centroid_json` | `TEXT` | NULLABLE | JSON array of 384-dim negative taste centroid |
| `updated_at` | `TEXT` | NOT NULL | Last update timestamp |

---

## 4. Mathematical Formulation

### Tier 1: Real-Time Centroid Taste Steering
Let $\vec{e}_i \in \mathbb{R}^{384}$ be the normalized embedding of track $i$.
The positive taste centroid $\vec{C}_{\text{pos}}$ and negative centroid $\vec{C}_{\text{neg}}$ are running exponential moving averages:
$$\vec{C}_{\text{pos}} \leftarrow \operatorname{Norm}\left( (1 - \gamma) \vec{C}_{\text{pos}} + \gamma \vec{e}_{\text{saved}} \right)$$
$$\vec{C}_{\text{neg}} \leftarrow \operatorname{Norm}\left( (1 - \gamma) \vec{C}_{\text{neg}} + \gamma \vec{e}_{\text{skipped}} \right)$$

When re-ranking candidate tracks for subsequent requests:
$$S_{\text{final}}(t) = S_{\text{base}}(t) + \alpha \cdot (\vec{e}_t \cdot \vec{C}_{\text{pos}}) - \beta \cdot (\vec{e}_t \cdot \vec{C}_{\text{neg}})$$
Where $\alpha = 0.15$, $\beta = 0.15$.

### Tier 2: DPO Loss Formulation
Triplets $(x, y_w, y_l)$ mined from user interaction sessions where:
- Prompt $x$: User's natural language request.
- Chosen $y_w$: Track title + artist + SID from Save/Replay action.
- Rejected $y_l$: Track title + artist + SID from Skip action.

The objective optimizes the Direct Preference policy:
$$\mathcal{L}_{\text{DPO}}(\pi_\theta; \pi_{\text{ref}}) = -\mathbb{E}_{(x, y_w, y_l)} \left[ \log \sigma \left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right]$$

---

## 5. Classes & Functions to Implement

### A. `backend/app/preference/store.py`
Class `PreferenceStore`:
- `__init__(self, db_path: str = "backend/data/preferences.db")`
- `init_db(self) -> None`: Creates `user_interactions` and `user_taste_profiles` with `CREATE TABLE IF NOT EXISTS`.
- `log_interaction(self, user_id: str, track: dict, query: str, action: str) -> dict`:
  - Validates action in `{"save", "skip", "replay", "play"}`.
  - Computes weight ($+1.0, +1.5, -1.0, +0.5$).
  - Inserts row using parameterized SQL.
  - Updates counter tallies in `user_taste_profiles`.
- `get_user_stats(self, user_id: str) -> dict`: Returns save/skip/play counts and feedback history.
- `get_recent_history(self, user_id: str, limit: int = 10) -> list[str]`: Human-readable history messages for Sonora UI.

### B. `backend/app/preference/online_reranker.py`
Class `OnlinePreferenceReranker`:
- `update_centroids(self, user_id: str, track_embedding: np.ndarray, action: str) -> None`:
  - Shifts positive or negative centroid.
- `rerank(self, candidates: list[dict], user_id: str, embedder: EmbeddingEngine) -> list[dict]`:
  - Applies centroid cosine similarity bias to candidate scores.

### C. `backend/app/preference/pair_miner.py`
Class `DPOPairMiner`:
- `mine_preference_pairs(self, user_id: str | None = None) -> list[dict]`:
  - Queries interactions grouped by session query.
  - Pairs saved/replayed tracks ($y_w$) with skipped tracks ($y_l$).
  - Returns list of `{"prompt": x, "chosen": y_w_text, "rejected": y_l_text}`.
- `export_dpo_jsonl(self, output_path: str) -> int`:
  - Serializes mined pairs to JSONL file.

### D. `backend/app/preference/dpo_trainer.py`
- `train_dpo_pipeline(dataset_path: str, output_dir: str, dry_run: bool = True) -> dict`:
  - Runs TRL `DPOTrainer` with PEFT LoRA, or simulates training loss step when in dry-run mode, returning training metrics (loss, rewards/margins, epochs).

---

## 6. Files to Create
1. `specs/SPEC_04_PREFERENCE_FLYWHEEL_AND_DPO.md`
2. `backend/app/preference/store.py`
3. `backend/app/preference/online_reranker.py`
4. `backend/app/preference/pair_miner.py`
5. `backend/app/preference/dpo_trainer.py`
6. `backend/tests/test_preference.py`
7. `backend/tests/test_dpo_pipeline.py`

---

## 7. Rules for Implementation
1. **Parameterized Queries Only**: Never concatenate SQL strings; always use `?` placeholders.
2. **Connection Safety**: Enable `PRAGMA foreign_keys = ON;` and use context managers for commits and rollbacks.
3. **Idempotent Tables**: Schema initialization must be safely repeatable without data loss.
4. **Dry-Run Readiness**: The DPO trainer must support `dry_run=True` to execute in seconds without GPU requirements during automated tests.

---

## 8. Definition of Done (Checklist)
- [ ] SQLite database initializes cleanly with both tables.
- [ ] Save, Replay, and Skip actions are correctly recorded and weighted.
- [ ] Online centroid steering visibly boosts saved genres and penalizes skipped genres.
- [ ] Pair miner successfully groups interactions into $(x, y_w, y_l)$ triplets.
- [ ] DPO trainer executes end-to-end and returns valid loss and metric logs.
- [ ] All unit tests in `backend/tests/test_preference.py` and `backend/tests/test_dpo_pipeline.py` pass.
