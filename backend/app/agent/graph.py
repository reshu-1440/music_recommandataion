"""
LangGraph Recommender Graph Assembly.
Conforms strictly to specs/SPEC_03_LANGGRAPH_GEMINI_AGENT.md.
"""

from __future__ import annotations

from functools import partial
from langgraph.graph import StateGraph, START, END

from backend.app.agent.nodes import (
    parse_intent_node,
    retrieve_candidates_node,
    filter_node,
    rank_node,
    explain_node
)
from backend.app.agent.state import RecommenderState
from backend.app.config import settings
from backend.app.core.embeddings import EmbeddingEngine
from backend.app.core.vector_store import VectorStore

_CACHED_AGENT = None
_CACHED_STORE = None
_CACHED_EMBEDDER = None


def get_shared_resources() -> tuple[VectorStore, EmbeddingEngine]:
    """Load or return cached VectorStore and EmbeddingEngine."""
    global _CACHED_STORE, _CACHED_EMBEDDER

    if _CACHED_EMBEDDER is None:
        _CACHED_EMBEDDER = EmbeddingEngine(model_name=settings.embedding_model)

    if _CACHED_STORE is None:
        if settings.faiss_index_path.exists() and settings.faiss_metadata_path.exists():
            _CACHED_STORE = VectorStore.load(settings.faiss_index_path, settings.faiss_metadata_path)
        else:
            _CACHED_STORE = VectorStore(dimension=_CACHED_EMBEDDER.dimension)

    return _CACHED_STORE, _CACHED_EMBEDDER


def build_recommender_graph(
    vector_store: VectorStore | None = None,
    embedder: EmbeddingEngine | None = None
):
    """
    Construct and compile the LangGraph Recommender StateGraph.
    """
    if vector_store is None or embedder is None:
        store, emb = get_shared_resources()
        vector_store = vector_store or store
        embedder = embedder or emb

    workflow = StateGraph(RecommenderState)

    # 1. Register Nodes
    workflow.add_node("parse_intent", parse_intent_node)
    workflow.add_node(
        "retrieve_candidates",
        partial(retrieve_candidates_node, vector_store=vector_store, embedder=embedder)
    )
    workflow.add_node("filter_constraints", filter_node)
    workflow.add_node("rank_results", rank_node)
    workflow.add_node("generate_explanations", explain_node)

    # 2. Wire Linear Flow Edges
    workflow.add_edge(START, "parse_intent")
    workflow.add_edge("parse_intent", "retrieve_candidates")
    workflow.add_edge("retrieve_candidates", "filter_constraints")
    workflow.add_edge("filter_constraints", "rank_results")
    workflow.add_edge("rank_results", "generate_explanations")
    workflow.add_edge("generate_explanations", END)

    # 3. Compile Runnable
    return workflow.compile()


def get_recommender_agent():
    """Retrieve compiled singleton agent instance."""
    global _CACHED_AGENT
    if _CACHED_AGENT is None:
        _CACHED_AGENT = build_recommender_graph()
    return _CACHED_AGENT
