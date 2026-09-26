"""Controller for /sessions: create, list, and fetch sessions."""

import sqlite3

from fastapi import APIRouter, HTTPException

from models import reaction, session
from views.schemas import Session, SessionCreate

router = APIRouter(prefix="/sessions", tags=["sessions"])


def require_session(session_id: str) -> dict:
    """Shared by all controllers: the session, or a 404 if it doesn't exist."""
    found = session.get(session_id)
    if not found:
        raise HTTPException(404, f"Session '{session_id}' not found")
    return found


@router.post("", response_model=Session, status_code=201)
def create_session(body: SessionCreate):
    try:
        session_id = session.create(body.id, body.name, body.video_url)
    except sqlite3.IntegrityError:
        raise HTTPException(409, f"Session '{body.id}' already exists")
    if body.reactions:
        reaction.add_many(session_id, [r.model_dump() for r in body.reactions])
    return require_session(session_id)


@router.get("", response_model=list[Session])
def list_sessions():
    return session.list_all()


@router.get("/{session_id}", response_model=Session)
def get_session(session_id: str):
    return require_session(session_id)
