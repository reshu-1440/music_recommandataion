"""
LangGraph Recommender State Schema.
Conforms strictly to specs/SPEC_03_LANGGRAPH_GEMINI_AGENT.md.
"""

from __future__ import annotations

from typing import Any, TypedDict


class RecommenderState(TypedDict, total=False):
    """
    Mutable state dictionary flowing through the LangGraph agent pipeline.
    """
    # Inputs
    query: str                       # User's natural language music prompt
    discovery_mode: str              # "familiar" | "explore" (GLIDE toggle)
    user_id: str                     # Listener ID for personalization
    k: int                           # Target number of recommendations (default: 8)

    # Agent Internal Pipeline State
    parsed_intent: dict[str, Any]    # Structured mood, bounds, genre hints
    dense_query: str                 # Enriched query for FAISS embedding
    candidates: list[dict[str, Any]] # Raw FAISS retrieved tracks with Semantic IDs
    filtered_tracks: list[dict[str, Any]] # Soft-filtered tracks matching constraints
    ranked_tracks: list[dict[str, Any]]   # Final ranked tracks with explanations
    overall_reasoning: str           # Synthesized rationale for "Why these?" panel
