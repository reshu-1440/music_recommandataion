"""
Build Index Script: Computes Embeddings, Semantic IDs, and FAISS Vector Store.
Conforms strictly to specs/SPEC_02_VECTOR_STORE_AND_GLIDE.md.
"""

from __future__ import annotations

import time
from pathlib import Path
import pandas as pd

from backend.app.core.embeddings import EmbeddingEngine
from backend.app.core.semantic_ids import SemanticIDGenerator
from backend.app.core.vector_store import VectorStore
from backend.app.scripts.download_or_seed_dataset import load_or_fetch_dataset


def build_catalog_index(
    data_dir: str | Path = "backend/data",
    n_levels: int = 4,
    n_clusters: int = 32
) -> None:
    data_path = Path(data_dir)
    data_path.mkdir(parents=True, exist_ok=True)

    csv_path = data_path / "kaggle_spotify_tracks.csv"
    index_bin_path = data_path / "faiss_index.bin"
    meta_pkl_path = data_path / "faiss_metadata.pkl"
    sid_model_path = data_path / "sid_codebooks.pkl"
    catalog_indexed_path = data_path / "catalog_indexed.csv"

    print("=" * 60)
    print("STEP 1: Loading Kaggle Spotify Tracks Dataset...")
    df = load_or_fetch_dataset(str(csv_path))
    print(f"Loaded {len(df)} tracks across {df['track_genre'].nunique()} genres.")

    print("\nSTEP 2: Fitting RQ-KMeans Semantic ID Generator...")
    start_time = time.time()
    sid_gen = SemanticIDGenerator(n_levels=n_levels, n_clusters=n_clusters, random_state=42)
    features = sid_gen.extract_features(df)
    sid_gen.fit(features)
    codes = sid_gen.encode(features)
    sid_strings = sid_gen.batch_format(codes)
    df["semantic_id"] = sid_strings
    sid_gen.save(sid_model_path)
    print(f"Fitted {n_levels}-level RQ-KMeans and saved codebooks to {sid_model_path} ({time.time() - start_time:.2f}s).")
    print(f"Sample generated SIDs: {sid_strings[:3]}")

    print("\nSTEP 3: Generating Text Embeddings via SentenceTransformer...")
    start_time = time.time()
    embedder = EmbeddingEngine(model_name="all-MiniLM-L6-v2")
    descriptions = df["description"].tolist()
    embeddings = embedder.encode_texts(descriptions, batch_size=64)
    print(f"Encoded {len(embeddings)} descriptions to shape {embeddings.shape} ({time.time() - start_time:.2f}s).")

    print("\nSTEP 4: Constructing FAISS IndexFlatIP Store...")
    vector_store = VectorStore(dimension=embedder.dimension)

    # Prepare metadata records
    metadata_list = []
    for _, row in df.iterrows():
        metadata_list.append({
            "track_id": row["track_id"],
            "track_name": row["track_name"],
            "artists": row["artists"],
            "album_name": row["album_name"],
            "track_genre": row["track_genre"],
            "duration_ms": int(row["duration_ms"]),
            "popularity": int(row["popularity"]),
            "semantic_id": row["semantic_id"],
            "description": row["description"],
            "audio_features": {
                "danceability": float(row["danceability"]),
                "energy": float(row["energy"]),
                "valence": float(row["valence"]),
                "acousticness": float(row["acousticness"]),
                "instrumentalness": float(row["instrumentalness"]),
                "speechiness": float(row["speechiness"]),
                "liveness": float(row["liveness"]),
                "tempo": float(row["tempo"]),
                "loudness": float(row["loudness"]),
            }
        })

    vector_store.add(embeddings, metadata_list)
    vector_store.save(index_bin_path, meta_pkl_path)
    print(f"Saved FAISS index ({len(vector_store)} tracks) to {index_bin_path} and {meta_pkl_path}.")

    # Save indexed catalog CSV for reference
    df.to_csv(catalog_indexed_path, index=False)
    print(f"Saved indexed catalog to {catalog_indexed_path}.")

    print("\n" + "=" * 60)
    print("Catalog indexing complete!")
    print(f"Total items indexed: {len(vector_store)}")


if __name__ == "__main__":
    build_catalog_index()
