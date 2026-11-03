# Spec Document: Phase 5 — FastAPI Backend Endpoints

**Status:** APPROVED  
**Date:** 2026-11-03  
**Target Phase:** Phase 5  
**Inspiration:** REST API gateway powering Sonora's reactive UI tabs and player bar

---

## 1. Overview & Context
Phase 5 exposes the complete backend system (LangGraph agent, FAISS vector store, RQ-KMeans Semantic IDs, GLIDE controller, and Two-Tier DPO preference flywheel) via high-performance, asynchronous REST endpoints built with **FastAPI** and **Pydantic v2**.

This API directly serves Sonora's frontend:
1. `POST /api/recommend`: Translates natural language queries into ranked recommendations with intent dimensions and grounded explanations.
2. `POST /api/feedback`: Logs Save/Skip/Replay/Play interactions, instantly updating online taste centroids.
3. `GET /api/preferences/{user_id}`: Powers Sonora's "Preference signals" tab with interaction stats and activity history.
4. `GET /api/dpo/pairs`: Surfaces mined preference training pairs.
5. `POST /api/dpo/train`: Executes DPO training pipeline and returns loss convergence metrics.
6. `GET /api/health`: Healthcheck endpoint for service readiness.

---

## 2. Depends on
- Phase 1 (`SemanticIDGenerator`, `catalog_indexed.csv`)
- Phase 2 (`VectorStore`, `EmbeddingEngine`)
- Phase 3 (`get_recommender_agent`, `RecommenderState`)
- Phase 4 (`PreferenceStore`, `OnlinePreferenceReranker`, `DPOPairMiner`, `train_dpo_pipeline`)

---

## 3. Routes & API Specifications

### Route 1: `POST /api/recommend`
Generates language-steered music recommendations.

- **Request Body (`RecommendRequest`)**:
  ```json
  {
    "query": "something calm for a 3 a.m. study session",
    "discovery_mode": "familiar",   // "familiar" | "explore" (GLIDE switch)
    "user_id": "default_user",
    "limit": 8
  }
  ```
- **Response Body (`RecommendResponse`)**:
  ```json
  {
    "query": "something calm for a 3 a.m. study session",
    "discovery_mode": "familiar",
    "intent_dimensions": [
      {"label": "Calm", "sub": "Emotional tone"},
      {"label": "Low energy", "sub": "Energy profile (15%)"},
      {"label": "Acoustic", "sub": "Sonic texture"},
      {"label": "Late-night study", "sub": "Listening context"}
    ],
    "overall_reasoning": "Selected 8 tracks in Familiar for 'late-night study'.",
    "retrieval_snapshot": {
      "intent_id": "INT-CALM-01",
      "catalog_id": "CAT-1200",
      "ranking_mode": "Hybrid (Semantic + Preference)",
      "retrieval": "FAISS IndexFlatIP (Cosine) + GLIDE MMR"
    },
    "tracks": [
      {
        "track_id": "TRK-AMB-0001",
        "title": "Midnight Reverie",
        "artist": "Brian Eno",
        "album": "Nocturne Dreams",
        "genre": "Ambient · Minimal",
        "duration": "3:54",
        "duration_ms": 234000,
        "score": "98%",
        "semantic_id": "SID-04-13-04-21",
        "image": "photo-1470225620780-dba8ba36b745",
        "reason": "Minimal ambient arrangement with gentle acoustic dynamics (15% energy)...",
        "audio_features": {
          "energy": 0.15,
          "valence": 0.25,
          "acousticness": 0.90,
          "tempo": 72.0
        }
      }
    ]
  }
  ```

### Route 2: `POST /api/feedback`
Logs user interaction and updates Tier 1 taste centroids in real time.

- **Request Body (`FeedbackRequest`)**:
  ```json
  {
    "user_id": "default_user",
    "track_id": "TRK-AMB-0001",
    "track_name": "Midnight Reverie",
    "artists": "Brian Eno",
    "query": "calm study session",
    "action": "save",   // "save" | "skip" | "replay" | "play"
    "semantic_id": "SID-04-13-04-21"
  }
  ```
- **Response**: `{"status": "success", "action": "save", "weight": 1.0, "updated_stats": {...}}`

### Route 3: `GET /api/preferences/{user_id}`
Returns user's aggregate preference counters and feedback history.

### Route 4: `GET /api/dpo/pairs`
Returns list of mined $(x, y_w, y_l)$ triplets.

### Route 5: `POST /api/dpo/train`
Triggers DPO training run on accumulated preference data.

### Route 6: `GET /api/health`
Returns service status, total indexed catalog count, and embedding dimensions.

---

## 4. Classes & Files to Implement

1. `backend/app/models/schemas.py`: Pydantic v2 request & response schemas matching Sonora UI props.
2. `backend/app/main.py`: FastAPI application with CORS middleware, lifespan events, and routers.
3. `backend/tests/test_api.py`: Endpoint test suite using FastAPI `TestClient`.

---

## 5. Rules for Implementation
1. **CORS Headers**: Allow `http://localhost:5173` (Vite) and `http://localhost:3000` (Next.js) with `allow_origins`, `allow_methods=["*"]`, `allow_headers=["*"]`.
2. **Prop Compatibility with Sonora**: Track objects returned by `/api/recommend` must contain the exact fields expected by Sonora's `TrackCard`: `id` (or `semantic_id`), `title`, `artist`, `genre`, `duration`, `score`, `reason`, `image`.
3. **Graceful Startup**: Lifespan handler ensures shared VectorStore, EmbeddingEngine, and PreferenceStore are initialized once on startup.

---

## 6. Definition of Done (Checklist)
- [ ] Pydantic v2 schemas defined and validated.
- [ ] FastAPI application starts up cleanly with all 6 endpoints.
- [ ] `POST /api/recommend` returns properly formatted tracks matching Sonora frontend expectations.
- [ ] `POST /api/feedback` updates SQLite and triggers real-time centroid bias.
- [ ] All unit and integration tests in `backend/tests/test_api.py` pass.
