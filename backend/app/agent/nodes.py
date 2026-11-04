"""
LangGraph Agent Nodes for Sonora Music Discovery.
Conforms strictly to specs/SPEC_03_LANGGRAPH_GEMINI_AGENT.md.
"""

from __future__ import annotations

import logging
from typing import Any
from backend.app.agent.prompts import (
    INTENT_PARSER_SYSTEM_PROMPT,
    EXPLANATION_SYSTEM_PROMPT,
    extract_json_from_llm_response,
    heuristic_intent_parser,
    heuristic_explainer
)
from backend.app.agent.state import RecommenderState
from backend.app.config import settings
from backend.app.core.embeddings import EmbeddingEngine
from backend.app.core.vector_store import VectorStore

logger = logging.getLogger(__name__)


def get_gemini_client():
    """Lazily construct Gemini chat model if API key is present."""
    if not settings.gemini_api_key:
        return None
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            temperature=0.2,
            timeout=settings.gemini_timeout,
            max_retries=settings.gemini_max_retries
        )
    except Exception as e:
        logger.warning(f"Failed to initialize ChatGoogleGenerativeAI: {e}")
        return None


def parse_intent_node(state: RecommenderState) -> dict[str, Any]:
    """
    Node 1: Extract mood, bounds, context, and enriched query via Gemini or fallback.
    Respects client-side pre-parsed intent from WebLLM if already provided.
    """
    query = state.get("query", "").strip()
    if not query:
        query = "calm study music"

    # If client passed pre-parsed intent from WebLLM, use it directly
    if state.get("parsed_intent") and isinstance(state["parsed_intent"], dict) and len(state["parsed_intent"]) > 0:
        parsed_intent = state["parsed_intent"]
        dense_query = parsed_intent.get("dense_query", query)
        return {
            "parsed_intent": parsed_intent,
            "dense_query": dense_query
        }

    llm = get_gemini_client()
    parsed_intent = None

    if llm is not None:
        try:
            prompt = f"{INTENT_PARSER_SYSTEM_PROMPT}\n\nUser Request: \"{query}\"\nJSON:"
            response = llm.invoke(prompt)
            parsed_intent = extract_json_from_llm_response(response.content)
        except Exception as exc:
            logger.warning(f"Gemini intent parsing failed, using heuristic: {exc}")

    if not parsed_intent or not isinstance(parsed_intent, dict):
        parsed_intent = heuristic_intent_parser(query)

    dense_query = parsed_intent.get("dense_query", query)
    return {
        "parsed_intent": parsed_intent,
        "dense_query": dense_query
    }


def retrieve_candidates_node(
    state: RecommenderState,
    vector_store: VectorStore,
    embedder: EmbeddingEngine
) -> dict[str, Any]:
    """
    Node 2: Search FAISS vector store with GLIDE mode toggle.
    Familiar mode (lambda=1.0) vs Explore mode (lambda=0.45).
    """
    dense_query = state.get("dense_query") or state.get("query", "calm study")
    mode = state.get("discovery_mode", "familiar").lower()
    target_k = state.get("k", 8)

    # GLIDE exploration parameter
    lambda_param = settings.glide_explore_lambda if mode in ["explore", "non_habitual"] else settings.glide_familiar_lambda

    q_vec = embedder.encode_query(dense_query)
    fetch_count = max(target_k * 3, 20)
    candidates = vector_store.search(q_vec, k=fetch_count, lambda_param=lambda_param)

    return {"candidates": candidates}


