"""
Vercel serverless entrypoint.

This module re-exports the existing FastAPI app instance so Vercel serves
the same application/middleware stack used in local development.
"""

from app.main import app

