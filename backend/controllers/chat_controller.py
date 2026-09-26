"""Controller for /sessions/{id}/chat: questions answered by the agent."""

from fastapi import APIRouter, HTTPException

from controllers.session_controller import require_session
from services import agent
from views.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/sessions/{session_id}/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(session_id: str, body: ChatRequest):
    require_session(session_id)
    try:
        return agent.chat(session_id, body.message, [h.model_dump() for h in body.history])
    except Exception as e:
        raise HTTPException(502, f"Agent error: {e}")
