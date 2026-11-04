"""
Dataset Downloader & Curated Seeder for Kaggle Spotify Tracks.
Conforms strictly to specs/SPEC_01_DATASET_AND_SEMANTIC_IDS.md.
"""

from __future__ import annotations

import os
import random
from pathlib import Path
import numpy as np
import pandas as pd

# Curated pools of unique high-resolution album artworks per genre
GENRE_PHOTO_POOLS = {
    "ambient": [
        "photo-1518837695005-2083093ee35b", "photo-1507525428034-b723cf961d3e",
        "photo-1519681393784-d120267933ba", "photo-1470770841072-f978cf4d019e",
        "photo-1500530855697-b586d89ba3ee", "photo-1448375240586-882707db888b",
        "photo-1534447677768-be436bb09401", "photo-1518709268805-4e9042af9f23",
        "photo-1509198397868-475647b2a1e5", "photo-1464822759023-fed622ff2c3b",
        "photo-1506744038136-46273834b3fb", "photo-1498038432885-c6f3f1b912ee"
    ],
    "piano": [
        "photo-1520523839898-507127050302", "photo-1511671782779-c97d3d27a1d4",
        "photo-1500530855697-b586d89ba3ee", "photo-1465847899084-d164df4dedc6",
        "photo-1514525253161-7a46d19cd819", "photo-1470225620780-dba8ba36b745",
        "photo-1507838153414-b4b713384a76", "photo-1459749411175-04bf5292ceea",
        "photo-1518837695005-2083093ee35b", "photo-1470770841072-f978cf4d019e",
        "photo-1507525428034-b723cf961d3e", "photo-1445985543468-79496ba88218"
    ],
    "classical": [
        "photo-1465847899084-d164df4dedc6", "photo-1519681393784-d120267933ba",
        "photo-1507838153414-b4b713384a76", "photo-1470225620780-dba8ba36b745",
        "photo-1511671782779-c97d3d27a1d4", "photo-1500530855697-b586d89ba3ee",
        "photo-1470770841072-f978cf4d019e", "photo-1514525253161-7a46d19cd819",
        "photo-1520523839898-507127050302", "photo-1459749411175-04bf5292ceea",
        "photo-1506744038136-46273834b3fb", "photo-1464822759023-fed622ff2c3b"
    ],
    "lo-fi": [
        "photo-1534447677768-be436bb09401", "photo-1518837695005-2083093ee35b",
        "photo-1498038432885-c6f3f1b912ee", "photo-1445985543468-79496ba88218",
        "photo-1507525428034-b723cf961d3e", "photo-1511671782779-c97d3d27a1d4",
        "photo-1470252649378-9c29740c9fa8", "photo-1519681393784-d120267933ba"
    ],
    "electronic": [
        "photo-1470225620780-dba8ba36b745", "photo-1516450360452-9312f5e86fc7",
        "photo-1509198397868-475647b2a1e5", "photo-1514525253161-7a46d19cd819",
        "photo-1519608487953-e999c86e7455", "photo-1478720568477-152d9b164e26",
        "photo-1508700115892-45ecd05ae2ad", "photo-1518709268805-4e9042af9f23"
    ],
    "deep-house": [
        "photo-1519608487953-e999c86e7455", "photo-1478720568477-152d9b164e26",
        "photo-1508700115892-45ecd05ae2ad", "photo-1516450360452-9312f5e86fc7",
        "photo-1514525253161-7a46d19cd819", "photo-1509198397868-475647b2a1e5",
        "photo-1470225620780-dba8ba36b745", "photo-1493225457124-a3eb161ffa5f"
    ],
    "indie": [
        "photo-1470252649378-9c29740c9fa8", "photo-1445985543468-79496ba88218",
        "photo-1459749411175-04bf5292ceea", "photo-1501386761578-eac5c94b800a",
        "photo-1498038432885-c6f3f1b912ee", "photo-1464375117522-1311d6a5b81f",
        "photo-1500530855697-b586d89ba3ee", "photo-1470770841072-f978cf4d019e"
    ],
    "post-rock": [
        "photo-1470770841072-f978cf4d019e", "photo-1506744038136-46273834b3fb",
        "photo-1464822759023-fed622ff2c3b", "photo-1470225620780-dba8ba36b745",
        "photo-1519681393784-d120267933ba", "photo-1500530855697-b586d89ba3ee",
        "photo-1448375240586-882707db888b", "photo-1518709268805-4e9042af9f23"
    ],
    "synthwave": [
        "photo-1509198397868-475647b2a1e5", "photo-1518709268805-4e9042af9f23",
        "photo-1511671782779-c97d3d27a1d4", "photo-1514525253161-7a46d19cd819",
        "photo-1516450360452-9312f5e86fc7", "photo-1519608487953-e999c86e7455",
        "photo-1478720568477-152d9b164e26", "photo-1470225620780-dba8ba36b745"
    ],
    "jazz": [
        "photo-1511671782779-c97d3d27a1d4", "photo-1415201364774-f6f0ab35f78f",
        "photo-1514525253161-7a46d19cd819", "photo-1465847899084-d164df4dedc6",
        "photo-1507838153414-b4b713384a76", "photo-1498038432885-c6f3f1b912ee",
        "photo-1459749411175-04bf5292ceea", "photo-1445985543468-79496ba88218"
    ],
    "chill": [
        "photo-1498038432885-c6f3f1b912ee", "photo-1507525428034-b723cf961d3e",
        "photo-1501386761578-eac5c94b800a", "photo-1518837695005-2083093ee35b",
        "photo-1470252649378-9c29740c9fa8", "photo-1534447677768-be436bb09401",
        "photo-1445985543468-79496ba88218", "photo-1470770841072-f978cf4d019e"
    ],
    "rock": [
        "photo-1464375117522-1311d6a5b81f", "photo-1493225457124-a3eb161ffa5f",
        "photo-1514525253161-7a46d19cd819", "photo-1511671782779-c97d3d27a1d4",
        "photo-1516450360452-9312f5e86fc7", "photo-1470225620780-dba8ba36b745",
        "photo-1459749411175-04bf5292ceea", "photo-1470252649378-9c29740c9fa8"
    ],
    "metal": [
        "photo-1514525253161-7a46d19cd819", "photo-1511671782779-c97d3d27a1d4",
        "photo-1464375117522-1311d6a5b81f", "photo-1509198397868-475647b2a1e5",
        "photo-1470225620780-dba8ba36b745", "photo-1493225457124-a3eb161ffa5f",
        "photo-1516450360452-9312f5e86fc7", "photo-1519608487953-e999c86e7455"
    ],
    "pop": [
        "photo-1516450360452-9312f5e86fc7", "photo-1493225457124-a3eb161ffa5f",
        "photo-1470225620780-dba8ba36b745", "photo-1514525253161-7a46d19cd819",
        "photo-1508700115892-45ecd05ae2ad", "photo-1509198397868-475647b2a1e5",
        "photo-1519608487953-e999c86e7455", "photo-1459749411175-04bf5292ceea"
    ],
    "r-n-b": [
        "photo-1493225457124-a3eb161ffa5f", "photo-1459749411175-04bf5292ceea",
        "photo-1511671782779-c97d3d27a1d4", "photo-1445985543468-79496ba88218",
        "photo-1516450360452-9312f5e86fc7", "photo-1498038432885-c6f3f1b912ee",
        "photo-1514525253161-7a46d19cd819", "photo-1470252649378-9c29740c9fa8"
    ],
    "folk": [
        "photo-1445985543468-79496ba88218", "photo-1470252649378-9c29740c9fa8",
        "photo-1500530855697-b586d89ba3ee", "photo-1459749411175-04bf5292ceea",
        "photo-1501386761578-eac5c94b800a", "photo-1498038432885-c6f3f1b912ee",
        "photo-1470770841072-f978cf4d019e", "photo-1507525428034-b723cf961d3e"
    ],
    "downtempo": [
        "photo-1518837695005-2083093ee35b", "photo-1519681393784-d120267933ba",
        "photo-1470770841072-f978cf4d019e", "photo-1500530855697-b586d89ba3ee",
        "photo-1534447677768-be436bb09401", "photo-1507525428034-b723cf961d3e",
        "photo-1509198397868-475647b2a1e5", "photo-1478720568477-152d9b164e26"
    ]
}

