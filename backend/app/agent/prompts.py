"""
Gemini System Prompts and Grounded Fallback Parsers for the Sonora Music Agent.
Conforms strictly to specs/SPEC_03_LANGGRAPH_GEMINI_AGENT.md.
"""

from __future__ import annotations

import json
import re
from typing import Any

INTENT_PARSER_SYSTEM_PROMPT = """You are the Intent Parser for Sonora, a language-steerable music discovery engine inspired by Spotify NEO and GLIDE.

Analyze the user's natural-language music request and map it to a structured JSON object representing their acoustic and emotional preferences.

Output MUST be a single raw valid JSON object without markdown code blocks, conforming to this schema:
{
  "mood": ["string", "string", "string"],
  "energy_range": [float, float],       // values between 0.0 (silent/calm) and 1.0 (explosive/heavy)
  "valence_range": [float, float],      // values between 0.0 (sad/melancholic) and 1.0 (happy/euphoric)
  "acousticness_min": float,            // minimum acousticness (0.0 to 1.0)
  "tempo_range": [float, float],        // BPM range between 50 and 200
  "preferred_genres": ["string", ...],  // e.g. ["ambient", "piano", "lo-fi", "indie", "electronic", "rock"]
  "listening_context": "string",        // e.g. "late-night study", "morning workout", "rainy afternoon"
  "dense_query": "string"               // expanded descriptive query for semantic vector search
}

Example:
User: "something calm for a 3 a.m. study session with soft piano and no distracting drums"
JSON:
{
  "mood": ["calm", "contemplative", "focused", "nocturnal"],
  "energy_range": [0.05, 0.30],
  "valence_range": [0.15, 0.45],
  "acousticness_min": 0.70,
  "tempo_range": [55.0, 85.0],
  "preferred_genres": ["ambient", "piano", "classical", "lo-fi"],
  "listening_context": "late-night study session",
  "dense_query": "peaceful ambient acoustic piano music with minimal drums, gentle textures, and low energy for late night studying"
}
"""

EXPLANATION_SYSTEM_PROMPT = """You are the Music Explainer for Sonora, inspired by Spotify NEO.
Your job is to provide a grounded, 1-2 sentence explanation for WHY each recommended song matches the user's request.

Rules:
1. Reference the user's scenario (e.g. late night studying, workout).
2. Reference the song's actual acoustic features (energy, tempo, acousticness, or instruments).
3. Mention the Semantic ID cluster code as an acoustic fingerprint.
4. Keep the tone warm, insightful, and concise (under 30 words per explanation).
5. Output valid JSON array of objects:
[
  {
    "track_id": "string",
    "explanation": "string"
  }
]
"""


def extract_json_from_llm_response(text: str) -> dict | list:
    """Safely extract JSON from raw LLM text that might contain markdown fences."""
    clean = text.strip()
    # Strip markdown code blocks if present
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean)
    if match:
        clean = match.group(1).strip()
    return json.loads(clean)


def heuristic_intent_parser(query: str) -> dict[str, Any]:
    """
    Deterministic rule-based intent parser used when offline or without Gemini API key.
    Provides identical schema guarantees so the pipeline never breaks.
    """
    q = query.lower()

    # Default profile: Balanced
    energy_range = [0.20, 0.80]
    valence_range = [0.20, 0.80]
    acousticness_min = 0.0
    tempo_range = [60.0, 140.0]
    mood = ["balanced", "curated"]
    preferred_genres = ["indie", "electronic", "chill"]
    context = "general listening"

    # 1. Sunny / Happy / Cheerful / Morning / Coffee / Feel Good
    if any(k in q for k in ["sunny", "cheerful", "happy", "morning", "coffee", "breakfast", "uplifting", "feel good", "joy", "warm"]):
        energy_range = [0.35, 0.72]
        valence_range = [0.55, 0.98]
        acousticness_min = 0.15
        tempo_range = [85.0, 125.0]
        mood = ["cheerful", "sunny", "uplifting", "bright"]
        preferred_genres = ["acoustic", "folk", "pop", "soul", "indie"]
        context = "cheerful morning / positive vibes"

    # 2. Upbeat / Workout / Party / Dance / High Energy
    elif any(k in q for k in ["workout", "gym", "run", "party", "dance", "upbeat", "high energy", "fast", "hype", "club"]):
        energy_range = [0.70, 0.98]
        valence_range = [0.50, 0.95]
        acousticness_min = 0.0
        tempo_range = [118.0, 160.0]
        mood = ["energetic", "euphoric", "motivating", "dynamic"]
        preferred_genres = ["electronic", "deep-house", "pop", "rock", "hip-hop"]
        context = "high-energy workout / party"

    # 3. Calm / Study / Sleep / Late Night / Relax
    elif any(k in q for k in ["calm", "study", "3 a.m.", "night", "sleep", "relax", "quiet", "soft", "focus", "piano", "ambient"]):
        energy_range = [0.05, 0.35]
        valence_range = [0.10, 0.50]
        acousticness_min = 0.60
        tempo_range = [50.0, 90.0]
        mood = ["calm", "introspective", "focused", "nocturnal"]
        preferred_genres = ["ambient", "piano", "lo-fi", "classical", "downtempo"]
        context = "late-night study / deep focus"

    # Melancholic / Sad / Rainy / Nostalgic
    elif any(k in q for k in ["sad", "rainy", "melancholy", "cry", "nostalgic", "autumn", "wistful", "alone"]):
        energy_range = [0.15, 0.55]
        valence_range = [0.10, 0.40]
        acousticness_min = 0.40
        tempo_range = [65.0, 110.0]
        mood = ["melancholic", "wistful", "nostalgic", "atmospheric"]
        preferred_genres = ["indie", "folk", "classical", "post-rock"]
        context = "rainy day / nostalgic reflection"

    return {
        "mood": mood,
        "energy_range": energy_range,
        "valence_range": valence_range,
        "acousticness_min": acousticness_min,
        "tempo_range": tempo_range,
        "preferred_genres": preferred_genres,
        "listening_context": context,
        "dense_query": f"{' '.join(mood)} {query} {' '.join(preferred_genres)}"
    }


def heuristic_explainer(track: dict, intent: dict, query: str) -> str:
    """Deterministic grounded explanation generator for offline/fallback mode."""
    feats = track.get("audio_features", {})
    energy = feats.get("energy", 0.5)
    genre = track.get("track_genre", "music")
    sid = track.get("semantic_id", "SID-XX-YY-ZZ-WW")
    context = intent.get("listening_context", "your listening session")

    if energy < 0.35:
        return f"Minimal {genre} arrangement with gentle acoustic dynamics ({energy:.0%} energy) and cluster {sid}, sustaining uninterrupted focus for {context}."
    elif energy > 0.70:
        return f"High-tempo {genre} groove featuring pulsing rhythm ({energy:.0%} energy) to power up {context}."
    else:
        return f"Balanced {genre} textures with melodic warmth, aligning with your request for {context} (fingerprint: {sid})."
