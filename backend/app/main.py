"""
FastAPI Main Application for Sonora Music Discovery.
Conforms strictly to specs/SPEC_05_FASTAPI_BACKEND_API.md.
"""

from __future__ import annotations

import os
# Force offline mode for model caches to prevent network stalling in sandboxed environments
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# Crucial: Import faiss before PyTorch / SentenceTransformers on Windows to avoid OpenMP handle conflict
import faiss

from pathlib import Path
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.app.agent.graph import build_recommender_graph
from backend.app.config import settings
from backend.app.core.embeddings import EmbeddingEngine
from backend.app.core.vector_store import VectorStore
from backend.app.models.schemas import (
    AudioFeaturesModel,
    DPOTrainRequest,
    DPOTrainResponse,
    FeedbackRequest,
    FeedbackResponse,
    IntentDimensionItem,
    RecommendRequest,
    RecommendResponse,
    RetrievalSnapshotModel,
    TrackCardResponse,
    UserPreferenceStatsResponse
)
from backend.app.preference.dpo_trainer import train_dpo_pipeline
from backend.app.preference.online_reranker import OnlinePreferenceReranker
from backend.app.preference.pair_miner import DPOPairMiner
from backend.app.preference.store import PreferenceStore

# Global State Container
state: dict[str, Any] = {}

# Curated Unsplash artwork IDs for diverse musical genres
GENRE_ARTWORK = {
    "ambient": "photo-1470225620780-dba8ba36b745",
    "lo-fi": "photo-1518837695005-2083093ee35b",
    "classical": "photo-1519681393784-d120267933ba",
    "piano": "photo-1500530855697-b586d89ba3ee",
    "indie": "photo-1470252649378-9c29740c9fa8",
    "electronic": "photo-1519608487953-e999c86e7455",
    "deep-house": "photo-1478720568477-152d9b164e26",
    "post-rock": "photo-1470770841072-f978cf4d019e",
    "synthwave": "photo-1509198397868-475647b2a1e5",
    "jazz": "photo-1511671782779-c97d3d27a1d4",
    "rock": "photo-1464375117522-1311d6a5b81f",
    "metal": "photo-1514525253161-7a46d19cd819",
    "pop": "photo-1516450360452-9312f5e86fc7",
    "r-n-b": "photo-1493225457124-a3eb161ffa5f",
    "soul": "photo-1459749411175-04bf5292ceea",
    "folk": "photo-1445985543468-79496ba88218",
    "reggae": "photo-1501386761578-eac5c94b800a",
    "chill": "photo-1498038432885-c6f3f1b912ee"
}


def ms_to_time_str(ms: int) -> str:
    """Format milliseconds into MM:SS string."""
    seconds = max(0, ms // 1000)
    minutes = seconds // 60
    rem_sec = seconds % 60
    return f"{minutes}:{rem_sec:02d}"


def init_app_state():
    """Synchronous initialization of backend components."""
    if "agent" not in state:
        embedder = EmbeddingEngine(model_name=settings.embedding_model)

        if settings.faiss_index_path.exists() and settings.faiss_metadata_path.exists():
            vector_store = VectorStore.load(settings.faiss_index_path, settings.faiss_metadata_path)
        else:
            vector_store = VectorStore(dimension=embedder.dimension)

        pref_store = PreferenceStore(db_path=settings.preferences_db_path)
        online_reranker = OnlinePreferenceReranker(pref_store)
        pair_miner = DPOPairMiner(pref_store)
        agent = build_recommender_graph(vector_store=vector_store, embedder=embedder)

        state["embedder"] = embedder
        state["vector_store"] = vector_store
        state["pref_store"] = pref_store
        state["online_reranker"] = online_reranker
        state["pair_miner"] = pair_miner
        state["agent"] = agent


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Language-Steerable Music Discovery API with Semantic IDs & DPO Flywheel"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/api/health")
def health_check():
    """Health status and index telemetry."""
    init_app_state()
    vstore = state.get("vector_store")
    return {
        "status": "healthy",
        "api": settings.api_title,
        "version": settings.api_version,
        "indexed_tracks": len(vstore) if vstore is not None else 0,
        "embedding_model": settings.embedding_model,
        "gemini_active": bool(settings.gemini_api_key)
    }


