"""
Vercel serverless entrypoint.

This module re-exports the existing FastAPI app instance so Vercel serves
the same application/middleware stack used in local development.
"""

from pathlib import Path
import sys

backend_root = Path(__file__).resolve().parents[1]
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.main import app
