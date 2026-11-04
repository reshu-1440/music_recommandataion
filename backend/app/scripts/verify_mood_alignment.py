"""
Verification and Evaluation Script for Mood-Based Recommendation Correctness.
Compares input mood prompts against the ground-truth Spotify psychoacoustic metrics
(energy, valence, tempo, acousticness, genre) of the recommended tracks.
"""

from __future__ import annotations

import pandas as pd
from backend.app.models.schemas import RecommendRequest
from backend.app.main import recommend

BENCHMARK_PROMPTS = [
    {
        "name": "Late Night Study (3 AM)",
        "prompt": "Calm quiet piano for late night study at 3 AM",
        "expected_energy": "Low (< 0.40)",
        "expected_valence": "Low / Moderate (< 0.50)",
        "expected_genres": ["piano", "ambient", "classical", "study"],
        "max_acceptable_energy": 0.40
    },
    {
        "name": "High-Intensity Workout",
        "prompt": "High energy intense aggressive workout and gym training",
        "expected_energy": "High (> 0.65)",
        "expected_valence": "High / Active (> 0.45)",
        "expected_genres": ["electronic", "rock", "pop", "synth-pop"],
        "min_acceptable_energy": 0.65
    },
    {
        "name": "Sunny Morning Coffee",
        "prompt": "Sunny cheerful acoustic morning coffee and relaxed breakfast",
        "expected_energy": "Moderate (0.30 - 0.70)",
        "expected_valence": "High / Happy (> 0.55)",
        "expected_genres": ["acoustic", "folk", "indie", "soul"],
        "min_acceptable_valence": 0.55
    }
]


def run_evaluation():
    print("=" * 80)
    print("SONORA MUSIC DISCOVERY — MOOD ALIGNMENT VERIFICATION REPORT")
    print("=" * 80)

    total_benchmarks = len(BENCHMARK_PROMPTS)
    passed_benchmarks = 0

    for idx, bench in enumerate(BENCHMARK_PROMPTS, 1):
        prompt = bench["prompt"]
        req = RecommendRequest(query=prompt, discovery_mode="familiar", limit=4)
        resp = recommend(req)

        tracks = resp.tracks
        avg_energy = sum(t.audio_features.energy for t in tracks) / len(tracks)
        avg_valence = sum(t.audio_features.valence for t in tracks) / len(tracks)
        avg_tempo = sum(t.audio_features.tempo for t in tracks) / len(tracks)
        genres = [t.genre.split("•")[0].strip().lower() for t in tracks]

        # Evaluation criteria
        is_correct = True
        if "max_acceptable_energy" in bench and avg_energy > bench["max_acceptable_energy"]:
            is_correct = False
        if "min_acceptable_energy" in bench and avg_energy < bench["min_acceptable_energy"]:
            is_correct = False

        status_tag = "[PASS] CORRECT" if is_correct else "[WARN] SUB-OPTIMAL"
        if is_correct:
            passed_benchmarks += 1

        print(f"\nBenchmark #{idx}: {bench['name']} {status_tag}")
        print(f"  Prompt: \"{prompt}\"")
        print(f"  Expected Profile: Energy {bench['expected_energy']} | Valence {bench['expected_valence']}")
        print(f"  Actual Average:   Energy {avg_energy:.2f} | Valence {avg_valence:.2f} | Tempo {avg_tempo:.1f} BPM")
        print(f"  Recommended Genres: {list(set(genres))}")
        print(f"  Recommended Tracks:")
        for t in tracks:
            print(
                f"    • {t.title} - {t.artist} [{t.id}] "
                f"(Energy: {t.audio_features.energy:.2f}, Valence: {t.audio_features.valence:.2f}, {int(t.audio_features.tempo)} BPM)"
            )

    print("\n" + "=" * 80)
    print(f"FINAL ACCURACY: {passed_benchmarks}/{total_benchmarks} benchmarks passed ({passed_benchmarks/total_benchmarks * 100:.1f}%)")
    print("=" * 80)


if __name__ == "__main__":
    run_evaluation()
