"""
Pharm AI Synapse — FastAPI Application

Autonomous 3D Molecular Evolution & Evidence-Backed Drug Discovery Engine.
Engineered by A.P. Anirudh.

DISCLAIMER:
This application is a research-support prototype. Computational
predictions are not experimental validation, clinical recommendations,
or proof of drug efficacy or safety.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.database.database import init_db, SessionLocal, seed_demo_data

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (modern replacement for deprecated on_event)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting Pharm AI Synapse backend...")

    # Initialize database tables
    init_db()
    logger.info("Database initialized.")

    # Seed demo data
    db = SessionLocal()
    try:
        seed_demo_data(db)
        logger.info("Demo data seeded.")
    except Exception as exc:
        logger.error("Failed to seed demo data: %s", exc)
    finally:
        db.close()

    logger.info("Pharm AI Synapse backend ready.")
    yield
    logger.info("Shutting down Pharm AI Synapse backend.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Pharm AI Synapse",
    description=(
        "Autonomous 3D Molecular Evolution & Evidence-Backed Drug Discovery Engine. "
        "Engineered by A.P. Anirudh. "
        "This is a research-support prototype. Computational predictions "
        "are not experimental validation or clinical recommendations."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(router)


# ---------------------------------------------------------------------------
# Root redirect
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "application": "Pharm AI Synapse",
        "version": "1.0.0",
        "architect": "A.P. Anirudh",
        "description": (
            "Autonomous 3D Molecular Evolution & Evidence-Backed Drug Discovery Engine. "
            "Visit /docs for API documentation."
        ),
        "disclaimer": (
            "This application is a research-support prototype. "
            "Computational predictions are not experimental validation, "
            "clinical recommendations, or proof of drug efficacy or safety."
        ),
    }
