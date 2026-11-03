"""
Tier 2: DPO Triplet Miner.
Conforms strictly to specs/SPEC_04_PREFERENCE_FLYWHEEL_AND_DPO.md.
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from backend.app.preference.store import PreferenceStore


class DPOPairMiner:
    """
    Mines (prompt, chosen, rejected) triplets from session interaction logs.
    A track saved/replayed (y_w) is chosen over a track skipped (y_l) under the same query context.
    """

    def __init__(self, store: PreferenceStore):
        self.store = store

    def mine_preference_pairs(self, user_id: str | None = None) -> list[dict[str, str]]:
        """
        Extract pairwise preference comparisons:
        Returns list of {"prompt": x, "chosen": y_w, "rejected": y_l}
        """
        interactions = self.store.get_interactions_for_user(user_id)
        if not interactions:
            return []

        # Group interactions by (user_id, query)
        sessions: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        for row in interactions:
            key = (row["user_id"], row["query"].strip().lower())
            sessions[key].append(row)

        pairs = []
        for (uid, query), group in sessions.items():
            chosen_tracks = [
                r for r in group if r["action"] in ["save", "replay"]
            ]
            rejected_tracks = [
                r for r in group if r["action"] == "skip"
            ]

            if not chosen_tracks or not rejected_tracks:
                continue

            # Pair every chosen track with every rejected track within the session
            for c in chosen_tracks:
                for r in rejected_tracks:
                    # Skip self-contradictions
                    if c["track_id"] == r["track_id"]:
                        continue

                    pairs.append({
                        "prompt": f"Recommend music for: \"{c['query']}\"",
                        "chosen": f"Track: {c['track_name']} by {c['artists']} | SID: {c['semantic_id']}",
                        "rejected": f"Track: {r['track_name']} by {r['artists']} | SID: {r['semantic_id']}",
                        "user_id": uid
                    })

        return pairs

    def export_dpo_jsonl(self, output_path: str | Path, user_id: str | None = None) -> int:
        """
        Save mined preference pairs to JSONL file for Hugging Face TRL trainer.
        """
        pairs = self.mine_preference_pairs(user_id=user_id)
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        with open(out_p, "w", encoding="utf-8") as f:
            for pair in pairs:
                f.write(json.dumps(pair) + "\n")

        return len(pairs)
