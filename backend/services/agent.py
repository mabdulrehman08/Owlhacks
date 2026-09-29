"""Chat agent that answers questions about a session using real reaction data.

If GEMINI_API_KEY is set, Gemini answers by calling the tools below (so it
can't make up moments). If ANTHROPIC_API_KEY is set instead, Claude does.
Otherwise a deterministic keyword-based fallback answers using the same tools,
so the demo still works offline.
"""

import json
import logging
import os
import re
from typing import Callable

from models import reaction as reaction_model
from services import analytics

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
# Tried in order when a model is overloaded (503) or rate-limited (429).
GEMINI_BACKUP_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
MODEL = os.environ.get("CLAUDE_MODEL", "claude-opus-5")
EFFORT = os.environ.get("CLAUDE_EFFORT", "medium")  # chat UI: favour latency over depth
MAX_TOOL_ROUNDS = 8

SYSTEM_PROMPT = """You analyze a viewer's facial reactions to a video. A detector sampled their face \
and labeled emotions (joy, surprise, confusion, boredom, ...) with an intensity and a confidence, \
each from 0 to 1, at timestamps in seconds.

Answer the video creator's questions using only data returned by your tools; call them before \
answering, and never invent moments. When you mention a moment, write its timestamp in seconds \
followed by mm:ss, like "127.4s (2:07)". Keep answers short and actionable: a sentence or two, \
or a short list when they ask for several moments. If the data can't answer the question, say so."""

