"""
Validator for natural language listening moods and edge-case detection.
Guards Sonora against gibberish, numeric noise, off-topic requests, and non-musical inputs.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


# Curated set of musical genres, acoustic descriptors, moods, and listening activities
MUSIC_AND_MOOD_KEYWORDS = {
    # Moods & Emotional states
    "calm", "chill", "relax", "relaxing", "relaxed", "peaceful", "quiet", "soft",
    "gentle", "serene", "soothing", "mellow", "ambient", "meditative", "zen",
    "happy", "cheerful", "uplifting", "feel good", "joy", "joyful", "warm", "bright",
    "sunny", "euphoric", "ecstatic", "bliss", "blissful", "smile", "positive",
    "sad", "melancholy", "melancholic", "sorrow", "tear", "crying", "cry", "wistful",
    "gloomy", "dark", "moody", "lonely", "alone", "nostalgic", "nostalgia", "heartbreak",
    "energetic", "upbeat", "fast", "hype", "intense", "aggressive", "heavy", "powerful",
    "dynamic", "motivating", "motivational", "explosive", "angry", "rage",
    "dreamy", "ethereal", "atmospheric", "spacey", "trippy", "psychedelic", "cosmic",
    "romantic", "love", "sensual", "sexy", "intimate", "sweet", "passionate",
    "spooky", "eerie", "mysterious", "dramatic", "epic", "cinematic", "haunting",
    "funky", "groovy", "playful", "bouncy", "vibrant", "quirky",

    # Listening Contexts & Activities
    "study", "studying", "focus", "deep focus", "concentrate", "concentration",
    "work", "working", "office", "coding", "programming", "reading", "writing",
    "sleep", "sleeping", "sleepy", "bedtime", "insomnia", "nap", "drowsy",
    "night", "late night", "3 am", "3am", "midnight", "nocturnal", "dawn", "dusk",
    "morning", "breakfast", "coffee", "tea", "wake up", "sunrise", "sunset", "evening",
    "workout", "gym", "gymming", "run", "running", "jogging", "cardio", "lifting",
    "weights", "fitness", "training", "exercise", "crossfit", "yoga", "stretch",
    "walk", "walking", "hiking", "commute", "driving", "drive", "road trip", "highway",
    "party", "club", "clubbing", "dance", "dancing", "rave", "festival",
    "rain", "rainy", "storm", "thunder", "cloudy", "autumn", "winter", "summer", "spring",
    "beach", "ocean", "sea", "bonfire", "campfire", "cozy", "fireplace", "lounge", "cafe",
    "gaming", "gamer", "chillout", "meditation", "chores", "cleaning",

    # Genres & Musical Styles
    "pop", "rock", "indie", "electronic", "electronica", "synthwave", "retrowave", "vaporwave",
    "lo-fi", "lofi", "chillhop", "trip hop", "downtempo", "ambient", "drone",
    "hip hop", "hip-hop", "hiphop", "rap", "trap", "r&b", "rnb", "soul", "neo-soul", "funk",
    "jazz", "blues", "classical", "neo-classical", "piano", "acoustic", "folk", "country",
    "metal", "heavy metal", "death metal", "punk", "hardcore", "post-rock", "grunge",
    "house", "deep house", "tech house", "techno", "edm", "trance", "dubstep", "dnb",
    "drum and bass", "garage", "disco", "reggae", "dub", "afrobeat", "latin", "salsa",
    "bossa nova", "k-pop", "kpop", "j-pop", "jpop", "shoegaze", "emo", "soundtrack",
    "score", "orchestral", "choral", "opera", "ska", "gospel",

    # Instruments & Acoustic Qualities
    "piano", "guitar", "acoustic guitar", "electric guitar", "strings", "violin", "cello",
    "bass", "synth", "synths", "synthesizer", "rhodes", "keyboard", "drums", "percussion",
    "beat", "beats", "808", "brass", "horn", "trumpet", "saxophone", "sax", "flute",
    "vocal", "vocals", "voice", "singing", "choir", "instrumental", "acousticness",
    "tempo", "bpm", "rhythm", "melody", "melodic", "harmony", "chords", "reverb", "distortion",
    "acoustic", "soundscape", "texture", "textures", "vibe", "vibes", "tune", "tunes",
    "music", "song", "songs", "track", "tracks", "sound", "sounds"
}

# Short recognized abbreviations (valid even with length <= 3)
SHORT_VALID_TOKENS = {
    "pop", "rap", "r&b", "rnb", "edm", "gym", "sad", "joy", "run", "dnb", "dub",
    "sax", "lofi", "80s", "90s", "70s", "60s", "hip", "hop", "cry", "tea", "nap"
}

# Standard keyboard mash rows
KEYBOARD_MASH_PATTERNS = [
    r"asdfg", r"sdfgh", r"dfghj", r"fghjk", r"ghjkl",
    r"qwert", r"werty", r"ertyu", r"rtyui", r"tyuio", r"yuiop",
    r"zxcvb", r"xcvbn", r"cvbnm",
    r"12345", r"23456", r"34567", r"45678", r"56789", r"67890",
    r"lkjhg", r"poiuy", r"mnbvc"
]

# Off-topic question starters that are not asking for music
OFF_TOPIC_STARTERS = [
    r"^what\s+(is|are|was|were)\s+(the|a|an)\b",
    r"^who\s+(is|are|was|were)\b",
    r"^where\s+(is|are|was|were)\b",
    r"^how\s+(to|do|does|did|can|could|is|are)\b",
    r"^why\s+(is|are|do|does|did)\b",
    r"^when\s+(did|was|will|is)\b",
    r"^explain\s+(how|what|why|the)\b",
    r"^tell\s+me\s+about\b",
    r"^calculate\b",
    r"^write\s+(code|python|java|javascript|c\+\+|sql|an\s+essay|a\s+poem|a\s+letter|script)\b",
    r"^solve\b",
    r"^buy\s+(a|an|the|some)\b",
    r"^cook\s+(a|an|the|some)\b"
]


@dataclass
class MoodValidationResult:
    is_valid: bool
    error_message: str = ""
    reason: str = ""


def validate_listening_mood(query: str) -> MoodValidationResult:
    """
    Validates whether the user's natural language input represents a valid
    listening mood, acoustic vibe, music genre, or listening context.

    Detects edge cases:
      1. Empty or whitespace-only queries.
      2. Pure numbers or predominantly numeric strings (e.g. "23458792345345").
      3. Pure symbols, punctuation, or emoji spam.
      4. Keyboard mash and random gibberish (e.g. "asdfghjkl", "qwertyuiop").
      5. Repetitive characters (e.g. "aaaaa", "zzzzzz").
      6. Extremely short queries (< 3 chars unless a recognized music term).
      7. Off-topic queries (encyclopedic questions, coding requests, shopping tasks).
      8. Excessively long spam (> 500 characters).
    """
    if not query or not query.strip():
        return MoodValidationResult(
            is_valid=False,
            error_message="Please describe your listening mood first.",
            reason="empty_query"
        )

    raw = query.strip()
    lowered = raw.lower()

    # 1. Length bounds
    if len(raw) > 500:
        return MoodValidationResult(
            is_valid=False,
            error_message="Your description is too long (max 500 characters). Please enter a concise mood or vibe.",
            reason="excessive_length"
        )

    # 2. Check pure numbers or numeric predominance
    # e.g., "23458792345345", "12345", "999999"
    digits_count = sum(c.isdigit() for c in raw)
    letters_count = sum(c.isalpha() for c in raw)

    if letters_count == 0 and digits_count > 0:
        return MoodValidationResult(
            is_valid=False,
            error_message="Numbers alone don't describe a mood. Please describe a feeling, tempo, activity, or genre (e.g., 'Late Night Study', 'Heavy Workout').",
            reason="numeric_only"
        )

    if digits_count > 0 and letters_count > 0:
        digit_ratio = digits_count / len(raw)
        if digit_ratio > 0.5:
            # Check if any recognized music keyword is present
            has_music_kw = any(k in lowered for k in MUSIC_AND_MOOD_KEYWORDS)
            if not has_music_kw:
                return MoodValidationResult(
                    is_valid=False,
                    error_message="Please enter a valid listening mood. Numbers or random codes cannot be translated into music recommendations.",
                    reason="numeric_dominated"
                )

    # 3. Check pure symbols / punctuation / special characters
    if letters_count == 0 and digits_count == 0:
        return MoodValidationResult(
            is_valid=False,
            error_message="Symbols and punctuation don't indicate a musical mood. Please enter words describing your vibe or listening context.",
            reason="symbols_only"
        )

    # 4. Short length check (< 3 characters)
    cleaned_alpha = re.sub(r"[^a-z0-9]", "", lowered)
    if len(cleaned_alpha) < 3:
        if cleaned_alpha not in SHORT_VALID_TOKENS:
            return MoodValidationResult(
                is_valid=False,
                error_message="Your prompt is too short. Please describe your listening mood with a few descriptive words or a recognized genre.",
                reason="too_short"
            )

    # 5. Check repeated characters (e.g. "aaaaa", "zzzzzz", "xxxxxx")
    if re.search(r"(.)\1{4,}", lowered):
        # Unless it's laughing like hahaha, check if any music keyword exists
        has_music_kw = any(k in lowered for k in MUSIC_AND_MOOD_KEYWORDS)
        if not has_music_kw:
            return MoodValidationResult(
                is_valid=False,
                error_message="That doesn't look like a mood or vibe. Please enter a valid mood (e.g., 'deep focus', 'mellow acoustic', 'synthwave night drive').",
                reason="repetitive_characters"
            )

    # 6. Check keyboard mash patterns (e.g. "asdfghjkl", "qwertyuiop")
    for pattern in KEYBOARD_MASH_PATTERNS:
        if pattern in lowered:
            has_music_kw = any(k in lowered for k in MUSIC_AND_MOOD_KEYWORDS)
            if not has_music_kw:
                return MoodValidationResult(
                    is_valid=False,
                    error_message="We couldn't recognize a valid mood or vibe. Please enter a valid listening mood (e.g., 'Late Night 3 AM', 'Deep focus').",
                    reason="keyboard_mash"
                )

    # 7. Check for words without vowels (consonant mash like "dfghjkl", "zxcvbnm", "qwrtyp")
    words = re.findall(r"[a-z]+", lowered)
    if words:
        vowels = set("aeiouy")
        has_recognized = any(w in SHORT_VALID_TOKENS or any(k in w for k in MUSIC_AND_MOOD_KEYWORDS) for w in words)
        if not has_recognized:
            mash_words = [w for w in words if len(w) >= 4 and not any(c in vowels for c in w)]
            if mash_words and len(mash_words) == len(words):
                return MoodValidationResult(
                    is_valid=False,
                    error_message="We couldn't recognize a valid mood from those words. Please enter a mood, genre, or activity.",
                    reason="consonant_mash"
                )

    # 8. Check off-topic questions or tasks (e.g., "what is the capital of France", "write python code")
    for pattern in OFF_TOPIC_STARTERS:
        if re.search(pattern, lowered):
            # If the user asks e.g. "what is good music for studying", that DOES contain music keywords!
            has_music_kw = any(k in lowered for k in MUSIC_AND_MOOD_KEYWORDS)
            if not has_music_kw:
                return MoodValidationResult(
                    is_valid=False,
                    error_message="This query doesn't seem related to music or mood. Sonora is designed for music discovery. Try describing how you feel or what you're doing.",
                    reason="off_topic_query"
                )

    # 9. General off-topic programming/math/system probe checks
    off_topic_keywords = [
        "python code", "write code", "javascript", "docker container",
        "sql query", "react component", "binary search", "leetcode",
        "capital of", "weather today", "crypto price", "bitcoin price",
        "system prompt", "ignore previous instructions", "order pizza",
        "buy groceries", "how to cook"
    ]
    for otk in off_topic_keywords:
        if otk in lowered:
            has_music_kw = any(k in lowered for k in MUSIC_AND_MOOD_KEYWORDS)
            if not has_music_kw:
                return MoodValidationResult(
                    is_valid=False,
                    error_message="This query appears off-topic. Please describe a music vibe, genre, or mood.",
                    reason="off_topic_keyword"
                )

    return MoodValidationResult(is_valid=True)
