# OwlHacks

A reaction-analytics dashboard: detect facial reactions in a video, store them, and let
an AI agent answer questions about what viewers felt and when.

- **backend/** — FastAPI service (Python). Stores reactions, computes insights, runs the chat agent. See [backend/README.md](backend/README.md) and [backend/API.md](backend/API.md).
- **frontend/** — React app (TanStack Start). Dashboard UI, timeline, chat. See [frontend/README.md](frontend/README.md).

The two are separate services that talk over HTTP. The easiest way to run both together
is Docker Compose.

## Run it with Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone <this-repo>
cd Owlhacks
docker compose up --build
```

Then open **http://localhost:3000** — that's the app.

- The frontend serves the UI and proxies `/api/*` requests to the backend internally, so the
  browser only ever talks to port 3000.
- The backend is also published on **http://localhost:8000** (its interactive docs are at
  `/docs`) so you can call it directly, e.g. to POST reaction data from a detector script.
- Reaction data is stored in a Docker volume (`backend-data`), so it survives `docker compose down`
  and `docker compose up --build` again. To wipe it: `docker compose down -v`.

### Using the AI chat agent

Without an API key, the chat still works using keyword matching. To get real LLM answers:

```bash
cp backend/.env.example backend/.env
# paste your GEMINI_API_KEY (or ANTHROPIC_API_KEY) into backend/.env
docker compose up --build
```

### Stopping it

```bash
docker compose down
```

### Rebuilding after code changes

```bash
docker compose up --build
```

(Compose caches layers, so this is fast unless `requirements.txt` / `package.json` changed.)

## Run it without Docker

Two terminals, each service run manually. See [backend/README.md](backend/README.md) and
[frontend/README.md](frontend/README.md) for details — short version:

```bash
# Terminal 1 — backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # optional: add your GEMINI_API_KEY
uvicorn main:app --reload   # http://localhost:8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev   # http://localhost:3000
```

Open **http://localhost:3000**.

## Project structure

```
Owlhacks/
├── backend/            FastAPI app (MVC) — see backend/README.md
├── frontend/           React app (TanStack Start) — see frontend/README.md
└── docker-compose.yml  runs both together
```