# 20+ diverse musical genres reflecting Spotify's catalog
GENRE_PROFILES = {
    "ambient": {
        "energy": (0.05, 0.25), "valence": (0.10, 0.40), "acousticness": (0.70, 0.98),
        "danceability": (0.10, 0.35), "instrumentalness": (0.75, 0.99), "tempo": (55, 85),
        "loudness": (-26.0, -16.0),
        "artists": ["Brian Eno", "Stars of the Lid", "Tim Hecker", "Hammock", "William Basinski", "Chihei Hatakeyama"],
        "adjectives": ["ethereal", "drifting", "subtle", "meditative", "deep", "hazy", "weightless"],
        "scenarios": ["3 a.m. study sessions", "deep meditation", "sleep sanctuary", "minimal focus", "quiet solitude"]
    },
    "lo-fi": {
        "energy": (0.15, 0.40), "valence": (0.25, 0.55), "acousticness": (0.50, 0.85),
        "danceability": (0.45, 0.70), "instrumentalness": (0.50, 0.90), "tempo": (70, 92),
        "loudness": (-18.0, -10.0),
        "artists": ["Kowloon", "Kupla", "Idealism", "Saib", "Nujabes", "Jinsang", "Tomppabeats"],
        "adjectives": ["warm vinyl", "tape-saturated", "nostalgic", "dusty", "mellow", "rainy-day"],
        "scenarios": ["coffee shop coding", "rainy afternoon reading", "casual background studying", "late-night sketching"]
    },
    "classical": {
        "energy": (0.10, 0.45), "valence": (0.15, 0.50), "acousticness": (0.80, 0.99),
        "danceability": (0.15, 0.40), "instrumentalness": (0.70, 0.98), "tempo": (60, 140),
        "loudness": (-28.0, -14.0),
        "artists": ["Max Richter", "Ludovico Einaudi", "Ólafur Arnalds", "Nils Frahm", "Joep Beving", "Yiruma"],
        "adjectives": ["poignant", "orchestral", "delicate", "cinematic", "timeless", "reverent"],
        "scenarios": ["creative writing", "candlelit focus", "deep introspection", "uninterrupted contemplation"]
    },
    "indie": {
        "energy": (0.35, 0.70), "valence": (0.30, 0.65), "acousticness": (0.20, 0.60),
        "danceability": (0.40, 0.65), "instrumentalness": (0.00, 0.40), "tempo": (95, 135),
        "loudness": (-12.0, -6.0),
        "artists": ["Bon Iver", "Phoebe Bridgers", "The National", "Fleet Foxes", "Sufjan Stevens", "Mac DeMarco"],
        "adjectives": ["heartfelt", "wistful", "jangly", "raw", "melodic", "intimate"],
        "scenarios": ["road trips alone", "sunset walks", "autumn evenings", "nostalgic reminiscing"]
    },
    "post-rock": {
        "energy": (0.30, 0.75), "valence": (0.15, 0.45), "acousticness": (0.10, 0.50),
        "danceability": (0.20, 0.45), "instrumentalness": (0.60, 0.95), "tempo": (75, 120),
        "loudness": (-16.0, -7.0),
        "artists": ["Explosions in the Sky", "Mogwai", "Sigur Rós", "This Will Destroy You", "Godspeed You! Black Emperor"],
        "adjectives": ["crescendoing", "monumental", "spacious", "cathartic", "soaring", "vast"],
        "scenarios": ["epic daydreaming", "night driving through mountains", "stargazing in open fields"]
    },
    "electronic": {
        "energy": (0.65, 0.95), "valence": (0.40, 0.80), "acousticness": (0.01, 0.20),
        "danceability": (0.65, 0.88), "instrumentalness": (0.30, 0.85), "tempo": (118, 132),
        "loudness": (-8.0, -4.0),
        "artists": ["Jon Hopkins", "Bonobo", "Tycho", "Kiasmos", "Four Tet", "Bicep", "Caribou"],
        "adjectives": ["pulsing", "modular", "shimmering", "hypnotic", "intricate", "dynamic"],
        "scenarios": ["productive flow states", "late night highway driving", "modern design sessions"]
    },
    "deep-house": {
        "energy": (0.70, 0.92), "valence": (0.50, 0.85), "acousticness": (0.02, 0.15),
        "danceability": (0.75, 0.92), "instrumentalness": (0.40, 0.85), "tempo": (120, 126),
        "loudness": (-7.5, -4.5),
        "artists": ["Lane 8", "Nora En Pure", "Ben Böhmer", "Tinlicker", "Yotto", "Sultan + Shepard"],
        "adjectives": ["melodic", "bouncy", "lush", "warm bassline", "euphoric", "sunset-groove"],
        "scenarios": ["rooftop lounge vibes", "golden hour cycling", "upbeat workflow"]
    },
    "jazz": {
        "energy": (0.25, 0.60), "valence": (0.40, 0.75), "acousticness": (0.50, 0.90),
        "danceability": (0.45, 0.75), "instrumentalness": (0.30, 0.85), "tempo": (80, 140),
        "loudness": (-18.0, -9.0),
        "artists": ["Miles Davis", "Bill Evans", "John Coltrane", "Chet Baker", "Kamasi Washington", "Alfa Mist"],
        "adjectives": ["smoky", "syncopated", "sophisticated", "bluesy", "smooth", "expressive"],
        "scenarios": ["late evening cocktails", "reading classic novels", "rainy city cafe"]
    },
    "chill": {
        "energy": (0.20, 0.50), "valence": (0.35, 0.70), "acousticness": (0.40, 0.80),
        "danceability": (0.50, 0.75), "instrumentalness": (0.20, 0.70), "tempo": (80, 110),
        "loudness": (-14.0, -7.0),
        "artists": ["Petit Biscuit", "Chet Faker", "Maribou State", "Tourist", "Emancipator"],
        "adjectives": ["laid-back", "sun-drenched", "breezy", "cozy", "effortless"],
        "scenarios": ["weekend brunch", "relaxing in the hammock", "casual unwinding"]
    },
    "rock": {
        "energy": (0.70, 0.95), "valence": (0.40, 0.75), "acousticness": (0.01, 0.25),
        "danceability": (0.40, 0.65), "instrumentalness": (0.00, 0.30), "tempo": (110, 160),
        "loudness": (-7.0, -3.5),
        "artists": ["Arctic Monkeys", "The Black Keys", "Foo Fighters", "Queens of the Stone Age", "The Strokes"],
        "adjectives": ["driving", "gritty", "punchy", "electric", "anthemic", "high-octane"],
        "scenarios": ["intense gym workouts", "high-energy garage sessions", "fast highway drives"]
    },
    "metal": {
        "energy": (0.85, 0.99), "valence": (0.10, 0.40), "acousticness": (0.00, 0.05),
        "danceability": (0.25, 0.50), "instrumentalness": (0.10, 0.60), "tempo": (120, 180),
        "loudness": (-5.0, -2.0),
        "artists": ["Tool", "Gojira", "Mastodon", "Opeth", "Deftones", "Meshuggah"],
        "adjectives": ["crushing", "polyrhythmic", "visceral", "aggressive", "dark", "furious"],
        "scenarios": ["heavy lifting pr sets", "unleashing raw adrenaline", "chaotic focus"]
    },
    "pop": {
        "energy": (0.55, 0.88), "valence": (0.55, 0.90), "acousticness": (0.05, 0.35),
        "danceability": (0.65, 0.90), "instrumentalness": (0.00, 0.05), "tempo": (100, 130),
        "loudness": (-6.5, -3.5),
        "artists": ["Dua Lipa", "The Weeknd", "Harry Styles", "Charli XCX", "Billie Eilish", "Lorde"],
        "adjectives": ["catchy", "glossy", "infectious", "sparkling", "hook-driven", "vibrant"],
        "scenarios": ["getting ready for a party", "sunny day karaoke", "upbeat commutes"]
    },
    "r-n-b": {
        "energy": (0.35, 0.65), "valence": (0.35, 0.70), "acousticness": (0.15, 0.50),
        "danceability": (0.60, 0.85), "instrumentalness": (0.00, 0.15), "tempo": (75, 115),
        "loudness": (-10.0, -5.0),
        "artists": ["SZA", "Frank Ocean", "Daniel Caesar", "Giveon", "Jhené Aiko", "Leon Bridges"],
        "adjectives": ["velvety", "sensual", "soulful", "introspective", "smooth-groove"],
        "scenarios": ["late night romance", "candlelit dinners", "winding down before bed"]
    },
    "hip-hop": {
        "energy": (0.60, 0.90), "valence": (0.40, 0.75), "acousticness": (0.02, 0.25),
        "danceability": (0.70, 0.95), "instrumentalness": (0.00, 0.15), "tempo": (80, 140),
        "loudness": (-7.0, -3.5),
        "artists": ["Kendrick Lamar", "J. Cole", "Travis Scott", "Tyler, The Creator", "Mac Miller"],
        "adjectives": ["hard-hitting", "lyrical", "rhythmic", "booming 808s", "confident"],
        "scenarios": ["city night walks", "pre-game motivation", "workout hype"]
    },
    "folk": {
        "energy": (0.20, 0.50), "valence": (0.25, 0.60), "acousticness": (0.65, 0.95),
        "danceability": (0.35, 0.60), "instrumentalness": (0.05, 0.40), "tempo": (75, 125),
        "loudness": (-16.0, -8.0),
        "artists": ["Iron & Wine", "The Tallest Man on Earth", "Gregory Alan Isakov", "Laura Marling"],
        "adjectives": ["fingerpicked", "earthy", "woodsy", "poetic", "rustic", "wholesome"],
        "scenarios": ["cabin in the woods", "morning coffee on the porch", "campfire evenings"]
    },
    "downtempo": {
        "energy": (0.25, 0.50), "valence": (0.20, 0.55), "acousticness": (0.30, 0.75),
        "danceability": (0.45, 0.70), "instrumentalness": (0.50, 0.90), "tempo": (65, 95),
        "loudness": (-16.0, -9.0),
        "artists": ["Marconi Union", "Bonobo", "Morcheeba", "Thievery Corporation", "Zero 7"],
        "adjectives": ["relaxing", "atmospheric", "low-tempo", "subtle groove", "deep pulse"],
        "scenarios": ["stress relief", "unwinding after long hours", "subtle background music"]
    },
    "piano": {
        "energy": (0.08, 0.35), "valence": (0.15, 0.45), "acousticness": (0.85, 0.99),
        "danceability": (0.20, 0.45), "instrumentalness": (0.75, 0.98), "tempo": (55, 90),
        "loudness": (-24.0, -14.0),
        "artists": ["Dustin O'Halloran", "Nils Frahm", "Ólafur Arnalds", "Chad Lawson", "Fabrizio Paterlini"],
        "adjectives": ["felted piano", "minimalist", "delicate keys", "soft reverb", "tranquil"],
        "scenarios": ["3 a.m. study sessions", "writing by window", "peaceful sleep", "gentle waking"]
    },
    "synthwave": {
        "energy": (0.65, 0.90), "valence": (0.40, 0.75), "acousticness": (0.01, 0.15),
        "danceability": (0.55, 0.80), "instrumentalness": (0.40, 0.90), "tempo": (105, 130),
        "loudness": (-8.5, -4.5),
        "artists": ["Kavinsky", "Gunship", "The Midnight", "Timecop1983", "Carpenter Brut"],
        "adjectives": ["neon-lit", "retrofuturistic", "arpeggiated synths", "cyberpunk", "nostalgic 80s"],
        "scenarios": ["night drives under neon lights", "retro gaming", "cyberpunk coding sprints"]
    },
    "soul": {
        "energy": (0.35, 0.70), "valence": (0.45, 0.85), "acousticness": (0.30, 0.70),
        "danceability": (0.50, 0.75), "instrumentalness": (0.00, 0.20), "tempo": (80, 125),
        "loudness": (-12.0, -6.0),
        "artists": ["Sam Cooke", "Aretha Franklin", "Otis Redding", "Leon Bridges", "Michael Kiwanuka"],
        "adjectives": ["warm brass", "vintage groove", "passionate", "timeless", "uplifting"],
        "scenarios": ["cooking dinner with family", "sunny Sunday mornings", "heartwarming reunions"]
    },
    "reggae": {
        "energy": (0.40, 0.70), "valence": (0.60, 0.90), "acousticness": (0.10, 0.45),
        "danceability": (0.70, 0.88), "instrumentalness": (0.00, 0.25), "tempo": (70, 95),
        "loudness": (-11.0, -5.5),
        "artists": ["Bob Marley", "Chronixx", "Protoje", "Damian Marley", "Koffee"],
        "adjectives": ["offbeat guitar skank", "deep bass", "positive vibration", "sunny", "laid-back"],
        "scenarios": ["beach bonfire", "summer afternoon grilling", "stress-free chilling"]
    }
}

