"""Load a reactions JSON file into SQLite as a session.

    python load_reactions.py data/reactions.json          # session id "reactions"
    python load_reactions.py person1_output.json video1  # custom session id

Re-running replaces that session's reactions. Works with or without the server running.
"""

import json
import sys
from pathlib import Path

import config
from models import reaction, session
from models.database import init_db
from views.schemas import ReactionIn


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = Path(sys.argv[1])
    session_id = sys.argv[2] if len(sys.argv) > 2 else path.stem

    # Validate through the same model the API uses, so bad data fails here, not later.
    reactions = [ReactionIn(**r).model_dump() for r in json.loads(path.read_text())]

    init_db()
    session.delete(session_id)  # re-running replaces the session
    session.create(session_id, name=path.stem, video_url=None)
    count = reaction.add_many(session_id, reactions)
    print(f"Loaded {count} reactions into session '{session_id}' ({config.DB_PATH})")
    print(f"Try: http://localhost:8000/sessions/{session_id}/insights")


if __name__ == "__main__":
    main()
