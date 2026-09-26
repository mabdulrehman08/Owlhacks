"""SQLite storage for sessions and reactions."""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

BASE_DIR = Path(__file__).parent
DB_PATH = Path(os.environ.get("REACTIONS_DB", BASE_DIR / "reactions.db"))
MOCK_PATH = BASE_DIR / "mock_reactions.json"
DEMO_SESSION_ID = "demo"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                name TEXT,
                video_url TEXT,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS reactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                timestamp REAL NOT NULL,
                type TEXT NOT NULL,
                intensity REAL NOT NULL,
                confidence REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_reactions_session_ts
                ON reactions(session_id, timestamp);
            """
        )
    seed_demo()


def seed_demo() -> None:
    """Create the `demo` session from mock_reactions.json if it doesn't exist."""
    if get_session(DEMO_SESSION_ID):
        return
    reactions = json.loads(MOCK_PATH.read_text())
    create_session(DEMO_SESSION_ID, name="Demo video", video_url=None)
    add_reactions(DEMO_SESSION_ID, reactions)


def create_session(session_id: Optional[str], name: Optional[str], video_url: Optional[str]) -> str:
    session_id = session_id or uuid.uuid4().hex[:8]
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (id, name, video_url, created_at) VALUES (?, ?, ?, ?)",
            (session_id, name, video_url, datetime.now(timezone.utc).isoformat()),
        )
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT s.*, COUNT(r.id) AS reaction_count
            FROM sessions s LEFT JOIN reactions r ON r.session_id = s.id
            WHERE s.id = ? GROUP BY s.id
            """,
            (session_id,),
        ).fetchone()
    return dict(row) if row else None


def list_sessions() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT s.*, COUNT(r.id) AS reaction_count
            FROM sessions s LEFT JOIN reactions r ON r.session_id = s.id
            GROUP BY s.id ORDER BY s.created_at DESC
            """
        ).fetchall()
    return [dict(r) for r in rows]


def add_reactions(session_id: str, reactions: Iterable[dict]) -> int:
    rows = [
        (session_id, r["timestamp"], r["type"], r["intensity"], r.get("confidence", 1.0))
        for r in reactions
    ]
    with get_conn() as conn:
        conn.executemany(
            "INSERT INTO reactions (session_id, timestamp, type, intensity, confidence) VALUES (?, ?, ?, ?, ?)",
            rows,
        )
    return len(rows)


def get_reactions(session_id: str, start: Optional[float] = None, end: Optional[float] = None) -> list[dict]:
    query = "SELECT id, timestamp, type, intensity, confidence FROM reactions WHERE session_id = ?"
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