TITLE_PATTERNS = [
    "{adj} {noun}", "{noun} in {place}", "The {adj} {noun}", "{verb} the {noun}",
    "{noun} of {place}", "{place} {noun}", "{adj} {verb}ing"
]
NOUNS = [
    "Echo", "Horizon", "Shadow", "Mirage", "Current", "Silence", "Dawn", "Solitude",
    "Rain", "Light", "Memory", "Pulse", "Reverie", "Tide", "Wanderer", "Signal", "Breeze",
    "Chords", "Dusk", "Path", "Vibration", "Rhythm", "Frequency", "Reflection", "Journey"
]
PLACES = [
    "Midnight", "Autumn", "Winter", "Tokyo", "Reykjavik", "Berlin", "the Mist",
    "the Canyon", "the Deep", "the Clouds", "the Wild", "Silence", "the Highlands"
]
VERBS = ["Finding", "Leaving", "Breathing", "Chasing", "Following", "Holding", "Remembering"]


def _random_track_id(genre: str, index: int) -> str:
    """Deterministic, clean track ID."""
    prefix = genre[:3].upper()
    return f"TRK-{prefix}-{index:04d}"


def seed_curated_kaggle_dataset(output_path: str, n_samples: int = 1200, random_seed: int = 42) -> pd.DataFrame:
    """
    Synthesize high-fidelity catalog conforming to Kaggle Spotify Audio Features schema.
    """
    random.seed(random_seed)
    np.random.seed(random_seed)

    genres = list(GENRE_PROFILES.keys())
    samples_per_genre = max(1, n_samples // len(genres))

    records = []
    track_counter = 1

    for genre in genres:
        profile = GENRE_PROFILES[genre]

        for i in range(samples_per_genre):
            artist = random.choice(profile["artists"])
            adj = random.choice(profile["adjectives"]).title()
            noun = random.choice(NOUNS)
            place = random.choice(PLACES)
            verb = random.choice(VERBS)

            pattern = random.choice(TITLE_PATTERNS)
            title = pattern.format(adj=adj, noun=noun, place=place, verb=verb)

            album = f"{title} (Deluxe)" if i % 4 == 0 else f"{title} EP" if i % 3 == 0 else f"{adj} {noun}"

            # Sample audio features within genre distribution
            energy = float(np.random.uniform(*profile["energy"]))
            valence = float(np.random.uniform(*profile["valence"]))
            acousticness = float(np.random.uniform(*profile["acousticness"]))
            danceability = float(np.random.uniform(*profile["danceability"]))
            instrumentalness = float(np.random.uniform(*profile["instrumentalness"]))
            tempo = float(np.random.uniform(*profile["tempo"]))
            loudness = float(np.random.uniform(*profile["loudness"]))

            speechiness = float(np.clip(np.random.exponential(0.04), 0.01, 0.40))
            liveness = float(np.clip(np.random.exponential(0.12), 0.05, 0.85))
            duration_ms = int(np.random.normal(230000, 45000))
            duration_ms = max(90000, min(duration_ms, 650000))
            popularity = int(np.clip(np.random.normal(55, 18), 10, 98))

            scenario = random.choice(profile["scenarios"])
            description = (
                f"A {adj.lower()} {genre} track by {artist}. Featuring {profile['adjectives'][0]} textures, "
                f"{'instrumental arrangements' if instrumentalness > 0.5 else 'expressive vocals'}, and a tempo of "
                f"{int(tempo)} BPM. Ideal for {scenario}."
            )

            photo_pool = GENRE_PHOTO_POOLS.get(genre, GENRE_PHOTO_POOLS["ambient"])
            photo_id = photo_pool[i % len(photo_pool)]
            image_url = f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=600&h=600&q=85"
            preview_url = f"/audio/{genre}.wav"

            records.append({
                "track_id": _random_track_id(genre, track_counter),
                "artists": artist,
                "album_name": album,
                "track_name": title,
                "popularity": popularity,
                "duration_ms": duration_ms,
                "danceability": round(danceability, 4),
                "energy": round(energy, 4),
                "valence": round(valence, 4),
                "acousticness": round(acousticness, 4),
                "instrumentalness": round(instrumentalness, 4),
                "speechiness": round(speechiness, 4),
                "liveness": round(liveness, 4),
                "tempo": round(tempo, 2),
                "loudness": round(loudness, 2),
                "track_genre": genre,
                "description": description,
                "image_url": image_url,
                "preview_url": preview_url
            })
            track_counter += 1

    df = pd.DataFrame(records)

    # Save to target path
    out_file = Path(output_path)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_file, index=False)
    print(f"Successfully seeded {len(df)} tracks across {len(genres)} genres to {out_file}")
    return df


def load_or_fetch_dataset(data_path: str = "backend/data/kaggle_spotify_tracks.csv") -> pd.DataFrame:
    """Load existing dataset or seed immediately if not found or missing image_url/preview_url."""
    path = Path(data_path)
    if path.exists() and path.stat().st_size > 100:
        df = pd.read_csv(path)
        if "image_url" in df.columns and "preview_url" in df.columns:
            return df
    return seed_curated_kaggle_dataset(str(path))


if __name__ == "__main__":
    target = Path(__file__).resolve().parent.parent.parent / "data" / "kaggle_spotify_tracks.csv"
    seed_curated_kaggle_dataset(str(target), n_samples=1200)
