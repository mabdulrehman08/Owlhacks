"""Controller for /sessions/{id}/insights: the dashboard's highlights."""

from fastapi import APIRouter

from controllers.session_controller import require_session
from models import reaction
from services import analytics
from views.schemas import Insights

router = APIRouter(prefix="/sessions/{session_id}/insights", tags=["insights"])


@router.get("", response_model=Insights)
def get_insights(session_id: str):
    require_session(session_id)
    return analytics.insights(reaction.list_for_session(session_id))
