"""Root-level FastAPI entrypoint for Vercel framework detection."""

from pathlib import Path
import sys

backend_root = Path(__file__).resolve().parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.main import app
