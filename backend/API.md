# Reaction Analytics API

Base URL: `http://localhost:8000`. Interactive docs: `/docs`.
Run: `pip install -r requirements.txt && uvicorn main:app --reload`
Put `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) in `backend/.env` to have an LLM answer chat questions; without one, a keyword fallback answers.

## Reaction shape

```json
{"timestamp": 127.4, "type": "surprise", "intensity": 0.94, "confidence": 0.91}
```
`timestamp` is seconds into the video. `intensity` and `confidence` are 0–1 (`confidence` defaults to 1). `type` is lowercased; unknown types count as neutral.

## For Person 1 (detection): send reactions

```bash
# create a session (optionally with reactions)
curl -X POST localhost:8000/sessions -H 'content-type: application/json' \
  -d '{"id": "video1", "name": "My video", "reactions": []}'

# append reactions (a JSON array); can be called repeatedly
curl -X POST localhost:8000/sessions/video1/reactions -H 'content-type: application/json' \
  -d @reactions.json
```

## For Person 2 (frontend): read results

| Call | Returns |
|---|---|
| `GET /sessions` | all sessions |
| `GET /sessions/{id}` | `{id, name, video_url, created_at, reaction_count}` |
| `POST /sessions/upload-video` | multipart file upload; returns `{filename, original_name, video_url, size}` |
| `DELETE /sessions/{id}` | deletes session and cascades to all its reactions |
| `GET /sessions/{id}/reactions?start=&end=` | reactions in time order (for a timeline chart) |
| `GET /sessions/{id}/insights` | highlights, see below |
| `POST /sessions/{id}/chat` | `{"message": "...", "history": [{"role": "user", "content": "..."}, ...]}` |

`GET /sessions/demo/insights`:
```json
{
  "most_positive":       {"timestamp": 94.2,  "type": "joy",       "intensity": 0.87, "confidence": 0.93, "score": 0.81},
  "biggest_reaction":    {"timestamp": 127.4, "type": "surprise",  "intensity": 0.94, "confidence": 0.91, "score": 0.86},
  "most_negative_shift": {"timestamp": 192.1, "type": "confusion", "intensity": 0.82,
                          "from_timestamp": 176.4, "from_type": "joy", "delta": -0.98},
  "top_5": [ {"timestamp": 127.4, "type": "surprise", ...}, ... ],
  "summary": {"reaction_count": 21, "duration": 244.4, "dominant_emotion": "joy",
              "average_intensity": 0.59, "overall_sentiment": 0.42, "counts_by_type": {"joy": 7, ...}}
}
```
Any highlight can be `null` when there's no data for it.

`POST /sessions/demo/chat` response:
```json
{
  "answer": "The viewer showed confusion at 2 point(s)...\n- 192.1s (3:12): confusion...",
  "timestamps": [192.1, 198.6],
  "tools_used": ["get_reactions_by_type"],
  "mode": "llm"
}
```
`timestamps` lists the moments the answer mentions; render them as seek buttons (`video.currentTime = t`).
Keep `history` on the client and send it back each turn for follow-up questions.

Errors: `404` unknown session, `409` session id already exists, `422` invalid body, `502` chat/LLM failure.