TOOLS = [
    {
        "name": "get_summary",
        "description": "Overall stats for the session: reaction count, duration, dominant emotion, "
        "average intensity, overall sentiment (-1..1), counts per emotion type, and average breathing "
        "rate in breaths per minute when it was measured (null otherwise).",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "get_insights",
        "description": "Precomputed highlights: most positive moment, biggest reaction, "
        "biggest negative shift between consecutive reactions, and top 5 moments.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "get_top_reactions",
        "description": "The n strongest non-neutral reactions (intensity x confidence), at least "
        "5 seconds apart, strongest first. Use for 'what should I review' or 'key moments'.",
        "input_schema": {
            "type": "object",
            "properties": {"n": {"type": "integer", "minimum": 1, "maximum": 20}},
            "required": ["n"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_reactions_by_type",
        "description": "All reactions of the given emotion types, strongest first. "
        "E.g. ['confusion'] to find where the viewer was confused, or "
        "['boredom','confusion','sadness','anger','disgust','fear','frustration'] for all negative moments.",
        "input_schema": {
            "type": "object",
            "properties": {"types": {"type": "array", "items": {"type": "string"}, "minItems": 1}},
            "required": ["types"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_reactions_between",
        "description": "All reactions between start and end (seconds, inclusive), in time order.",
        "input_schema": {
            "type": "object",
            "properties": {"start": {"type": "number"}, "end": {"type": "number"}},
            "required": ["start", "end"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_reaction_at",
        "description": "The reaction closest to a timestamp (seconds), plus how far away it is.",
        "input_schema": {
            "type": "object",
            "properties": {"timestamp": {"type": "number"}},
            "required": ["timestamp"],
            "additionalProperties": False,
        },
    },
]


def _strip_ids(rs: list[dict]) -> list[dict]:
    return [{k: v for k, v in r.items() if k != "id"} for r in rs]


def build_tool_impls(session_id: str) -> dict[str, Callable[..., object]]:
    def reactions() -> list[dict]:
        return reaction_model.list_for_session(session_id)

    return {
        "get_summary": lambda: analytics.summary(reactions()),
        "get_insights": lambda: analytics.insights(reactions()),
        "get_top_reactions": lambda n=5: analytics.top_moments(reactions(), int(n)),
        "get_reactions_by_type": lambda types: analytics.negative_moments(
            reactions(), {t.lower() for t in types}
        ),
        "get_reactions_between": lambda start, end: _strip_ids(
            reaction_model.list_for_session(session_id, float(start), float(end))
        ),
        "get_reaction_at": lambda timestamp: analytics.reaction_at(reactions(), float(timestamp)),
    }


def fmt_time(seconds: float) -> str:
    m, s = divmod(int(round(seconds)), 60)
    return f"{m}:{s:02d}"


def cited_timestamps(text: str, session_id: str) -> list[float]:
    """Timestamps from the session that the answer mentions (as '127.4s' or '2:07'), in order."""
    known = [r["timestamp"] for r in reaction_model.list_for_session(session_id)]
    found: list[float] = []
    for m in re.finditer(r"(\d+(?:\.\d+)?)s\b|\b(\d{1,2}):(\d{2})\b", text):
        value = float(m.group(1)) if m.group(1) else int(m.group(2)) * 60 + int(m.group(3))
        tolerance = 0.05 if m.group(1) else 0.5
        match = next((t for t in known if abs(t - value) <= tolerance), None)
        if match is not None and match not in found:
            found.append(match)
    return found


def chat(session_id: str, message: str, history: list[dict]) -> dict:
    answer = None
    try:
        if os.environ.get("GEMINI_API_KEY"):
            answer, tools_used = _chat_gemini(session_id, message, history)
        elif os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"):
            answer, tools_used = _chat_llm(session_id, message, history)
    except Exception as e:
        # Never fail the demo because the LLM provider is down: fall back to keyword answers.
        logger.warning("LLM chat failed, using fallback: %s", e)
    if answer is not None:
        mode = "llm"
    else:
        answer, tools_used = _chat_fallback(session_id, message)
        mode = "fallback"
    return {
        "answer": answer,
        "timestamps": cited_timestamps(answer, session_id),
        "tools_used": tools_used,
        "mode": mode,
    }


# ---------------------------------------------------------------------------
# Gemini path
# ---------------------------------------------------------------------------

_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai

        _gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _gemini_client


def _chat_gemini(session_id: str, message: str, history: list[dict]) -> tuple[str, list[str]]:
    from google.genai import errors

    models = list(dict.fromkeys([GEMINI_MODEL, *GEMINI_BACKUP_MODELS]))
    for i, model in enumerate(models):
        try:
            return _chat_gemini_model(model, session_id, message, history)
        except errors.APIError as e:
            if e.code not in (429, 503) or i == len(models) - 1:
                raise
            logger.warning("Gemini model %s unavailable (%s), trying %s", model, e.code, models[i + 1])
    raise RuntimeError("unreachable")


def _chat_gemini_model(model: str, session_id: str, message: str, history: list[dict]) -> tuple[str, list[str]]:
    from google.genai import types

    client = _get_gemini_client()
    impls = build_tool_impls(session_id)
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=[
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=t["name"], description=t["description"], parameters_json_schema=t["input_schema"]
                    )
                    for t in TOOLS
                ]
            )
        ],
        # We run the tools ourselves so we can record which ones were used.
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )
    contents: list = [
        types.Content(role="model" if h["role"] == "assistant" else "user", parts=[types.Part(text=h["content"])])
        for h in history
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    tools_used: list[str] = []

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.models.generate_content(model=model, contents=contents, config=config)
        calls = response.function_calls or []
        if not calls:
            return (response.text or "").strip() or "I couldn't produce an answer.", tools_used

        # Append the model turn as-is (keeps Gemini's thought signatures intact).
        contents.append(response.candidates[0].content)
        parts = []
        for call in calls:
            tools_used.append(call.name)
            content, is_error = _run_tool(impls, call.name, dict(call.args or {}))
            result = {"error": content} if is_error else {"result": json.loads(content)}
            parts.append(types.Part.from_function_response(name=call.name, response=result))
        contents.append(types.Content(role="user", parts=parts))

    return "I ran out of steps before finishing. Try a more specific question.", tools_used


# ---------------------------------------------------------------------------
# Claude path
# ---------------------------------------------------------------------------

_client = None


def _get_client():
    global _client
    if _client is None:
        import anthropic

        _client = anthropic.Anthropic()
    return _client


def _run_tool(impls: dict, name: str, args: dict) -> tuple[str, bool]:
    if name not in impls:
        return f"Unknown tool: {name}", True
    try:
        return json.dumps(impls[name](**args)), False
    except Exception as e:  # bad args from the model -> let it retry
        return f"Error: {e}", True


def _chat_llm(session_id: str, message: str, history: list[dict]) -> tuple[str, list[str]]:
    client = _get_client()
    impls = build_tool_impls(session_id)
    messages: list[dict] = [{"role": h["role"], "content": h["content"]} for h in history]
    messages.append({"role": "user", "content": message})
    tools_used: list[str] = []

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
            thinking={"type": "adaptive"},
            output_config={"effort": EFFORT},
            # If a safety classifier declines, retry server-side on a fallback model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )

        if response.stop_reason == "refusal":
            return "Sorry, I can't help with that request.", tools_used

        if response.stop_reason != "tool_use":
            text = "".join(b.text for b in response.content if b.type == "text").strip()
            return text or "I couldn't produce an answer.", tools_used

        messages.append({"role": "assistant", "content": response.content})
        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            tools_used.append(block.name)
            content, is_error = _run_tool(impls, block.name, block.input or {})
            results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": content, "is_error": is_error}
            )
        messages.append({"role": "user", "content": results})

    return "I ran out of steps before finishing. Try a more specific question.", tools_used


# ---------------------------------------------------------------------------
# Deterministic fallback (no API key)
# ---------------------------------------------------------------------------

NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}


def _parse_times(text: str) -> list[float]:
    times = []
    for m in re.finditer(r"\b(\d{1,2}):(\d{2})\b|\b(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds)?\b", text):
        if m.group(1):
            times.append(int(m.group(1)) * 60 + int(m.group(2)))
        else:
            times.append(float(m.group(3)))
    return times


def _parse_count(text: str, default: int) -> int:
    m = re.search(r"\b(\d{1,2})\b", text)
    if m:
        return max(1, min(20, int(m.group(1))))
    for word, n in NUMBER_WORDS.items():
        if re.search(rf"\b{word}\b", text):
            return n
    return default


def _has(text: str, keys) -> bool:
    """True if any key starts a word in text (so 'lose' doesn't match 'close')."""
    return any(re.search(rf"\b{re.escape(k)}", text) for k in keys)


def _line(m: dict) -> str:
    return f"- {m['timestamp']}s ({fmt_time(m['timestamp'])}): {m['type']}, intensity {m['intensity']:.2f}"


def _chat_fallback(session_id: str, message: str) -> tuple[str, list[str]]:
    impls = build_tool_impls(session_id)
    q = message.lower()

    between = re.search(r"between\s+(\S+)\s+and\s+(\S+)", q)
    if between:
        times = _parse_times(between.group(1)) + _parse_times(between.group(2))
        if len(times) == 2:
            start, end = sorted(times)
            rs = impls["get_reactions_between"](start, end)
            if not rs:
                return f"No reactions between {fmt_time(start)} and {fmt_time(end)}.", ["get_reactions_between"]
            return (
                f"Reactions between {fmt_time(start)} and {fmt_time(end)}:\n" + "\n".join(_line(r) for r in rs),
                ["get_reactions_between"],
            )

    at = re.search(r"\b(?:at|around|near)\s+(\d{1,2}:\d{2}|\d+(?:\.\d+)?)", q)
    if at:
        t = _parse_times(at.group(1))[0]
        r = impls["get_reaction_at"](t)
        if not r:
            return "There are no reactions in this session yet.", ["get_reaction_at"]
        return (
            f"Closest reaction to {fmt_time(t)} is at {r['timestamp']}s ({fmt_time(r['timestamp'])}): "
            f"{r['type']}, intensity {r['intensity']:.2f} ({r['distance']}s away).",
            ["get_reaction_at"],
        )

    type_keywords = {
        "confusion": ("confus", "lost", "unclear"),
        "boredom": ("bor", "disengag", "dull"),
        "surprise": ("surpris", "shock", "unexpected"),
        "joy": ("laugh", "funny", "smil", "joy", "happ"),
    }
    for emotion, keys in type_keywords.items():
        if _has(q, keys):
            hits = impls["get_reactions_by_type"]([emotion])
            if not hits:
                return f"I didn't detect any {emotion} in this session.", ["get_reactions_by_type"]
            return (
                f"The viewer showed {emotion} at {len(hits)} point(s), strongest first:\n"
                + "\n".join(_line(h) for h in hits[:5]),
                ["get_reactions_by_type"],
            )

    if _has(q, ("negative", "worst", "dislike", "drop", "bad", "lose", "lost interest")):
        ins = impls["get_insights"]()
        hits = impls["get_reactions_by_type"](list(analytics.NEGATIVE_TYPES))
        parts = []
        if shift := ins["most_negative_shift"]:
            parts.append(
                f"The biggest drop was at {shift['timestamp']}s ({fmt_time(shift['timestamp'])}): "
                f"{shift['from_type']} → {shift['type']}."
            )
        if hits:
            parts.append("Negative moments:\n" + "\n".join(_line(h) for h in hits[:5]))
        return "\n".join(parts) or "No negative reactions detected.", ["get_insights", "get_reactions_by_type"]

    if _has(q, ("positive", "best", "enjoy", "like", "favorite", "favourite")):
        best = impls["get_insights"]()["most_positive"]
        if not best:
            return "No positive reactions detected.", ["get_insights"]
        return (
            f"The most positive moment was {best['timestamp']}s ({fmt_time(best['timestamp'])}): "
            f"{best['type']} at intensity {best['intensity']:.2f}.",
            ["get_insights"],
        )

    if _has(q, ("review", "top", "moment", "highlight", "important", "key", "biggest", "strongest")):
        n = _parse_count(q, 5)
        top = impls["get_top_reactions"](n)
        return f"Top {len(top)} moments to review:\n" + "\n".join(_line(m) for m in top), ["get_top_reactions"]

    s = impls["get_summary"]()
    top = impls["get_top_reactions"](3)
    mood = "positive" if s["overall_sentiment"] > 0.15 else "negative" if s["overall_sentiment"] < -0.15 else "mixed"
    return (
        f"{s['reaction_count']} reactions over {fmt_time(s['duration'])}. Overall the response was {mood} "
        f"(sentiment {s['overall_sentiment']:+.2f}); dominant emotion: {s['dominant_emotion']}.\n"
        + (
            f"Average breathing rate: {s['average_breathing_rate']:.0f} breaths/min.\n"
            if s.get("average_breathing_rate")
            else ""
        )
        +
        "Strongest moments:\n" + "\n".join(_line(m) for m in top),
        ["get_summary", "get_top_reactions"],
    )
