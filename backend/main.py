"""FastAPI app. Run with:  uvicorn main:app --reload   (then open /docs)"""

import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load backend/.env (your private ANTHROPIC_API_KEY) before anything reads the environment.
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import agent
import analytics
import database
from models import ChatRequest, ChatResponse, Insights, Reaction, ReactionIn, Session, SessionCreate


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield


app = FastAPI(title="Reaction Analytics API", lifespan=lifespan)

# Wide open for the hackathon so the React dev server can call us.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def require_session(session_id: str) -> dict:
    session = database.get_session(session_id)
    if not session:
        raise HTTPException(404, f"Session '{session_id}' not found")
    return session


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/sessions", response_model=Session, status_code=201)
def create_session(body: SessionCreate):
    try:
        session_id = database.create_session(body.id, body.name, body.video_url)
    except sqlite3.IntegrityError:
        raise HTTPException(409, f"Session '{body.id}' already exists")
    if body.reactions:
        database.add_reactions(session_id, [r.model_dump() for r in body.reactions])
    return require_session(session_id)


@app.get("/sessions", response_model=list[Session])
def list_sessions():
    return database.list_sessions()


@app.get("/sessions/{session_id}", response_model=Session)
def get_session(session_id: str):
    return require_session(session_id)


@app.post("/sessions/{session_id}/reactions", response_model=Session)
def add_reactions(session_id: str, reactions: list[ReactionIn]):
    """Append reactions to a session. This is where Person 1's detector posts its output."""
    require_session(session_id)
    database.add_reactions(session_id, [r.model_dump() for r in reactions])
    return require_session(session_id)


@app.get("/sessions/{session_id}/reactions", response_model=list[Reaction])
def get_reactions(session_id: str, start: Optional[float] = None, end: Optional[float] = None):
    require_session(session_id)
    return database.get_reactions(session_id, start, end)


@app.get("/sessions/{session_id}/insights", response_model=Insights)
def get_insights(session_id: str):
    require_session(session_id)
    return analytics.insights(database.get_reactions(session_id))


@app.post("/sessions/{session_id}/chat", response_model=ChatResponse)
def chat(session_id: str, body: ChatRequest):
    require_session(session_id)
    try:
        return agent.chat(session_id, body.message, [h.model_dump() for h in body.history])
    except Exception as e:
        raise HTTPException(502, f"Agent error: {e}")