def filter_node(state: RecommenderState) -> dict[str, Any]:
    """
    Node 3: Apply soft constraint scoring to candidates matching intent bounds.
    """
    candidates = state.get("candidates", [])
    intent = state.get("parsed_intent", {})

    energy_range = intent.get("energy_range", [0.0, 1.0])
    valence_range = intent.get("valence_range", [0.0, 1.0])
    acousticness_min = intent.get("acousticness_min", 0.0)
    preferred_genres = [g.lower() for g in intent.get("preferred_genres", [])]

    rescored_candidates = []
    for track in candidates:
        feats = track.get("audio_features", {})
        energy = feats.get("energy", 0.5)
        valence = feats.get("valence", 0.5)
        acousticness = feats.get("acousticness", 0.5)
        genre = track.get("track_genre", "").lower()

        bonus = 0.0
        # Energy match bonus & penalty
        if energy_range[0] <= energy <= energy_range[1]:
            bonus += 0.15
        elif energy > energy_range[1]:
            bonus -= min(0.25, (energy - energy_range[1]) * 0.5)
        elif energy < energy_range[0]:
            bonus -= min(0.20, (energy_range[0] - energy) * 0.4)

        # Valence match bonus & penalty
        if valence_range[0] <= valence <= valence_range[1]:
            bonus += 0.08
        elif valence > valence_range[1]:
            bonus -= min(0.15, (valence - valence_range[1]) * 0.3)

        # Acousticness threshold bonus
        if acousticness >= acousticness_min:
            bonus += 0.10
        elif acousticness_min > 0.0:
            bonus -= min(0.15, (acousticness_min - acousticness) * 0.3)

        # Genre affinity bonus
        if any(pg in genre for pg in preferred_genres):
            bonus += 0.12

        track_copy = dict(track)
        track_copy["base_score"] = track.get("score", 0.5)
        track_copy["score"] = round(min(1.0, track_copy["base_score"] + bonus), 4)
        rescored_candidates.append(track_copy)

    return {"filtered_tracks": rescored_candidates}


def rank_node(state: RecommenderState) -> dict[str, Any]:
    """
    Node 4: Sort candidates by final score and truncate to top-k.
    """
    tracks = state.get("filtered_tracks") or state.get("candidates", [])
    target_k = state.get("k", 8)

    # Sort descending by score
    sorted_tracks = sorted(tracks, key=lambda t: t.get("score", 0.0), reverse=True)
    return {"ranked_tracks": sorted_tracks[:target_k]}


def explain_node(state: RecommenderState) -> dict[str, Any]:
    """
    Node 5: Generate grounded explanations referencing query scenario, traits, and Semantic ID.
    """
    ranked_tracks = state.get("ranked_tracks", [])
    intent = state.get("parsed_intent", {})
    query = state.get("query", "")

    llm = get_gemini_client()
    explanations_map: dict[str, str] = {}

    if llm is not None and ranked_tracks:
        try:
            # Batch prompt for all tracks
            track_summaries = [
                {
                    "track_id": t["track_id"],
                    "track_name": t["track_name"],
                    "artists": t["artists"],
                    "genre": t.get("track_genre"),
                    "semantic_id": t.get("semantic_id"),
                    "energy": t.get("audio_features", {}).get("energy"),
                    "tempo": t.get("audio_features", {}).get("tempo")
                }
                for t in ranked_tracks
            ]
            prompt = (
                f"{EXPLANATION_SYSTEM_PROMPT}\n\n"
                f"User Request: \"{query}\"\n"
                f"Listening Context: {intent.get('listening_context')}\n"
                f"Tracks to Explain:\n{track_summaries}\n\n"
                f"JSON Array:"
            )
            response = llm.invoke(prompt)
            data = extract_json_from_llm_response(response.content)
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and "track_id" in item and "explanation" in item:
                        explanations_map[item["track_id"]] = item["explanation"]
        except Exception as exc:
            logger.warning(f"Gemini batch explanation generation failed: {exc}")

    # Attach explanations to track dicts (falling back to heuristic if missing)
    explained_tracks = []
    for track in ranked_tracks:
        t_copy = dict(track)
        t_id = track.get("track_id", "")
        if t_id in explanations_map:
            t_copy["explanation"] = explanations_map[t_id]
        else:
            t_copy["explanation"] = heuristic_explainer(track, intent, query)
        explained_tracks.append(t_copy)

    # Synthesize overall reasoning for "Why these?" panel
    context = intent.get("listening_context", "your current listening mood")
    mode_label = "Familiar" if state.get("discovery_mode", "familiar") == "familiar" else "Explore (GLIDE Mode)"
    overall_reasoning = (
        f"Selected {len(explained_tracks)} tracks in {mode_label} for '{context}'. "
        f"Filtered by acoustic bounds ({intent.get('energy_range', [0, 1])[0]:.0%}-{intent.get('energy_range', [0, 1])[1]:.0%} energy) "
        f"and clustered by Semantic ID fingerprints."
    )

    return {
        "ranked_tracks": explained_tracks,
        "overall_reasoning": overall_reasoning
    }
