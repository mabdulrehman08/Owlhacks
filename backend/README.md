# Backend: Reaction Analytics API

Takes facial-reaction data from the detector (Person 1), stores it, analyzes it, and serves
insights plus an AI chat to the dashboard (Person 2). Endpoint reference: [API.md](API.md).

## Run it

Use an **Ubuntu (WSL) terminal**, not Git Bash.

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # then paste your GEMINI_API_KEY into .env
uvicorn main:app --reload     # open http://localhost:8000/docs
```

Without an API key the chat still works, using simple keyword matching instead of Gemini.

Load a reactions file (e.g. Person 1's output) as a session:

```bash
python load_reactions.py data/reactions.json            # session "reactions"
python load_reactions.py person1_output.json video1     # session "video1"
```

## Structure: Model-View-Controller (MVC)

MVC splits the code by *job*, so each file has one reason to change.

```
backend/
├── main.py                  entry point: creates the app, plugs in the controllers
├── config.py                settings; loads your private .env
│
├── models/                  MODEL: the data
│   ├── database.py          SQLite connection, tables, demo seed data
│   ├── session.py           SQL for sessions (create / get / list / delete)
│   └── reaction.py          SQL for reactions (add / list by time range)
│
├── views/                   VIEW: what the data looks like to the outside world
│   └── schemas.py           JSON shapes the API accepts and returns (Pydantic)
│
├── controllers/             CONTROLLER: handles each HTTP request
│   ├── session_controller.py    /sessions
│   ├── reaction_controller.py   /sessions/{id}/reactions
│   ├── insight_controller.py    /sessions/{id}/insights
│   └── chat_controller.py       /sessions/{id}/chat
│
├── services/                business logic the controllers call
│   ├── analytics.py         most positive, biggest reaction, negative shift, top 5
│   └── agent.py             AI chat (Gemini, or Claude) with data tools
│
├── data/                    fake reactions to build against
│   ├── mock_reactions.json  auto-loaded as the "demo" session
│   └── reactions.json
└── load_reactions.py        CLI: load a JSON file into the database
```

### What each layer does

| Layer | Job | Rule | Example |
|---|---|---|---|
| **Model** | Stores and fetches data | The only place that talks to the database (SQL lives here and nowhere else) | `reaction.list_for_session("demo", 60, 130)` |
| **View** | Defines the shape of what goes in and out | No logic, just field names, types and validation (`intensity` must be 0 to 1) | `Insights`, `ChatResponse` |
| **Controller** | Receives a request and coordinates the work | Thin: checks input, calls models and services, returns a view. No SQL, no analytics math | `GET /sessions/{id}/insights` |
| **Service** | The "thinking": analytics and the AI agent | Works on plain data; doesn't know about HTTP or SQL | `analytics.insights(reactions)` |

In a web page MVC app the View would be HTML. In an API like this one, the View is the JSON
response, and Person 2's React app is what draws it on screen.

The **service** layer isn't one of the three MVC letters, but it's standard in MVC backends: it keeps
the controllers thin and makes the analytics and agent reusable (the chat agent uses the same
`analytics` functions the insights endpoint does).

### One request, step by step

`GET /sessions/demo/insights`:

```
React dashboard
   │  HTTP GET
   ▼
controllers/insight_controller.py   1. is there a session "demo"? (else 404)
   │
   ├──► models/reaction.py          2. fetch its reactions from SQLite
   │
   ├──► services/analytics.py       3. compute most positive, biggest reaction, top 5...
   │
   └──► views/schemas.py (Insights) 4. check and shape the result as JSON
   ▼
React dashboard draws it
```

### Why it helps the team

- **Swapping in Person 1's real data** only touches the data, never the code: load their JSON and every endpoint just works.
- **Changing the database** (e.g. SQLite → Postgres) only touches `models/`.
- **Changing what the API returns** starts in `views/schemas.py`, and `/docs` updates automatically for Person 2.
- **Changing the AI** (Gemini ↔ Claude) only touches `services/agent.py`.
