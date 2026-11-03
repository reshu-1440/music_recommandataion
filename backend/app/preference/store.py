"""
SQLite Preference Store for AI Playlist Flywheel.
Conforms strictly to specs/SPEC_04_PREFERENCE_FLYWHEEL_AND_DPO.md.
"""

from __future__ import annotations

import datetime
import json
import sqlite3
from pathlib import Path
from typing import Any

ACTION_WEIGHTS = {
    "save": 1.0,
    "replay": 1.5,
    "play": 0.5,
    "skip": -1.0
}


class PreferenceStore:
    """
    Manages persistent user interactions (save, skip, replay, play)
    and taste profile state using pure SQLite with parameterized queries.
    """

    def __init__(self, db_path: str | Path = "backend/data/preferences.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        """Create a connection with row_factory and foreign keys enabled."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_db(self) -> None:
        """Create tables safely if they do not exist."""
        with self.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    track_id TEXT NOT NULL,
                    track_name TEXT NOT NULL,
                    artists TEXT NOT NULL,
                    query TEXT NOT NULL,
                    action TEXT NOT NULL,
                    weight REAL NOT NULL,
                    semantic_id TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_taste_profiles (
                    user_id TEXT PRIMARY KEY,
                    save_count INTEGER DEFAULT 0,
                    skip_count INTEGER DEFAULT 0,
                    play_count INTEGER DEFAULT 0,
                    pos_centroid_json TEXT,
                    neg_centroid_json TEXT,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.commit()

    def log_interaction(
        self,
        user_id: str,
        track: dict[str, Any],
        query: str,
        action: str
    ) -> dict[str, Any]:
        """
        Record a user feedback interaction and update user stats.
        """
        act = action.lower().strip()
        if act not in ACTION_WEIGHTS:
            raise ValueError(f"Invalid action '{action}'. Must be one of {list(ACTION_WEIGHTS.keys())}")

        weight = ACTION_WEIGHTS[act]
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        track_id = track.get("track_id", "TRK-UNKNOWN")
        track_name = track.get("track_name") or track.get("title", "Unknown Track")
        artists = track.get("artists") or track.get("artist", "Unknown Artist")
        semantic_id = track.get("semantic_id") or track.get("id", "SID-00-00-00-00")

        with self.get_connection() as conn:
            # 1. Insert interaction record
            conn.execute("""
                INSERT INTO user_interactions (
                    user_id, track_id, track_name, artists, query, action, weight, semantic_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (user_id, track_id, track_name, artists, query, act, weight, semantic_id, now))

            # 2. Update user profile counters
            save_inc = 1 if act == "save" else 0
            skip_inc = 1 if act == "skip" else 0
            play_inc = 1 if act in ["play", "replay"] else 0

            conn.execute("""
                INSERT INTO user_taste_profiles (
                    user_id, save_count, skip_count, play_count, updated_at
                ) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    save_count = save_count + ?,
                    skip_count = skip_count + ?,
                    play_count = play_count + ?,
                    updated_at = ?;
            """, (user_id, save_inc, skip_inc, play_inc, now, save_inc, skip_inc, play_inc, now))

            conn.commit()

        return {
            "status": "success",
            "action": act,
            "weight": weight,
            "track_id": track_id,
            "user_id": user_id
        }

    def get_user_stats(self, user_id: str) -> dict[str, Any]:
        """Get aggregate counts and recent activity history."""
        with self.get_connection() as conn:
            row = conn.execute("""
                SELECT save_count, skip_count, play_count, updated_at
                FROM user_taste_profiles WHERE user_id = ?;
            """, (user_id,)).fetchone()

            save_cnt = row["save_count"] if row else 0
            skip_cnt = row["skip_count"] if row else 0
            play_cnt = row["play_count"] if row else 0

            history_rows = conn.execute("""
                SELECT track_name, artists, action, created_at
                FROM user_interactions
                WHERE user_id = ?
                ORDER BY id DESC LIMIT 10;
            """, (user_id,)).fetchall()

        history_msgs = []
        for r in history_rows:
            action_verb = {
                "save": "Saved",
                "replay": "Replayed",
                "play": "Played",
                "skip": "Skipped"
            }.get(r["action"], "Interacted with")
            history_msgs.append(f"{action_verb} '{r['track_name']}' by {r['artists']}")

        return {
            "user_id": user_id,
            "saved_count": save_cnt,
            "skipped_count": skip_cnt,
            "played_count": play_cnt,
            "total_interactions": save_cnt + skip_cnt + play_cnt,
            "history": history_msgs
        }

    def get_interactions_for_user(self, user_id: str | None = None) -> list[dict[str, Any]]:
        """Retrieve interaction rows for DPO triplet mining."""
        with self.get_connection() as conn:
            if user_id:
                cursor = conn.execute("""
                    SELECT id, user_id, track_id, track_name, artists, query, action, weight, semantic_id, created_at
                    FROM user_interactions WHERE user_id = ? ORDER BY id ASC;
                """, (user_id,))
            else:
                cursor = conn.execute("""
                    SELECT id, user_id, track_id, track_name, artists, query, action, weight, semantic_id, created_at
                    FROM user_interactions ORDER BY id ASC;
                """)
            return [dict(row) for row in cursor.fetchall()]
