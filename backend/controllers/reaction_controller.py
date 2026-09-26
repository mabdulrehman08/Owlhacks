"""Controller for /sessions/{id}/reactions: Person 1 posts detector output here,
Person 2 reads it for the timeline."""

from typing import Optional

from fastapi import APIRouter

from controllers.session_controller import require_session
from models import reaction
from views.schemas import Reaction, ReactionIn, Session

router = APIRouter(prefix="/sessions/{session_id}/reactions", tags=["reactions"])


@router.post("", response_model=Session)
def add_reactions(session_id: str, reactions: list[ReactionIn]):
    """Append reactions to a session. This is where Person 1's detector posts its output."""
    require_session(session_id)
    reaction.add_many(session_id, [r.model_dump() for r in reactions])
    return require_session(session_id)


@router.get("", response_model=list[Reaction])
def get_reactions(session_id: str, start: Optional[float] = None, end: Optional[float] = None):
    require_session(session_id)
    return reaction.list_for_session(session_id, start, end)
