"""App-wide settings. Importing this loads backend/.env (your private API keys),
so it must be imported before anything that reads environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

DATA_DIR = BASE_DIR / "data"
VIDEOS_DIR = DATA_DIR / "videos"
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = Path(os.environ.get("REACTIONS_DB", BASE_DIR / "reactions.db"))
MOCK_REACTIONS_PATH = DATA_DIR / "mock_reactions.json"
DEMO_SESSION_ID = "demo"
