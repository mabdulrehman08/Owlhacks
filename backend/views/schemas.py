"""Pydantic request/response models. This is the contract Person 1 (detection)
and Person 2 (frontend) code against."""

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class ReactionIn(BaseModel):
    timestamp: float = Field(..., ge=0, description="Seconds into the video")
    type: str = Field(..., description="Emotion label, e.g. joy, surprise, confusion")
    intensity: float = Field(..., ge=0, le=1)
    confidence: float = Field(1.0, ge=0, le=1)
    breathing_rate: Optional[float] = Field(
        None, ge=0, le=80, description="Breaths per minute measured by SmartSpectra, if available"
    )

    @field_validator("type")
    @classmethod
    def normalize_type(cls, v: str) -> str:
        return v.strip().lower()


class Reaction(ReactionIn):
    id: int


class SessionCreate(BaseModel):
    id: Optional[str] = Field(None, description="Optional custom id; a random one is generated otherwise")
    name: Optional[str] = None
    video_url: Optional[str] = None
    reactions: list[ReactionIn] = Field(default_factory=list)


class Session(BaseModel):
    id: str
    name: Optional[str] = None
    video_url: Optional[str] = None
    created_at: str
    reaction_count: int = 0


class Moment(BaseModel):
    timestamp: float
    type: str
    intensity: float
    confidence: float
    score: float = Field(..., description="Signed (valence) or unsigned (salience) score used for ranking")


class Shift(BaseModel):
    timestamp: float
    type: str
    intensity: float
    from_timestamp: float
    from_type: str
    delta: float = Field(..., description="Change in valence score; negative means things got worse")


class Summary(BaseModel):
    reaction_count: int
    duration: float
    dominant_emotion: Optional[str]
    average_intensity: float
    overall_sentiment: float = Field(..., description="-1 (negative) .. 1 (positive)")
    counts_by_type: dict[str, int]
    average_breathing_rate: Optional[float] = Field(
        None, description="Mean breaths per minute across reactions that have one"
    )


class Insights(BaseModel):
    most_positive: Optional[Moment]
    biggest_reaction: Optional[Moment]
    most_negative_shift: Optional[Shift]
    top_5: list[Moment]
    summary: Summary


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list, description="Prior turns, oldest first")


class ChatResponse(BaseModel):
    answer: str
    timestamps: list[float] = Field(default_factory=list, description="Moments the answer references, for seek buttons")
    tools_used: list[str] = Field(default_factory=list)
    mode: Literal["llm", "fallback"]
