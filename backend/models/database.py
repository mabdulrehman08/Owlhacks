"""SQLite connection, table setup, and demo seed data."""

import json
import sqlite3

import config


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH)
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
    """Create the `demo` session from data/mock_reactions.json if it doesn't exist."""
    from models import reaction, session  # imported here to avoid a circular import

    if session.get(config.DEMO_SESSION_ID):
        return
    session.create(
        config.DEMO_SESSION_ID,
        name="Demo video",
        video_url="/api/videos/product_demo.mp4",
    )
    reaction.add_many(config.DEMO_SESSION_ID, json.loads(config.MOCK_REACTIONS_PATH.read_text()))
