"""Session model: one recorded viewing of a video. All SQL for sessions lives here."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from models.database import get_conn

# Every read returns the session plus how many reactions it has.
_SELECT = """
    SELECT s.*, COUNT(r.id) AS reaction_count
    FROM sessions s LEFT JOIN reactions r ON r.session_id = s.id
"""


def create(session_id: Optional[str], name: Optional[str], video_url: Optional[str]) -> str:
    """Insert a session and return its id. Raises sqlite3.IntegrityError if the id is taken."""
    session_id = session_id or uuid.uuid4().hex[:8]
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (id, name, video_url, created_at) VALUES (?, ?, ?, ?)",
            (session_id, name, video_url, datetime.now(timezone.utc).isoformat()),
        )
    return session_id


def get(session_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(_SELECT + " WHERE s.id = ? GROUP BY s.id", (session_id,)).fetchone()
    return dict(row) if row else None


def list_all() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(_SELECT + " GROUP BY s.id ORDER BY s.created_at DESC").fetchall()
    return [dict(r) for r in rows]


def delete(session_id: str) -> None:
    """Delete a session and (via ON DELETE CASCADE) all its reactions."""
    with get_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
