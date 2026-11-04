"""
Audio Preview Generator: Synthesizes high-fidelity, genre-tailored musical audio clips.
Creates native 16-bit 44.1kHz audio files in backend/data/audio_previews/
so the Sonora music player can stream authentic music immediately without external dependencies.
"""

from __future__ import annotations

import math
from pathlib import Path
import wave
import numpy as np

SAMPLE_RATE = 44100

# Musical scale frequencies (Hz)
NOTES = {
    "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00, "A4": 440.00, "B4": 493.88,
    "C5": 523.25, "D5": 587.33, "E5": 659.25, "F5": 698.46, "G5": 783.99, "A5": 880.00, "B5": 987.77
}


def create_tone(freq: float, duration: float, envelope_type: str = "piano") -> np.ndarray:
    """Generate a harmonic audio tone with acoustic ADSR envelope."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    # Fundamental + harmonics
    signal = (
        0.55 * np.sin(2 * np.pi * freq * t) +
        0.25 * np.sin(2 * np.pi * (freq * 2) * t) +
        0.12 * np.sin(2 * np.pi * (freq * 3) * t) +
        0.05 * np.sin(2 * np.pi * (freq * 4) * t)
    )

    n_samples = len(signal)
    if envelope_type == "piano":
        # Fast attack, exponential decay
        decay = np.exp(-3.5 * t)
        attack_len = min(int(0.02 * SAMPLE_RATE), n_samples)
        attack = np.linspace(0, 1, attack_len)
        decay[:attack_len] *= attack
        signal = signal * decay
    elif envelope_type == "ambient":
        # Slow swell, long sustain, gentle release
        window = np.sin(np.pi * np.linspace(0, 1, n_samples)) ** 1.5
        signal = signal * window
    elif envelope_type == "synth":
        # Punchy envelope with slight resonance
        decay = np.exp(-1.8 * t)
        signal = signal * decay

    return signal


def render_chord_progression(
    chords: list[list[str]],
    chord_duration: float = 3.5,
    style: str = "ambient"
) -> np.ndarray:
    """Compose a multi-chord musical loop."""
    total_samples = int(len(chords) * chord_duration * SAMPLE_RATE)
    mix = np.zeros(total_samples, dtype=np.float32)

    for i, chord in enumerate(chords):
        start_idx = int(i * chord_duration * SAMPLE_RATE)
        for note in chord:
            freq = NOTES.get(note, 261.63)
            tone = create_tone(freq, chord_duration, envelope_type=style)
            end_idx = min(start_idx + len(tone), total_samples)
            mix[start_idx:end_idx] += tone[:end_idx - start_idx]

    # Add gentle stereo chorus effect / normalization
    max_val = np.max(np.abs(mix))
    if max_val > 0:
        mix = mix / max_val * 0.85

    return mix


GENRE_PROFILES = {
    "ambient": {
        "style": "ambient",
        "chords": [["C3", "G3", "C4", "E4"], ["A2", "E3", "A3", "C4"], ["F2", "C3", "F3", "A3"], ["G2", "D3", "G3", "B3"]],
        "chord_dur": 4.0
    },
    "piano": {
        "style": "piano",
        "chords": [["C4", "E4", "G4", "B4"], ["A3", "C4", "E4", "G4"], ["F3", "A3", "C4", "E4"], ["G3", "B3", "D4", "F4"]],
        "chord_dur": 3.2
    },
    "classical": {
        "style": "piano",
        "chords": [["C3", "G3", "E4"], ["G2", "D3", "B3"], ["A2", "E3", "C4"], ["F2", "C3", "A3"]],
        "chord_dur": 3.5
    },
    "lo-fi": {
        "style": "piano",
        "chords": [["D3", "F3", "A3", "C4"], ["G3", "B3", "D4", "F4"], ["C3", "E3", "G3", "B3"], ["A2", "C3", "E3", "G3"]],
        "chord_dur": 3.0
    },
    "electronic": {
        "style": "synth",
        "chords": [["A3", "C4", "E4"], ["F3", "A3", "C4"], ["D3", "F3", "A3"], ["E3", "G3", "B3"]],
        "chord_dur": 2.2
    },
    "deep-house": {
        "style": "synth",
        "chords": [["F3", "A3", "C4", "E4"], ["D3", "F3", "A3", "C4"], ["G3", "B3", "D4"], ["E3", "G3", "B3"]],
        "chord_dur": 2.5
    },
    "indie": {
        "style": "ambient",
        "chords": [["G3", "B3", "D4"], ["E3", "G3", "B3"], ["C3", "E3", "G3"], ["D3", "F3", "A3"]],
        "chord_dur": 3.0
    },
    "post-rock": {
        "style": "ambient",
        "chords": [["D3", "A3", "D4", "F4"], ["B2", "F3", "B3", "D4"], ["G2", "D3", "G3", "B3"], ["A2", "E3", "A3", "C4"]],
        "chord_dur": 4.0
    },
    "synthwave": {
        "style": "synth",
        "chords": [["A2", "E3", "A3", "C4"], ["F2", "C3", "F3", "A3"], ["C3", "G3", "C4", "E4"], ["G2", "D3", "G3", "B3"]],
        "chord_dur": 2.4
    },
    "jazz": {
        "style": "piano",
        "chords": [["D3", "F3", "A3", "C4"], ["G2", "B3", "D4", "F4"], ["C3", "E3", "G3", "B3"], ["A2", "C3", "E3", "G3"]],
        "chord_dur": 3.2
    },
    "chill": {
        "style": "ambient",
        "chords": [["C3", "E3", "G3", "B3"], ["F2", "A3", "C4", "E4"], ["A2", "C3", "E3", "G3"], ["G2", "B2", "D3", "F3"]],
        "chord_dur": 3.5
    },
    "rock": {
        "style": "synth",
        "chords": [["E2", "B2", "E3"], ["G2", "D3", "G3"], ["A2", "E3", "A3"], ["B2", "F3", "B3"]],
        "chord_dur": 2.5
    },
    "metal": {
        "style": "synth",
        "chords": [["D2", "A2", "D3"], ["F2", "C3", "F3"], ["C2", "G2", "C3"], ["B1", "F2", "B2"]],
        "chord_dur": 2.2
    },
    "pop": {
        "style": "piano",
        "chords": [["C4", "G4", "E5"], ["G3", "D4", "B4"], ["A3", "E4", "C5"], ["F3", "C4", "A4"]],
        "chord_dur": 2.6
    },
    "r-n-b": {
        "style": "piano",
        "chords": [["E3", "G3", "B3", "D4"], ["A2", "C3", "E3", "G3"], ["D3", "F3", "A3", "C4"], ["G2", "B2", "D3", "F3"]],
        "chord_dur": 3.2
    },
    "folk": {
        "style": "ambient",
        "chords": [["G3", "D4", "G4"], ["C3", "G3", "E4"], ["E3", "B3", "G4"], ["D3", "A3", "F4"]],
        "chord_dur": 3.2
    },
    "downtempo": {
        "style": "ambient",
        "chords": [["C3", "G3", "D4"], ["F2", "C3", "A3"], ["A2", "E3", "B3"], ["G2", "D3", "F3"]],
        "chord_dur": 3.8
    }
}


def save_wav(filename: Path, audio: np.ndarray) -> None:
    """Write normalized float32 array to 16-bit PCM WAV."""
    int_audio = np.int16(audio * 32767)
    with wave.open(str(filename), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(int_audio.tobytes())


def generate_all_previews(output_dir: str | Path = "backend/data/audio_previews") -> dict[str, str]:
    """Generate audio files for all supported genres."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    generated = {}

    for genre, conf in GENRE_PROFILES.items():
        file_path = out_path / f"{genre}.wav"
        if not file_path.exists() or file_path.stat().st_size < 1000:
            audio = render_chord_progression(
                chords=conf["chords"],
                chord_duration=conf["chord_dur"],
                style=conf["style"]
            )
            save_wav(file_path, audio)
        generated[genre] = f"/audio/{genre}.wav"

    # Default fallback
    default_path = out_path / "default.wav"
    if not default_path.exists():
        default_audio = render_chord_progression(
            chords=GENRE_PROFILES["ambient"]["chords"],
            chord_duration=3.5,
            style="ambient"
        )
        save_wav(default_path, default_audio)
    generated["default"] = "/audio/default.wav"

    print(f"Generated {len(generated)} audio previews in {out_path}")
    return generated


if __name__ == "__main__":
    generate_all_previews()
