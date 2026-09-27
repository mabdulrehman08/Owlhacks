"""Reaction model: one detected emotion at a moment in a video. All SQL for reactions lives here."""

from typing import Iterable, Optional

from models.database import get_conn


def add_many(session_id: str, reactions: Iterable[dict]) -> int:
    rows = [
        (session_id, r["timestamp"], r["type"], r["intensity"], r.get("confidence", 1.0), r.get("breathing_rate"))
        for r in reactions
    ]
    with get_conn() as conn:
        conn.executemany(
            "INSERT INTO reactions (session_id, timestamp, type, intensity, confidence, breathing_rate) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            rows,
        )
    return len(rows)


def list_for_session(session_id: str, start: Optional[float] = None, end: Optional[float] = None) -> list[dict]:
    """Reactions in time order, optionally limited to start..end seconds (inclusive)."""
    query = (
        "SELECT id, timestamp, type, intensity, confidence, breathing_rate FROM reactions WHERE session_id = ?"
    )
    params: list = [session_id]
    if start is not None:
        query += " AND timestamp >= ?"
        params.append(start)
    if end is not None:
        query += " AND timestamp <= ?"
        params.append(end)
    query += " ORDER BY timestamp"
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(query, params).fetchall()]
