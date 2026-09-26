"""Deterministic analytics over a list of reactions. No LLM here.

Each reaction is a dict with timestamp, type, intensity, confidence.
"""

from collections import Counter
from typing import Optional

# How positive/negative each emotion label is, from -1 to 1.
# Unknown labels are treated as neutral (0), so new labels from the detector won't break anything.
VALENCE = {
    "joy": 1.0,
    "happiness": 1.0,
    "happy": 1.0,
    "amusement": 1.0,
    "excitement": 0.9,
    "interest": 0.5,
    "surprise": 0.3,
    "neutral": 0.0,
    "boredom": -0.5,
    "confusion": -0.6,
    "fear": -0.7,
    "sadness": -0.8,
    "frustration": -0.8,
    "anger": -1.0,
    "disgust": -1.0,
}

NEGATIVE_TYPES = {t for t, v in VALENCE.items() if v < 0}
# Moments closer together than this are treated as the same moment in top-N lists.
MIN_MOMENT_GAP = 5.0


def valence(r: dict) -> float:
    return VALENCE.get(r["type"], 0.0)


def weight(r: dict) -> float:
    """How strong and trustworthy a reaction is, ignoring direction."""
    return r["intensity"] * r.get("confidence", 1.0)


def valence_score(r: dict) -> float:
    """Signed score: positive for good reactions, negative for bad ones."""
    return valence(r) * weight(r)


def salience(r: dict) -> float:
    """Unsigned 'how big was this reaction'. Neutral reactions don't count."""
    return 0.0 if r["type"] == "neutral" else weight(r)


def _moment(r: dict, score: float) -> dict:
    return {
        "timestamp": r["timestamp"],
        "type": r["type"],
        "intensity": r["intensity"],
        "confidence": r.get("confidence", 1.0),
        "score": round(score, 4),
    }


def _sorted(reactions: list[dict]) -> list[dict]:
    return sorted(reactions, key=lambda r: r["timestamp"])


def most_positive(reactions: list[dict]) -> Optional[dict]:
    candidates = [r for r in reactions if valence(r) > 0]
    if not candidates:
        return None
    best = max(candidates, key=valence_score)
    return _moment(best, valence_score(best))


def most_negative(reactions: list[dict]) -> Optional[dict]:
    candidates = [r for r in reactions if valence(r) < 0]
    if not candidates:
        return None
    worst = min(candidates, key=valence_score)
    return _moment(worst, valence_score(worst))


def biggest_reaction(reactions: list[dict]) -> Optional[dict]:
    candidates = [r for r in reactions if salience(r) > 0]
    if not candidates:
        return None
    best = max(candidates, key=salience)
    return _moment(best, salience(best))


def most_negative_shift(reactions: list[dict]) -> Optional[dict]:
    """Largest drop in valence score between consecutive reactions that lands on a
    negative emotion (a drop from joy to neutral is just calming down, not a problem)."""
    rs = _sorted(reactions)
    best = None
    for prev, cur in zip(rs, rs[1:]):
        if valence(cur) >= 0:
            continue
        delta = valence_score(cur) - valence_score(prev)
        if delta < 0 and (best is None or delta < best["delta"]):
            best = {
                "timestamp": cur["timestamp"],
                "type": cur["type"],
                "intensity": cur["intensity"],
                "from_timestamp": prev["timestamp"],
                "from_type": prev["type"],
                "delta": round(delta, 4),
            }
    return best


def top_moments(reactions: list[dict], n: int = 5, min_gap: float = MIN_MOMENT_GAP) -> list[dict]:
    """Top-n most salient reactions, skipping ones within `min_gap` seconds of an already-picked moment."""
    picked: list[dict] = []
    for r in sorted(reactions, key=salience, reverse=True):
        if salience(r) <= 0:
            break
        if all(abs(r["timestamp"] - p["timestamp"]) >= min_gap for p in picked):
            picked.append(r)
        if len(picked) == n:
            break
    return [_moment(r, salience(r)) for r in picked]


def negative_moments(reactions: list[dict], types: Optional[set[str]] = None) -> list[dict]:
    """All negative reactions (optionally restricted to `types`), strongest first."""
    types = types or NEGATIVE_TYPES
    hits = [r for r in reactions if r["type"] in types]
    return [_moment(r, weight(r)) for r in sorted(hits, key=weight, reverse=True)]


def reaction_at(reactions: list[dict], timestamp: float) -> Optional[dict]:
    """The reaction closest to `timestamp`, with its distance in seconds."""
    if not reactions:
        return None
    r = min(reactions, key=lambda r: abs(r["timestamp"] - timestamp))
    return {**_moment(r, valence_score(r)), "distance": round(abs(r["timestamp"] - timestamp), 2)}


def summary(reactions: list[dict]) -> dict:
    if not reactions:
        return {
            "reaction_count": 0,
            "duration": 0.0,
            "dominant_emotion": None,
            "average_intensity": 0.0,
            "overall_sentiment": 0.0,
            "counts_by_type": {},
        }
    rs = _sorted(reactions)
    counts = Counter(r["type"] for r in rs)
    non_neutral = Counter({t: c for t, c in counts.items() if t != "neutral"})
    dominant = (non_neutral or counts).most_common(1)[0][0]
    total_weight = sum(weight(r) for r in rs) or 1.0
    return {
        "reaction_count": len(rs),
        "duration": round(rs[-1]["timestamp"] - rs[0]["timestamp"], 2),
        "dominant_emotion": dominant,
        "average_intensity": round(sum(r["intensity"] for r in rs) / len(rs), 4),
        # Weighted mean valence, so strong confident reactions count more.
        "overall_sentiment": round(sum(valence_score(r) for r in rs) / total_weight, 4),
        "counts_by_type": dict(counts.most_common()),
    }


def insights(reactions: list[dict]) -> dict:
    return {
        "most_positive": most_positive(reactions),
        "biggest_reaction": biggest_reaction(reactions),
        "most_negative_shift": most_negative_shift(reactions),
        "top_5": top_moments(reactions, 5),
        "summary": summary(reactions),
    }