@app.post("/api/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    """
    Language-steerable recommendation endpoint.
    Translates natural-language intent into Semantic IDs and grounded explanations.
    """
    init_app_state()
    agent = state.get("agent")
    reranker: OnlinePreferenceReranker = state.get("online_reranker")
    embedder: EmbeddingEngine = state.get("embedder")

    if not agent:
        raise HTTPException(status_code=500, detail="Recommender agent is not initialized.")

    # 1. Execute LangGraph recommendation graph
    initial_state = {
        "query": req.query,
        "discovery_mode": req.discovery_mode,
        "user_id": req.user_id,
        "k": req.limit
    }
    result_state = agent.invoke(initial_state)

    ranked_tracks = result_state.get("ranked_tracks", [])
    parsed_intent = result_state.get("parsed_intent", {})
    overall_reasoning = result_state.get("overall_reasoning", "Recommended tracks matching your prompt.")

    # 2. Apply Tier 1 Online Preference Reranking if user has interactions
    if reranker and embedder and req.user_id:
        ranked_tracks = reranker.rerank(ranked_tracks, req.user_id, embedder)

    # 3. Format tracks to Sonora frontend TrackCard schema
    formatted_tracks = []
    for t in ranked_tracks:
        genre_key = t.get("track_genre", "ambient").lower()
        image_key = GENRE_ARTWORK.get(genre_key, "photo-1470225620780-dba8ba36b745")
        dur_ms = t.get("duration_ms", 230000)
        score_val = float(t.get("score", 0.90))

        feats_dict = t.get("audio_features", {})
        audio_feats = AudioFeaturesModel(
            energy=feats_dict.get("energy", 0.5),
            valence=feats_dict.get("valence", 0.5),
            acousticness=feats_dict.get("acousticness", 0.5),
            danceability=feats_dict.get("danceability", 0.5),
            instrumentalness=feats_dict.get("instrumentalness", 0.5),
            tempo=feats_dict.get("tempo", 120.0),
            loudness=feats_dict.get("loudness", -10.0)
        )

        formatted_tracks.append(TrackCardResponse(
            id=t.get("semantic_id", "SID-00-00-00-00"),
            track_id=t.get("track_id", "TRK-0000"),
            title=t.get("track_name") or t.get("title", "Unknown Track"),
            artist=t.get("artists") or t.get("artist", "Unknown Artist"),
            album=t.get("album_name") or t.get("album", "Single"),
            genre=f"{t.get('track_genre', 'Music').title()} · Curated",
            duration=ms_to_time_str(dur_ms),
            duration_ms=dur_ms,
            score=f"{int(score_val * 100)}%",
            numeric_score=score_val,
            semantic_id=t.get("semantic_id", "SID-00-00-00-00"),
            image=image_key,
            reason=t.get("explanation", "Matches requested mood and tempo."),
            audio_features=audio_feats
        ))

    # 4. Format intent dimensions for "Why these?" tab
    energy_val = parsed_intent.get("energy_range", [0.1, 0.4])
    intent_dims = [
        IntentDimensionItem(label=parsed_intent.get("mood", ["Calm"])[0].title(), sub="Emotional tone"),
        IntentDimensionItem(label=f"{int(energy_val[1] * 100)}% Max", sub="Energy profile"),
        IntentDimensionItem(label=parsed_intent.get("preferred_genres", ["Ambient"])[0].title(), sub="Genre affinity"),
        IntentDimensionItem(label=parsed_intent.get("listening_context", "Study session").title(), sub="Listening context")
    ]

    snapshot = RetrievalSnapshotModel(
        intent_id=f"INT-{parsed_intent.get('mood', ['REC'])[0][:3].upper()}-{len(formatted_tracks)}",
        catalog_id=f"CAT-{len(state.get('vector_store', []))}",
        ranking_mode="Hybrid (Semantic + Preference)" if req.discovery_mode == "familiar" else "GLIDE (MMR Exploratory)",
        retrieval="FAISS IndexFlatIP (Cosine) + Gemini Reasoning"
    )

    return RecommendResponse(
        query=req.query,
        discovery_mode=req.discovery_mode,
        tracks=formatted_tracks,
        intent_dimensions=intent_dims,
        overall_reasoning=overall_reasoning,
        retrieval_snapshot=snapshot
    )


@app.post("/api/feedback", response_model=FeedbackResponse)
def log_feedback(req: FeedbackRequest):
    """
    Log user Save, Skip, Replay, or Play feedback.
    Instantly updates Tier 1 online preference taste centroids.
    """
    init_app_state()
    pref_store: PreferenceStore = state.get("pref_store")
    reranker: OnlinePreferenceReranker = state.get("online_reranker")
    embedder: EmbeddingEngine = state.get("embedder")

    if not pref_store:
        raise HTTPException(status_code=500, detail="Preference store not initialized.")

    track_dict = {
        "track_id": req.track_id,
        "track_name": req.track_name,
        "artists": req.artists,
        "semantic_id": req.semantic_id
    }

    # Log to SQLite
    res = pref_store.log_interaction(
        user_id=req.user_id,
        track=track_dict,
        query=req.query,
        action=req.action
    )

    # Real-time online centroid update
    if reranker and embedder:
        track_text = f"{req.track_name} by {req.artists} (SID: {req.semantic_id})"
        vec = embedder.encode_query(track_text)
        reranker.update_from_action(req.user_id, vec, req.action)

    updated_stats = pref_store.get_user_stats(req.user_id)
    return FeedbackResponse(
        status="success",
        action=req.action,
        weight=res["weight"],
        track_id=req.track_id,
        user_id=req.user_id,
        updated_stats=updated_stats
    )


@app.get("/api/preferences/{user_id}", response_model=UserPreferenceStatsResponse)
def get_preferences(user_id: str):
    """Fetch user's preference counters and interaction history."""
    init_app_state()
    pref_store: PreferenceStore = state.get("pref_store")
    if not pref_store:
        raise HTTPException(status_code=500, detail="Preference store not initialized.")
    stats = pref_store.get_user_stats(user_id)
    return UserPreferenceStatsResponse(**stats)


@app.get("/api/dpo/pairs")
def get_dpo_pairs(user_id: str | None = None):
    """Retrieve mined DPO preference triplets (prompt, chosen, rejected)."""
    init_app_state()
    miner: DPOPairMiner = state.get("pair_miner")
    if not miner:
        raise HTTPException(status_code=500, detail="DPO Pair Miner not initialized.")
    pairs = miner.mine_preference_pairs(user_id)
    return {
        "total_pairs": len(pairs),
        "pairs": pairs
    }


@app.post("/api/dpo/train", response_model=DPOTrainResponse)
def trigger_dpo_training(req: DPOTrainRequest):
    """Execute DPO model fine-tuning on accumulated preference pairs."""
    init_app_state()
    miner: DPOPairMiner = state.get("pair_miner")
    if not miner:
        raise HTTPException(status_code=500, detail="DPO Pair Miner not initialized.")

    dataset_path = Path("backend/data/dpo_training_pairs.jsonl")
    count = miner.export_dpo_jsonl(dataset_path)

    if count == 0:
        return DPOTrainResponse(
            status="skipped",
            mode="dry_run",
            pairs_trained=0,
            epochs=req.epochs,
            beta=req.beta
        )

    out_dir = Path("backend/data/dpo_checkpoints")
    metrics = train_dpo_pipeline(
        dataset_path=dataset_path,
        output_dir=out_dir,
        epochs=req.epochs,
        beta=req.beta,
        dry_run=req.dry_run
    )
    return DPOTrainResponse(**metrics)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
