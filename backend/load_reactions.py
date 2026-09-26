"""Load a reactions JSON file into SQLite as a session.

    python load_reactions.py reactions.json            # session id "reactions"
    python load_reactions.py person1_output.json video1  # custom session id

Re-running replaces that session's reactions. Works with or without the server running.
"""

import json
import sys
from pathlib import Path

import database
from models import ReactionIn


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = Path(sys.argv[1])
    session_id = sys.argv[2] if len(sys.argv) > 2 else path.stem

    # Validate through the same model the API uses, so bad data fails here, not later.
    reactions = [ReactionIn(**r).model_dump() for r in json.loads(path.read_text())]

    database.init_db()
    with database.get_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))  # cascades to reactions
    database.create_session(session_id, name=path.stem, video_url=None)
    count = database.add_reactions(session_id, reactions)
    print(f"Loaded {count} reactions into session '{session_id}' ({database.DB_PATH})")
    print(f"Try: http://localhost:8000/sessions/{session_id}/insights")


if __name__ == "__main__":
    main()
