"""
Enrich Kaggle Spotify Tracks Dataset with Official Spotify CDN Album Covers.
Uses Spotify's public unauthenticated oEmbed endpoint:
https://open.spotify.com/oembed?url=https://open.spotify.com/track/{track_id}
Fetches official album thumbnails directly from Spotify CDN (image-cdn-ak.spotifycdn.com).
"""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
import httpx
import pandas as pd

from backend.app.scripts.build_index import build_catalog_index

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent.parent / "data"
RAW_DATASET_PATH = DATA_DIR / "raw_kaggle_spotify_tracks.csv"
ENRICHED_DATASET_PATH = DATA_DIR / "kaggle_spotify_tracks.csv"

# Diverse 20 genres covering Sonora's discovery moods
TARGET_GENRES = [
    "ambient", "chill", "piano", "classical", "study", "sleep",
    "electronic", "deep-house", "trip-hop", "synth-pop",
    "indie", "jazz", "soul", "acoustic", "blues",
    "folk", "funk", "r-n-b", "rock", "pop"
]

GENRE_AUDIO_MAP = {
    "ambient": "/audio/ambient.wav",
    "chill": "/audio/chill.wav",
    "piano": "/audio/piano.wav",
    "classical": "/audio/classical.wav",
    "study": "/audio/lo-fi.wav",
    "sleep": "/audio/ambient.wav",
    "electronic": "/audio/electronic.wav",
    "deep-house": "/audio/deep-house.wav",
    "trip-hop": "/audio/downtempo.wav",
    "synth-pop": "/audio/synthwave.wav",
    "indie": "/audio/indie.wav",
    "jazz": "/audio/jazz.wav",
    "soul": "/audio/r-n-b.wav",
    "acoustic": "/audio/folk.wav",
    "blues": "/audio/jazz.wav",
    "folk": "/audio/folk.wav",
    "funk": "/audio/r-n-b.wav",
    "r-n-b": "/audio/r-n-b.wav",
    "rock": "/audio/rock.wav",
    "pop": "/audio/pop.wav"
}

FALLBACK_UNSPLASH = [
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=600&h=600&q=85",
    "https://images.unsplash.com/photo-1520523839898-507127050302?auto=format&fit=crop&w=600&h=600&q=85",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&h=600&q=85",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&h=600&q=85",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&h=600&q=85"
]


def ensure_raw_dataset() -> Path:
    """Ensure raw 114k Kaggle Spotify dataset is present."""
    if not RAW_DATASET_PATH.exists() or RAW_DATASET_PATH.stat().st_size < 1_000_000:
        import urllib.request
        url = "https://huggingface.co/datasets/maharshipandya/spotify-tracks-dataset/resolve/main/dataset.csv"
        print(f"Downloading raw Kaggle dataset from {url}...")
        RAW_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, RAW_DATASET_PATH)
    return RAW_DATASET_PATH


async def fetch_spotify_cover(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    track_id: str,
    delay: float = 0.08
) -> tuple[str, str | None]:
    """Fetch official album art thumbnail via Spotify oEmbed endpoint with rate-friendly retries."""
    url = f"https://open.spotify.com/oembed?url=https://open.spotify.com/track/{track_id}"
    async with sem:
        for attempt in range(3):
            try:
                resp = await client.get(url, timeout=5.0)
                if resp.status_code == 200:
                    thumb = resp.json().get("thumbnail_url")
                    if thumb:
                        await asyncio.sleep(delay)
                        return track_id, thumb
                elif resp.status_code == 429:
                    # Throttled: back off gently
                    await asyncio.sleep(1.2 + attempt * 0.5)
            except Exception:
                await asyncio.sleep(0.4)
        await asyncio.sleep(delay)
    return track_id, None


async def run_enrichment(tracks_per_genre: int = 40, concurrency: int = 4) -> pd.DataFrame:
    """Select diverse tracks and enrich with authentic Spotify album covers."""
    raw_path = ensure_raw_dataset()
    df_raw = pd.read_csv(raw_path)

    # Filter to target genres, deduplicate, and sort by popularity
    selected = (
        df_raw[df_raw["track_genre"].isin(TARGET_GENRES)]
        .drop_duplicates(subset=["track_id"])
        .sort_values(by=["popularity"], ascending=False)
        .groupby("track_genre")
        .head(tracks_per_genre)
        .copy()
        .reset_index(drop=True)
    )

    total_tracks = len(selected)
    print(f"\n============================================================")
    print(f"ENRICHING CATALOG WITH SPOTIFY OEMBED: {total_tracks} tracks across {selected['track_genre'].nunique()} genres")
    print(f"============================================================")

    sem = asyncio.Semaphore(concurrency)
    limits = httpx.Limits(max_keepalive_connections=concurrency, max_connections=concurrency + 5)

    t0 = time.time()
    async with httpx.AsyncClient(limits=limits, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as client:
        tasks = [
            fetch_spotify_cover(client, sem, tid, delay=0.08)
            for tid in selected["track_id"]
        ]
        results = await asyncio.gather(*tasks)

    elapsed = time.time() - t0
    thumb_map = dict(results)
    selected["image_url"] = selected["track_id"].map(thumb_map)

    # Fallback for any remaining unmapped tracks
    missing_count = selected["image_url"].isna().sum()
    if missing_count > 0:
        print(f"Applying high-resolution fallback for {missing_count} tracks...")
        for idx in selected[selected["image_url"].isna()].index:
            selected.at[idx, "image_url"] = FALLBACK_UNSPLASH[idx % len(FALLBACK_UNSPLASH)]

    success_rate = ((total_tracks - missing_count) / total_tracks) * 100
    print(f"Resolved in {elapsed:.2f}s ({total_tracks / elapsed:.1f} tracks/sec)")
    print(f"Official Spotify CDN Artwork Coverage: {success_rate:.1f}% ({total_tracks - missing_count}/{total_tracks})")

    # Set audio preview URLs
    selected["preview_url"] = selected["track_genre"].map(GENRE_AUDIO_MAP).fillna("/audio/default.wav")

    # Build descriptions for SentenceTransformer embedding
    descriptions = []
    for _, row in selected.iterrows():
        energy_desc = "high energy" if row["energy"] > 0.65 else "moderate energy" if row["energy"] > 0.35 else "gentle low energy"
        acoustic_desc = "acoustic instrumentation" if row["acousticness"] > 0.5 else "electronic/synthesized production"
        mood_desc = "uplifting and positive" if row["valence"] > 0.6 else "reflective and melancholic" if row["valence"] < 0.4 else "balanced mood"
        desc = (
            f"\"{row['track_name']}\" by {row['artists']}. Genre: {row['track_genre']}. "
            f"Album: {row['album_name']}. Sound profile: {energy_desc}, {acoustic_desc}, {mood_desc}, "
            f"{int(row['tempo'])} BPM, {int(row['energy'] * 100)}% energy, {int(row['valence'] * 100)}% valence."
        )
        descriptions.append(desc)
    selected["description"] = descriptions

    # Save enriched catalog
    ENRICHED_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    selected.to_csv(ENRICHED_DATASET_PATH, index=False)
    print(f"\nSaved enriched dataset to {ENRICHED_DATASET_PATH}")

    # Automatically re-index catalog (SIDs + FAISS + metadata)
    print("\nRebuilding FAISS index and RQ-KMeans codebooks...")
    build_catalog_index(data_dir=DATA_DIR)
    return selected


if __name__ == "__main__":
    asyncio.run(run_enrichment(tracks_per_genre=40, concurrency=4))
